"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
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
                throw new Error(j?.error || "Falha no login");
                window.location.assign(from);
            }
            router.push(from);
        } catch (err: any) {
            setError(err.message || "Erro ao autenticar");
        } finally {
            setLoading(false);
        }
    }

    return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border rounded-lg p-6 shadow bg-white"
      >
        <h1 className="text-2xl font-bold mb-4 text-center">Login do Painel</h1>

        {error && (
          <div className="mb-3 text-sm text-red-600">{error}</div>
        )}

        <label className="block text-sm mb-1">Usuário</label>
        <input
          className="w-full border rounded p-2 mb-3 text-black"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Seu usuário"
          autoComplete="username"
          required
        />

        <label className="block text-sm mb-1">Senha</label>
        <input
          type="password"
          className="w-full border rounded p-2 mb-4 text-black"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Sua senha"
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}