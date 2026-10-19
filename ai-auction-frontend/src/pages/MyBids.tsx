import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gavel, Clock, ExternalLink, Trash2 } from "lucide-react";

interface Bid {
  vehicleId: string;
  brand: string;
  model: string;
  amount: number | string;
  time: string;
}

function MyBids() {
  const [bids, setBids] = useState<Bid[]>([]);

  const loadBids = () => {
    const storedBids = JSON.parse(localStorage.getItem("bids") || "[]");
    const sorted = storedBids.sort(
      (a: Bid, b: Bid) =>
        new Date(b.time).getTime() - new Date(a.time).getTime()
    );
    setBids(sorted);
  };

  useEffect(() => { loadBids(); }, []);

  const removeBid = (index: number) => {
    const updated = [...bids];
    updated.splice(index, 1);
    localStorage.setItem("bids", JSON.stringify(updated));
    setBids(updated);
  };

  const totalBidValue = bids.reduce(
    (sum, b) => sum + Number(b.amount), 0
  );

  const card = {
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border-color)",
  };

  const surface = {
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl shadow-inner border border-indigo-500/30">
            <Gavel className="text-indigo-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
              My Active Bids
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Track and manage your ongoing auction participation.
            </p>
          </div>
        </div>

        {/* Summary stats */}
        {bids.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            <div className="px-4 py-2 rounded-xl text-sm font-semibold" style={surface}>
              <span style={{ color: "var(--text-muted)" }}>Total Bids:</span>{" "}
              <span style={{ color: "var(--text-primary)" }}>{bids.length}</span>
            </div>
            <div className="px-4 py-2 rounded-xl text-sm font-semibold" style={surface}>
              <span style={{ color: "var(--text-muted)" }}>Total Value:</span>{" "}
              <span className="text-emerald-400">
                ₹{totalBidValue.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}
      </div>

      {bids.length === 0 ? (
        /* Empty state */
        <div className="text-center py-24 rounded-3xl backdrop-blur-sm" style={card}>
          <Gavel className="w-16 h-16 text-indigo-500/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            No bids placed yet
          </h2>
          <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
            You haven't participated in any auto auctions.
          </p>
          <Link
            to="/auctions"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/20"
          >
            Explore Auctions
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bids.map((bid, index) => (
            <div
              key={`${bid.vehicleId}-${index}`}
              className="group relative rounded-2xl p-6 flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-color)",
              }}
            >
              {/* Subtle hover accent */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />

              <div className="relative z-10 flex-1 flex flex-col">
                {/* Title row */}
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold tracking-tight leading-tight" style={{ color: "var(--text-primary)" }}>
                    {bid.brand}{" "}
                    <span style={{ color: "var(--text-secondary)" }}>{bid.model}</span>
                  </h2>
                  <div className="flex gap-1.5">
                    <Link
                      to={`/vehicle/${bid.vehicleId}`}
                      className="p-2 rounded-lg transition-colors"
                      style={surface}
                      title="View Auction"
                    >
                      <ExternalLink className="w-4 h-4 text-indigo-400" />
                    </Link>
                    <button
                      onClick={() => removeBid(index)}
                      className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
                      style={surface}
                      title="Remove Bid"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </button>
                  </div>
                </div>

                {/* Bid amount */}
                <div className="mt-auto pt-4" style={{ borderTop: "1px solid var(--border-color)" }}>
                  <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                    Your Bid Amount
                  </p>
                  <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-3">
                    ₹{Number(bid.amount).toLocaleString("en-IN")}
                  </p>

                  {/* Timestamp */}
                  <div
                    className="flex items-center gap-2 text-xs font-medium px-3 py-2 w-max rounded-lg"
                    style={surface}
                  >
                    <Clock className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                    <span style={{ color: "var(--text-muted)" }}>
                      {new Date(bid.time).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyBids;
