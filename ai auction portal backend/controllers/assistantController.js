/**
 * ═══════════════════════════════════════════════════════════════════
 * ASSISTANT CONTROLLER
 * 
 * Handles authenticated endpoints for RAG chat, conversation history,
 * administrative ingestion, and role capability metadata.
 * ═══════════════════════════════════════════════════════════════════
 */

const Conversation = require("../models/Conversation");
const KnowledgeChunk = require("../models/KnowledgeChunk");
const { processRAGQuery } = require("../services/rag/ragOrchestrator");
const { runFullIngestion } = require("../services/rag/ingestionService");

/**
 * POST /api/assistant/chat
 * Primary authenticated RAG chat endpoint
 */
exports.chat = async (req, res) => {
  try {
    const { message, conversationId, simulatedRole } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "A message string is required." });
    }

    // Verify authenticated user from token
    const user = req.user;
    if (!user || (!user.id && !user._id)) {
      return res.status(401).json({ error: "Unauthorized. Valid authentication token required." });
    }

    // Allow role persona testing while keeping verified identity
    const validRoles = ["buyer", "seller", "bank", "admin"];
    const effectiveRole = (simulatedRole && validRoles.includes(simulatedRole.toLowerCase()))
      ? simulatedRole.toLowerCase()
      : (user.role || "buyer").toLowerCase();

    const result = await processRAGQuery({
      user: {
        id: user.id || user._id,
        role: effectiveRole,
        name: user.name || "Valued User",
        email: user.email || "",
      },
      message: message.trim(),
      conversationId: conversationId || null,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("❌ [AssistantController] Chat error:", err);

    if (err.statusCode === 503 || err.code === "LLM_NOT_CONFIGURED") {
      return res.status(503).json({
        error: "AI Provider Not Configured",
        message: err.message,
        setupInstructions: "Add GROQ_API_KEY=gsk_... to your backend .env file.",
      });
    }

    return res.status(500).json({
      error: "Assistant encountered an error",
      details: err.message,
    });
  }
};

/**
 * GET /api/assistant/conversations
 * Fetch user's past conversation sessions
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const conversations = await Conversation.find({ userId })
      .select("title userRole createdAt updatedAt messages")
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean();

    const formatted = conversations.map((c) => ({
      _id: c._id,
      title: c.title,
      userRole: c.userRole,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c.messages?.length || 0,
      preview: c.messages?.[c.messages.length - 1]?.content?.slice(0, 80) || "",
    }));

    return res.json({ success: true, conversations: formatted });
  } catch (err) {
    console.error("❌ [AssistantController] Get conversations error:", err);
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

/**
 * GET /api/assistant/conversations/:id
 * Retrieve a specific conversation with complete message thread
 */
exports.getConversationById = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    const conversation = await Conversation.findOne({ _id: id, userId });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found or access denied." });
    }

    return res.json({ success: true, conversation });
  } catch (err) {
    console.error("❌ [AssistantController] Get conversation error:", err);
    return res.status(500).json({ error: "Failed to fetch conversation" });
  }
};

/**
 * DELETE /api/assistant/conversations/:id
 * Delete a user's conversation session
 */
exports.deleteConversation = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    const result = await Conversation.findOneAndDelete({ _id: id, userId });
    if (!result) {
      return res.status(404).json({ error: "Conversation not found or access denied." });
    }

    return res.json({ success: true, message: "Conversation deleted successfully." });
  } catch (err) {
    console.error("❌ [AssistantController] Delete conversation error:", err);
    return res.status(500).json({ error: "Failed to delete conversation" });
  }
};

/**
 * POST /api/assistant/ingest
 * Administrative knowledge base re-indexing
 */
exports.triggerIngestion = async (req, res) => {
  try {
    const userRole = (req.user?.role || "buyer").toLowerCase();
    if (userRole !== "admin") {
      return res.status(403).json({
        error: "Forbidden. Administrative privileges required to re-index knowledge sources.",
      });
    }

    const summary = await runFullIngestion();
    return res.json({
      message: "Knowledge base re-indexed successfully.",
      ...summary,
    });
  } catch (err) {
    console.error("❌ [AssistantController] Ingestion error:", err);
    return res.status(500).json({ error: "Ingestion failed", details: err.message });
  }
};

/**
 * GET /api/assistant/capabilities
 * Returns role capabilities and assistant metadata
 */
exports.getCapabilities = async (req, res) => {
  try {
    const role = (req.user?.role || "buyer").toLowerCase();
    const totalChunks = await KnowledgeChunk.countDocuments();

    const roleMap = {
      buyer: {
        roleName: "General Bidder Assistant",
        mappedRole: "buyer",
        description: "Assists with live auctions, bidding rules, damage inspections, AI valuations, and your personal bid history.",
        sampleQuestions: [
          "Which available cars match my budget and preferences?",
          "Summarize the detected damage on this vehicle.",
          "Why is this vehicle's predicted value different from its current bid?",
          "What are the rules for placing a bid?",
          "Show my bidding history.",
          "Compare these auction vehicles."
        ],
      },
      seller: {
        roleName: "Bank / Institutional Seller Assistant",
        mappedRole: "seller",
        description: "Assists with institutional vehicle listings, 4-tier hybrid valuations, YOLOv8 damage inspection reports, and auction performance.",
        sampleQuestions: [
          "Explain how the 80/20 hybrid pricing engine calculates vehicle values.",
          "Show my institution's listed vehicles and valuations.",
          "Summarize YOLOv8 damage detection results for my vehicles.",
          "Generate a condition summary and draft listing for our inventory.",
          "Review auction performance for our vehicles."
        ],
      },
      bank: {
        roleName: "Bank / Institutional Seller Assistant",
        mappedRole: "bank",
        description: "Assists financial recovery and liquidation teams with appraisal reports, 4-tier valuations, and asset compliance.",
        sampleQuestions: [
          "Explain how the 80/20 hybrid pricing engine calculates vehicle values.",
          "Show my institution's listed vehicles and valuations.",
          "Summarize YOLOv8 damage detection results for my vehicles.",
          "Generate a condition summary and draft listing for our inventory.",
          "Review auction performance for our vehicles."
        ],
      },
      admin: {
        roleName: "Platform Administrator Assistant",
        mappedRole: "admin",
        description: "Assists system administrators with platform-wide auction metrics, pending verification queues, and bidding concentration surveillance.",
        sampleQuestions: [
          "Summarize the currently active auctions.",
          "Which auctions have unusually concentrated bidding activity?",
          "Show listings awaiting verification or approval.",
          "Summarize damage detection results for recently listed vehicles.",
          "Prepare a platform operational report."
        ],
      },
    };

    const currentCap = roleMap[role] || roleMap.buyer;

    return res.json({
      success: true,
      userRole: role,
      roleName: currentCap.roleName,
      description: currentCap.description,
      sampleQuestions: currentCap.sampleQuestions,
      llmProvider: process.env.GROQ_API_KEY ? "Groq (High-Speed Inference)" : "Unconfigured",
      llmModel: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      embeddingDimensions: 384,
      totalIndexedChunks: totalChunks,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch capabilities" });
  }
};
