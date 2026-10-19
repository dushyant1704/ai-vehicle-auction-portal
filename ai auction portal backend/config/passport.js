const passport = require("passport");

module.exports = function configurePassport() {
  // Only configure Google strategy if credentials are present
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn("\n⚠️  [Passport] Google OAuth credentials not set — Google login disabled.");
    console.warn("   Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable it.\n");

    // Still need serialize/deserialize for session middleware to work
    passport.serializeUser((user, done) => done(null, JSON.stringify(user)));
    passport.deserializeUser((data, done) => {
      try {
        done(null, typeof data === "string" ? JSON.parse(data) : data);
      } catch (e) {
        done(e);
      }
    });
    return passport;
  }

  const GoogleStrategy = require("passport-google-oauth20").Strategy;

  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:5000/auth/google/callback";

  console.log("\n✅ [Passport] Google OAuth configured");
  console.log(`   Callback URL: ${callbackURL}`);

  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      function (accessToken, refreshToken, profile, done) {
        const user = {
          googleId:    profile.id,
          name:        profile.displayName,
          email:       profile.emails?.[0]?.value || null,
          photo:       profile.photos?.[0]?.value || null,
          provider:    "google",
        };
        console.log(`✅ [Passport] Google login: ${user.email}`);
        return done(null, user);
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, JSON.stringify(user));
  });

  passport.deserializeUser((data, done) => {
    try {
      done(null, typeof data === "string" ? JSON.parse(data) : data);
    } catch (e) {
      done(e);
    }
  });

  return passport;
};
