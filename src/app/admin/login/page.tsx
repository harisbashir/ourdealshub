"use client";

import { signIn, useSession } from "next-auth/react";
import { BrandMark } from "@/components/BrandMark";
import { inputClass, labelClass, primaryButtonClass } from "@/components/admin/ui";
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
      setError("That email and password don't match. Check them and try again. After several tries, sign-in pauses for 15 minutes.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-border-subtle sm:p-8">
        <div className="mb-6 text-center">
          <BrandMark className="mx-auto h-14 w-14" />
          <h1 className="mt-4 text-[26px] font-bold tracking-tight text-foreground">Sign In</h1>
          <p className="mt-1 text-[15px] text-muted">OurDealsHub admin</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className={labelClass}>Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputClass} mt-1.5`}
            />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} mt-1.5`}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-[15px] text-danger">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className={`${primaryButtonClass} w-full`}>
            {loading ? "Signing In…" : "Sign In"}
          </button>
        </form>
        <p className="mt-5 text-center text-[13px] text-muted">
          Forgot your password? Ask a Super Admin to reset it.
        </p>
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
