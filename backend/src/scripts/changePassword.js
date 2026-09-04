/**
 * Change a user's password directly in the database.
 *
 * Usage (run from the project root, so .env is found):
 *   node src/scripts/changePassword.js <email> <newPassword>
 *
 * Example:
 *   node src/scripts/changePassword.js admin@keepalive.local "a much better password 123"
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");

async function main() {
  const [, , email, newPassword] = process.argv;

  if (!email || !newPassword) {
    console.error("Usage: node src/scripts/changePassword.js <email> <newPassword>");
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  console.log(`Password updated for ${user.email} (role: ${user.role}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
