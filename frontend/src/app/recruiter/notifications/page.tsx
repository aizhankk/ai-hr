"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Bell } from "lucide-react";

export default function RecruiterNotificationsPage() {
  const [notes, setNotes] = useState<Record<string, unknown>[]>([]);

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

  const unread = notes.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        {unread > 0 && <Button variant="secondary" size="sm" onClick={markAll}>Mark all as read</Button>}
      </div>
      {notes.length === 0 ? (
        <Card>
          <CardBody className="text-center py-16 text-slate-400">
            <Bell size={40} className="mx-auto mb-3 opacity-40" />
            <p>No notifications yet.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((n) => (
            <Card key={n.id as string} className={!n.is_read ? "border-indigo-200 bg-indigo-50/30" : ""}>
              <CardBody className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />}
                  <div>
                    <p className={`text-sm ${!n.is_read ? "font-medium text-slate-900" : "text-slate-600"}`}>{n.message as string}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(n.created_at as string).toLocaleString()}</p>
                  </div>
                </div>
                {!n.is_read ? (
                  <button onClick={() => markRead(n.id as string)} className="text-xs text-indigo-600 hover:underline flex-shrink-0">
                    Mark read
                  </button>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}