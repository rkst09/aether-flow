import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

function ConfirmEmail({ email }: { email: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full max-w-[400px] bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-8 text-center space-y-5"
    >
      <div className="flex justify-center">
        <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
          <Mail className="h-6 w-6 text-indigo-500" strokeWidth={1.5} />
        </div>
      </div>
      <div className="space-y-1.5">
        <h2 className="text-[20px] font-bold text-slate-900">Check your email</h2>
        <p className="text-[13px] text-slate-500 leading-relaxed">
          We sent a confirmation link to<br />
          <span className="font-medium text-slate-700">{email}</span>
        </p>
      </div>
      <p className="text-[12px] text-slate-400">
        Click the link in the email to activate your account, then{" "}
        <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
          sign in
        </Link>
        .
      </p>
    </motion.div>
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const { user, signUp, signInWithGoogle, signInWithGitHub } = useAuth();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [touched,      setTouched]      = useState({ email: false, password: false });
  const [submitting,   setSubmitting]   = useState(false);
  const [authError,    setAuthError]    = useState("");
  const [confirmed,    setConfirmed]    = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user]);

  const emailError = touched.email && (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ? (!email.trim() ? "Email is required" : "Enter a valid email address") : "";
  const passwordError = touched.password && password.length < 8
    ? (password.length === 0 ? "Password is required" : "Password must be at least 8 characters") : "";
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isValid) return;
    setSubmitting(true);
    setAuthError("");
    const { error, needsConfirmation } = await signUp(email, password);
    if (error) {
      setAuthError(
        error.message.includes("already registered")
          ? "An account with this email already exists."
          : error.message
      );
      setSubmitting(false);
    } else if (needsConfirmation) {
      setConfirmed(true);
    } else {
      navigate("/dashboard", { replace: true });
    }
  }

  async function handleGoogle() {
    setOauthLoading("google");
    const { error } = await signInWithGoogle();
    if (error) { setAuthError(error.message); setOauthLoading(null); }
  }

  async function handleGitHub() {
    setOauthLoading("github");
    const { error } = await signInWithGitHub();
    if (error) { setAuthError(error.message); setOauthLoading(null); }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-4 py-12">

      <Link to="/" className="mb-8 text-[15px] font-semibold text-slate-900 hover:text-slate-700 transition-colors">
        Aether
      </Link>

      {confirmed ? (
        <ConfirmEmail email={email} />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-[400px] bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-8 space-y-6"
        >
          <div className="text-center space-y-1">
            <h1 className="text-[22px] font-bold text-slate-900">Create your account</h1>
            <p className="text-[13px] text-slate-500">Start building your product system</p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={handleGoogle}
              disabled={!!oauthLoading || submitting}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-zinc-200 rounded-xl bg-white hover:bg-zinc-50 hover:border-zinc-300 text-sm font-medium text-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {oauthLoading === "google"
                ? <span className="h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                : <GoogleIcon />}
              Continue with Google
            </button>
            <button
              onClick={handleGitHub}
              disabled={!!oauthLoading || submitting}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-zinc-200 rounded-xl bg-white hover:bg-zinc-50 hover:border-zinc-300 text-sm font-medium text-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {oauthLoading === "github"
                ? <span className="h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                : <GitHubIcon />}
              Continue with GitHub
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-200" />
            <span className="text-[12px] text-slate-400">or</span>
            <div className="flex-1 h-px bg-zinc-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authError && (
              <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">
                {authError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setAuthError(""); }}
                onBlur={() => setTouched(t => ({ ...t, email: true }))}
                placeholder="you@company.com"
                className={cn(
                  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all",
                  emailError ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/20" : "border-zinc-200",
                )}
              />
              {emailError && <p className="text-[12px] text-rose-500">{emailError}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); if (!touched.password) setTouched(t => ({ ...t, password: true })); }}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  placeholder="Min. 8 characters"
                  className={cn(
                    "w-full rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all",
                    passwordError ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/20" : "border-zinc-200",
                  )}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPass ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>
              {passwordError && <p className="text-[12px] text-rose-500">{passwordError}</p>}
            </div>

            <motion.button
              type="submit"
              disabled={submitting || !!oauthLoading}
              whileHover={!submitting ? { scale: 1.01 } : {}}
              whileTap={!submitting ? { scale: 0.98 } : {}}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all mt-2",
                submitting ? "bg-indigo-400 cursor-not-allowed" : "bg-[#6366F1] hover:bg-[#4F46E5]"
              )}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating account…
                </span>
              ) : (
                <>Create Account <ArrowRight className="h-4 w-4" strokeWidth={2} /></>
              )}
            </motion.button>
          </form>

          <p className="text-center text-[13px] text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
              Log in
            </Link>
          </p>
        </motion.div>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="mt-6 text-[12px] text-slate-400 text-center max-w-xs"
      >
        By creating an account, you agree to our Terms of Service and Privacy Policy
      </motion.p>
    </div>
  );
}
