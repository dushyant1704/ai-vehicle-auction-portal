/**
 * ═══════════════════════════════════════════════════════════════════
 * DAMAGE ROUTES
 * 
 * API endpoints for damage detection and image quality validation
 * ═══════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const damageController = require('../controllers/damageController');

// Health check
router.get('/health', damageController.healthCheck);

// Validate image quality
router.post('/validate-quality', damageController.validateImageQuality);

// Detect damage in images
router.post('/detect', damageController.detectDamage);

// Process batch (validate + detect)
router.post('/process-batch', damageController.processBatch);
router.post('/analyze', damageController.processBatch);

module.exports = router;
