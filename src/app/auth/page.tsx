"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "signin" | "signup" | "reset";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, error, signIn, signUp, resetPassword, signOut } = useAuth();

  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailForReset, setEmailForReset] = useState("");

  // Get redirect URL from search params
  const redirectUrl = searchParams?.get('redirect') || '/';

  // Debug logging
  useEffect(() => {
    console.log('Auth Page Debug:', {
      user: user?.email,
      loading,
      redirectUrl,
      hasUser: !!user
    });
  }, [user, loading, redirectUrl]);

  // If user is already signed in, redirect them
  useEffect(() => {
    if (user && !loading) {
      console.log('Redirecting signed-in user to:', redirectUrl);
      // Add a small delay to prevent redirect loops
      const timer = setTimeout(() => {
        window.location.href = redirectUrl;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, loading, router, redirectUrl]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    console.log('Attempting sign in with:', email, 'redirect to:', redirectUrl);
    try {
      await signIn(email, password);
      console.log('Sign in successful, redirecting to:', redirectUrl);
      // Use window.location.href for more reliable redirect
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 100);
    } catch (error) {
      console.error('Sign in error:', error);
      // Error is handled by AuthContext
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    try {
      await signUp(email, password);
      // Use window.location.href for more reliable redirect
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 100);
    } catch (error) {
      console.error('Sign up error:', error);
      // Error is handled by AuthContext
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    await resetPassword(emailForReset);
    alert("Password reset email sent (if the email exists). Check your inbox.");
    setTab("signin");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md border rounded-lg p-6 bg-white/5">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="text-sm text-gray-500">
            {user ? (
              <>
                Signed in as <strong>{user.email}</strong>.{" "}
                <button
                  className="text-blue-600 underline"
                  onClick={() => signOut()}
                >
                  Sign out
                </button>
              </>
            ) : (
              "Create an account or sign in."
            )}
          </p>
        </header>

        <nav className="mb-6 grid grid-cols-3 gap-2">
          <button
            onClick={() => setTab("signin")}
            className={`px-3 py-2 rounded border ${tab === "signin" ? "bg-black text-white" : ""}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab("signup")}
            className={`px-3 py-2 rounded border ${tab === "signup" ? "bg-black text-white" : ""}`}
          >
            Sign Up
          </button>
          <button
            onClick={() => setTab("reset")}
            className={`px-3 py-2 rounded border ${tab === "reset" ? "bg-black text-white" : ""}`}
          >
            Reset
          </button>
        </nav>

        {error && (
          <div className="mb-4 text-sm text-red-600 border border-red-300 rounded p-2 bg-red-50">
            {error}
          </div>
        )}

        {tab === "signin" && (
          <form onSubmit={handleSignIn} className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm">Email</span>
              <input
                type="email"
                required
                className="border rounded px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Password</span>
              <input
                type="password"
                required
                className="border rounded px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
            <div className="text-sm">
              Forgot your password?{" "}
              <button
                type="button"
                className="text-blue-600 underline"
                onClick={() => setTab("reset")}
              >
                Reset it
              </button>
            </div>
          </form>
        )}

        {tab === "signup" && (
          <form onSubmit={handleSignUp} className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm">Email</span>
              <input
                type="email"
                required
                className="border rounded px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Password</span>
              <input
                type="password"
                required
                minLength={6}
                className="border rounded px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>
        )}

        {tab === "reset" && (
          <form onSubmit={handleReset} className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm">Email</span>
              <input
                type="email"
                required
                className="border rounded px-3 py-2"
                value={emailForReset}
                onChange={(e) => setEmailForReset(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 px-4 py-2 rounded bg-amber-600 text-white disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <div className="text-sm">
              Remembered password?{" "}
              <button
                type="button"
                className="text-blue-600 underline"
                onClick={() => setTab("signin")}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        <footer className="mt-8 text-xs text-gray-500">
          <Link href="/" className="underline">Back to Home</Link>
        </footer>
      </div>
    </main>
  );
}