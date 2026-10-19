/**
 * ═══════════════════════════════════════════════════════════════════
 * DAMAGE CONTROLLER
 * 
 * Handles damage detection requests and coordinates with damage service
 * Includes automatic vehicle condition assessment generation
 * ═══════════════════════════════════════════════════════════════════
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { generateVehicleConditionAssessment } = require('../utils/damageCalculator');
const UploadLog = require('../models/UploadLog');

const DAMAGE_SERVICE_URL = process.env.DAMAGE_SERVICE_URL || 'http://127.0.0.1:5002';
const DAMAGE_SERVICE_TIMEOUT = 60000; // 60 seconds for image processing

/**
 * Validate image quality
 * POST /api/damage/validate-quality
 */
// Helper function to call Flask service with 1 retry attempt
async function callFlaskService(endpoint, payload, timeoutMs = 60000) {
  const url = `${DAMAGE_SERVICE_URL}${endpoint}`;
  try {
    console.log(`[Express -> Flask] Calling ${url} (Attempt 1)...`);
    const res = await axios.post(url, payload, { timeout: timeoutMs });
    return res;
  } catch (err1) {
    console.warn(`[Express -> Flask] Attempt 1 to ${url} failed: ${err1.message}. Retrying in 1.5s...`);
    await new Promise(r => setTimeout(r, 1500));
    try {
      console.log(`[Express -> Flask] Calling ${url} (Attempt 2 Retry)...`);
      const res = await axios.post(url, payload, { timeout: timeoutMs });
      console.log(`[Express -> Flask] Retry attempt 2 to ${url} SUCCEEDED!`);
      return res;
    } catch (err2) {
      console.error(`[Express -> Flask] Retry attempt 2 to ${url} FAILED: ${err2.message}`);
      throw err2;
    }
  }
}

/**
 * Validate image quality
 * POST /api/damage/validate-quality
 */
exports.validateImageQuality = async (req, res) => {
  console.log('\n========================================');
  console.log('[DEBUG] validateImageQuality - START');
  console.log('[DEBUG] Request received at:', new Date().toISOString());
  console.log('========================================\n');
  
  try {
    const { images, userId, vehicleId } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        error: 'No images provided',
        message: 'Please provide images array with base64 data'
      });
    }

    if (images.length < 5) {
      return res.status(400).json({
        error: 'Insufficient images',
        message: `Please upload at least 5 vehicle images. You provided ${images.length}.`,
        required: 5,
        provided: images.length
      });
    }

    const response = await callFlaskService('/validate-quality', { images }, DAMAGE_SERVICE_TIMEOUT);

    console.log('[Damage] Quality validation complete:', response.data.images_valid, 'Status:', response.data.status);

    // ── Log upload audit entry to MongoDB ───────────────────────
    try {
      if (response.data.quality_checks && Array.isArray(response.data.quality_checks)) {
        const logEntries = response.data.quality_checks.map((qc) => ({
          userId: userId || req.user?.id || null,
          vehicleId: vehicleId || null,
          filename: qc.filename,
          qualityScore: qc.overall_score || 0,
          sharpnessScore: qc.sharpness_score || 0,
          lightingScore: qc.lighting_score || 0,
          resolutionScore: qc.resolution_score || 0,
          reflectionLevel: qc.reflection_level || 'None',
          blurScore: qc.blur_check?.blur_score || 0,
          brightnessScore: qc.brightness_check?.brightness_level || 0,
          resolution: qc.resolution_check?.resolution || 'Unknown',
          aiConfidence: qc.confidence_multiplier ? Math.round(qc.confidence_multiplier * 100) : 90,
          processingTimeMs: response.data.processing_time_ms || 0,
          status: qc.status || (qc.overall_status === 'pass' ? 'Accepted' : 'Rejected'),
          warnings: qc.warnings || [],
          reason: qc.reason || '',
          exifValidation: qc.exif_validation || {}
        }));
        await UploadLog.insertMany(logEntries).catch(err => console.error('[UploadLog] Insert warning:', err.message));
      }
    } catch (logErr) {
      console.error('[UploadLog] Failed to log upload entry:', logErr.message);
    }

    res.json({
      success: true,
      ...response.data
    });
    
    console.log('[DEBUG] validateImageQuality - SUCCESS END\n');

  } catch (error) {
    console.error('[ERROR] validateImageQuality error:', error.message);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(530).json({
        error: 'Unable to contact AI Detection Service',
        message: `Failed to connect to Flask YOLO service at ${DAMAGE_SERVICE_URL}: ${error.message}`,
        details: error.message,
        retryable: true
      });
    }

    res.status(500).json({
      error: 'Quality validation failed',
      message: error.response?.data?.error || error.message,
      details: error.response?.data || {},
      retryable: true
    });
  }
};

/**
 * Detect damage in images
 * POST /api/damage/detect
 */
exports.detectDamage = async (req, res) => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        error: 'No images provided',
        message: 'Please provide images array with base64 data'
      });
    }

    console.log(`[Damage] Running detection on ${images.length} images...`);

    const response = await callFlaskService('/detect-damage', { images }, DAMAGE_SERVICE_TIMEOUT);
    const { detection } = response.data;

    console.log('[Damage] Detection complete:', {
      damages: detection?.damage_summary?.total_damages || 0,
      severity: detection?.damage_summary?.severity_level || 'pristine'
    });

    res.json({
      success: true,
      detection
    });

  } catch (error) {
    console.error('[Damage] Detection error:', error.message);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(530).json({
        error: 'Unable to contact AI Detection Service',
        message: `Failed to connect to Flask YOLO service at ${DAMAGE_SERVICE_URL}: ${error.message}`,
        retryable: true
      });
    }

    res.status(500).json({
      error: 'Damage detection failed',
      message: error.response?.data?.error || error.message,
      retryable: true
    });
  }
};

/**
 * Process batch (validate + detect + assess condition)
 * POST /api/damage/process-batch
 * POST /api/damage/analyze
 */
exports.processBatch = async (req, res) => {
  try {
    const { images, marketPrice } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        error: 'No images provided',
        message: 'Please provide images array with base64 data'
      });
    }

    if (images.length < 5) {
      return res.status(400).json({
        error: 'Insufficient images',
        message: `Please upload at least 5 vehicle images. You provided ${images.length}.`,
        required: 5,
        provided: images.length
      });
    }

    console.log(`[Damage] Processing batch of ${images.length} images...`);

    const response = await callFlaskService('/process-batch', { images }, DAMAGE_SERVICE_TIMEOUT);

    const { validation = {}, detection = {} } = response.data;

    console.log('[Damage] Batch processing complete:', {
      images_valid: validation.images_valid,
      damages_detected: detection?.damage_summary?.total_damages || 0,
      severity: detection?.damage_summary?.severity_level || 'pristine'
    });

    const damages = detection.damages_detected || [];
    const price = marketPrice || 0;
    
    const conditionAssessment = generateVehicleConditionAssessment(
      damages,
      detection,
      price
    );

    // ── Log upload audit entry to MongoDB ───────────────────────
    try {
      if (validation && validation.quality_checks && Array.isArray(validation.quality_checks)) {
        const logEntries = validation.quality_checks.map((qc) => ({
          userId: req.body.userId || req.user?.id || null,
          vehicleId: req.body.vehicleId || null,
          filename: qc.filename,
          qualityScore: qc.overall_score || 0,
          sharpnessScore: qc.sharpness_score || 0,
          lightingScore: qc.lighting_score || 0,
          resolutionScore: qc.resolution_score || 0,
          reflectionLevel: qc.reflection_level || 'None',
          blurScore: qc.blur_check?.blur_score || 0,
          brightnessScore: qc.brightness_check?.brightness_level || 0,
          resolution: qc.resolution_check?.resolution || 'Unknown',
          aiConfidence: detection.quality_adjusted_confidence || Math.round((qc.confidence_multiplier || 0.95) * 100),
          processingTimeMs: validation.processing_time_ms || 0,
          detectedDamagesCount: detection.damage_summary?.total_damages || 0,
          conditionScore: conditionAssessment.conditionScore || 80,
          primaryImageFilename: detection.primary_image_filename || 'image_0.jpg',
          combinedReport: detection.combined_ai_report?.summary_text || '',
          status: qc.status || (qc.overall_status === 'pass' ? 'Accepted' : 'Rejected'),
          warnings: qc.warnings || [],
          reason: qc.reason || ''
        }));
        await UploadLog.insertMany(logEntries).catch(err => console.error('[UploadLog] Batch insert warning:', err.message));
      }
    } catch (logErr) {
      console.error('[UploadLog] Failed to log batch upload entry:', logErr.message);
    }

    const unifiedInspection = {
      inspectionId: `INSP_${Date.now()}`,
      vehicle: {
        totalImages: images.length,
        marketPrice: price
      },
      imageQuality: {
        totalImages: images.length,
        overallScore: validation.avg_quality_score || 85,
        overallStatus: validation.status || 'Accepted',
        checks: validation.quality_checks || [],
        warnings: validation.warnings || []
      },
      damageDetection: {
        detectedCount: detection.damage_summary?.total_damages || 0,
        severityLevel: detection.damage_summary?.severity_level || 'pristine',
        confidence: detection.quality_adjusted_confidence || 95.0,
        categories: detection.damage_summary?.categories || [],
        damagesDetected: detection.damages_detected || [],
        annotatedImages: detection.annotated_images || []
      },
      conditionAssessment,
      repairEstimate: conditionAssessment.repairEstimate || { estimated_repair_cost: 0 },
      valuation: {
        predictedPrice: price > 0 ? Math.round(price * (1 - (conditionAssessment.damageSummary?.penalty_percent || 0)/100)) : 0,
        startingBid: Math.round((price || 0) * 0.7),
        reservePrice: Math.round((price || 0) * 0.9),
        sellingRange: {
          min: Math.round((price || 0) * 0.85),
          max: Math.round((price || 0) * 1.15)
        }
      },
      recommendations: conditionAssessment.recommendedRepairs || [],
      summary: detection.combined_ai_report?.summary_text || `AI Inspection complete. Found ${detection.damage_summary?.total_damages || 0} damage findings.`,
      metadata: {
        processingTimeMs: validation.processing_time_ms || 1200,
        timestamp: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      imageQuality: unifiedInspection.imageQuality,
      damageDetection: unifiedInspection.damageDetection,
      conditionAssessment: conditionAssessment,
      repairEstimate: conditionAssessment.repairEstimate || { estimated_repair_cost: 0 },
      valuation: unifiedInspection.valuation,
      summary: unifiedInspection.summary,
      recommendation: conditionAssessment.recommendedRepairs?.[0]?.action || "Vehicle verified for auction.",
      metadata: unifiedInspection.metadata,
      inspection: unifiedInspection,
      validation,
      detection
    });

  } catch (error) {
    console.error('[Damage] Batch processing error:', error.message);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(530).json({
        error: 'Unable to contact AI Detection Service',
        message: `Failed to connect to Flask YOLO service at ${DAMAGE_SERVICE_URL}: ${error.message}`,
        details: error.message,
        retryable: true
      });
    }

    res.status(500).json({
      error: 'Batch processing failed',
      message: error.response?.data?.error || error.message,
      details: error.response?.data || {},
      retryable: true
    });
  }
};

/**
 * Health check for damage service
 * GET /api/damage/health
 */
exports.healthCheck = async (req, res) => {
  try {
    const response = await axios.get(`${DAMAGE_SERVICE_URL}/`, {
      timeout: 5000
    });

    res.json({
      service: 'damage-detection',
      status: 'online',
      ...response.data
    });

  } catch (error) {
    res.status(503).json({
      service: 'damage-detection',
      status: 'offline',
      error: error.message
    });
  }
};
