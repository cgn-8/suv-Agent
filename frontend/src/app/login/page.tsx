"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, Mail, ArrowRight, Loader2, Sparkles, UserPlus, LogIn } from "lucide-react";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign Up Flow
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }

        if (data.session) {
          router.push("/dashboard");
          router.refresh();
        } else {
          // Sign in directly
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
          });

          if (signInError) {
            setSuccessMsg("Account created! Please enter your password to sign in.");
            setIsSignUp(false);
          } else {
            router.push("/dashboard");
            router.refresh();
          }
        }
      } else {
        // Sign In Flow
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }

        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4 rounded-3xl overflow-hidden my-4 shadow-xl">
      {/* Background Silk Texture */}
      <Image
        src="/crimson_texture.jpg"
        alt="Crimson Silk Background"
        fill
        className="object-cover object-center"
        priority
      />

      {/* Dark Silk Tint */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" />

      {/* Floating Frosted Glassmorphism Card */}
      <div className="relative z-10 max-w-md w-full glass-panel rounded-3xl p-8 space-y-6 shadow-2xl border border-white/60">
        {/* Header with Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-lg shadow-rose-600/30 mb-2">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight">
            {isSignUp ? "Create Your Account" : "The Time is Now"}
          </h2>
          <p className="text-xs text-gray-600 font-medium">
            {isSignUp
              ? "Enter any email and password to start your learning journey"
              : "Sign in with your email and password to access your roadmaps"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-rose-50/80 p-1.5 rounded-2xl border border-rose-100">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              !isSignUp ? "bg-white text-rose-700 shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              isSignUp ? "bg-white text-rose-700 shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up</span>
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium">
            {successMsg}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs font-medium transition shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs font-medium transition shadow-xs"
              />
            </div>
            {isSignUp && (
              <p className="text-[11px] text-gray-500 mt-1">Minimum 6 characters</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs rounded-xl tactile-btn flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isSignUp ? "Creating Account..." : "Signing in..."}</span>
              </>
            ) : (
              <>
                <span>{isSignUp ? "Create Free Account" : "Sign In"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-[11px] text-gray-500">
            Stored securely in your Supabase database.
          </p>
        </div>
      </div>
    </div>
  );
}
