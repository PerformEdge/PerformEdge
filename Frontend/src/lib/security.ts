type LoginRole = "employee" | "manager";

type AuthSessionInput = {
  accessToken: string;
  user?: unknown;
  role?: string;
  roles?: unknown;
};

const ACCESS_TOKEN_KEY = "access_token";
const USER_KEY = "user";
const USER_ROLE_KEY = "user_role";
const USER_ROLES_KEY = "user_roles";

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = decodeBase64Url(parts[1]);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function sanitizeInput(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

export function normalizeEmail(email: string): string {
  return sanitizeInput(email).toLowerCase();
}

export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const payload = parseJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number") return false;
  const now = Math.floor(Date.now() / 1000);
  return now >= exp - skewSeconds;
}

export function clearAuthSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  localStorage.removeItem(USER_ROLES_KEY);
}

export function setAuthSession(input: AuthSessionInput): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, input.accessToken);

  if (typeof input.user !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(input.user));
  }

  if (typeof input.role === "string") {
    const role = input.role.toLowerCase() as LoginRole;
    localStorage.setItem(USER_ROLE_KEY, role === "manager" ? "manager" : "employee");
  }

  if (typeof input.roles !== "undefined") {
    localStorage.setItem(USER_ROLES_KEY, JSON.stringify(input.roles));
  }
}

export function getAccessToken(): string | null {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;
  if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token)) {
    clearAuthSession();
    return null;
  }
  if (isTokenExpired(token)) {
    clearAuthSession();
    return null;
  }
  return token;
}

export function getStoredRole(): string {
  return (localStorage.getItem(USER_ROLE_KEY) || "").toLowerCase();
}

export function getStoredUser<T = Record<string, unknown>>(): T | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function buildAuthHeaders(extraHeaders: HeadersInit = {}): HeadersInit {
  const token = getAccessToken();
  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
