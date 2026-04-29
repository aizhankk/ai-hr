"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { MapPin, DollarSign, Search, Briefcase } from "lucide-react";

export default function CandidateJobsPage() {
  const [jobs, setJobs] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.listJobs(100).then((r) => setJobs(r.data)).catch(() => {});
  }, []);

  const filtered = jobs.filter((j) =>
    [(j.title as string), (j.company_name as string), (j.location as string)].some((v) =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Browse Jobs</h1>

      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search by title, company or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge label={j.employment_type as string} />
                    </div>
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