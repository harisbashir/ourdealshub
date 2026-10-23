"use client";

import { signIn, useSession } from "next-auth/react";
import { FormEvent, useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** After login, only allow staying inside /admin (blocks evil.com tricks). */
function safeAdminCallback(raw: string | null): string {
  if (!raw) return "/admin";
  const path = raw.trim();
  if (!path.startsWith("/")) return "/admin";
  if (path.startsWith("//")) return "/admin";
  if (path.includes("\\")) return "/admin";
  if (!path.startsWith("/admin")) return "/admin";
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) return "/admin";
  return path;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, status } = useSession();
  const callbackUrl = safeAdminCallback(params.get("callbackUrl"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.replace("/admin");
    }
  }, [status, session, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="admin-shell relative flex min-h-screen items-center justify-center px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(229,62,62,0.12), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(229,62,62,0.06), transparent 50%)",
        }}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card/95 p-7 sm:p-8 shadow-sm backdrop-blur">
        <div className="text-center mb-7">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white font-bold text-xl shadow-md shadow-brand/30">
            OD
          </span>
          <h1 className="mt-4 text-2xl font-bold text-foreground tracking-tight">
            Admin sign in
          </h1>
          <p className="mt-1 text-sm text-muted">OurDealsHub console</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-input-bg px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-input-bg px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition"
            />
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-sm shadow-brand/25 hover:bg-brand-dark disabled:opacity-70 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
