const express = require("express");
const router = express.Router();
const assistantController = require("../controllers/assistantController");
const { verifyToken } = require("../middleware/auth");

// Primary Authenticated Chat Endpoint
router.post("/chat", verifyToken, assistantController.chat);

// Conversation History Management
router.get("/conversations", verifyToken, assistantController.getConversations);
router.get("/conversations/:id", verifyToken, assistantController.getConversationById);
router.delete("/conversations/:id", verifyToken, assistantController.deleteConversation);

// Administrative Knowledge Ingestion
router.post("/ingest", verifyToken, assistantController.triggerIngestion);

// Assistant Capabilities & Role Guidance
router.get("/capabilities", verifyToken, assistantController.getCapabilities);

module.exports = router;
