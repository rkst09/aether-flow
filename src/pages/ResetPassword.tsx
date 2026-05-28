import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import aetherLogo from "@/assets/aether-logo.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [done,       setDone]       = useState(false);

  // Supabase puts the token in the URL hash — getSession() picks it up automatically
  useEffect(() => {
    supabase.auth.getSession();
  }, []);

  const passwordError = password.length > 0 && password.length < 8
    ? "Password must be at least 8 characters" : "";
  const confirmError = confirm.length > 0 && confirm !== password
    ? "Passwords do not match" : "";
  const isValid = password.length >= 8 && password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="mb-8 flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        <img src={aetherLogo} alt="Aether" className="h-8 w-8 object-contain" />
        <span className="text-[15px] font-semibold text-slate-900">Aether</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-[400px] bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-8 space-y-6"
      >
        {done ? (
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-slate-900">Password updated</h2>
              <p className="text-[13px] text-slate-500 mt-1">Redirecting you to sign in…</p>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1">
              <h1 className="text-[22px] font-bold text-slate-900">Set new password</h1>
              <p className="text-[13px] text-slate-500">Choose a strong password for your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-slate-700">New password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className={cn(
                      "w-full rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400",
                      "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all",
                      passwordError ? "border-rose-300" : "border-zinc-200"
                    )}
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPass ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                  </button>
                </div>
                {passwordError && <p className="text-[12px] text-rose-500">{passwordError}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-slate-700">Confirm password</label>
                <input
                  type={showPass ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  className={cn(
                    "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all",
                    confirmError ? "border-rose-300" : "border-zinc-200"
                  )}
                />
                {confirmError && <p className="text-[12px] text-rose-500">{confirmError}</p>}
              </div>

              <motion.button
                type="submit"
                disabled={submitting || !isValid}
                whileHover={!submitting && isValid ? { scale: 1.01 } : {}}
                whileTap={!submitting && isValid ? { scale: 0.98 } : {}}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all mt-2",
                  submitting || !isValid ? "bg-indigo-400 cursor-not-allowed" : "bg-[#6366F1] hover:bg-[#4F46E5]"
                )}
              >
                {submitting ? "Updating…" : <>Update password <ArrowRight className="h-4 w-4" strokeWidth={2} /></>}
              </motion.button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
