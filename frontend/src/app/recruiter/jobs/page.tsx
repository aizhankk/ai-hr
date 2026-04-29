"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Briefcase, Plus, ChevronRight } from "lucide-react";

const STATUSES = ["all", "draft", "published", "paused", "closed"];

export default function RecruiterJobsPage() {
  const [jobs, setJobs] = useState<Record<string, unknown>[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.getMyJobs().then((r) => setJobs(r.data)).catch(() => {});
  }, []);

  const filtered = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Jobs</h1>
        <Link href="/recruiter/jobs/new" className="shrink-0">
          <Button><Plus size={16} /> <span className="hidden sm:inline">Post a Job</span><span className="sm:hidden">Post</span></Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === s ? "bg-indigo-600 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardBody className="text-center py-16 text-slate-400">
            <Briefcase size={40} className="mx-auto mb-3 opacity-40" />
            <p>No jobs found.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((j) => (
            <Link key={j.id as string} href={`/recruiter/jobs/${j.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardBody className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{j.title as string}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>{j.employment_type as string}</span>
                      {j.location ? <><span>·</span><span>{j.location as string}</span></> : null}
                      <span>·</span>
                      <span>{new Date(j.created_at as string).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge label={j.status as string} />
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}