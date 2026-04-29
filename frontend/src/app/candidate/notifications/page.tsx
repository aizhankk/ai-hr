"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Bell, CheckCircle, Video, Brain } from "lucide-react";

function NotificationIcon({ type }: { type: string }) {
  if (type === "status_changed") return <CheckCircle size={16} className="text-indigo-500 shrink-0 mt-0.5" />;
  if (type === "system") return <Video size={16} className="text-violet-500 shrink-0 mt-0.5" />;
  if (type === "new_application") return <Brain size={16} className="text-green-500 shrink-0 mt-0.5" />;
  return <Bell size={16} className="text-slate-400 shrink-0 mt-0.5" />;
}

export default function NotificationsPage() {
  const [notes, setNotes] = useState<Record<string, unknown>[]>([]);
  const router = useRouter();

  const load = () => api.listNotifications().then((r) => setNotes(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await api.markNotificationRead(id).catch(() => {});
    load();
  };

  const markAll = async () => {
    await api.markAllNotificationsRead().catch(() => {});
    load();
  };

  const handleClick = async (n: Record<string, unknown>) => {
    if (!n.is_read) await api.markNotificationRead(n.id as string).catch(() => {});
    const payload = n.payload as Record<string, unknown> | null;
    const appId = payload?.application_id as string | undefined;
    if (appId) {
      router.push(`/candidate/applications/${appId}`);
    } else {
      load();
    }
  };

  const unread = notes.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          {unread > 0 && (
            <p className="text-sm text-indigo-600 mt-0.5">{unread} unread</p>
          )}
        </div>
        {unread > 0 && (
          <Button variant="secondary" size="sm" onClick={markAll}>Mark all as read</Button>
        )}
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardBody className="text-center py-16 text-slate-400">
            <Bell size={40} className="mx-auto mb-3 opacity-40" />
            <p>No notifications yet.</p>
            <p className="text-xs mt-1">You'll be notified when your application status changes or your interview is analyzed.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((n) => {
            const payload = n.payload as Record<string, unknown> | null;
            const hasLink = !!payload?.application_id;
            return (
              <div
                key={n.id as string}
                onClick={() => handleClick(n)}
                className={`rounded-2xl border p-4 flex items-start justify-between gap-4 transition-colors ${
                  !n.is_read
                    ? "border-indigo-200 bg-indigo-50/40 cursor-pointer hover:bg-indigo-50"
                    : hasLink
                    ? "border-slate-200 bg-white cursor-pointer hover:bg-slate-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <NotificationIcon type={n.type as string} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.is_read ? "font-medium text-slate-900" : "text-slate-600"}`}>
                      {n.message as string}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(n.created_at as string).toLocaleString()}
                    </p>
                    {hasLink && (
                      <p className="text-xs text-indigo-500 mt-1">Tap to view application →</p>
                    )}
                  </div>
                </div>
                {!n.is_read && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(n.id as string); }}
                      className="text-xs text-slate-400 hover:text-indigo-600"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
