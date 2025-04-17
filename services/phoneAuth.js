// services/phoneAuth.js
const twilio = require('twilio');
const crypto = require('crypto');

// Store OTP verification data (in production, use Redis or another store)
const otpStore = new Map();

// Initialize Twilio client
const client = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

/**
 * Sends an OTP to the provided phone number
 *
 * @param {string} phoneNumber - The phone number to send the OTP to
 * @returns {Promise<object>} - Object containing verificationId
 */
const sendOtp = async (phoneNumber) => {
  try {
    console.log(`Attempting to send OTP to: ${phoneNumber}`);
    
    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Generate a verification ID
    const verificationId = crypto.randomBytes(32).toString('hex');
    
    // Standardize the phone number
    const standardizedPhone = phoneNumber.replace(/[\s-()]/g, '');
    
    if (client && process.env.TWILIO_PHONE_NUMBER) {
      console.log('Using Twilio to send SMS');
      
      try {
        // Ensure the from number is exactly as provided by Twilio
        const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;
        
        console.log(`Sending from Twilio number: ${twilioFromNumber} to ${standardizedPhone}`);
        
        // Send SMS via Twilio
        await client.messages.create({
          body: `Your verification code is: ${otp}`,
          from: twilioFromNumber,
          to: standardizedPhone
        });
        
        console.log('Twilio SMS sent successfully');
      } catch (twilioError) {
        console.error('Twilio error:', twilioError);
        
        // Log helpful information for debugging
        if (twilioError.code === 21659) {
          console.error('This is a country code mismatch error. Make sure your Twilio number can send to the destination country.');
          console.error('If using a trial account, you may only be able to send to verified numbers.');
        }
        
        // Fall back to dev mode if Twilio fails
        console.log(`[TWILIO FAILED - FALLBACK] OTP for ${standardizedPhone}: ${otp}`);
      }
    } else {
      // For development/testing without Twilio
      console.log(`[DEV MODE] OTP for ${standardizedPhone}: ${otp}`);
    }
    
    // Store OTP with expiration (10 minutes)
    otpStore.set(verificationId, {
      phoneNumber: standardizedPhone,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });
    
    // Set timeout to clean up expired OTP
    setTimeout(() => {
      otpStore.delete(verificationId);
    }, 10 * 60 * 1000);
    
    console.log(`OTP stored with verification ID: ${verificationId}`);
    return { verificationId };
  } catch (error) {
    console.error('Error in sendOtp:', error);
    throw error; // Re-throw to be handled by the route
  }
};

/**
 * Verifies an OTP for a given phone number and verification ID
 *
 * @param {string} phoneNumber - Phone number to verify
 * @param {string} otp - The OTP code to verify
 * @param {string} verificationId - The verification ID associated with the OTP
 * @returns {Promise<boolean>} - True if verification successful, false otherwise
 */
const verifyOtp = async (phoneNumber, otp, verificationId) => {
  try {
    console.log(`Verifying OTP for phone: ${phoneNumber}, verification ID: ${verificationId}`);
    
    const verification = otpStore.get(verificationId);
    if (!verification) {
      console.log('Verification not found or expired');
      return false;
    }
    
    // Standardize phone numbers for comparison
    const standardizedInputPhone = phoneNumber.replace(/[\s-()]/g, '');
    const standardizedStoredPhone = verification.phoneNumber;
    
    console.log(`Comparing phones: Input (${standardizedInputPhone}) vs Stored (${standardizedStoredPhone})`);
    
    if (standardizedInputPhone !== standardizedStoredPhone) {
      console.log('Phone number mismatch');
      return false;
    }
    
    if (verification.expiresAt < Date.now()) {
      console.log('OTP expired');
      otpStore.delete(verificationId);
      return false;
    }
    
    const isValid = verification.otp === otp;
    
    // Remove from store if verified
    if (isValid) {
      console.log('OTP verified successfully');
      otpStore.delete(verificationId);
    } else {
      console.log('Invalid OTP provided');
    }
    
    return isValid;
  } catch (error) {
    console.error('Error in verifyOtp:', error);
    return false; // Return false instead of throwing to handle gracefully
  }
};

module.exports = { sendOtp, verifyOtp,otpStore };