import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  text: String,
  userProfileImage: {
    type: String,
    required: false, // or true, depending on your requirements
  },
  timestamp: Date,
});

export const MessageSchema = mongoose.model("messages", messageSchema);
