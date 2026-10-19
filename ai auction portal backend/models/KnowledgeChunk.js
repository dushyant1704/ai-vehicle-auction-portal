const mongoose = require("mongoose");

const knowledgeChunkSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    sourceType: {
      type: String,
      required: true,
      enum: [
        "vehicle",
        "pricing_engine",
        "damage_inspection",
        "policy",
        "institution_policy",
        "admin_guide",
        "document",
        "faq",
        "general"
      ],
      index: true,
    },
    sourceId: { type: String, required: true, index: true },
    content: { type: String, required: true },
    chunkIndex: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    permittedRoles: {
      type: [String],
      enum: ["buyer", "seller", "bank", "admin", "inspector"],
      default: ["buyer", "seller", "bank", "admin"],
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    embedding: {
      type: [Number],
      default: [],
    },
    tokenCount: { type: Number, default: 0 },
  },
  {
    collection: "knowledgechunks",
    timestamps: true,
  }
);

knowledgeChunkSchema.index({ permittedRoles: 1, sourceType: 1 });
knowledgeChunkSchema.index({ sellerId: 1, permittedRoles: 1 });
knowledgeChunkSchema.index({ title: "text", content: "text" });

module.exports = mongoose.model("KnowledgeChunk", knowledgeChunkSchema);
