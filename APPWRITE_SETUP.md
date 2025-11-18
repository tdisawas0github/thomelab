# Appwrite Setup for THOMELAB (Web SDK v21+)

This guide configures Appwrite for THOMELAB using the current Web SDK semantics. Recent Appwrite versions use named-parameter objects for Databases methods and introduce "Tables/Rows" terminology alongside "Collections/Documents". This app uses the Databases SDK with named parameters and user-scoped permissions.

## Prerequisites
- App running locally: `npm run dev` (from the `thomelab` directory)
- Node.js 18+
- Appwrite Cloud account: https://cloud.appwrite.io/

## 1) Project + Web Platform
1. Create a new Project in the Appwrite console.
2. Add Platform → Web → Hostname: `http://localhost:3000` → Save.

## 2) Auth: Email/Password
Ensure Email/Password is enabled in Authentication → Settings (it’s enabled by default on Cloud). The app signs users in via Appwrite sessions.

## 3) Database and Tasks Collection
1. Databases → Create Database.
2. Inside the database → Create Collection named `tasks`.
3. Attributes:
   - `title`: `string`, required
   - `status`: `enum` of `todo | in_progress | done`, default `todo`, required
   - `priority`: `enum` of `low | medium | high`, default `medium`, required
   - `dueDate`: `string` (UI sends `YYYY-MM-DD`), optional
4. Collection permissions:
   - Create: `users`
   - Read: `users`
   - Update: `users`
   - Delete: `users`

On document creation, the app also sets document permissions to the current user so only you can read/update/delete your tasks.

## 4) Environment Variables
Copy `thomelab/.env.local.example` → `thomelab/.env.local` and fill:

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your_database_id
NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID=your_tasks_collection_id
NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION_ID=your_activities_collection_id
NEXT_PUBLIC_APPWRITE_TIMELOGS_COLLECTION_ID=your_timelogs_collection_id
NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID=your_notes_collection_id
```

Restart after changes:
```bash
npm run dev
```

## 5) Where To Get These IDs (Activities & Time Logs)
- In the Appwrite console:
  - Go to `Databases` → open your database → `Collections`.
  - Click `New Collection` and create:
    - `activities` (for sessions you start/stop, e.g., coding, studying)
    - `time_logs` (for start/stop timestamps and durations)
  - After each collection is created, open it → `Overview` → copy its `ID`.
  - Paste those into `NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION_ID` and `NEXT_PUBLIC_APPWRITE_TIMELOGS_COLLECTION_ID` in `.env.local`.

Suggested attributes:
- `activities` collection:
  - `type`: `string` (e.g., `coding`, `gaming`, `studying`)
  - `notes`: `string` (optional)
  - `startedAt`: `datetime`
  - `endedAt`: `datetime` (optional)
- `time_logs` collection:
  - `activityId`: `string` (store related activity document ID)
  - `taskId`: `string` (optional; link logs to tasks)
  - `startedAt`: `datetime`
  - `endedAt`: `datetime`
  - `durationSeconds`: `integer`

Collection permissions (recommended):
- Create/Read/Update/Delete: `users`
  - The app will still set per-document permissions to the signed-in user using `Role.user(<userId>)` so only you can access your rows.

## 7) Try It
1. Open `http://localhost:3000/` → click "Sign In" → sign up/sign in.
2. Visit `http://localhost:3000/tasks` → add, complete, delete tasks.

## 8) How This App Integrates Appwrite
- Client init: `src/lib/appwrite.ts:10-16` creates the Appwrite client with endpoint + project.
- Auth:
  - Sign in/up form: `src/components/AuthForm.tsx:26-43` creates sessions via Email/Password.
  - Header with auth state + logout: `src/components/Header.tsx:17-21`.
- Databases (named params):
  - List tasks: `src/app/tasks/page.tsx:38-52`
    ```ts
    const res = await databases.listDocuments({
      databaseId, collectionId, queries: []
    });
    ```
  - Create task (user-scoped permissions): `src/app/tasks/page.tsx:66-83`
    ```ts
    await databases.createDocument({
      databaseId, collectionId, documentId: ID.unique(),
      data: { title, status: "todo", priority, dueDate },
      permissions: [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ],
    });
    ```
  - Update task status: `src/app/tasks/page.tsx:101-107`
    ```ts
    await databases.updateDocument({
      databaseId, collectionId, documentId: doc.$id,
      data: { status: "done" },
    });
    ```
  - Delete task: `src/app/tasks/page.tsx:122-124`
    ```ts
    await databases.deleteDocument({
      databaseId, collectionId, documentId: doc.$id,
    });
    ```

Optional: Activities & Time Logs code (example patterns)
- Create activity with user-only permissions:
  ```ts
  await databases.createDocument({
    databaseId,
    collectionId: process.env.NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION_ID!,
    documentId: ID.unique(),
    data: { type: "coding", startedAt: new Date().toISOString() },
    permissions: [
      Permission.read(Role.user(user.$id)),
      Permission.update(Role.user(user.$id)),
      Permission.delete(Role.user(user.$id)),
    ],
  });
  ```
- Log time for an activity:
  ```ts
  await databases.createDocument({
    databaseId,
    collectionId: process.env.NEXT_PUBLIC_APPWRITE_TIMELOGS_COLLECTION_ID!,
    documentId: ID.unique(),
    data: {
      activityId: activity.$id,
      startedAt: startISO,
      endedAt: endISO,
      durationSeconds: Math.floor((new Date(endISO).getTime() - new Date(startISO).getTime()) / 1000),
    },
    permissions: [
      Permission.read(Role.user(user.$id)),
      Permission.update(Role.user(user.$id)),
      Permission.delete(Role.user(user.$id)),
    ],
  });
  ```

Notes on terminology:
- New docs may refer to "Tables" and "Rows" (TablesDB, `createRow`, `listRows`). In this app, we use Databases with Collections/Documents, which remain fully supported in the Web SDK v21+. The API now prefers named-parameter objects, shown above.

## Troubleshooting
- Origin/CORS errors: Ensure Platform → Web includes `http://localhost:3000`.
- Missing env: The app will throw descriptive errors; fill `.env.local` and restart.
- Permission denied: Sign in first and verify collection permissions are set to `users`.
- Not found: Confirm `PROJECT_ID`, `DATABASE_ID`, `TASKS_COLLECTION_ID` match console values.
- Date parsing: UI sends `YYYY-MM-DD`. If you switch `dueDate` to `datetime`, send full ISO strings.

## Optional (Future)
- Add `projects`, `activities`, `time_logs` collections.
- Add indexes to `tasks` for performance.
- Consider TablesDB with generics for type-safe rows if you prefer the new terminology.

You’re set. With envs and permissions configured, THOMELAB handles auth and task management securely via Appwrite.
## 6) Notes Collection (IDs and Schema)
- Create a `notes` collection for your note-taking page.
- After creating, copy the collection `ID` and paste into `NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID` in `.env.local`.
- Suggested attributes:
  - `title`: `string`, required
  - `content`: `string`, required
  - `category`: `string`, optional
- Permissions: Create/Read/Update/Delete → `users` (the app also sets per-document permissions to the current user).

Notes page route: `/notes`. Code uses named-parameter Web SDK calls to list, create, edit, and delete notes.

Notes operations:
- List notes: `src/app/notes/page.tsx:22-35`, `src/app/notes/page.tsx:40-52`
- Create note: `src/app/notes/page.tsx:55-76`
- Update note: `src/app/notes/page.tsx:100-116`
- Delete note: `src/app/notes/page.tsx:123-134`
