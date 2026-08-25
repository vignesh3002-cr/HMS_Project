import { getUser } from "@/utils/token";

export interface AccountActivity {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: number;
}

const ACTIVITY_KEY = "hms_account_activity";

function loadAll(): AccountActivity[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addAccountActivity(title: string, message: string): void {
  const userId = getUser()?.user_id || "";
  const items = loadAll();
  items.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    title,
    message,
    createdAt: Date.now(),
  });
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(items.slice(0, 100)));
  } catch {
    // Ignore localStorage errors.
  }
  window.dispatchEvent(new Event("account-activity-updated"));
}

export function getAccountActivity(): AccountActivity[] {
  const userId = getUser()?.user_id || "";
  return loadAll()
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function clearAccountActivity(): void {
  try {
    localStorage.removeItem(ACTIVITY_KEY);
  } catch {
    // Ignore localStorage errors.
  }
  window.dispatchEvent(new Event("account-activity-updated"));
}