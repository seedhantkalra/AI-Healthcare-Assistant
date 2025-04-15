import mongoose from "mongoose";
import bcrypt from "bcrypt";

/**
 * This schema defines a basic User model.
 * It's currently not used by the chatbot, but can be extended later
 * to support separate admin login, dashboard access, or analytics.
 */
const userSchema = new mongoose.Schema({
  // Email address of the user (must be unique)
  email: { type: String, required: true, unique: true },
  // Hashed version of the user's password (stored securely)
  passwordHash: { type: String, required: true }
});

/**
 * Instance method on User objects to validate a login attempt.
 * Compares a plain-text password to the stored hash using bcrypt.
 * Returns: true if password is valid, false otherwise.
 */
userSchema.methods.validatePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

const User = mongoose.model("User", userSchema);
export default User;
