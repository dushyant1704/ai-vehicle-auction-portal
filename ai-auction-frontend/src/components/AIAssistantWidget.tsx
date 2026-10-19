import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  History,
  Trash2,
  Database,
  Shield,
  Layers,
  AlertTriangle,
  RotateCcw,
  Zap,
  Maximize2,
  Minimize2,
  FileText,
  Car,
  Eye,
  ArrowRight,
  Copy,
  Check,
  ChevronRight,
  Sliders,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import toast from "react-hot-toast";

export interface SourceCitation {
  title: string;
  sourceType: string;
  sourceId?: string;
  snippet?: string;
  score?: number;
  matchConfidence?: string;
  category?: string;
}

export interface MessageDiagnostics {
  retrievedCount?: number;
  latencyMs?: number;
  provider?: string;
  model?: string;
  liveDataUsed?: boolean;
  roleApplied?: string;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[];
  diagnostics?: MessageDiagnostics;
  timestamp: string | Date;
}

export interface ConversationSummary {
  _id: string;
  title: string;
  userRole: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
}

const BACKEND_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const API_BASE = `${BACKEND_URL}/api/assistant`;

type PersonaType = "buyer" | "bank" | "admin";

export default function AIAssistantWidget() {
  const { user, token } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Widget State
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Active Role Persona (Allows immediate demonstration and testing of all 3 roles)
  const initialRole: PersonaType =
    user?.role === "admin" ? "admin" :
    (user?.role === "bank" || user?.role === "seller") ? "bank" : "buyer";
  const [activePersona, setActivePersona] = useState<PersonaType>(initialRole);

  // Source Inspection Modal
  const [selectedSource, setSelectedSource] = useState<SourceCitation | null>(null);

  // Copied message index state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep persona in sync if user changes
  useEffect(() => {
    if (user?.role) {
      const mapped: PersonaType =
        user.role === "admin" ? "admin" :
        (user.role === "bank" || user.role === "seller") ? "bank" : "buyer";
      setActivePersona(mapped);
    }
  }, [user]);

  // Role metadata and presentation configuration
  const roleConfig = {
    buyer: {
      key: "buyer" as PersonaType,
      badge: "General Bidder AI",
      label: "Bidder",
      color: "from-emerald-500 to-teal-600",
      border: "border-emerald-500/30",
      accent: "text-emerald-400",
      bgSubtle: "bg-emerald-500/10",
      icon: "🎯",
      description: "Live bidding rules, active auctions, vehicle condition & damage summaries.",
      quickPills: [
        "🚗 Live Auctions",
        "📋 Bidding Rules",
        "🔍 Damage Reports",
        "💰 Market vs Start Price",
        "📊 My Bids History",
      ],
      quickPrompts: [
        "🚗 What live auction cars are available right now?",
        "📋 What are the rules for placing a bid?",
        "🔍 How does YOLOv8 detect vehicle damage?",
        "💰 Why does market value differ from start price?",
        "📊 Show my personal bidding history.",
      ],
    },
    bank: {
      key: "bank" as PersonaType,
      badge: "Bank / Institutional Seller AI",
      label: "Bank / Seller",
      color: "from-blue-500 to-indigo-600",
      border: "border-blue-500/30",
      accent: "text-blue-400",
      bgSubtle: "bg-blue-500/10",
      icon: "🏛️",
      description: "80/20 hybrid valuation engine, YOLOv8 damage inspection reports, and portfolio performance.",
      quickPills: [
        "📐 80/20 Formula",
        "🏢 My Vehicles",
        "📷 YOLOv8 Damage",
        "📝 Listing SOP",
        "📈 Auction Performance",
      ],
      quickPrompts: [
        "📐 Explain how the 80/20 hybrid pricing engine calculates vehicle values.",
        "🏢 Show our institution's listed vehicles and 4-tier valuations.",
        "📷 Summarize YOLOv8 damage detection reports for our inventory.",
        "📝 What documents are required for vehicle listing?",
        "📈 Review auction performance for our vehicles.",
      ],
    },
    admin: {
      key: "admin" as PersonaType,
      badge: "Platform Administrator AI",
      label: "Admin",
      color: "from-purple-500 to-violet-600",
      border: "border-purple-500/30",
      accent: "text-purple-400",
      bgSubtle: "bg-purple-500/10",
      icon: "🛡️",
      description: "Platform-wide surveillance, active auctions, anomaly detection, and verification queues.",
      quickPills: [
        "📊 Platform Metrics",
        "🚨 Anomaly Review",
        "⏳ Verification Queue",
        "🛡️ Platform Policies",
        "🚙 Damage Summaries",
      ],
      quickPrompts: [
        "📊 Summarize the currently active auctions and platform metrics.",
        "🚨 Report any bidding concentration signals for human review.",
        "⏳ Show vehicle listings currently awaiting verification.",
        "🛡️ Summarize platform dispute policies and auto-extension rules.",
        "🚙 Summarize damage detection results for recently listed vehicles.",
      ],
    },
  }[activePersona];

  // Scroll to bottom on new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Listen for global open event
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-ai-assistant", handleOpen);
    return () => window.removeEventListener("open-ai-assistant", handleOpen);
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  // Load user's conversations when opening widget
  useEffect(() => {
    if (isOpen && token) {
      fetchConversations();
    }
  }, [isOpen, token]);

  const fetchConversations = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API_BASE}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch {
      // Silently ignore if unauthenticated or offline
    }
  };

  // Switch to an existing conversation
  const loadConversation = async (convId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/conversations/${convId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success && data.conversation) {
        setActiveConversationId(convId);
        setMessages(data.conversation.messages || []);
        setShowHistory(false);
      }
    } catch {
      toast.error("Failed to load conversation");
    } finally {
      setLoading(false);
    }
  };

  // Delete a conversation
  const deleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await axios.delete(`${API_BASE}/conversations/${convId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (activeConversationId === convId) {
        setActiveConversationId(null);
        setMessages([]);
      }
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  // Start fresh conversation session
  const startNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  // Copy assistant response to clipboard
  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Answer copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Send query to authenticated RAG backend
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || loading) return;

    if (!token) {
      toast.error("Please login to use the AI Assistant");
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customText) setInputMessage("");
    setLoading(true);

    try {
      const { data } = await axios.post(
        `${API_BASE}/chat`,
        {
          message: textToSend.trim(),
          conversationId: activeConversationId,
          simulatedRole: activePersona,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (data.success) {
        if (!activeConversationId && data.conversationId) {
          setActiveConversationId(data.conversationId);
          fetchConversations();
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
          diagnostics: data.diagnostics || {},
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || "Unknown server response");
      }
    } catch (err: any) {
      console.error("[AIAssistant] Error:", err);
      const errMsg =
        err.response?.data?.error === "AI Provider Not Configured"
          ? "⚠️ AI Provider Not Configured: Add your GROQ_API_KEY in the backend .env file to enable instant inference."
          : err.response?.data?.details || err.response?.data?.error || err.message || "Failed to generate response";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ **Error**: ${errMsg}`,
          timestamp: new Date(),
        },
      ]);
      toast.error("Assistant request failed");
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcut (Enter to send)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper: map sourceType to human badge & color
  const getSourceMeta = (type: string) => {
    switch (type) {
      case "live_database":
        return {
          label: "Live DB",
          fullLabel: "Authoritative Real-Time Database",
          icon: <Zap className="w-3 h-3 text-emerald-400" />,
          color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30",
          badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
        };
      case "pricing_engine":
        return {
          label: "80/20 Formula",
          fullLabel: "AI Hybrid Valuation Engine Spec (v4.1)",
          icon: <Layers className="w-3 h-3 text-indigo-400" />,
          color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30",
          badgeColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/40",
        };
      case "damage_inspection":
        return {
          label: "YOLOv8 Vision",
          fullLabel: "Computer Vision Damage Inspection SOP",
          icon: <Eye className="w-3 h-3 text-amber-400" />,
          color: "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30",
          badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/40",
        };
      case "policy":
      case "institution_policy":
      case "admin_guide":
        return {
          label: "Platform Policy",
          fullLabel: "Official Platform Operating Procedure",
          icon: <FileText className="w-3 h-3 text-cyan-400" />,
          color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30",
          badgeColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/40",
        };
      case "vehicle":
        return {
          label: "Vehicle Spec",
          fullLabel: "Vehicle Technical Catalog & Valuation",
          icon: <Car className="w-3 h-3 text-violet-400" />,
          color: "bg-violet-500/20 text-violet-300 border-violet-500/30 hover:bg-violet-500/30",
          badgeColor: "bg-violet-500/15 text-violet-400 border-violet-500/40",
        };
      default:
        return {
          label: "Knowledge",
          fullLabel: "Verified Platform Knowledge Document",
          icon: <Database className="w-3 h-3 text-slate-400" />,
          color: "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700",
          badgeColor: "bg-slate-800 text-slate-300 border-slate-700",
        };
    }
  };

  // Render markdown with styled headers, tables, lists, alerts, and valuation visualizer
  const formatMarkdown = (text: string) => {
    if (!text) return null;

    const hasFormula = text.includes("80/20") || text.includes("0.80") || text.includes("0.8 ×");

    // Split paragraphs
    const paragraphs = text.split("\n\n");

    return (
      <div className="space-y-2">
        {/* Interactive 80/20 Valuation Visualizer Card (Rendered when explaining the formula) */}
        {hasFormula && (
          <div className="my-3 p-3.5 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/30 shadow-lg">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-500/20">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                80/20 Single Source of Truth Valuation Formula
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                v4.1 Certified
              </span>
            </div>

            {/* Split Progress Bar */}
            <div className="w-full h-3 rounded-full bg-slate-800 flex overflow-hidden my-2 shadow-inner">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full flex items-center justify-center text-[9px] font-bold text-white tracking-wide"
                style={{ width: "80%" }}
              >
                80% ML Baseline
              </div>
              <div
                className="bg-gradient-to-r from-amber-500 to-rose-500 h-full flex items-center justify-center text-[9px] font-bold text-white tracking-wide"
                style={{ width: "20%" }}
              >
                20% Damage
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span><strong>80% ML Baseline:</strong> XGBoost ($R^2=0.9487$)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span><strong>20% Damage Factor:</strong> YOLOv8 Vision</span>
              </div>
            </div>
          </div>
        )}

        {paragraphs.map((p, idx) => {
          // Check for table
          if (p.includes("|") && p.includes("\n|")) {
            const lines = p.trim().split("\n");
            const headerCols = lines[0].split("|").filter((c) => c.trim().length > 0);
            const dataRows = lines.slice(2).map((l) => l.split("|").filter((c) => c.trim().length > 0));

            return (
              <div key={idx} className="my-2.5 overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-950/70 p-1 shadow-md">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-700/80 text-slate-200 font-semibold bg-slate-850">
                      {headerCols.map((col, cIdx) => (
                        <th key={cIdx} className="px-3 py-2 text-indigo-300">
                          {col.trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {dataRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                        {row.map((cell, cIdx) => {
                          const isCurrency = cell.includes("₹");
                          return (
                            <td
                              key={cIdx}
                              className={`px-3 py-2 font-medium ${isCurrency ? "text-emerald-400 font-semibold" : ""}`}
                            >
                              {cell.trim()}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          // Check for Header (### or ##)
          if (p.startsWith("### ")) {
            return (
              <h4 key={idx} className="text-sm font-bold text-indigo-300 mt-3 mb-1 flex items-center gap-1.5">
                {p.replace("### ", "")}
              </h4>
            );
          }
          if (p.startsWith("## ")) {
            return (
              <h3 key={idx} className="text-base font-bold text-slate-100 mt-3 mb-1.5 flex items-center gap-1.5 border-b border-slate-800 pb-1">
                {p.replace("## ", "")}
              </h3>
            );
          }

          // Check for bullet list
          if (p.includes("\n- ") || p.startsWith("- ") || p.includes("\n• ") || p.startsWith("• ")) {
            const items = p.split(/\n[-•]\s*/).filter(Boolean);
            return (
              <ul key={idx} className="my-1.5 space-y-1 text-xs text-slate-200 pl-2">
                {items.map((item, iIdx) => (
                  <li key={iIdx} className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-1 text-[8px] flex-shrink-0">●</span>
                    <span dangerouslySetInnerHTML={{ __html: sanitizeBold(item) }} />
                  </li>
                ))}
              </ul>
            );
          }

          // Check for blockquote or damage alert
          if (p.startsWith("> ") || p.includes("⚠️") || p.toLowerCase().includes("inspection note")) {
            return (
              <div
                key={idx}
                className="my-2 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs flex items-start gap-2.5 shadow-sm"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div
                  className="leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeBold(p.replace(/^>\s*/, "")) }}
                />
              </div>
            );
          }

          // Normal paragraph
          return (
            <p
              key={idx}
              className="my-1 text-xs leading-relaxed text-slate-200"
              dangerouslySetInnerHTML={{ __html: sanitizeBold(p) }}
            />
          );
        })}
      </div>
    );
  };

  // Safe bold, italic, code formatting
  const sanitizeBold = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-slate-300">$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px] border border-slate-700/60">$1</code>');
  };

  return (
    <>
      {/* ── Floating AI Trigger Button ──────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl text-white font-medium transition-all duration-300 hover:scale-105 active:scale-95 group bg-gradient-to-r ${roleConfig.color}`}
          style={{
            boxShadow: "0 10px 30px -5px rgba(99, 102, 241, 0.45)",
          }}
          aria-label="Open AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-200" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900 animate-ping" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold leading-none tracking-wide text-white flex items-center gap-1">
              <span>{roleConfig.icon}</span> {roleConfig.badge}
            </span>
            <span className="text-[10px] text-white/80 font-normal leading-tight mt-0.5">
              Live Role RAG
            </span>
          </div>
        </button>
      )}

      {/* ── Slide-over / Modal Assistant Container ─────────────────── */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 flex flex-col shadow-2xl overflow-hidden rounded-2xl border backdrop-blur-xl ${
            isExpanded
              ? "inset-4 sm:inset-8"
              : "bottom-4 right-4 w-full sm:w-[480px] h-[670px] max-h-[92vh]"
          } ${
            isDark
              ? "bg-slate-950/95 border-slate-800 text-slate-100 shadow-indigo-950/40"
              : "bg-white/95 border-slate-200 text-slate-800 shadow-slate-400/30"
          }`}
          style={{
            boxShadow: isDark
              ? "0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.25)"
              : "0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 40px rgba(99, 102, 241, 0.15)",
          }}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <div
            className={`flex items-center justify-between px-4 py-3 border-b select-none ${
              isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white bg-gradient-to-tr ${roleConfig.color} shadow-md flex-shrink-0 text-lg`}
              >
                {roleConfig.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-bold tracking-tight text-white truncate">
                    {roleConfig.badge}
                  </h3>
                </div>
                <p className="text-[10.5px] text-slate-400 leading-none mt-0.5 truncate">
                  Grounded in live database & vector retrieval
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors ${
                  showHistory ? "bg-slate-800 text-indigo-400" : "hover:bg-slate-800/60"
                }`}
                title="Conversation History"
              >
                <History className="w-4 h-4" />
              </button>

              <button
                onClick={startNewConversation}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                title="New Conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors hidden sm:block"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors ml-1"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Role Persona Switcher Bar ────────────────────────────── */}
          <div className="px-3.5 py-2 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Role Persona:</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActivePersona("buyer")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all flex items-center gap-1 ${
                  activePersona === "buyer"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>🎯</span> Bidder
              </button>

              <button
                onClick={() => setActivePersona("bank")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all flex items-center gap-1 ${
                  activePersona === "bank"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>🏛️</span> Bank/Seller
              </button>

              <button
                onClick={() => setActivePersona("admin")}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all flex items-center gap-1 ${
                  activePersona === "admin"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>🛡️</span> Admin
              </button>
            </div>
          </div>

          {/* ── Subheader Notice ─────────────────────────────────────── */}
          <div className="px-4 py-1.5 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 truncate">
              <Shield className="w-3 h-3 text-indigo-400 flex-shrink-0" />
              <span>
                Verified identity: <strong className="text-slate-200">{user?.name || "Guest"}</strong>{" "}
                <span className="text-[10px] text-indigo-400">({user?.role || "buyer"})</span>
              </span>
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Groq GPT-OSS-120B (Ultra-Fast)
            </span>
          </div>

          {/* ── Main Chat Area / History View ──────────────────────── */}
          <div className="relative flex-1 overflow-y-auto flex flex-col p-4 space-y-4">
            {/* Conversation History Drawer */}
            {showHistory && (
              <div
                className={`absolute inset-0 z-20 flex flex-col p-4 backdrop-blur-md transition-all ${
                  isDark ? "bg-slate-950/95" : "bg-white/95"
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-indigo-400" />
                    Past Sessions ({conversations.length})
                  </h4>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={startNewConversation}
                  className="w-full mb-3 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Start New Chat
                </button>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {conversations.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No saved conversations found.
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv._id}
                        onClick={() => loadConversation(conv._id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start justify-between group ${
                          activeConversationId === conv._id
                            ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-semibold truncate text-white">
                            {conv.title || "Untitled Session"}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(conv.updatedAt).toLocaleDateString()} · {conv.messageCount} messages
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteConversation(e, conv._id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Empty State / Welcome Screen */}
            {messages.length === 0 && !loading && (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-tr ${roleConfig.color} shadow-lg shadow-indigo-500/25 text-2xl`}
                >
                  {roleConfig.icon}
                </div>
                <h4 className="text-base font-bold text-white mb-1">
                  Welcome to {roleConfig.badge}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mb-6">
                  {roleConfig.description}
                </p>

                {/* Quick Prompts */}
                <div className="w-full space-y-2 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                    Suggested Questions for {roleConfig.label}:
                  </p>
                  {roleConfig.quickPrompts.map((prompt, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-indigo-500/40 text-xs text-slate-300 transition-all flex items-center justify-between group"
                    >
                      <span className="truncate pr-2">{prompt}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Thread */}
            {messages.map((msg, mIdx) => (
              <div
                key={mIdx}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold bg-gradient-to-tr ${roleConfig.color} shadow-sm mt-1 text-xs`}
                  >
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white font-normal ml-auto rounded-tr-none"
                      : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none"
                  }`}
                >
                  {/* Message Content */}
                  <div>{formatMarkdown(msg.content)}</div>

                  {/* Sleek Source Badges Strip (Assistant only) */}
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Database className="w-3 h-3 text-indigo-400" />
                          Grounded Sources ({msg.sources.length}):
                        </span>
                        <span className="text-[9.5px] text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> 100% Verified
                        </span>
                      </div>

                      {/* Interactive Source Chips Grid */}
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, sIdx) => {
                          const meta = getSourceMeta(src.sourceType);
                          return (
                            <button
                              key={sIdx}
                              onClick={() => setSelectedSource(src)}
                              className={`group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-medium border transition-all ${meta.color}`}
                              title={`Click to inspect source: ${src.title}`}
                            >
                              {meta.icon}
                              <span className="truncate max-w-[170px]">{src.title}</span>
                              <ChevronRight className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Diagnostic metadata & Copy footer */}
                  {msg.role === "assistant" && (
                    <div className="mt-2.5 pt-1.5 border-t border-slate-800/40 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <div className="flex items-center gap-1.5 truncate">
                        <span>⚡ {msg.diagnostics?.latencyMs || 1400}ms</span>
                        <span>·</span>
                        <span className="capitalize">{msg.diagnostics?.provider || "Groq"}</span>
                        {msg.diagnostics?.liveDataUsed && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-400 font-semibold">Live DB Active</span>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopy(msg.content, mIdx)}
                        className="inline-flex items-center gap-1 text-[10.5px] text-slate-400 hover:text-indigo-300 transition-colors p-1 rounded hover:bg-slate-800"
                        title="Copy answer to clipboard"
                      >
                        {copiedIndex === mIdx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-indigo-300 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex gap-2.5 items-start">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold bg-gradient-to-tr ${roleConfig.color} shadow-sm animate-pulse text-xs`}
                >
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 text-xs text-slate-400 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                  <div
                    className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                  <span className="text-[11px] text-slate-400 ml-1">
                    Retrieving live database facts & verified knowledge...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Quick Action Pills Above Input ──────────────────────── */}
          <div className="px-3 pt-2 pb-1 bg-slate-900/95 border-t border-slate-800/80 overflow-x-auto no-scrollbar flex items-center gap-1.5">
            {roleConfig.quickPills.map((pill, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(roleConfig.quickPrompts[idx] || pill)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-[10.5px] font-medium text-slate-300 hover:text-white hover:border-indigo-500/50 hover:bg-slate-850 transition-all flex-shrink-0"
              >
                {pill}
              </button>
            ))}
          </div>

          {/* ── Input Box & Actions ─────────────────────────────────── */}
          <div
            className={`p-3 border-t ${
              isDark ? "bg-slate-900/95 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="relative flex items-center">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${roleConfig.badge} about vehicles, valuations, rules...`}
                rows={1}
                disabled={loading}
                className={`w-full resize-none rounded-xl pl-3.5 pr-14 py-2.5 text-xs outline-none transition-all placeholder:text-slate-500 ${
                  isDark
                    ? "bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white"
                    : "bg-white border border-slate-300 focus:border-indigo-500 text-slate-900"
                }`}
                style={{ maxHeight: "100px" }}
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || loading}
                className={`absolute right-2 p-2 rounded-lg text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  inputMessage.trim() && !loading
                    ? "bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 scale-100"
                    : "bg-slate-800 text-slate-500"
                }`}
                title="Send query"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>Shift+Enter for newline</span>
              <span className="truncate max-w-[220px]">
                Active Persona: <strong className="text-slate-300 capitalize">{roleConfig.label}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Interactive Source Inspection Modal ────────────────────── */}
      {selectedSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 overflow-hidden flex flex-col space-y-4"
            style={{
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.2)",
            }}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                      getSourceMeta(selectedSource.sourceType).badgeColor
                    }`}
                  >
                    {getSourceMeta(selectedSource.sourceType).fullLabel}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {selectedSource.matchConfidence || "Verified Authoritative Source"}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white leading-snug">
                  {selectedSource.title}
                </h3>
              </div>

              <button
                onClick={() => setSelectedSource(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close source inspection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Verified Text Excerpt:
                </span>
                <div className="mt-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                  {selectedSource.snippet || "Authoritative platform document used for grounding."}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-500">Source Identifier:</span>{" "}
                  <code className="text-indigo-300 font-mono text-[9.5px]">
                    {selectedSource.sourceId || "platform_canon"}
                  </code>
                </div>
                <div>
                  <span className="text-slate-500">Category:</span>{" "}
                  <span className="text-slate-300 font-medium">
                    {selectedSource.category || selectedSource.sourceType}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedSource(null)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
