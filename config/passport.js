// config/passport.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../model/user');

// Serialize user for session
passport.serializeUser((user, done) => {
  try {
    done(null, user.id);
  } catch (err) {
    done(err);
  }
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Local Strategy (Email/Password)
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      // Find user by email
      const user = await User.findOne({ email }).select('+password');
      // If user doesn't exist
      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }
      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return done(null, false, { message: 'Invalid email or password' });
      }
      // If all is well, return the user
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Only configure Google Strategy if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:5023/api/auth/google/callback', // 👈 Important
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ googleId: profile.id });
      // If not, create new user
      if (!user) {
        user = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          profilePicture: profile.photos[0].value
        });
        await user.save();
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

// Only configure Facebook Strategy if credentials are available
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  const FacebookStrategy = require('passport-facebook').Strategy;
  
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: '/api/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'photos', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ facebookId: profile.id });
      // If not, create new user
      if (!user) {
        user = new User({
          facebookId: profile.id,
          name: profile.displayName,
          email: profile.emails ? profile.emails[0].value : null,
          profilePicture: profile.photos ? profile.photos[0].value : null
        });
        await user.save();
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

// Only configure Apple Strategy if credentials are available
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && 
    process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY_LOCATION) {
  const AppleStrategy = require('passport-apple');
  const jwt = require('jsonwebtoken');
  
  passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKeyLocation: process.env.APPLE_PRIVATE_KEY_LOCATION,
    callbackURL: '/api/auth/apple/callback',
    scope: ['name', 'email']
  }, async (accessToken, refreshToken, idToken, profile, done) => {
    try {
      // Parse the ID token to get the user's info
      const decoded = jwt.decode(idToken);
      const appleId = decoded.sub;
      // Check if user already exists
      let user = await User.findOne({ appleId });
      // If not, create new user
      if (!user) {
        user = new User({
          appleId,
          name: profile.name?.firstName ? `${profile.name.firstName} ${profile.name.lastName || ''}` : 'Apple User',
          email: decoded.email
        });
        await user.save();
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

module.exports = passport;