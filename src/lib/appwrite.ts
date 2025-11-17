import { Client, Databases, Account } from "appwrite";

let client: Client | null = null;

function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export function getAppwriteClient() {
  if (client) return client;
  const endpoint = required("NEXT_PUBLIC_APPWRITE_ENDPOINT", process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
  const projectId = required("NEXT_PUBLIC_APPWRITE_PROJECT_ID", process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
  client = new Client().setEndpoint(endpoint).setProject(projectId);
  return client;
}

export function getDatabases() {
  return new Databases(getAppwriteClient());
}

export function getAccount() {
  return new Account(getAppwriteClient());
}
