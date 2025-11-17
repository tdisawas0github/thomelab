"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccount } from "@/lib/appwrite";
import type { Models } from "appwrite";
import AuthForm from "./AuthForm";

export default function Header() {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const account = getAccount();
    account.get().then((u) => setUser(u as Models.User<Models.Preferences>)).catch(() => {});
  }, []);

  async function logout() {
    const account = getAccount();
    await account.deleteSession("current");
    setUser(null);
  }

  return (
    <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-black dark:text-zinc-50">
          THOMELAB
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/tasks" className="text-sm text-zinc-700 dark:text-zinc-300">
            Tasks
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{user.email}</span>
              <button
                onClick={logout}
                className="rounded-md bg-black px-3 py-1 text-sm text-white dark:bg-zinc-50 dark:text-black"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-md bg-black px-3 py-1 text-sm text-white dark:bg-zinc-50 dark:text-black"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
      {!user && open && (
        <div className="mx-auto max-w-4xl px-6 pb-6">
          <AuthForm onAuth={(u) => { setUser(u); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}
