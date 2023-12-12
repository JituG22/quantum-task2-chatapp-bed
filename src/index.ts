import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import multer from "multer";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import * as yup from "yup";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import signupSchema from "./schema/signupSchema";
import { User } from "./schema/userModel";
import path from "path";
import { MessageFc } from "./interface/interface";
import { MessageSchema } from "./schema/messageSchema";
import { RequestRecord } from "./schema/RequestSchema";

const socketIo = require("socket.io");

dotenv.config();
// Connect to MongoDB
// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/chatapp")
  .then(() => console.log("Connected to MongoDB..."))
  .catch((err) => console.error("Could not connect to MongoDB...", err));

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
app.use(bodyParser.json());
app.use(express.static("uploads"));
app.use(cors());

io.on("connection", (socket: any) => {
  console.log("New client connected");

  socket.on("chat message", async (msg: MessageFc) => {
    const chatMessage = new MessageSchema({
      userId: msg.userId,
      userName: msg.userName,
      text: msg.text,
      userProfileImage: msg.userProfileImage,
      timestamp: msg.timestamp,
    });

    // Check if msg.text matches any requestId in RequestRecord
    try {
      const matchedRequest = await RequestRecord.findOne({
        requestId: msg.text,
      });
      if (matchedRequest) {
        msg.text = `Number: ${msg.text} 
        Name: ${matchedRequest.name} 
        Date of Joining :   ${matchedRequest.doj} 
        Location: ${matchedRequest.location} 
        Request: ${matchedRequest.request} 
        Date: ${matchedRequest.date} 
        Status: ${matchedRequest.status}
        Current Stage: ${matchedRequest.currentStage}
        Request Created : ${matchedRequest.requestCreated}
        `;
        // If a match is found, emit it back to the client
        chatMessage.text = msg.text;
        socket.emit("matched request", msg);
      }
    } catch (error) {
      console.error("Error fetching request record: ", error);
      // Optionally, you can emit an error message back to the client
      socket.emit("error", "Error fetching request record");
    }
    await chatMessage.save();
    io.emit("chat message", msg);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Set up multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // 'uploads/' is the folder where images will be stored
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Appends the original extension to the filename
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // Limit file size to 2MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      throw Error("Invalid file type, only JPEG and PNG is allowed!");
    }
  },
});

const userSchema = yup.object().shape({
  userName: yup.string().required(),
  email: yup.string().email().required(),
  password: yup.string().required(),
  // profileImage is not here as it's handled separately by multer
});
app.post("/signup", upload.single("profileImage"), async (req, res) => {
  try {
    const validatedBody = await userSchema.validate(req.body);
    const hashedPassword = await bcrypt.hash(validatedBody.password, 10);

    const user = new User({
      userName: validatedBody.userName,
      email: validatedBody.email,
      password: hashedPassword,
      profileImage: req.file ? req.file.filename : null, // Store the file path
    });

    await user.save();
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "secretKey"
    );

    res.status(201).json({ token });
  } catch (error) {
    if (
      error instanceof yup.ValidationError ||
      error instanceof multer.MulterError
    ) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
});

// Define the login schema using yup
const loginSchema = yup.object().shape({
  email: yup.string().email().required(),
  password: yup.string().required(),
});

//  on start

app.get("", (req, res) => {
  res.send("ok");
});
// Login endpoint
app.post("/login", async (req, res) => {
  try {
    const validatedBody = await loginSchema.validate(req.body);
    const user = await User.findOne({ email: validatedBody.email });
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(validatedBody.password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "secretKey"
    );

    // Send the token, email, username, and profile image URL in the response
    res.json({
      userId: user._id,
      token: token,
      userEmail: user.email,
      userName: user.userName,
      userProfileImage: user.profileImage, // Assuming profileImage holds the URL
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
});

app.get("/messages", async (req, res) => {
  try {
    // Fetch all messages from MongoDB
    const messages = await MessageSchema.find({}).sort({ timestamp: -1 });
    // Send the messages as a response
    res.json(messages);
  } catch (error) {
    // Handle any errors that occur during fetching
    res
      .status(500)
      .json({ error: "An error occurred while fetching messages" });
  }
});

// GET API endpoint to fetch all request records
app.get("/requestRecords", async (req, res) => {
  try {
    const records = await RequestRecord.find({});
    res.status(200).json(records);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while fetching request records" });
  }
});

app.post("/requestRecord", async (req, res) => {
  try {
    const newRecord = new RequestRecord(req.body);
    await newRecord.save();
    res
      .status(201)
      .json({ message: "Request record saved successfully", data: newRecord });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while saving the request record" });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
