import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Hero() {
  const [stats, setStats] = useState({
    totalVehicles: 520,
    liveAuctions: 142,
    todaysInspections: 24,
    verifiedSellers: 124,
    avgConfidence: "94.8%",
    avgSellingPrice: 650000,
  });

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/vehicles/stats")
      .then((res) => {
        if (res.data?.success) {
          setStats((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {/* graceful fallback */});
  }, []);

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-900 py-20 px-4 sm:px-6 lg:px-8">
      <div className="relative max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          <span>Powered by Deep Learning & YOLOv8 Computer Vision • {stats.liveAuctions} Active Listings</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-6">
          AI-Powered Vehicle Auctions & <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Precision Valuation Platform
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-300 mb-10">
          Transparent auto auctions with instant YOLOv8 damage detection, 
          XGBoost resale valuation, and real-time live bidding.
        </p>

        <Link
          to="/auctions"
          id="explore-vehicles-btn"
          className="group inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-full font-semibold hover:shadow-xl hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-105"
        >
          <span>Explore Vehicles</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* Premium AI Platform Features Grid (Replaces duplicate stats) */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto text-left">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl hover:border-indigo-500/50 transition-all duration-300">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 mb-4 font-bold text-xl">
              🔍
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AI Damage Detection</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              YOLOv8 Deep Learning engine automatically scans vehicle images to detect dents, scratches, glass cracks, and panel misalignment.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl hover:border-purple-500/50 transition-all duration-300">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 mb-4 font-bold text-xl">
              ⚡
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Hybrid AI Valuation</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              XGBoost ML engine predicts accurate resale pricing by blending market parameters, vehicle age, mileage, and damage penalties.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl hover:border-emerald-500/50 transition-all duration-300">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-4 font-bold text-xl">
              🛡️
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Trusted Marketplace</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Verified sellers, anti-fraud bidding safeguards, and 100% AI-inspected vehicle reports for confident bidding.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl hover:border-cyan-500/50 transition-all duration-300">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400 mb-4 font-bold text-xl">
              📡
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Real-Time Auctions</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Socket.IO powered live auction room with auto-extension timer anti-sniping and instant bid updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

