import { useState, useEffect, useCallback, ChangeEvent, FormEvent } from "react";
import axios from "axios";
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  Landmark,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileCheck,
  Check,
  X,
  Loader2,
  Eye,
  Info,
  Calendar,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

interface ConsistencyRule {
  ruleId: string;
  name: string;
  passed: boolean;
  penalty: number;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}

interface DocumentItem {
  _id?: string;
  documentType: string;
  fileName?: string;
  fileUrl?: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "SUPERSEDED";
  trustScore?: number;
  autoRecommendation?: string;
  maskedReference?: string;
  extractedFields?: {
    registrationNumber?: string;
    chassisNumber?: string;
    engineNumber?: string;
    ownerName?: string;
    bankName?: string;
    loanAccountNumber?: string;
    maskedPlate?: string;
    maskedVIN?: string;
    maskedOwner?: string;
    issueDate?: string;
    expiryDate?: string;
  };
  consistencyChecks?: ConsistencyRule[];
  summaryChecks?: string[];
  reviewDetails?: {
    reviewedAt?: string;
    reviewerName?: string;
    reason?: string;
    notes?: string;
  };
  verifiedAt?: string;
}

interface DocumentVerificationProps {
  vehicleId: string;
  vehicle: any;
  onVerificationUpdate?: () => void;
}

const BACKEND_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const DOC_TYPES = [
  {
    key: "rcBook",
    label: "Registration Certificate (RC)",
    description: "Official RTO Smart Card verifying ownership, VIN, and engine specifications.",
    icon: FileText,
    required: true,
  },
  {
    key: "repossessionNotice",
    label: "Bank Repossession Notice",
    description: "SARFAESI Act / hypothecation authorization letter from accredited financier.",
    icon: Landmark,
    required: true,
  },
  {
    key: "form35Noc",
    label: "Form 35 Hypothecation NOC",
    description: "RTO Form 35 confirming clean title and hypothecation discharge.",
    icon: FileCheck,
    required: false,
  },
  {
    key: "insurancePolicy",
    label: "Motor Insurance Policy",
    description: "Active comprehensive / third-party insurance certificate with IDV value.",
    icon: ShieldCheck,
    required: false,
  },
];

export default function DocumentVerificationSection({
  vehicleId,
  vehicle,
  onVerificationUpdate,
}: DocumentVerificationProps) {
  const { user, token } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessLevel, setAccessLevel] = useState<"public" | "privileged">("public");
  const [complianceScore, setComplianceScore] = useState<number>(85);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("rcBook");
  const [regNumber, setRegNumber] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [engineNumber, setEngineNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [loanAccountNumber, setLoanAccountNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preflight check state
  const [isPreflighting, setIsPreflighting] = useState(false);
  const [preflightResult, setPreflightResult] = useState<any>(null);

  // Review state for admin
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null);

  const isPrivileged =
    user?.role === "admin" ||
    (user && (user.role === "seller" || user.role === "bank") && String(user.id) === String(vehicle?.sellerId));

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${BACKEND_URL}/api/documents/vehicle/${vehicleId}`, { headers });
      setDocuments(res.data.documents || []);
      setAccessLevel(res.data.accessLevel || "public");
      if (res.data.complianceSummary?.complianceScore) {
        setComplianceScore(res.data.complianceSummary.complianceScore);
      }
    } catch (err) {
      console.error("Failed to load vehicle documents:", err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, token]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle instant preflight validation check
  const handlePreflightCheck = async () => {
    try {
      setIsPreflighting(true);
      const payload = {
        vehicleId,
        documentType: selectedDocType,
        registrationNumber: regNumber,
        chassisNumber: chassisNumber,
        engineNumber: engineNumber,
        bankName: bankName,
        loanAccountNumber: loanAccountNumber,
      };

      const res = await axios.post(`${BACKEND_URL}/api/documents/preflight`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPreflightResult(res.data.result);
      if (res.data.result.trustScore >= 80) {
        toast.success(`Integrity Score: ${res.data.result.trustScore}% (Conforming)`);
      } else {
        toast.error(`Integrity Score: ${res.data.result.trustScore}% — check advisories`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Preflight check failed");
    } finally {
      setIsPreflighting(false);
    }
  };

  // Handle document upload submit
  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Please login to upload compliance documents");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("vehicleId", vehicleId);
      formData.append("documentType", selectedDocType);
      if (regNumber) formData.append("registrationNumber", regNumber);
      if (chassisNumber) formData.append("chassisNumber", chassisNumber);
      if (engineNumber) formData.append("engineNumber", engineNumber);
      if (bankName) formData.append("bankName", bankName);
      if (loanAccountNumber) formData.append("loanAccountNumber", loanAccountNumber);
      if (uploadNotes) formData.append("notes", uploadNotes);
      if (file) {
        formData.append("file", file);
      }

      await axios.post(`${BACKEND_URL}/api/documents/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Document uploaded & processed through integrity engine! 🎉");
      setIsUploadModalOpen(false);
      setFile(null);
      setPreflightResult(null);
      fetchDocuments();
      if (onVerificationUpdate) onVerificationUpdate();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to upload document");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Admin Review Decision (VERIFIED or REJECTED)
  const handleAdminReview = async (docId: string, decision: "VERIFIED" | "REJECTED") => {
    let reason = "";
    if (decision === "REJECTED") {
      const promptRes = window.prompt("Enter rejection reason for this document:");
      if (!promptRes) return;
      reason = promptRes;
    }

    try {
      setReviewingDocId(docId);
      await axios.put(
        `${BACKEND_URL}/api/documents/${docId}/review`,
        { status: decision, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Document marked as ${decision}!`);
      fetchDocuments();
      if (onVerificationUpdate) onVerificationUpdate();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Review submission failed");
    } finally {
      setReviewingDocId(null);
    }
  };

  const getDocForType = (typeKey: string) => {
    return documents.find((d) => d.documentType === typeKey);
  };

  return (
    <section
      aria-label="Vehicle Documentation & Legal Compliance"
      className="rounded-3xl border overflow-hidden backdrop-blur-xl relative transition-all"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-color)",
        boxShadow: "0 10px 30px -10px rgba(99,102,241,0.08)",
      }}
    >
      {/* ── Banner Header ── */}
      <div className="px-6 py-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderColor: "var(--border-color)" }}>
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(168,85,247,0.15) 100%)",
              border: "1px solid rgba(139,92,246,0.3)",
            }}
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-white tracking-tight">Legal Compliance & Document Verification</h3>
              {vehicle?.verificationStatus === "verified" ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Clear Legal Title
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Verification In Progress
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-point RTO registration audit, ISO 3779 VIN validation, and institutional repossession authority check.
            </p>
          </div>
        </div>

        {/* Action Controls & Score */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400">Integrity Index:</span>
            <span className="text-sm font-extrabold text-indigo-400">{complianceScore}%</span>
          </div>

          {isPrivileged && (
            <button
              onClick={() => {
                setIsUploadModalOpen(true);
                setPreflightResult(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4" /> Upload Document
            </button>
          )}
        </div>
      </div>

      {/* ── Document Grid ── */}
      <div className="p-6">
        {loading ? (
          <div className="py-8 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Verifying document records...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DOC_TYPES.map((dt) => {
              const doc = getDocForType(dt.key);
              const Icon = dt.icon;
              const isVerified = doc?.status === "VERIFIED";
              const isPending = doc?.status === "PENDING";
              const isRejected = doc?.status === "REJECTED";
              const isMissing = !doc;

              return (
                <div
                  key={dt.key}
                  className="p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4"
                  style={{
                    backgroundColor: isVerified
                      ? "rgba(16, 185, 129, 0.03)"
                      : isRejected
                      ? "rgba(244, 63, 94, 0.03)"
                      : "rgba(15, 23, 42, 0.4)",
                    borderColor: isVerified
                      ? "rgba(16, 185, 129, 0.25)"
                      : isRejected
                      ? "rgba(244, 63, 94, 0.25)"
                      : isPending
                      ? "rgba(245, 158, 11, 0.25)"
                      : "var(--border-color)",
                  }}
                >
                  <div>
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isVerified
                              ? "bg-emerald-500/20 text-emerald-400"
                              : isPending
                              ? "bg-amber-500/20 text-amber-400"
                              : isRejected
                              ? "bg-rose-500/20 text-rose-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                            {dt.label}
                            {dt.required && (
                              <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                                Required
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{dt.description}</p>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <div>
                        {isVerified && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> In Review
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                        {isMissing && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-slate-800 text-slate-400 border border-slate-700">
                            Not Uploaded
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Masked / Extracted Info */}
                    <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-1.5">
                      {doc ? (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Identifier / Ref:</span>
                            <span className="font-mono text-indigo-300 font-semibold">
                              {doc.maskedReference || doc.extractedFields?.maskedPlate || doc.extractedFields?.maskedVIN || "Verified Record"}
                            </span>
                          </div>

                          {doc.trustScore !== undefined && doc.trustScore > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Automated Audit Match:</span>
                              <span className="font-bold text-emerald-400">{doc.trustScore}% Concordance</span>
                            </div>
                          )}

                          {doc.reviewDetails?.reviewedAt && (
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span>Verified Date:</span>
                              <span className="text-slate-300">
                                {new Date(doc.reviewDetails.reviewedAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          )}

                          {/* Rule Checks Pill preview */}
                          {doc.consistencyChecks && doc.consistencyChecks.length > 0 && isPrivileged && (
                            <div className="mt-2.5 space-y-1 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                Automated Consistency Rules:
                              </p>
                              <div className="space-y-1">
                                {doc.consistencyChecks.slice(0, 3).map((chk, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-300 truncate max-w-[200px]">{chk.name}</span>
                                    <span
                                      className={`font-semibold shrink-0 ${
                                        chk.passed ? "text-emerald-400" : "text-amber-400"
                                      }`}
                                    >
                                      {chk.passed ? "Passed ✓" : "Flagged ✗"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-500 italic py-1">
                          No document uploaded yet for this legal compliance requirement.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer actions for Admin & Owners */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/80">
                    {doc?.fileUrl ? (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect Scan
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-500">Official MoRTH Record</span>
                    )}

                    {/* Admin 1-Click Review Controls */}
                    {user?.role === "admin" && doc && doc.status === "PENDING" && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          disabled={reviewingDocId === doc._id}
                          onClick={() => handleAdminReview(doc._id!, "VERIFIED")}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button
                          disabled={reviewingDocId === doc._id}
                          onClick={() => handleAdminReview(doc._id!, "REJECTED")}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Document Upload Modal ── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Upload Compliance Document</h3>
                  <p className="text-xs text-slate-400">
                    Vehicle: {vehicle?.brand} {vehicle?.model} ({vehicle?.year})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Document Type Select */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Document Type
                </label>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="rcBook">Registration Certificate (RC Book)</option>
                  <option value="repossessionNotice">Bank Repossession Notice (13(2) Notice)</option>
                  <option value="form35Noc">Form 35 Hypothecation NOC</option>
                  <option value="insurancePolicy">Motor Insurance Policy Certificate</option>
                  <option value="inspectionCertificate">Physical 150-Point Inspection</option>
                  <option value="loanClearance">Loan Settlement / Full Clearance</option>
                </select>
              </div>

              {/* Conditional Inputs based on Type */}
              {selectedDocType === "rcBook" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Registration Plate Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MH02AB1234"
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Chassis / VIN (17 digits)
                    </label>
                    <input
                      type="text"
                      maxLength={17}
                      placeholder="e.g. MALAA51FLNM123456"
                      value={chassisNumber}
                      onChange={(e) => setChassisNumber(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              )}

              {(selectedDocType === "repossessionNotice" || selectedDocType === "form35Noc") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Issuing Bank / Financier
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank, SBI, ICICI"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Loan Account Reference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. LA-AUTO-992211"
                      value={loanAccountNumber}
                      onChange={(e) => setLoanAccountNumber(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs"
                    />
                  </div>
                </div>
              )}

              {/* File Attachment */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document File (PDF, PNG, JPG, WebP — Max 10MB)
                </label>
                <div className="border-2 border-dashed border-slate-700 rounded-2xl p-4 text-center hover:border-indigo-500 transition-colors bg-slate-800/40">
                  <input
                    type="file"
                    id="doc-file-input"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files && e.target.files[0]) {
                        setFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="doc-file-input" className="cursor-pointer block">
                    <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto mb-1.5" />
                    {file ? (
                      <p className="text-xs font-bold text-white truncate max-w-xs mx-auto">
                        {file.name} ({(file.size / 1024).toFixed(0)} KB)
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Click or drag to select document scan / certificate
                      </p>
                    )}
                  </label>
                </div>
              </div>

              {/* Live Preflight Integrity Check Output */}
              {preflightResult && (
                <div
                  className="p-3.5 rounded-2xl border text-xs space-y-2 animate-fadeIn"
                  style={{
                    backgroundColor:
                      preflightResult.trustScore >= 80 ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
                    borderColor:
                      preflightResult.trustScore >= 80 ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Live Integrity Pre-Check</span>
                    <span
                      className={`font-extrabold px-2 py-0.5 rounded-full ${
                        preflightResult.trustScore >= 80 ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {preflightResult.trustScore}% Score
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{preflightResult.verdictMessage}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-3">
                <button
                  type="button"
                  disabled={isPreflighting}
                  onClick={handlePreflightCheck}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
                >
                  {isPreflighting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
                  Check Integrity
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/25 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                      </>
                    ) : (
                      "Submit Document"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
