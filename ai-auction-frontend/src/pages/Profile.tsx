import { User, Mail, Award, Clock, ShieldCheck, Settings, TrendingUp, LogIn, IndianRupee } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bidsCount, setBidsCount] = useState(0);
  const [totalExposure, setTotalExposure] = useState(0);
  const [highestBid, setHighestBid] = useState(0);

  useEffect(() => {
    const storedBids = JSON.parse(localStorage.getItem("bids") || "[]");
    setBidsCount(storedBids.length);
    const exposure = storedBids.reduce(
      (acc: number, bid: any) => acc + Number(bid.amount), 0
    );
    setTotalExposure(exposure);
    const max = storedBids.reduce(
      (m: number, bid: any) => Math.max(m, Number(bid.amount)), 0
    );
    setHighestBid(max);
  }, []);

  const card = {
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border-color)",
  };
  const surface = {
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
  };

  // Not logged in
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={surface}
        >
          <User className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
          You're not logged in
        </h2>
        <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
          Please sign in to view your profile and bid history.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold px-8 py-3 rounded-xl hover:shadow-lg hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-105"
        >
          <LogIn className="w-4 h-4" /> Sign In
        </Link>
      </div>
    );
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const formatINR = (val: number) =>
    val > 0
      ? val >= 100_000
        ? `₹${(val / 100_000).toFixed(1)}L`
        : `₹${val.toLocaleString("en-IN")}`
      : "₹0";

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div
        className="backdrop-blur-xl rounded-3xl p-8 relative overflow-hidden shadow-2xl"
        style={card}
      >
        {/* Subtle glow blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/8 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/8 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">

          {/* Avatar */}
          <div className="relative group shrink-0">
            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-600">
              <div
                className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: "var(--bg-secondary)" }}
              >
                <User className="text-indigo-400 w-16 h-16" />
              </div>
            </div>
            <div
              className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-full border-4 shadow-xl"
              style={{ borderColor: "var(--bg-card)" }}
              title="Verified Account"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* User details */}
          <div className="flex-1 w-full text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  {user.name}
                </h1>
                <p className="flex items-center justify-center md:justify-start gap-2 mt-1" style={{ color: "var(--text-secondary)" }}>
                  <Mail className="w-4 h-4" /> {user.email}
                </p>
                <span
                  className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full capitalize"
                  style={{
                    background: "rgba(99,102,241,0.12)",
                    color: "#818cf8",
                    border: "1px solid rgba(99,102,241,0.3)",
                  }}
                >
                  {user.role || "Bidder"}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-center md:justify-end">
                <button
                  className="flex items-center justify-center gap-2 px-5 py-2.5 font-medium rounded-xl transition-colors shadow-sm"
                  style={surface}
                  onClick={() => navigate("/my-bids")}
                >
                  <Settings className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                  <span style={{ color: "var(--text-primary)" }}>My Bids</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl border border-red-500/30 transition-colors shadow-sm"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={<Award className="w-5 h-5 text-indigo-400" />}
                iconBg="bg-indigo-500/20"
                label="Active Bids"
                value={String(bidsCount)}
                surface={surface}
              />
              <StatCard
                icon={<IndianRupee className="w-5 h-5 text-emerald-400" />}
                iconBg="bg-emerald-500/20"
                label="Total Exposure"
                value={formatINR(totalExposure)}
                surface={surface}
              />
              <StatCard
                icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}
                iconBg="bg-cyan-500/20"
                label="Highest Bid"
                value={formatINR(highestBid)}
                surface={surface}
              />
              <StatCard
                icon={<Clock className="w-5 h-5 text-purple-400" />}
                iconBg="bg-purple-500/20"
                label="Member Since"
                value={memberSince}
                surface={surface}
                small
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, iconBg, label, value, surface, small = false,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  surface: React.CSSProperties;
  small?: boolean;
}) {
  return (
    <div
      className="p-4 rounded-2xl flex items-center gap-3"
      style={surface}
    >
      <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
        <p
          className={`font-bold truncate ${small ? "text-base" : "text-xl"}`}
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default Profile;
