"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ClipboardList, ChevronRight, FileText, Trash2 } from "lucide-react";

export default function CandidateApplicationsPage() {
  const [apps, setApps] = useState<Record<string, unknown>[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  const load = () => api.listApplications().then((r) => setApps(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const withdraw = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Withdraw this application? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await api.withdrawApplication(id);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">My Applications</h1>
      {apps.length === 0 ? (
        <Card>
          <CardBody className="text-center py-16 text-slate-400">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
            <p>No applications yet.</p>
            <Link href="/candidate/jobs" className="text-indigo-600 hover:underline text-sm mt-2 block">
              Browse available jobs
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {apps.map((a) => {
            const resumeUrl = a.resume_file_url as string | null;
            const isDeleting = deleting === (a.id as string);

            return (
              <Card
                key={a.id as string}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/candidate/applications/${a.id}`)}
              >
                <CardBody className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{a.job_title as string}</p>
                    <p className="text-sm text-slate-500">{a.company_name as string}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Applied {new Date(a.applied_at as string).toLocaleDateString()}
                    </p>

                    {a.resume_filename ? (
                      <div className="mt-2 flex items-center gap-1.5">
                        <FileText size={13} className="text-indigo-400 shrink-0" />
                        {resumeUrl ? (
                          <a
                            href={resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-indigo-600 hover:underline truncate"
                          >
                            {a.resume_filename as string}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-500 truncate">
                            {a.resume_filename as string}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">No resume attached</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge label={a.status as string} />
                    <button
                      onClick={(e) => withdraw(e, a.id as string)}
                      disabled={isDeleting}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Withdraw application"
                    >
                      <Trash2 size={15} />
                    </button>
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
