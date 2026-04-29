"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Users, ChevronRight, Brain } from "lucide-react";

function MatchScore({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="text-xs text-slate-400 flex items-center gap-1">
        <Brain size={12} className="text-slate-300" /> Not analyzed
      </span>
    );
  }
  const pct = Math.round(score);
  const color =
    pct >= 80 ? "bg-green-50 text-green-700 border-green-200" :
    pct >= 60 ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
    pct >= 40 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
    "bg-red-50 text-red-600 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
      <Brain size={11} />
      {pct}% match
    </span>
  );
}

const STATUSES = ["pending", "reviewing", "shortlisted", "interview_scheduled", "rejected", "hired"];

export default function JobApplicationsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [apps, setApps] = useState<Record<string, unknown>[]>([]);
  const [filter, setFilter] = useState("all");

  const load = () => api.listApplications(id).then((r) => setApps(r.data)).catch(() => {});
  useEffect(() => { load(); }, [id]);

  const updateStatus = async (e: React.MouseEvent, appId: string, status: string) => {
    e.preventDefault();
    e.stopPropagation();
    await api.updateApplicationStatus(appId, status).catch(() => {});
    load();
  };

  const filtered = filter === "all" ? apps : apps.filter((a) => a.status === filter);

  return (
    <div>
      <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline mb-4">
        ← Back to job
      </button>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
          <p className="text-sm text-slate-500 mt-0.5">{apps.length} total · click a candidate to see full profile & AI analysis</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {["all", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === s
                ? "bg-indigo-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s === "all" ? `All (${apps.length})` : `${s.replace(/_/g, " ")} (${apps.filter((a) => a.status === s).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardBody className="text-center py-16 text-slate-400">
            <Users size={40} className="mx-auto mb-3 opacity-40" />
            <p>No applications yet.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Candidate</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">AI Match</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Applied</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Change status</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const score = a.matching_score != null ? (a.matching_score as number) : null;
                return (
                  <tr
                    key={a.id as string}
                    className={`border-b border-slate-50 hover:bg-indigo-50/40 cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}
                    onClick={() => router.push(`/recruiter/applications/${a.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900 text-sm">
                        {a.first_name as string} {a.last_name as string}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{a.candidate_email as string}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <MatchScore score={score} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge label={a.status as string} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">
                      {new Date(a.applied_at as string).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 hover:border-indigo-400 transition-colors outline-none"
                        value={a.status as string}
                        onChange={(e) => updateStatus(e as unknown as React.MouseEvent, a.id as string, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3.5">
                      <ChevronRight size={16} className="text-slate-300" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
