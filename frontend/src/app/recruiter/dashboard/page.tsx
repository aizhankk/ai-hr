"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { Briefcase, Users, Plus, ChevronRight } from "lucide-react";

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.getMyJobs().then((r) => setJobs(r.data)).catch(() => {});
  }, []);

  const published = jobs.filter((j) => j.status === "published").length;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1 truncate max-w-[200px] sm:max-w-none">{user?.email}</p>
        </div>
        <Link href="/recruiter/jobs/new" className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> <span className="hidden sm:inline">Post a Job</span><span className="sm:hidden">Post</span>
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Briefcase size={22} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{jobs.length}</p>
              <p className="text-sm text-slate-500">Total jobs</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <Users size={22} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{published}</p>
              <p className="text-sm text-slate-500">Published</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">My Job Postings</h2>
        <Link href="/recruiter/jobs" className="text-sm text-indigo-600 hover:underline">View all</Link>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12 text-slate-400">
            <Briefcase size={40} className="mx-auto mb-3 opacity-40" />
            <p>No jobs yet.</p>
            <Link href="/recruiter/jobs/new" className="text-indigo-600 hover:underline text-sm mt-2 block">Post your first job</Link>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.slice(0, 5).map((j) => (
            <Link key={j.id as string} href={`/recruiter/jobs/${j.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardBody className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{j.title as string}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(j.created_at as string).toLocaleDateString()}</p>
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