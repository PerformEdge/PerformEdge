import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";

type Msg = {
  message_id: string;
  subject: string;
  body: string;
  created_at: string;
  is_read: number | boolean;
  sender_user_id: number;
  sender_name?: string;
  sender_email?: string;
  receiver_user_id: number;
  receiver_name?: string;
  receiver_email?: string;
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
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

type Tab = "inbox" | "sent";

export default function MessagesPage() {
  const [tab, setTab] = React.useState<Tab>("inbox");
  const [items, setItems] = React.useState<Msg[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Msg | null>(null);

  const [toEmail, setToEmail] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const load = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/messages/${tab}?limit=100`, {
        headers: getAuthHeaders(),
        signal,
      });
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
  }, [tab]);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function markRead(message_id: string) {
    try {
      await fetch(`${API_BASE}/messages/mark-read`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ message_id }),
      });
      setItems((prev) => prev.map((m) => (m.message_id === message_id ? { ...m, is_read: 1 } : m)));
    } catch {
      // Silent
    }
  }

  async function sendMessage() {
    setError(null);
    if (!toEmail.trim() || !subject.trim() || !body.trim()) {
      setError("Please fill To, Subject and Message.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/messages/send`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ to_email: toEmail.trim(), subject: subject.trim(), body: body.trim() }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to send message");
      }
      setToEmail("");
      setSubject("");
      setBody("");
      // Refresh sent tab (or inbox if you sent to yourself)
      await load();
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  const unreadCount = items.filter((i) => tab === "inbox" && !Boolean(i.is_read)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-2xl font-extrabold">Messages</div>
          <div className="text-sm text-muted-foreground">
            {tab === "inbox" ? "Inbox" : "Sent"}
            {tab === "inbox" && unreadCount > 0 ? ` • ${unreadCount} unread` : ""}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={tab === "inbox" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => {
              setTab("inbox");
              setSelected(null);
            }}
          >
            Inbox
          </Button>
          <Button
            variant={tab === "sent" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() => {
              setTab("sent");
              setSelected(null);
            }}
          >
            Sent
          </Button>
        </div>
      </div>

      {/* Compose */}
      <Card className="rounded-3xl">
        <CardContent className="p-6">
          <div className="text-sm font-bold">Compose</div>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-1">
              <label className="text-xs font-semibold text-muted-foreground">To (email)</label>
              <input
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="recipient@example.com"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Subject"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-semibold text-muted-foreground">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Write your message..."
              />
            </div>

            <div className="flex justify-end">
              <Button className="rounded-xl" onClick={sendMessage} disabled={sending}>
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && <div className="text-sm text-muted-foreground">Loading...</div>}

      {error && (
        <div className="rounded-xl border border-border bg-background p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* List */}
          <Card className="rounded-3xl">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {items.map((m) => {
                  const unread = tab === "inbox" && !Boolean(m.is_read);
                  const active = selected?.message_id === m.message_id;
                  const fromTo = tab === "inbox" ? m.sender_email : m.receiver_email;

                  return (
                    <button
                      key={m.message_id}
                      type="button"
                      onClick={() => {
                        setSelected(m);
                        if (unread) markRead(m.message_id);
                      }}
                      className={cn(
                        "w-full text-left px-6 py-4 hover:bg-muted transition",
                        unread && "bg-amber-50/60 dark:bg-amber-500/10",
                        active && "bg-muted",
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{m.subject || "(No subject)"}</div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">{fromTo || "-"}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs text-muted-foreground">{formatDate(m.created_at)}</div>
                          {unread && (
                            <div className="mt-1 inline-flex rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
                              NEW
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {items.length === 0 && (
                  <div className="px-6 py-10 text-sm text-muted-foreground">No messages found.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detail */}
          <Card className="rounded-3xl">
            <CardContent className="p-6">
              {!selected ? (
                <div className="text-sm text-muted-foreground">Select a message to view.</div>
              ) : (
                <div className="space-y-3">
                  <div className="text-lg font-extrabold">{selected.subject || "(No subject)"}</div>
                  <div className="text-xs text-muted-foreground">
                    {tab === "inbox" ? (
                      <>
                        From: <span className="font-semibold">{selected.sender_name || selected.sender_email || "-"}</span>
                      </>
                    ) : (
                      <>
                        To: <span className="font-semibold">{selected.receiver_name || selected.receiver_email || "-"}</span>
                      </>
                    )}
                    {" "}• {formatDate(selected.created_at)}
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-4 text-sm whitespace-pre-wrap">
                    {selected.body || ""}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
