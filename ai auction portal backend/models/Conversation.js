const mongoose = require("mongoose");

const sourceCitationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    sourceType: { type: String, default: "general" },
    sourceId: { type: String, default: "" },
    snippet: { type: String, default: "" },
    score: { type: Number, default: 0 },
  },
  { _id: true }
);

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true },
    sources: [sourceCitationSchema],
    diagnostics: {
      retrievedCount: { type: Number, default: 0 },
      latencyMs: { type: Number, default: 0 },
      provider: { type: String, default: "" },
      model: { type: String, default: "" },
      liveDataUsed: { type: Boolean, default: false },
      roleApplied: { type: String, default: "" },
    },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      enum: ["buyer", "seller", "bank", "admin", "inspector"],
      default: "buyer",
    },
    title: {
      type: String,
      default: "AI Assistant Session",
    },
    messages: [messageSchema],
  },
  {
    collection: "conversations",
    timestamps: true,
  }
);

conversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
