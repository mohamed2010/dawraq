"use client";

import type { CycleInput, DailyInput, MedicationRecord, ProfileRecord } from "./api";

export type OfflineSnapshot = {
  profile: ProfileRecord | null;
  cycles: Array<CycleInput & { id: number; userId: number; symptomsJson: string }>;
  dailyEntries: Array<DailyInput & { id: number; userId: number; symptomsJson: string }>;
  medications: MedicationRecord[];
  savedAt: string;
};

export type OfflineAccount = { id: number; name: string | null; email: string; role: "user" | "admin" };

export type OfflineOperation =
  | { id: string; accountId: number; resource: "cycle"; action: "create"; payload: CycleInput; createdAt: string }
  | { id: string; accountId: number; resource: "cycle"; action: "update"; payload: CycleInput & { id: number }; createdAt: string }
  | { id: string; accountId: number; resource: "cycle"; action: "delete"; payload: { id: number }; createdAt: string }
  | { id: string; accountId: number; resource: "daily-entry"; action: "save"; payload: DailyInput; createdAt: string }
  | { id: string; accountId: number; resource: "daily-entry"; action: "delete"; payload: { id: number }; createdAt: string };

type EncryptedRecord = { id: string; accountId: number; iv: string; data: string; createdAt: string };

const DB_NAME = "zuhaira-offline-v1";
const VAULT_STORE = "vault";
const QUEUE_STORE = "queue";
const SNAPSHOT_PREFIX = "snapshot:";
const ACTIVE_ACCOUNT_KEY = "active-account";
let databasePromise: Promise<IDBDatabase> | null = null;

function available() { return typeof window !== "undefined" && "indexedDB" in window && "crypto" in window; }
function encode(value: ArrayBuffer) { return btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function decode(value: string) { const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4); return Uint8Array.from(atob(normalized), char => char.charCodeAt(0)); }

function getDb() {
  if (!available()) throw new Error("OFFLINE_STORAGE_UNAVAILABLE");
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VAULT_STORE)) db.createObjectStore(VAULT_STORE);
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("OFFLINE_STORAGE_UNAVAILABLE"));
  });
  return databasePromise;
}

async function getValue<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function putValue(storeName: string, value: unknown, key?: IDBValidKey) {
  const db = await getDb();
  return new Promise<void>((resolve, reject) => {
    const request = key === undefined ? db.transaction(storeName, "readwrite").objectStore(storeName).put(value) : db.transaction(storeName, "readwrite").objectStore(storeName).put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function deleteValue(storeName: string, key: IDBValidKey) {
  const db = await getDb();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(storeName, "readwrite").objectStore(storeName).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function listValues<T>(storeName: string): Promise<T[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function deviceKey() {
  const current = await getValue<CryptoKey>(VAULT_STORE, "device-key");
  if (current) return current;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await putValue(VAULT_STORE, key, "device-key");
  return key;
}

async function seal(value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deviceKey(), new TextEncoder().encode(JSON.stringify(value)));
  return { iv: encode(iv.buffer), data: encode(encrypted) };
}

async function open<T>(record: Pick<EncryptedRecord, "iv" | "data">) {
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(record.iv) }, await deviceKey(), decode(record.data));
  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}

export async function saveOfflineSnapshot(accountId: number, snapshot: OfflineSnapshot) {
  const sealed = await seal(snapshot);
  await putValue(VAULT_STORE, { id: `${SNAPSHOT_PREFIX}${accountId}`, accountId, ...sealed, createdAt: new Date().toISOString() } satisfies EncryptedRecord, `${SNAPSHOT_PREFIX}${accountId}`);
}

export async function loadOfflineSnapshot(accountId: number) {
  const stored = await getValue<EncryptedRecord>(VAULT_STORE, `${SNAPSHOT_PREFIX}${accountId}`);
  return stored ? open<OfflineSnapshot>(stored) : null;
}

export async function saveActiveOfflineAccount(account: OfflineAccount) {
  const sealed = await seal(account);
  await putValue(VAULT_STORE, { id: ACTIVE_ACCOUNT_KEY, accountId: account.id, ...sealed, createdAt: new Date().toISOString() } satisfies EncryptedRecord, ACTIVE_ACCOUNT_KEY);
}

export async function loadActiveOfflineAccount() {
  const stored = await getValue<EncryptedRecord>(VAULT_STORE, ACTIVE_ACCOUNT_KEY);
  return stored ? open<OfflineAccount>(stored) : null;
}

export async function clearActiveOfflineAccount() { await deleteValue(VAULT_STORE, ACTIVE_ACCOUNT_KEY); }

export async function enqueueOfflineOperation(operation: OfflineOperation) {
  const sealed = await seal(operation);
  await putValue(QUEUE_STORE, { id: operation.id, accountId: operation.accountId, ...sealed, createdAt: operation.createdAt } satisfies EncryptedRecord);
}

export async function listOfflineOperations(accountId: number) {
  const encrypted = await listValues<EncryptedRecord>(QUEUE_STORE);
  const own = encrypted.filter(item => item.accountId === accountId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return Promise.all(own.map(item => open<OfflineOperation>(item)));
}

export async function removeOfflineOperation(id: string) { await deleteValue(QUEUE_STORE, id); }
export async function offlineOperationCount(accountId: number) { return (await listOfflineOperations(accountId)).length; }
export function createOfflineOperationId() { return `${Date.now()}-${crypto.randomUUID()}`; }
