import { useState } from "react";
import { Gavel, IndianRupee, X, Loader2 } from "lucide-react";

interface BidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => void;
  vehiclePrice?: number;
  isSubmitting?: boolean;
}

function BidModal({ isOpen, onClose, onSubmit, vehiclePrice, isSubmitting = false }: BidModalProps) {
  const [bidAmount, setBidAmount] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    setError("");
    const amount = Number(bidAmount);

    if (!bidAmount || isNaN(amount) || amount <= 0) {
      setError("Please enter a valid bid amount.");
      return;
    }
    if (vehiclePrice && amount < vehiclePrice) {
      setError(`Bid must be at least ₹${vehiclePrice.toLocaleString("en-IN")} (listing price).`);
      return;
    }

    onSubmit(amount);
    setBidAmount("");
    setError("");
  };

  const handleClose = () => {
    setBidAmount("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm px-4">
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Gavel className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Place Your Bid
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {vehiclePrice && (
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}
            >
              <span style={{ color: "var(--text-secondary)" }}>Listing Price</span>
              <span className="font-bold text-emerald-400">
                ₹{vehiclePrice.toLocaleString("en-IN")}
              </span>
            </div>
          )}

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              Your Bid Amount (₹)
            </label>
            <div className="relative">
              <IndianRupee
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                type="number"
                placeholder={vehiclePrice ? `Min ₹${vehiclePrice.toLocaleString("en-IN")}` : "Enter amount"}
                value={bidAmount}
                onChange={(e) => { setBidAmount(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                min={vehiclePrice || 1}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "var(--border-color)"}`,
                  color: "var(--text-primary)",
                }}
                autoFocus
              />
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-400">{error}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-6 py-4 border-t"
          style={{ borderColor: "var(--border-color)" }}
        >
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !bidAmount}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Gavel className="w-4 h-4" />
            )}
            {isSubmitting ? "Placing…" : "Place Bid"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BidModal;
