"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Sparkles, FileText, MapPin, DollarSign, Briefcase, Star, Check } from "lucide-react";

type Job = Record<string, unknown>;

function scoreColor(score: number) {
  if (score >= 75) return "bg-green-100 text-green-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-500";
}

export default function MatchPage() {
  const [resumes, setResumes] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listResumes()
      .then((r) => {
        setResumes(r.data);
        const primary = r.data.find((x) => x.is_primary) ?? r.data[0];
        if (primary) setSelected(primary.id as string);
      })
      .catch(() => {});
  }, []);

  const runMatch = async () => {
    if (!selected) return;
    setLoading(true);
    setError("");
    setJobs(null);
    try {
      const r = await api.matchJobs(selected);
      setJobs(r.data.jobs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Matching failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={22} className="text-indigo-600" />
        <h1 className="text-2xl font-bold text-slate-900">AI Job Match</h1>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Pick a resume — the system finds jobs that match <strong>by meaning</strong>, not just by keywords.
      </p>

      {/* Step 1: pick resume */}
      {resumes.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12 text-slate-400">
            <FileText size={40} className="mx-auto mb-3 opacity-40" />
            <p className="mb-3">You don&apos;t have any uploaded resumes yet.</p>
            <Link href="/candidate/resumes">
              <Button size="sm">Upload resume</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-2 mb-4">
            {resumes.map((r) => {
              const active = selected === r.id;
              return (
                <button
                  key={r.id as string}
                  onClick={() => setSelected(r.id as string)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    active ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? "border-indigo-600 bg-indigo-600" : "border-slate-300"}`}>
                    {active ? <Check size={12} className="text-white" /> : null}
                  </div>
                  <FileText size={18} className="text-slate-400 shrink-0" />
                  <span className="flex-1 truncate text-sm text-slate-800">{(r.original_filename as string) || "resume"}</span>
                  {r.is_primary ? (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
                      <Star size={11} /> primary
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <Button onClick={runMatch} loading={loading} disabled={!selected} className="mb-6">
            <Sparkles size={16} /> Find matching jobs
          </Button>
        </>
      )}

      {error ? <div className="mb-6"><Alert type="error" message={error} /></div> : null}

      {loading ? (
        <p className="text-sm text-slate-400">Analyzing your resume and comparing it with jobs…</p>
      ) : null}

      {/* Step 2: results */}
      {jobs !== null && !loading ? (
        jobs.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12 text-slate-400">
              <Briefcase size={40} className="mx-auto mb-3 opacity-40" />
              <p>No matching jobs found.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-slate-500">Jobs found: {jobs.length}</p>
            {jobs.map((j) => {
              const score = Number(j.match_score ?? 0);
              return (
                <Link key={j.id as string} href={`/candidate/jobs/${j.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardBody>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900">{j.title as string}</p>
                          <p className="text-sm text-slate-600 mt-0.5">{j.company_name as string}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                            {j.location ? (
                              <span className="flex items-center gap-1"><MapPin size={12} />{j.location as string}</span>
                            ) : null}
                            {(j.salary_min || j.salary_max) ? (
                              <span className="flex items-center gap-1">
                                <DollarSign size={12} />
                                {j.salary_min ? `${j.salary_min}` : ""} — {j.salary_max ? `${j.salary_max}` : ""} {j.currency as string}
                              </span>
                            ) : null}
                            {j.is_remote ? <Badge label="remote" /> : null}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`rounded-full px-2.5 py-1 text-sm font-bold ${scoreColor(score)}`}>
                            {score}%
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">match</span>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        )
      ) : null}
    </div>
  );
}
