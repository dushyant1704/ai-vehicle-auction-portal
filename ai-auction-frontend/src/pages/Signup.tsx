import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Gavel, User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"buyer" | "seller" | "bank">("buyer");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const passwordStrength = (): { label: string; color: string; bars: number } => {
    if (password.length === 0) return { label: "", color: "", bars: 0 };
    if (password.length < 6) return { label: "Weak", color: "bg-red-500", bars: 1 };
    if (password.length < 10) return { label: "Fair", color: "bg-yellow-500", bars: 2 };
    return { label: "Strong", color: "bg-emerald-500", bars: 3 };
  };

  const strength = passwordStrength();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password, role);
      toast.success(`Welcome to AI Auction Portal, ${name.trim().split(" ")[0]}! 🎉`);
      navigate("/");
    } catch (err: any) {
      console.error("Signup error:", err);
      const serverError = err?.response?.data?.error || err?.response?.data?.message;
      let msg = serverError;
      if (!msg) {
        if (!err.response) {
          msg = "Cannot connect to server. Please ensure the backend server is running on http://localhost:5000.";
        } else {
          msg = "Signup failed. Please try again.";
        }
      }
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25 transition-transform hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%)",
                boxShadow: "0 0 0 1px rgba(139,92,246,0.3), 0 8px 24px rgba(99,102,241,0.35)"
              }}
            >
              <Gavel className="text-white w-6 h-6 drop-shadow-sm" />
            </div>
            <div className="text-left">
              <span className="block text-white font-extrabold text-2xl sm:text-3xl tracking-tight leading-none">
                AI Auction Portal
              </span>
              <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-indigo-400 uppercase mt-0.5 block">
                Repossessed Asset Marketplace
              </span>
            </div>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto">
            Create an account to participate in vehicle auctions & asset management
          </p>
        </header>

        {/* Card */}
        <div className="bg-slate-800/70 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-1.5 text-center">Create account</h1>
          <p className="text-slate-400 text-sm text-center mb-6">
            Select your account type and get started
          </p>

          {/* Role Selector */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <button
              type="button"
              onClick={() => setRole("buyer")}
              className={`p-2.5 rounded-xl border text-xs font-medium transition-all text-center ${
                role === "buyer"
                  ? "bg-indigo-600/30 border-indigo-500 text-white shadow-sm shadow-indigo-500/20"
                  : "bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="font-bold mb-0.5">Buyer</div>
              <div className="text-[10px] opacity-80">Bid & Buy</div>
            </button>
            <button
              type="button"
              onClick={() => setRole("seller")}
              className={`p-2.5 rounded-xl border text-xs font-medium transition-all text-center ${
                role === "seller"
                  ? "bg-indigo-600/30 border-indigo-500 text-white shadow-sm shadow-indigo-500/20"
                  : "bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="font-bold mb-0.5">Seller</div>
              <div className="text-[10px] opacity-80">List Vehicles</div>
            </button>
            <button
              type="button"
              onClick={() => setRole("bank")}
              className={`p-2.5 rounded-xl border text-xs font-medium transition-all text-center ${
                role === "bank"
                  ? "bg-indigo-600/30 border-indigo-500 text-white shadow-sm shadow-indigo-500/20"
                  : "bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="font-bold mb-0.5">Bank / Inst.</div>
              <div className="text-[10px] opacity-80">Repossessions</div>
            </button>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-6"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-slate-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-slate-300 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password strength bars */}
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((bar) => (
                      <div
                        key={bar}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          strength.bars >= bar ? strength.color : "bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${
                    strength.bars === 1 ? "text-red-400" :
                    strength.bars === 2 ? "text-yellow-400" : "text-emerald-400"
                  }`}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="signup-confirm" className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="signup-confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                />
                {confirmPassword.length > 0 && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {confirmPassword === password ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              id="signup-submit-btn"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-slate-500 text-xs">or</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          <p className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Sign in instead
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <p className="text-center mt-6 text-sm text-slate-500">
          <Link to="/" className="hover:text-slate-300 transition-colors">
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
