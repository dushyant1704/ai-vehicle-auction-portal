/**
 * Enhanced Image Upload Section Component
 *
 * Features:
 * - METHOD 1: Quick Upload (select all 5+ images at once)
 * - METHOD 2: Guided Upload (upload each view separately)
 * - Image quality validation
 * - Damage detection with YOLO
 * - Annotated image display
 * - Progress tracking (0/5 to 5/5)
 */

import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Upload,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Eye,
  X,
  AlertCircle,
  Replace,
  Camera,
  Zap,
  Grid3x3,
  Sparkles,
} from "lucide-react";

interface ImageData {
  file: File;
  preview: string;
  uploaded: boolean;
  slot?: 'front' | 'rear' | 'left' | 'right' | 'damage' | 'quick';
  quality_check?: {
    status?: 'Accepted' | 'Warning' | 'Rejected' | 'pass' | 'fail' | string;
    overall_status?: string;
    overall_score?: number;
    sharpness_score?: number;
    lighting_score?: number;
    resolution_score?: number;
    reflection_level?: string;
    vehicle_detected?: boolean;
    warnings?: string[];
    reason?: string;
    confidence_multiplier?: number;
    blur_check?: any;
    resolution_check?: any;
    brightness_check?: any;
    is_valid?: boolean;
  };
  error?: string;
}

interface DamageDetectionResult {
  success: boolean;
  damages_detected: Array<{
    type: string;
    confidence: number;
    severity: string;
  }>;
  damage_summary: {
    total_damages: number;
    severity_level: string;
    categories: string[];
  };
  annotated_images: Array<{
    image_index: number;
    annotated_data: string;
  }>;
}

interface ConditionAssessment {
  scores: {
    exterior_condition: number;
    damage_severity: number;
    final_condition: number;
  };
  conditionCategory: {
    label: string;
    score: number;
    color: string;
    key: string;
  };
  damageSeverityCategory: {
    label: string;
    score: number;
    impact: string;
    key: string;
  };
  damageSummary: {
    total_damages: number;
    damage_types: Record<string, number>;
    categories: string[];
    severity_level: string;
    penalty_percent: number;
  };
  conditionScore: number;
  conditionCategoryLabel?: string;
  damageSeverity: number;
  repairEstimate?: {
    estimated_repair_cost: number;
    repair_cost_range: { min: number; max: number };
    repair_to_value_ratio: number;
    economic_to_repair: boolean;
  };
  valueImpact?: {
    original_value: number;
    adjusted_value: number;
    value_reduction: number;
    reduction_percent: number;
    penalty_applied: number;
  };
  recommendedRepairs: Array<{
    type: string;
    priority: string;
    message: string;
    action: string;
  }>;
  assessed_at: string;
}

interface ImageUploadSectionProps {
  onDamageDetected?: (data: DamageDetectionResult) => void;
  onImagesSelected?: (images: ImageData[]) => void;
  onConditionAssessed?: (assessment: ConditionAssessment) => void;
  marketPrice?: number;
}

type UploadMode = 'quick' | 'guided';
type ImageSlot = 'front' | 'rear' | 'left' | 'right' | 'damage';

const SLOT_INFO: Record<ImageSlot, { label: string; icon: string }> = {
  front: { label: 'Front View', icon: '🚗' },
  rear: { label: 'Rear View', icon: '🚙' },
  left: { label: 'Left Side', icon: '⬅️' },
  right: { label: 'Right Side', icon: '➡️' },
  damage: { label: 'Additional Damage', icon: '⚠️' },
};

export default function ImageUploadSection({
  onDamageDetected,
  onImagesSelected,
  onConditionAssessed,
  marketPrice = 0,
}: ImageUploadSectionProps) {
  const [uploadMode, setUploadMode] = useState<UploadMode>('quick');
  const [images, setImages] = useState<ImageData[]>([]);
  const [guidedSlots, setGuidedSlots] = useState<Partial<Record<ImageSlot, ImageData>>>({});
  const [validating, setValidating] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [damageResults, setDamageResults] =
    useState<DamageDetectionResult | null>(null);
  const [conditionAssessment, setConditionAssessment] = 
    useState<ConditionAssessment | null>(null);
  const [showAnnotated, setShowAnnotated] = useState<number | null>(null);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  // Get current image count
  const getImageCount = () => {
    if (uploadMode === 'quick') {
      return images.length;
    } else {
      return Object.keys(guidedSlots).length;
    }
  };

  // Get all images as array
  const getAllImages = (): ImageData[] => {
    if (uploadMode === 'quick') {
      return images;
    } else {
      return Object.values(guidedSlots);
    }
  };

  // Helper for overall quality status badge
  const getOverallQualityBadge = () => {
    const imagesList = getAllImages();
    if (imagesList.length === 0) return null;

    const allAccepted = imagesList.every((img) => {
      const qc = img.quality_check;
      if (!qc) return false;
      return (
        qc.status === 'Accepted' ||
        qc.status === 'pass' ||
        qc.overall_status === 'pass' ||
        qc.is_valid === true
      );
    });

    if (allAccepted) {
      return (
        <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-bold flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5" /> High Quality (Accepted)
        </span>
      );
    }

    const hasWarning = imagesList.some((img) => {
      const qc = img.quality_check;
      if (!qc) return false;
      return (
        qc.status === 'Warning' ||
        qc.overall_status === 'warn' ||
        (Array.isArray(qc.warnings) && qc.warnings.length > 0)
      );
    });

    if (hasWarning) {
      return (
        <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> Medium Quality (Warning - Accepted)
        </span>
      );
    }

    return (
      <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-bold flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5" /> Action Required (Rejected)
      </span>
    );
  };

  // Helper for annotated image src resolution
  const getAnnotatedImageSrc = (ann: any): string => {
    if (!ann) return "";
    const rawData = typeof ann === "string" ? ann : (ann?.annotated_data || ann?.data || ann?.image || "");
    if (!rawData) return "";
    return rawData.startsWith("data:image") || rawData.startsWith("http")
      ? rawData
      : `data:image/jpeg;base64,${rawData}`;
  };

  // Helper for dynamic quality metrics computation (no hardcoded defaults)
  const getDynamicQualityMetrics = (qc: any) => {
    if (!qc) {
      return {
        score: 0,
        sharpness: 0,
        lighting: 0,
        resolution: 0,
        reflection: "None",
        statusLabel: "Pending",
        reason: "Image analysis pending",
      };
    }

    const sharpness = typeof qc.sharpness_score === "number" ? qc.sharpness_score : (typeof qc.sharpness === "number" ? qc.sharpness : (typeof qc.blur_check?.sharpness_score === "number" ? qc.blur_check.sharpness_score : 0));
    const lighting = typeof qc.lighting_score === "number" ? qc.lighting_score : (typeof qc.brightness_score === "number" ? qc.brightness_score : (typeof qc.brightness === "number" ? qc.brightness : 0));
    const resolution = typeof qc.resolution_score === "number" && qc.resolution_score > 0
      ? qc.resolution_score
      : (typeof qc.resolution === "number" ? qc.resolution : 100);
    const reflection = qc.reflection_level || (typeof qc.reflection === "string" ? qc.reflection : (qc.reflection_check?.reflection_level || "None"));

    const refPenalty = reflection === "High" ? 25 : reflection === "Medium" ? 15 : reflection === "Low" ? 5 : 0;

    // Formula: 40% Sharpness + 25% Brightness/Lighting + 20% Resolution - Reflection Penalty
    const computedScore = typeof qc.overall_score === "number" && qc.overall_score > 0
      ? qc.overall_score
      : Math.max(0, Math.min(100, Math.round(sharpness * 0.4 + lighting * 0.25 + resolution * 0.20 - refPenalty)));

    let statusLabel = qc.status || (qc.overall_status === "pass" ? "Accepted" : "Warning");
    if (qc.warnings && Array.isArray(qc.warnings)) {
      if (qc.warnings.some((w: string) => w.toLowerCase().includes("blur"))) {
        statusLabel = "Blur Warning";
      } else if (qc.warnings.some((w: string) => w.toLowerCase().includes("dark") || w.toLowerCase().includes("light") || w.toLowerCase().includes("brightness"))) {
        statusLabel = "Low Lighting";
      } else if (qc.warnings.some((w: string) => w.toLowerCase().includes("reflect") || w.toLowerCase().includes("glare"))) {
        statusLabel = "High Reflection";
      }
    }

    const reason = qc.reason || (qc.warnings && qc.warnings[0]) || (qc.status === "Rejected" ? "Quality criteria not met" : "Image analyzed successfully.");

    return {
      score: computedScore,
      sharpness,
      lighting,
      resolution,
      reflection,
      statusLabel,
      reason,
    };
  };

  // ── METHOD 1: Quick Upload - Handle Multiple Files ──
  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    if (files.length < 5) {
      toast.error(
        `Please select at least 5 images. You selected ${files.length}.`,
      );
      return;
    }

    if (files.length > 10) {
      toast(
        <div>
          <p>
            You selected {files.length} images. Only the first 10 will be used.
          </p>
        </div>
      );
    }

    // Convert to ImageData
    const newImages: ImageData[] = files.slice(0, 10).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploaded: false,
      slot: 'quick',
    }));

    setImages(newImages);
    onImagesSelected?.(newImages);
    toast.success(`${newImages.length} images loaded successfully!`);

    // Step 9: Automatically trigger OpenCV Quality -> YOLO Detection -> Condition -> Repair Cost -> XGBoost
    setTimeout(() => {
      handleValidateQuality();
    }, 400);
  };

  // ── METHOD 2: Guided Upload - Handle Single Slot ──
  const handleGuidedUpload = (slot: ImageSlot, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageData: ImageData = {
      file,
      preview: URL.createObjectURL(file),
      uploaded: false,
      slot,
    };

    const updatedGuidedSlots = { ...guidedSlots, [slot]: imageData };
    setGuidedSlots(updatedGuidedSlots);

    toast.success(`${SLOT_INFO[slot].label} uploaded!`);
    
    // Update parent component
    const allImagesArr = Object.values(updatedGuidedSlots);
    onImagesSelected?.(allImagesArr);

    // Step 9: Automatically trigger pipeline when at least 5 images loaded
    if (allImagesArr.length >= 5) {
      setTimeout(() => {
        handleValidateQuality();
      }, 400);
    }
  };

  // ── Remove Image (Quick Mode) ──
  const removeQuickImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Remove Image (Guided Mode) ──
  const removeGuidedImage = (slot: ImageSlot) => {
    setGuidedSlots(prev => {
      const updated = { ...prev };
      delete updated[slot];
      return updated;
    });
  };

  // ── Replace Image (Guided Mode) ──
  const replaceGuidedImage = (slot: ImageSlot) => {
    // Trigger file input for this slot
    const input = document.getElementById(`guided-${slot}`) as HTMLInputElement;
    if (input) input.click();
  };

  // ── Switch Upload Mode ──
  const switchMode = (mode: UploadMode) => {
    if (getImageCount() > 0) {
      const confirm = window.confirm(
        'Switching modes will clear current images. Continue?'
      );
      if (!confirm) return;
    }
    
    setUploadMode(mode);
    setImages([]);
    setGuidedSlots({});
    setDamageResults(null);
  };

  // ── Validate Quality ──
  const handleValidateQuality = async () => {
    const currentImages = getAllImages();
    
    if (currentImages.length < 5) {
      toast.error("Please upload at least 5 images first");
      return;
    }

    setValidating(true);
    const tid = toast.loading("Validating image quality...");

    try {
      // Convert images to base64
      const imagePayload = await Promise.all(
        currentImages.map(
          (img) =>
            new Promise<{ data: string; filename: string }>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result as string;
                resolve({
                  data: base64,
                  filename: img.file.name,
                });
              };
              reader.readAsDataURL(img.file);
            }),
        ),
      );

      const response = await axios.post(
        "http://localhost:5000/api/damage/validate-quality",
        { images: imagePayload },
        { timeout: 30000 },
      );

      if (!response.data.success) {
        toast.error("Image validation failed", { id: tid });
        return;
      }

      // Update image quality checks based on mode
      if (uploadMode === 'quick') {
        const updatedImages = images.map((img, idx) => {
          const qc = response.data.quality_checks?.[idx];
          const isUsable = qc?.status !== "Rejected" && qc?.overall_status !== "fail";
          return {
            ...img,
            quality_check: qc,
            uploaded: isUsable,
            error: qc?.status === "Rejected" ? (qc.warnings?.[0] || "Unusable image quality") : undefined,
          };
        });
        setImages(updatedImages);
      } else {
        // Update guided slots
        const slots = Object.keys(guidedSlots) as ImageSlot[];
        const updatedSlots: Partial<Record<ImageSlot, ImageData>> = {};
        
        slots.forEach((slot, idx) => {
          const img = guidedSlots[slot];
          if (img) {
            const qc = response.data.quality_checks?.[idx];
            const isUsable = qc?.status !== "Rejected" && qc?.overall_status !== "fail";
            updatedSlots[slot] = {
              ...img,
              quality_check: qc,
              uploaded: isUsable,
              error: qc?.status === "Rejected" ? (qc.warnings?.[0] || "Unusable image quality") : undefined,
            };
          }
        });
        
        setGuidedSlots(updatedSlots);
      }

      const status = response.data.status || response.data.overallStatus || (response.data.images_valid ? "Accepted" : "Warning");

      if (status === "Accepted" || status === "Warning" || response.data.continueToYOLO) {
        if (status === "Accepted") {
          toast.success("All images passed quality checks! Continuing to YOLO damage detection...", { id: tid });
        } else {
          toast("Images accepted with quality warnings. Continuing to YOLO damage detection...", {
            id: tid,
            icon: "⚠️",
            duration: 4000
          });
        }
        // Auto-continue to YOLO Damage Detection (Task 9)
        setTimeout(() => {
          handleDetectDamage();
        }, 600);
      } else {
        toast.error("One or more images are unusable. Please replace marked images.", { id: tid });
      }
    } catch (error: any) {
      console.error("[IMAGE UPLOAD] Validation error:", error);
      toast.error(error.response?.data?.error || "Validation failed", {
        id: tid,
      });
    } finally {
      setValidating(false);
    }
  };

  // ── Run Damage Detection ──
  const handleDetectDamage = async () => {
    const currentImages = getAllImages();
    
    if (currentImages.length < 5) {
      toast.error("Please upload at least 5 images first");
      return;
    }

    setDetecting(true);
    console.log("Starting YOLO request", { count: currentImages.length });
    const tid = toast.loading(
      "Running YOLO damage detection... this may take 30-60 seconds",
    );

    try {
      // Convert images to base64
      const imagePayload = await Promise.all(
        currentImages.map(
          (img) =>
            new Promise<{ data: string; filename: string }>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result as string;
                resolve({
                  data: base64,
                  filename: img.file.name,
                });
              };
              reader.readAsDataURL(img.file);
            }),
        ),
      );

      console.log("Sending YOLO request to backend");
      const response = await axios.post(
        "http://localhost:5000/api/damage/process-batch",
        { 
          images: imagePayload,
          marketPrice: marketPrice  // Send market price for value impact calculation
        },
        { timeout: 120000 }, // 2 minute timeout for YOLO
      );

      console.log("Response received", response.status, response.data);

      if (!response.data || !response.data.success) {
        console.error("YOLO returned unsuccessful response", response.data);
        toast.error("Damage detection failed", { id: tid });
        return;
      }

      console.log("Parsing response");
      const detectionData = response.data.detection || response.data;
      const conditionData = response.data.conditionAssessment;
      
      // Ensure damage_summary and quality validation structure is safe before setting state
      const safeDetectionData = {
        ...detectionData,
        validation: response.data.validation || detectionData.validation || {},
        quality_checks: response.data.validation?.quality_checks || detectionData.quality_checks || [],
        avg_quality_score: response.data.validation?.avg_quality_score ?? detectionData.avg_quality_score ?? 85,
        damage_summary: {
          total_damages: detectionData?.damage_summary?.total_damages ?? detectionData?.damages_detected?.length ?? 0,
          severity_level: detectionData?.damage_summary?.severity_level ?? "minor",
          categories: Array.isArray(detectionData?.damage_summary?.categories) ? detectionData.damage_summary.categories : [],
        },
        damages_detected: Array.isArray(detectionData?.damages_detected) ? detectionData.damages_detected : [],
        annotated_images: Array.isArray(detectionData?.annotated_images) ? detectionData.annotated_images : [],
      };

      console.log("Updating state", safeDetectionData);
      setDamageResults(safeDetectionData);
      onDamageDetected?.(safeDetectionData);

      // Set condition assessment if available
      if (conditionData) {
        setConditionAssessment(conditionData);
        onConditionAssessed?.(conditionData);
      }

      setDetectionError(null);
      toast.success(
        `Analysis complete: ${safeDetectionData.damage_summary?.total_damages || 0} damages detected`,
        { id: tid },
      );
    } catch (error: any) {
      console.error("[IMAGE UPLOAD] Detection error:", error);
      const errMsg = error.response?.data?.message || error.response?.data?.error || error.message || "Unable to contact AI Detection Service";
      setDetectionError(errMsg);
      toast.error(errMsg, { id: tid });
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── AI Service Error Alert with Retry ── */}
      {detectionError && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-6 space-y-3 text-center">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h4 className="text-lg font-bold text-white">Unable to contact AI Detection Service</h4>
          <p className="text-xs text-amber-200/90 max-w-md mx-auto">{detectionError}</p>
          <button
            onClick={() => {
              setDetectionError(null);
              handleDetectDamage();
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 mx-auto active:scale-95"
          >
            <Zap className="w-4 h-4" /> Retry AI Detection
          </button>
        </div>
      )}

      {/* ── Header with Mode Toggle ── */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Vehicle Images</h3>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full">
              {getImageCount()}/5 Uploaded
            </span>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => switchMode('quick')}
              disabled={validating || detecting}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                uploadMode === 'quick'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Zap className="w-4 h-4" />
              Quick Upload
            </button>
            <button
              onClick={() => switchMode('guided')}
              disabled={validating || detecting}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                uploadMode === 'guided'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Camera className="w-4 h-4" />
              Guided Upload
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Upload Progress</span>
            <span className={getImageCount() >= 5 ? 'text-green-400 font-bold' : ''}>
              {getImageCount()}/5 Required
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                getImageCount() >= 5 ? 'bg-green-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min((getImageCount() / 5) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Warning if less than 5 */}
        {getImageCount() < 5 && (
          <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 p-3 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
            <span>Please upload all {5 - getImageCount()} remaining images to continue</span>
          </div>
        )}

        {/* Success message */}
        {getImageCount() >= 5 && !validating && !detecting && (
          <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 p-3 rounded-lg">
            <CheckCircle className="w-4 h-4" />
            <span>All required images uploaded! Ready for validation.</span>
          </div>
        )}
      </div>

      {/* ── METHOD 1: Quick Upload ── */}
      {uploadMode === 'quick' && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            <h4 className="text-md font-bold text-white">Quick Upload</h4>
          </div>

          <p className="text-sm text-slate-400">
            Select multiple images at once (minimum 5 required: Front, Rear, Left Side, Right Side, Additional View)
          </p>

          {/* File Input */}
          <label className="relative inline-block w-full">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleQuickUpload}
              disabled={validating || detecting}
              className="sr-only"
            />
            <div className="w-full border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/5 transition-all disabled:opacity-50">
              <Upload className="w-10 h-10 mx-auto text-slate-500 mb-3" />
              <p className="text-sm font-medium text-slate-300">
                Click to select or drag multiple images
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Select 5-10 images (JPG, PNG) - All at once
              </p>
            </div>
          </label>

          {/* Image Previews */}
          {images.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-3">
                Uploaded Images ({images.length})
              </p>
              <div className="grid grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img.preview}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-slate-600"
                    />
                    
                    {/* Remove button */}
                    <button
                      onClick={() => removeQuickImage(idx)}
                      disabled={validating || detecting}
                      className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    
                    {/* Status indicators */}
                    {img.uploaded && (
                      <div className="absolute -bottom-2 -right-2 bg-green-600 rounded-full p-1">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {img.error && (
                      <div className="absolute -bottom-2 -right-2 bg-red-600 rounded-full p-1">
                        <AlertTriangle className="w-4 h-4 text-white" />
                      </div>
                    )}
                    
                    {/* Image number */}
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── METHOD 2: Guided Upload ── */}
      {uploadMode === 'guided' && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            <h4 className="text-md font-bold text-white">Guided Upload</h4>
          </div>

          <p className="text-sm text-slate-400">
            Upload images for each specific view separately
          </p>

          {/* Guided Slots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(['front', 'rear', 'left', 'right', 'damage'] as ImageSlot[]).map((slot) => {
              const slotData = guidedSlots[slot];
              const slotInfo = SLOT_INFO[slot];

              return (
                <div
                  key={slot}
                  className={`border-2 border-dashed rounded-xl p-4 transition-all ${
                    slotData
                      ? 'border-indigo-500 bg-indigo-500/5'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  {/* Slot Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{slotInfo.icon}</span>
                      <span className="text-sm font-bold text-white">
                        {slotInfo.label}
                      </span>
                    </div>
                    {slotData?.uploaded && (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                  </div>

                  {/* Preview or Upload Button */}
                  {slotData ? (
                    <div className="space-y-3">
                      {/* Image Preview */}
                      <img
                        src={slotData.preview}
                        alt={slotInfo.label}
                        className="w-full h-32 object-cover rounded-lg"
                      />

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => replaceGuidedImage(slot)}
                          disabled={validating || detecting}
                          className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1"
                        >
                          <Replace className="w-3 h-3" />
                          Replace
                        </button>
                        <button
                          onClick={() => removeGuidedImage(slot)}
                          disabled={validating || detecting}
                          className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Remove
                        </button>
                      </div>

                      {/* Quality Status */}
                      {slotData.error && (
                        <div className="text-xs text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {slotData.error}
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        id={`guided-${slot}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleGuidedUpload(slot, e)}
                        disabled={validating || detecting}
                        className="sr-only"
                      />
                      <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-indigo-500 hover:bg-indigo-500/5 transition-all">
                        <Upload className="w-6 h-6 mx-auto text-slate-500 mb-2" />
                        <p className="text-xs text-slate-400">Click to upload</p>
                      </div>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Grid3x3 className="w-5 h-5 text-indigo-400" />
          <h4 className="text-md font-bold text-white">Image Processing</h4>
        </div>

        {/* Quality Validation Button */}
        <button
          onClick={handleValidateQuality}
          disabled={getImageCount() < 5 || validating || detecting}
          className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
        >
          {validating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {validating ? "Validating Quality..." : "Step 1: Validate Image Quality"}
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="flex-1 h-px bg-slate-700" />
          <span>THEN</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {/* Damage Detection Button */}
        <button
          onClick={handleDetectDamage}
          disabled={
            getImageCount() < 5 ||
            !getAllImages().every((img) => img.uploaded) ||
            detecting
          }
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
        >
          {detecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          {detecting ? "Analyzing Damage... (30-60s)" : "Step 2: Run Damage Detection (YOLO)"}
        </button>

        {/* Instructions */}
        <div className="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-400 space-y-1">
          <p className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">1</span>
            First validate image quality (blur, brightness, resolution, reflections)
          </p>
          <p className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">2</span>
            Then run YOLO damage detection (finds dents, scratches, glass cracks, etc.)
          </p>
          <p className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">3</span>
            Review condition assessment and submit vehicle
          </p>
        </div>
      </div>

      {/* ── Quality Analysis Summary Dashboard Card ── */}
      {getAllImages().some(img => img.quality_check) && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h4 className="text-md font-bold text-white">AI Image Quality Breakdown</h4>
            </div>
            <div className="flex items-center gap-2">
              {getOverallQualityBadge()}
            </div>
          </div>

          {/* Individual Image Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getAllImages().map((img, idx) => {
              const qc = img.quality_check;
              if (!qc) return null;
              const metrics = getDynamicQualityMetrics(qc);
              return (
                <div key={idx} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <img src={img.preview} alt={`Img ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg border border-slate-600" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">Image #{idx + 1}</span>
                        <span className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                          metrics.statusLabel === 'Accepted' || metrics.statusLabel === 'pass' ? 'bg-green-500/20 text-green-400' :
                          metrics.statusLabel.includes('Warning') || metrics.statusLabel.includes('Lighting') || metrics.statusLabel.includes('Reflection') ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {metrics.statusLabel} ({metrics.score}%)
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{metrics.reason}</p>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs bg-slate-800/60 p-2 rounded-lg border border-slate-700/40">
                    <div>
                      <div className="text-slate-400 text-[10px]">Sharpness</div>
                      <div className="font-bold text-indigo-300">{metrics.sharpness}%</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Lighting</div>
                      <div className="font-bold text-indigo-300">{metrics.lighting}%</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Resolution</div>
                      <div className="font-bold text-indigo-300">{metrics.resolution}%</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Reflection</div>
                      <div className="font-bold text-indigo-300">{metrics.reflection}</div>
                    </div>
                  </div>

                  {/* Warnings if any */}
                  {qc.warnings && qc.warnings.length > 0 && (
                    <div className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        {qc.warnings.map((w, wIdx) => (
                          <div key={wIdx}>{w}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Vehicle Condition Assessment Card ── */}
      {conditionAssessment && (() => {
        const condCatLabel = conditionAssessment?.conditionCategory?.label || (typeof conditionAssessment?.conditionCategory === "string" ? conditionAssessment.conditionCategory : "No AI Data");
        const condCatColor = conditionAssessment?.conditionCategory?.color || "indigo";
        const damSevLabel = conditionAssessment?.damageSeverityCategory?.label || (typeof conditionAssessment?.damageSeverity === "string" ? conditionAssessment.damageSeverity : "No AI Data");
        const damSevImpact = conditionAssessment?.damageSeverityCategory?.impact || "low";
        const finalScoreVal = typeof conditionAssessment?.scores?.final_condition === "number" 
          ? conditionAssessment.scores.final_condition 
          : (typeof conditionAssessment?.conditionScore === "number" ? conditionAssessment.conditionScore : "N/A");
        const extCondScore = typeof conditionAssessment?.scores?.exterior_condition === "number" 
          ? conditionAssessment.scores.exterior_condition 
          : "N/A";
        const damSevScore = typeof conditionAssessment?.scores?.damage_severity === "number" 
          ? conditionAssessment.scores.damage_severity 
          : "N/A";
        const totalDmgCount = typeof conditionAssessment?.damageSummary?.total_damages === "number" 
          ? conditionAssessment.damageSummary.total_damages 
          : 0;
        const penaltyPct = typeof conditionAssessment?.damageSummary?.penalty_percent === "number" 
          ? conditionAssessment.damageSummary.penalty_percent 
          : 0;

        return (
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-indigo-500/40 rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/20 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Vehicle Condition Assessment</h3>
                  <p className="text-xs text-slate-400">AI-powered condition analysis</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${
                  condCatColor === 'green' ? 'text-green-400' :
                  condCatColor === 'blue' ? 'text-blue-400' :
                  condCatColor === 'cyan' ? 'text-cyan-400' :
                  condCatColor === 'yellow' ? 'text-yellow-400' :
                  condCatColor === 'orange' ? 'text-orange-400' :
                  'text-red-400'
                }`}>
                  {finalScoreVal}
                </div>
                <div className="text-xs text-slate-400">out of 100</div>
              </div>
            </div>

            {/* Overall Condition Banner */}
            <div className={`p-4 rounded-xl border-2 ${
              condCatColor === 'green' ? 'bg-green-500/10 border-green-500/30' :
              condCatColor === 'blue' ? 'bg-blue-500/10 border-blue-500/30' :
              condCatColor === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/30' :
              condCatColor === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/30' :
              condCatColor === 'orange' ? 'bg-orange-500/10 border-orange-500/30' :
              'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Overall Condition</p>
                  <p className={`text-2xl font-bold ${
                    condCatColor === 'green' ? 'text-green-400' :
                    condCatColor === 'blue' ? 'text-blue-400' :
                    condCatColor === 'cyan' ? 'text-cyan-400' :
                    condCatColor === 'yellow' ? 'text-yellow-400' :
                    condCatColor === 'orange' ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {condCatLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-1">Damage Severity</p>
                  <p className={`text-xl font-bold ${
                    damSevImpact === 'low' ? 'text-green-400' :
                    damSevImpact === 'medium' ? 'text-yellow-400' :
                    damSevImpact === 'high' ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {damSevLabel}
                  </p>
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                <p className="text-xs text-slate-400 mb-2">Exterior Condition</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-bold text-white">{extCondScore}</p>
                  <p className="text-sm text-slate-400 mb-1">/100</p>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${extCondScore}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                <p className="text-xs text-slate-400 mb-2">Damage Severity</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-bold text-amber-400">{damSevScore}</p>
                  <p className="text-sm text-slate-400 mb-1">/100</p>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${damSevScore}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                <p className="text-xs text-slate-400 mb-2">Total Damages</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-bold text-red-400">{totalDmgCount}</p>
                  <p className="text-sm text-slate-400 mb-1">found</p>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {typeof penaltyPct === "number" ? penaltyPct.toFixed(1) : "0.0"}% penalty
                </p>
              </div>
            </div>

            {/* Value Impact (if available) */}
            {conditionAssessment.valueImpact && (
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                <p className="text-xs font-bold text-slate-400 uppercase mb-3">Price Impact</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Original Value</p>
                    <p className="text-xl font-bold text-white">
                      ₹{(conditionAssessment.valueImpact.original_value ?? 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Adjusted Value</p>
                    <p className="text-xl font-bold text-green-400">
                      ₹{(conditionAssessment.valueImpact.adjusted_value ?? 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Value Reduction</p>
                    <p className="text-lg font-bold text-red-400">
                      -₹{(conditionAssessment.valueImpact.value_reduction ?? 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Reduction %</p>
                    <p className="text-lg font-bold text-orange-400">
                      {(conditionAssessment.valueImpact.reduction_percent ?? 0).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Repair Estimates (if available) */}
            {conditionAssessment.repairEstimate && (
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                <p className="text-xs font-bold text-slate-400 uppercase mb-3">Repair Cost Estimate</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Estimated Cost</p>
                    <p className="text-xl font-bold text-white">
                      ₹{(conditionAssessment.repairEstimate.estimated_repair_cost ?? 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Range: ₹{(conditionAssessment.repairEstimate.repair_cost_range?.min ?? 0).toLocaleString('en-IN')} - 
                      ₹{(conditionAssessment.repairEstimate.repair_cost_range?.max ?? 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Cost to Value Ratio</p>
                    <p className="text-xl font-bold text-amber-400">
                      {(conditionAssessment.repairEstimate.repair_to_value_ratio ?? 0).toFixed(1)}%
                    </p>
                    <p className={`text-xs mt-1 ${
                      conditionAssessment.repairEstimate.economic_to_repair 
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }`}>
                      {conditionAssessment.repairEstimate.economic_to_repair 
                        ? '✓ Economic to repair' 
                        : '✗ May not be economic'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {Array.isArray(conditionAssessment.recommendedRepairs) && conditionAssessment.recommendedRepairs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase">Recommendations</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {conditionAssessment.recommendedRepairs.map((rec, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border-l-4 ${
                        rec?.type === 'positive' ? 'bg-green-500/10 border-green-500' :
                        rec?.type === 'info' ? 'bg-blue-500/10 border-blue-500' :
                        rec?.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500' :
                        'bg-red-500/10 border-red-500'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                          rec?.priority === 'low' ? 'bg-slate-700 text-slate-300' :
                          rec?.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          rec?.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {rec?.priority || "medium"}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white mb-1">{rec?.message || "Repair recommended."}</p>
                          <p className="text-xs text-slate-400">{rec?.action || ""}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Damage Results ── */}
      {damageResults && (
        <div className="bg-slate-800/50 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Damage Analysis Results</h3>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Total Damages</p>
              <p className="text-3xl font-bold text-white">
                {damageResults.damage_summary?.total_damages ?? damageResults.damages_detected?.length ?? 0}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Severity Level</p>
              <p className="text-xl font-bold text-amber-400 capitalize">
                {damageResults.damage_summary?.severity_level || "minor"}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Categories</p>
              <p className="text-sm font-bold text-slate-300">
                {Array.isArray(damageResults.damage_summary?.categories) && damageResults.damage_summary.categories.length > 0
                  ? damageResults.damage_summary.categories.join(", ")
                  : "None"}
              </p>
            </div>
          </div>

          {/* Individual Damages List */}
          {Array.isArray(damageResults.damages_detected) && damageResults.damages_detected.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase">
                Detected Damages ({damageResults.damages_detected.length})
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {damageResults.damages_detected.map((dmg, idx) => {
                  const typeLabel = (dmg?.type || "Cosmetic Imperfection").replace(/_/g, ' ');
                  const confVal = typeof dmg?.confidence === "number" 
                    ? (dmg.confidence <= 1 ? dmg.confidence * 100 : dmg.confidence)
                    : 90;
                  const severityVal = dmg?.severity || "minor";

                  return (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg"
                    >
                      <span className="text-sm font-medium text-slate-300 capitalize">
                        {typeLabel}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-300">
                          {confVal.toFixed(1)}% confidence
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded font-bold capitalize ${
                            severityVal === "minor"
                              ? "bg-green-500/20 text-green-400"
                              : severityVal === "moderate"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {severityVal}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Annotated Images Grid */}
          {Array.isArray(damageResults.annotated_images) && damageResults.annotated_images.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase">
                Annotated Images (Click to enlarge)
              </p>
              <div className="grid grid-cols-5 gap-2">
                {damageResults.annotated_images.map((ann: any, idx: number) => {
                  const imgSrc = getAnnotatedImageSrc(ann);
                  if (!imgSrc) return null;

                  return (
                    <button
                      key={idx}
                      onClick={() =>
                        setShowAnnotated(showAnnotated === idx ? null : idx)
                      }
                      className="relative group"
                    >
                      <img
                        src={imgSrc}
                        alt={`Annotated ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-slate-600 group-hover:border-indigo-500 transition-colors"
                      />
                      <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        Image {idx + 1}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Size Annotated View */}
          {showAnnotated !== null &&
            Array.isArray(damageResults.annotated_images) &&
            damageResults.annotated_images[showAnnotated] && (
              <div className="mt-4 p-4 bg-slate-900/80 rounded-lg border border-indigo-500/30">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-bold text-white">
                    Annotated Image {showAnnotated + 1} - Full View
                  </p>
                  <button
                    onClick={() => setShowAnnotated(null)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                <img
                  src={getAnnotatedImageSrc(damageResults.annotated_images[showAnnotated])}
                  alt="Full annotated view"
                  className="w-full rounded-lg"
                />
              </div>
            )}
        </div>
      )}
    </div>
  );
}
