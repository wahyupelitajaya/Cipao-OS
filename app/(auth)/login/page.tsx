"use client";

import { FormEvent, useState, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { isSafeRedirectPath } from "@/lib/validation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const supabase = createSupabaseBrowserClient();

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Pastikan session sudah tersimpan di cookie sebelum redirect.
    await supabase.auth.getSession();

    const redirectTo = searchParams.get("redirectTo");
    const destination =
      redirectTo && isSafeRedirectPath(redirectTo) ? redirectTo : "/dashboard";
    // Full page redirect agar request berikutnya selalu kirim cookie (bukan client-side nav).
    window.location.href = destination;
  }

  return (
    <div className="w-full max-w-xs">
      <div className="mb-12 flex items-center gap-3">
        <Image
          src="/favicon.ico?v=2"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 object-contain"
          unoptimized
        />
        <span className="text-lg font-medium tracking-tight text-foreground">
          Cipao OS
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
          />
        </div>
        {error && (
          <p className="text-sm text-muted-foreground">
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      }
    >
      <div className="flex min-h-screen items-center justify-center px-6">
        <LoginForm />
      </div>
    </Suspense>
  );
}
