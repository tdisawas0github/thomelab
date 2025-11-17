"use client";
import { useEffect, useState } from "react";
import { ID, Permission, Role } from "appwrite";
import { getAccount, getDatabases } from "@/lib/appwrite";
import type { Models } from "appwrite";

export default function Home() {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);

  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const collectionId = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID;
  const canCreate = Boolean(databaseId && collectionId && user);

  useEffect(() => {
    const account = getAccount();
    account.get().then((u) => setUser(u as Models.User<Models.Preferences>)).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const databases = getDatabases();
      const permissions = [
        Permission.read(Role.user(user!.$id)),
        Permission.update(Role.user(user!.$id)),
        Permission.delete(Role.user(user!.$id)),
      ];
      await databases.createDocument({
        databaseId: databaseId as string,
        collectionId: collectionId as string,
        documentId: ID.unique(),
        data: {
          title,
          status: "todo",
          priority,
          dueDate: dueDate || null,
        },
        permissions,
      });
      setTitle("");
      setPriority("medium");
      setDueDate("");
      setStatusMsg("Task created");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create task";
      setStatusMsg(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">THOMELAB</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Quick add a task</p>
        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="col-span-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-black outline-none ring-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-black outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-black outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={!canCreate || loading}
            className="col-span-2 rounded-md bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
          >
            {loading ? "Saving..." : canCreate ? "Add Task" : user ? "Configure Appwrite envs" : "Sign in to add"}
          </button>
        </form>
        {statusMsg && (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{statusMsg}</p>
        )}
      </main>
    </div>
  );
}
