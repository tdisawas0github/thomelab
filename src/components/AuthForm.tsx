"use client";
import { useState } from "react";
import { ID, Account } from "appwrite";
import { getAccount } from "@/lib/appwrite";
import type { Models } from "appwrite";

type Props = {
  onAuth?: (user: Models.User<Models.Preferences>) => void;
};

export default function AuthForm({ onAuth }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchUser(account: Account) {
    try {
      const user = await account.get();
      onAuth?.(user as Models.User<Models.Preferences>);
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const account = getAccount();
    try {
      if (mode === "signup") {
        await account.create(ID.unique(), email, password, name || undefined);
      }
      await account.createEmailPasswordSession(email, password);
      await fetchUser(account);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex gap-2">
        <button
          className={`rounded-md px-3 py-1 text-sm cursor-pointer ${mode === "signin" ? "bg-black text-white dark:bg-zinc-50 dark:text-black" : "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-zinc-50"}`}
          onClick={() => setMode("signin")}
          type="button"
        >
          Sign In
        </button>
        <button
          className={`rounded-md px-3 py-1 text-sm cursor-pointer ${mode === "signup" ? "bg-black text-white dark:bg-zinc-50 dark:text-black" : "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-zinc-50"}`}
          onClick={() => setMode("signup")}
          type="button"
        >
          Sign Up
        </button>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3">
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-black outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-black outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-black outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-50 dark:text-black"
        >
          {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Sign Up"}
        </button>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </div>
  );
}
