import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userName: String,
  email: String,
  password: String,
  profileImage: {
    type: String,
    required: false, // or true, depending on your requirements
  },
});

export const User = mongoose.model("User", userSchema);
