const Plan = require("../model/plan");
const Stripe = require("stripe");
const User = require("../model/user");
const Subscription = require("../model/Subscription");
const stripe = Stripe(process.env.stripe_secretKey);
const paypal = require("paypal-rest-sdk");

paypal.configure({
  mode: "sandbox", // or 'live'
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.status(200).json({ success: true, count: plans.length, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCheckoutSession = async (req, res) => {
  const data = req.body;
  try {
    const { planId, userPrice, successUrl, cancelUrl, userId, userEmail } =
      data;

    if (!userPrice || userPrice < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid price",
      });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const productDescription = plan.features
      .map((feature) => feature.text)
      .join(". ");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: plan.name,
              description: productDescription,
            },
            unit_amount: Math.round(userPrice * 100),
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        planId,
        userId,
        planName: plan.name,
      },
      client_reference_id: userId,
      customer_email: userEmail,
    });

    res.status(200).json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("Checkout session error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const verifyPortalSession = async (req, res) => {
  try {
    let { customerId, userId, planId } = req.query;
 

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "customerId is required",
      });
    }

    // Handle Checkout Session ID to real customer ID
    if (customerId.startsWith("cs_")) {
      const session = await stripe.checkout.sessions.retrieve(customerId);
      customerId = session.customer;
    
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      expand: ["data.default_payment_method", "data.items.data.price"],
      limit: 5,
    });

    if (!subscriptions.data.length) {
      return res.status(404).json({
        success: false,
        message: "No subscriptions found",
      });
    }

    const latest = subscriptions.data.sort((a, b) => b.created - a.created)[0];

    const currentPlan = await Plan.findById(planId);
    if (!currentPlan) {
      return res.status(404).json({
        success: false,
        message: "Current plan not found",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const stripeInterval = latest.items.data[0].price.recurring?.interval;
    const billingCycle =
      stripeInterval === "month"
        ? "monthly"
        : stripeInterval === "year"
        ? "yearly"
        : "unknown";

    const startDate = latest.current_period_start
      ? new Date(latest.current_period_start * 1000)
      : new Date();

    let expiryDate;
    if (latest.current_period_end) {
      expiryDate = new Date(latest.current_period_end * 1000);
    } else {
      const tempDate = new Date(startDate);
      if (billingCycle === "monthly") {
        tempDate.setMonth(tempDate.getMonth() + 1);
      } else if (billingCycle === "yearly") {
        tempDate.setFullYear(tempDate.getFullYear() + 1);
      }
      expiryDate = tempDate;
    }

    const subscriptionData = {
      user: userId,
      plan: currentPlan._id,
      stripeSubscriptionId: latest.id,
      stripeCustomerId: latest.customer,
      status: latest.status,
      startDate,
      expiryDate,
      monthlyItems: 40,
      price: latest.items.data[0].price.unit_amount / 100,
      planName: latest.items.data[0].price.nickname || currentPlan.name,
      customerEmail: user.email,
      paymentMethod: latest.default_payment_method
        ? `${latest.default_payment_method.card.brand} **** ${latest.default_payment_method.card.last4}`
        : "Unknown",
      billingCycle,
    };

    const savedSubscription = await Subscription.create(subscriptionData);
    user.plan = savedSubscription._id;
    await user.save();

    res.status(200).json({ success: true, subscription: savedSubscription });
  } catch (error) {
    console.error("Portal session verification error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCheckoutOrder = async (req, res) => {
  const data = req.body;

  try {
    const { items, totalPrice, user } = data;

    if (!totalPrice || totalPrice < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid price",
      });
    }

    const customer = await User.findById(user);

    const lineItems = items.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.pricePerItem * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/checkout/created?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      client_reference_id: customer._id.toString(),
      customer_email: customer.email,
    });

    res.status(200).json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("Checkout session error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const createCheckoutOrderPaypal = async (req, res) => {
  const data = req.body;

  try {
    const { items, totalPrice, user } = data;

    if (!totalPrice || totalPrice < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid price",
      });
    }

    const customer = await User.findById(user);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Convert items for PayPal
    const paypalItems = items.map((item, index) => ({
      name: item.name,
      sku: `sku-${index + 1}`,
      price: item.pricePerItem.toFixed(2),
      currency: "EUR",
      quantity: item.quantity,
    }));

    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: `${process.env.CLIENT_URL}/checkout/created?session_id=true`,
        cancel_url: `${process.env.CLIENT_URL}/cancel`,
      },
      transactions: [
        {
          item_list: {
            items: paypalItems,
          },
          amount: {
            currency: "EUR",
            total: totalPrice.toFixed(2),
          },
          description: `Order for ${customer.name || customer.email}`,
        },
      ],
    };

    paypal.payment.create(create_payment_json, (error, payment) => {
      if (error) {
        console.error("PayPal create error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to create PayPal payment",
        });
      } else {
        const approvalUrl = payment.links.find(
          (link) => link.rel === "approval_url"
        );
        if (approvalUrl) {
          return res.status(200).json({
            success: true,
            checkoutUrl: approvalUrl.href,
          });
        } else {
          return res.status(500).json({
            success: false,
            message: "Approval URL not found",
          });
        }
      }
    });
  } catch (error) {
    console.error("Checkout session error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  getAllPlans,
  createCheckoutSession,
  verifyPortalSession,
  createCheckoutOrder,
  createCheckoutOrderPaypal,
};
