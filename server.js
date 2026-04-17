require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const socketio = require("socket.io");

const app = express();
const server = http.createServer(app);

// ✅ Socket.IO with CORS
const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ✅ Debug ENV
console.log("ENV:", process.env.MONGO_URI);

// ✅ Check ENV
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing in .env file");
  process.exit(1);
}

// ✅ MongoDB Connection (IMPROVED)
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
  });

// ✅ Schema
const Document = mongoose.model(
  "Document",
  new mongoose.Schema({
    content: Object,
  })
);

// ✅ Socket Logic
io.on("connection", (socket) => {
  console.log("🔗 New client connected");

  socket.on("join-document", async (documentId) => {
    try {
      // ✅ fallback ID if invalid
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        documentId = "64b8f9c2f1a2b3c4d5e6f789"; // default valid ID
      }

      const document = await findOrCreateDocument(documentId);
      socket.join(documentId);

      socket.emit("load-document", document.content);

      socket.on("send-changes", (delta) => {
        socket.broadcast.to(documentId).emit("receive-changes", delta);
      });

      socket.on("save-document", async (data) => {
        try {
          await Document.findByIdAndUpdate(documentId, {
            content: data,
          });
        } catch (err) {
          console.error("❌ Save Error:", err.message);
        }
      });
    } catch (err) {
      console.error("❌ Join Error:", err.message);
    }
  });
});

// ✅ Helper
async function findOrCreateDocument(id) {
  let document = await Document.findById(id);
  if (document) return document;

  return await Document.create({
    _id: id,
    content: "",
  });
}

// ✅ Root route
app.get("/", (req, res) => {
  res.send("✅ Backend is running");
});

// ✅ Global Error Handling
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
});

// ✅ Start server
server.listen(4000, () => {
  console.log("🚀 Server running on http://localhost:4000");
});