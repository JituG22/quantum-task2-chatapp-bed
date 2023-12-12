import mongoose from "mongoose";

const requestSchema = new mongoose.Schema({
  requestId: String,
  name: String,
  doj: String,
  location: String,
  request: String,
  date: String,
  status: String,
  currentStage: String,
  requestCreated: String,
});

export const RequestRecord = mongoose.model("RequestRecord", requestSchema);
