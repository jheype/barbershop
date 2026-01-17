"use client";

import { Suspense, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useRouter, useSearchParams } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginSkeleton />}>
      <AdminLoginInner />
    </Suspense>
  );
}

function AdminLoginSkeleton() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-10 bg-[#0F1115]">
      <div className="w-full max-w-sm border border-[#24272D] rounded-2xl p-6 sm:p-7 shadow-[0_10px_40px_rgba(0,0,0,0.45)] bg-[#0F1115]/95 space-y-4">
        <div className="text-center mb-2 space-y-2">
          <Skeleton className="h-8 w-48 mx-auto" rounded="lg" />
          <Skeleton className="h-4 w-44 mx-auto" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-12 w-full" rounded="lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-12 w-full" rounded="lg" />
        </div>
        <Skeleton className="h-12 w-full" rounded="lg" />
      </div>
    </div>
  );
}

function AdminLoginInner() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const sp = useSearchParams();
  const from = sp.get("from") || "/painel";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Login failed");
      }

      router.replace(from);
      router.refresh();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Authentication error"));
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-lg border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 px-4 py-3";

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-10 bg-[#0F1115]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-[#24272D] rounded-2xl p-6 sm:p-7 shadow-[0_10px_40px_rgba(0,0,0,0.45)] bg-[#0F1115]/95 text-white space-y-4"
      >
        <div className="text-center mb-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide">Dashboard access</h1>
          <p className="text-sm text-[#C9CDD3] mt-1">Sign in with your credentials</p>
        </div>

        {error && (
          <div className="rounded-lg border border-fuchsia-900/40 bg-fuchsia-900/20 text-fuchsia-300 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm text-[#C9CDD3] mb-1">Username</label>
          <input
            className={input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your username"
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-[#C9CDD3] mb-1">Password</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              className={`${input} pr-12`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute inset-y-0 right-0 px-4 text-[#E4E7EC] hover:text-white"
              title={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-medium px-4 py-3 hover:opacity-95 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}