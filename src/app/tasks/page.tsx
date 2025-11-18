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
  const [success, setSuccess] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | TaskDoc["status"]>("all");
  const [filterPriority, setFilterPriority] = useState<"all" | TaskDoc["priority"]>("all");
  const [query, setQuery] = useState("");

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
      setSuccess("Task added");
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
    if (typeof window !== "undefined" && !window.confirm("Delete this task?")) return;
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

  const filtered = useMemo(() => {
    let arr = [...tasks];
    if (filterStatus !== "all") arr = arr.filter((t) => t.status === filterStatus);
    if (filterPriority !== "all") arr = arr.filter((t) => t.priority === filterPriority);
    if (query.trim()) arr = arr.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()));
    return arr;
  }, [tasks, filterStatus, filterPriority, query]);

  

  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return ad - bd;
    });
    return arr;
  }, [filtered]);

  function priorityClass(p: TaskDoc["priority"]) {
    if (p === "high") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    if (p === "medium") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  }

  function statusClass(s: TaskDoc["status"]) {
    if (s === "done") return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    if (s === "in_progress") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }

  function dueLabel(d?: string | null) {
    if (!d) return "No due";
    const date = new Date(d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((date.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "Due today";
    if (diff === 1) return "Due tomorrow";
    if (diff < 0) return `Overdue ${Math.abs(diff)}d`;
    return `Due in ${diff}d`;
  }

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
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Tasks</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{tasks.length} total</p>
      </div>
      {!ready && (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Configure Appwrite envs</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
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
      <div className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | TaskDoc["status"])}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="all">All statuses</option>
              <option value="todo">Todo</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as "all" | TaskDoc["priority"])}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="all">All priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Search tasks"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div className="mt-4 space-y-2">
          {sortedFiltered.length === 0 && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No tasks match your filters</p>
          )}
          {sortedFiltered.map((t) => (
            <div key={t.$id} className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs ${priorityClass(t.priority)}`}>{t.priority}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(t.status)}`}>{t.status.replace("_", " ")}</span>
                <p className="font-medium text-black dark:text-zinc-50">{t.title}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${t.dueDate && new Date(t.dueDate) < new Date() ? "text-red-600 dark:text-red-400" : "text-zinc-600 dark:text-zinc-400"}`}>{dueLabel(t.dueDate ?? undefined)}</span>
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
    </div>
  );
}
