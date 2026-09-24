"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [userId, setUserId] = useState<"jon" | "ahmed">("jon");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });

      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setError(data.error ?? "Invalid user or password.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded border border-navy/10 bg-white p-6 shadow-sm"
    >
      <div className="space-y-1.5">
        <label htmlFor="user" className="block text-sm font-medium text-navy">
          User
        </label>
        <select
          id="user"
          name="userId"
          value={userId}
          onChange={(event) =>
            setUserId(event.target.value as "jon" | "ahmed")
          }
          className="w-full rounded border border-navy/15 bg-cream px-3 py-2 text-sm text-navy outline-none focus:border-coral focus:ring-1 focus:ring-coral"
        >
          <option value="jon">Jon</option>
          <option value="ahmed">Ahmed</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-navy"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded border border-navy/15 bg-cream px-3 py-2 text-sm text-navy outline-none focus:border-coral focus:ring-1 focus:ring-coral"
        />
      </div>

      {error ? (
        <p className="text-sm text-coral" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-navy px-4 py-2.5 text-sm font-medium text-cream transition hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
