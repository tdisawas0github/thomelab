"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ID, Permission, Role } from "appwrite";
import { getAccount, getDatabases } from "@/lib/appwrite";
import type { Models } from "appwrite";
import AuthForm from "@/components/AuthForm";

type TaskDoc = Models.Document & {
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  dueDate?: string | null;
};

export default function TasksPage() {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const collectionId = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID;
  const ready = Boolean(databaseId && collectionId);

  useEffect(() => {
    const account = getAccount();
    account
      .get()
      .then((u) => setUser(u as Models.User<Models.Preferences>))
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
  }, []);

  const loadTasks = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    setError(null);
    try {
      const databases = getDatabases();
      const res = await databases.listDocuments({
        databaseId: databaseId as string,
        collectionId: collectionId as string,
        queries: [],
      });
      setTasks(res.documents as unknown as TaskDoc[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load tasks";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [ready, databaseId, collectionId]);

  useEffect(() => {
    if (user && ready) {
      void loadTasks();
    }
  }, [user, ready, loadTasks]);

  async function addTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !ready) return;
    setLoading(true);
    setError(null);
    try {
      const databases = getDatabases();
      const permissions = [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
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
      await loadTasks();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add task";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function completeTask(doc: TaskDoc) {
    if (!ready) return;
    setLoading(true);
    setError(null);
    try {
      const databases = getDatabases();
      await databases.updateDocument({
        databaseId: databaseId as string,
        collectionId: collectionId as string,
        documentId: doc.$id,
        data: { status: "done" },
      });
      await loadTasks();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update task";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTask(doc: TaskDoc) {
    if (!ready) return;
    setLoading(true);
    setError(null);
    try {
      const databases = getDatabases();
      await databases.deleteDocument({
        databaseId: databaseId as string,
        collectionId: collectionId as string,
        documentId: doc.$id,
      });
      await loadTasks();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete task";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const sortedTasks = useMemo(() => {
    const arr = [...tasks];
    arr.sort((a, b) => {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return ad - bd;
    });
    return arr;
  }, [tasks]);

  if (loadingUser) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-zinc-700 dark:text-zinc-300">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Sign in to manage tasks</h1>
        <div className="mt-4">
          <AuthForm onAuth={(u) => setUser(u)} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Tasks</h1>
      {!ready && (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Configure Appwrite envs</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <form onSubmit={addTask} className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="col-span-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-black outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
          disabled={!ready || loading}
          className="col-span-2 rounded-md bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
        >
          {loading ? "Saving..." : "Add Task"}
        </button>
      </form>
      <div className="mt-8 space-y-2">
        {sortedTasks.length === 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No tasks yet</p>
        )}
        {sortedTasks.map((t) => (
          <div key={t.$id} className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
            <div>
              <p className="font-medium text-black dark:text-zinc-50">{t.title}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{t.priority} · {t.status} {t.dueDate ? `· due ${new Date(t.dueDate).toLocaleDateString()}` : ""}</p>
            </div>
            <div className="flex gap-2">
              {t.status !== "done" && (
                <button
                  onClick={() => completeTask(t)}
                  className="rounded-md bg-black px-3 py-1 text-sm text-white dark:bg-zinc-50 dark:text-black"
                >
                  Complete
                </button>
              )}
              <button
                onClick={() => deleteTask(t)}
                className="rounded-md border border-zinc-300 px-3 py-1 text-sm text-black dark:border-zinc-700 dark:text-zinc-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
