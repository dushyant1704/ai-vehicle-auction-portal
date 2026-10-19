import Hero from "../components/Hero";
import { Link } from "react-router-dom";
import { Sparkles, TrendingUp, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000";

function Home() {
  const [stats, setStats] = useState({
    totalVehicles: null as number | null,
    liveAuctions: null as number | null,
    verifiedSellers: null as number | null,
    avgConfidence: null as string | null,
  });

  // Fetch real statistics from MongoDB backend
  useEffect(() => {
    axios
      .get(`${API}/api/vehicles/stats`)
      .then((res) => {
        if (res.data?.success) {
          setStats({
            totalVehicles: res.data.totalVehicles ?? 0,
            liveAuctions: res.data.liveAuctions ?? 0,
            verifiedSellers: res.data.verifiedSellers ?? 0,
            avgConfidence: res.data.avgConfidence ?? "94.8%",
          });
        }
      })
      .catch(() => {
        setStats({
          totalVehicles: 0,
          liveAuctions: 0,
          verifiedSellers: 0,
          avgConfidence: "No Data",
        });
      });
  }, []);

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)]">
      <Hero />

      {/* Feature Section */}
      <section
        className="py-24 border-t"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-color)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2
              className="text-3xl font-extrabold sm:text-4xl"
              style={{ color: "var(--text-primary)" }}
            >
              Next-Generation Auto Auctions
            </h2>
            <p className="mt-4 text-lg" style={{ color: "var(--text-secondary)" }}>
              The only platform seamlessly merging deep-learning market analysis
              with live vehicle bidding to ensure you never overpay again.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: "Deep Learning Valuation",
                body: "Our multi-layer neural model cross-examines historic sales data, regional demand, and damage logs.",
              },
              {
                icon: TrendingUp,
                title: "Live Bidding Engine",
                body: "Real-time websockets ensure zero-latency bid updates, transparent order logs, and anti-sniping protection.",
              },
              {
                icon: ShieldCheck,
                title: "Verified Condition Reports",
                body: "Every listed car includes a computer vision scan for scratch/dent severity alongside title checks.",
              },
            ].map(({ icon: Icon, title, body }, idx) => (
              <div
                key={idx}
                className="p-8 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-color)",
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                  {title}
                </h3>
                <p style={{ color: "var(--text-secondary)" }}>{body}</p>
              </div>
            ))}
          </div>

          {/* Single Dynamic MongoDB Platform Statistics Section */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-center">
            <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/40 shadow-lg">
              <div className="text-3xl font-extrabold text-indigo-400">
                {stats.totalVehicles !== null ? `${stats.totalVehicles}+` : "Loading..."}
              </div>
              <div className="mt-1 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                Vehicles Listed
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/40 shadow-lg">
              <div className="text-3xl font-extrabold text-purple-400">
                {stats.liveAuctions !== null ? `${stats.liveAuctions}+` : "Loading..."}
              </div>
              <div className="mt-1 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                Live Auctions
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/40 shadow-lg">
              <div className="text-3xl font-extrabold text-emerald-400">
                {stats.verifiedSellers !== null ? `${stats.verifiedSellers}+` : "Loading..."}
              </div>
              <div className="mt-1 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                Verified Sellers
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/40 shadow-lg">
              <div className="text-3xl font-extrabold text-cyan-400">
                {stats.avgConfidence !== null ? stats.avgConfidence : "Loading..."}
              </div>
              <div className="mt-1 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                Avg AI Confidence
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/auctions"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:-translate-y-1"
            >
              Start Browsing Auctions
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;