const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const RiderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      required: true,
    },
    password: {
      type: String,
      select: false,
      required: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      set: (v) => (v === "" ? null : v),
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    facebookId: {
      type: String,
      unique: true,
      sparse: true,
    },
    appleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    username: {
      type: String,
      default: "",
    },
    servicesAreas: [
      {
        type: String,
      },
    ],
    vehicle: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
RiderSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// Compare password method
RiderSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};



const Rider = mongoose.model("Rider", RiderSchema);
module.exports = Rider;
