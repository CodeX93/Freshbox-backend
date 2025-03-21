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
  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Generate a verification ID
  const verificationId = crypto.randomBytes(32).toString('hex');
  
  if (client && process.env.TWILIO_PHONE_NUMBER) {
    // Send SMS via Twilio
    await client.messages.create({
      body: `Your verification code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
  } else {
    // For development/testing without Twilio
    console.log(`[DEV MODE] OTP for ${phoneNumber}: ${otp}`);
  }
  
  // Store OTP with expiration (10 minutes)
  otpStore.set(verificationId, {
    phoneNumber,
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000
  });
  
  // Set timeout to clean up expired OTP
  setTimeout(() => {
    otpStore.delete(verificationId);
  }, 10 * 60 * 1000);
  
  return { verificationId };
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
  const verification = otpStore.get(verificationId);
  
  if (!verification) {
    throw new Error('Verification not found or expired');
  }
  
  if (verification.phoneNumber !== phoneNumber) {
    throw new Error('Phone number mismatch');
  }
  
  if (verification.expiresAt < Date.now()) {
    otpStore.delete(verificationId);
    throw new Error('OTP expired');
  }
  
  const isValid = verification.otp === otp;
  
  // Remove from store if verified
  if (isValid) {
    otpStore.delete(verificationId);
  }
  
  return isValid;
};

module.exports = { sendOtp, verifyOtp };