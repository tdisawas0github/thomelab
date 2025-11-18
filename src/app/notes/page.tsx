"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ID, Permission, Role } from "appwrite";
import { getAccount, getDatabases } from "@/lib/appwrite";
import type { Models } from "appwrite";
import AuthForm from "@/components/AuthForm";

type NoteDoc = Models.Document & {
  title: string;
  content: string;
  category?: string | null;
};

export default function NotesPage() {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [notes, setNotes] = useState<NoteDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const collectionId = process.env.NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID;
  const ready = Boolean(databaseId && collectionId);

  useEffect(() => {
    const account = getAccount();
    account
      .get()
      .then((u) => setUser(u as Models.User<Models.Preferences>))
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
  }, []);

  const loadNotes = useCallback(async () => {
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
      setNotes(res.documents as unknown as NoteDoc[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load notes";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [ready, databaseId, collectionId]);

  useEffect(() => {
    if (user && ready) {
      void loadNotes();
    }
  }, [user, ready, loadNotes]);

  async function addNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !ready) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
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
          content,
          category: category || null,
        },
        permissions,
      });
      setTitle("");
      setContent("");
      setCategory("");
      await loadNotes();
      setSuccess("Note added");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add note";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(n: NoteDoc) {
    setEditingId(n.$id);
    setEditTitle(n.title);
    setEditContent(n.content);
    setEditCategory(n.category || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
    setEditCategory("");
  }

  async function saveEdit() {
    if (!editingId || !ready) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const databases = getDatabases();
      await databases.updateDocument({
        databaseId: databaseId as string,
        collectionId: collectionId as string,
        documentId: editingId,
        data: {
          title: editTitle,
          content: editContent,
          category: editCategory || null,
        },
      });
      await loadNotes();
      cancelEdit();
      setSuccess("Note updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update note";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteNote(n: NoteDoc) {
    if (!ready) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this note?")) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const databases = getDatabases();
      await databases.deleteDocument({
        databaseId: databaseId as string,
        collectionId: collectionId as string,
        documentId: n.$id,
      });
      await loadNotes();
      setSuccess("Note deleted");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete note";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let arr = [...notes];
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
    }
    return arr;
  }, [notes, query]);

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
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Sign in to manage notes</h1>
        <div className="mt-4">
          <AuthForm onAuth={(u) => setUser(u)} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Notes</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{notes.length} total</p>
      </div>
      {!ready && (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Configure Appwrite envs</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}

      <form onSubmit={addNote} className="mt-6 space-y-3">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <textarea
          placeholder="Write your note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={6}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Category (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-black outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={!ready || loading}
            className="rounded-md bg-black px-4 py-2 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-50 dark:text-black"
          >
            {loading ? "Saving..." : "Add Note"}
          </button>
        </div>
      </form>

      <div className="mt-8 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <input
            type="text"
            placeholder="Search notes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No notes yet</p>
        )}

        {filtered.map((n) => (
          <div key={n.$id} className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            {editingId === n.$id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    placeholder="Category"
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-black outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                  <button
                    onClick={saveEdit}
                    className="rounded-md bg-black px-3 py-1 text-sm text-white cursor-pointer dark:bg-zinc-50 dark:text-black"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="rounded-md border border-zinc-300 px-3 py-1 text-sm text-black cursor-pointer dark:border-zinc-700 dark:text-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-black dark:text-zinc-50">{n.title}</p>
                  {n.category && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{n.category}</p>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{n.content}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(n)}
                    className="rounded-md bg-black px-3 py-1 text-sm text-white cursor-pointer dark:bg-zinc-50 dark:text-black"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteNote(n)}
                    className="rounded-md border border-zinc-300 px-3 py-1 text-sm text-black cursor-pointer dark:border-zinc-700 dark:text-zinc-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
