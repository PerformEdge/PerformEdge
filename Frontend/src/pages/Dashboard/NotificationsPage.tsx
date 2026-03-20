import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:8000";

type NotificationItem = {
  notification_id: string;
  messages: string;
  created_at: string;
  is_read: number | boolean;
};

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatDate(d: string) {
  try {
    const dt = new Date(d);
    return dt.toLocaleString();
  } catch {
    return d;
  }
}

export default function NotificationsPage() {
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [markingAll, setMarkingAll] = React.useState(false);

  const load = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/notifications?limit=100&unreadOnly=${unreadOnly ? "true" : "false"}`,
        { headers: getAuthHeaders(), signal },
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Failed (${res.status})`);
      }
      const json = await res.json();
      setItems(json.items || []);
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function markAllRead() {
    setMarkingAll(true);
    try {
      const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
      await load();
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setMarkingAll(false);
    }
  }

  async function markOneRead(id: string) {
    try {
      const res = await fetch(`${API_BASE}/notifications/mark-read`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids: [id] }),
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      setItems((prev) => prev.map((n) => (n.notification_id === id ? { ...n, is_read: 1 } : n)));
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    }
  }

  const unreadCount = items.filter((i) => !Boolean(i.is_read)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-2xl font-extrabold">Notifications</div>
          <div className="text-sm text-muted-foreground">
            {unreadOnly ? "Showing unread notifications" : "All notifications"}
            {unreadCount > 0 && !unreadOnly ? ` • ${unreadCount} unread` : ""}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={unreadOnly ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => setUnreadOnly((v) => !v)}
          >
            {unreadOnly ? "Show All" : "Unread Only"}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={markAllRead}
            disabled={markingAll}
          >
            Mark All Read
          </Button>
        </div>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading...</div>}

      {error && (
        <div className="rounded-xl border border-border bg-background p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (
        <Card className="rounded-3xl">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {items.map((n) => {
                const unread = !Boolean(n.is_read);
                return (
                  <button
                    key={n.notification_id}
                    type="button"
                    onClick={() => (unread ? markOneRead(n.notification_id) : undefined)}
                    className={cn(
                      "w-full text-left px-6 py-4 hover:bg-muted transition",
                      unread && "bg-amber-50/60 dark:bg-amber-500/10",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className={cn("font-semibold", unread ? "text-foreground" : "text-muted-foreground")}> 
                          {n.messages}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{formatDate(n.created_at)}</div>
                      </div>
                      {unread && (
                        <span className="shrink-0 rounded-full bg-amber-500 px-2 py-1 text-[11px] font-bold text-white">
                          NEW
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {items.length === 0 && (
                <div className="px-6 py-10 text-sm text-muted-foreground">No notifications found.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
