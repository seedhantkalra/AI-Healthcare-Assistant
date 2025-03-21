import mongoose from "mongoose";
import bcrypt from "bcrypt";

// Define the schema for the User
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }
});

// Add a method to validate the password
userSchema.methods.validatePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Create and export the model
const User = mongoose.model("User", userSchema);
export default User;
