import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Gavel, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back! You're now logged in.");
      navigate("/");
    } catch (err: any) {
      console.error("Login error:", err);
      const serverError = err?.response?.data?.error || err?.response?.data?.message;
      let msg = serverError;
      if (!msg) {
        if (!err.response) {
          msg = "Cannot connect to server. Please ensure the backend server is running on http://localhost:5000.";
        } else {
          msg = "Login failed. Please check your credentials.";
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
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
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
            AI-Powered Vehicle Auction & Valuation Portal
          </p>
        </header>

        {/* Card */}
        <div className="bg-slate-800/70 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-1.5 text-center">Welcome back</h1>
          <p className="text-slate-400 text-sm text-center mb-6">
            Sign in to access your authorized auctions and dashboard
          </p>

          {/* Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-6 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-300 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-email"
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
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
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
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              id="login-submit-btn"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-slate-500 text-xs">or</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Signup Link */}
          <p className="text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Create one for free
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

export default Login;
