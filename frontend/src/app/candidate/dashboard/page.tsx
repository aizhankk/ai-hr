"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Briefcase, FileText, ClipboardList, ChevronRight } from "lucide-react";

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Record<string, unknown>[]>([]);
  const [resumes, setResumes] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.listApplications().then((r) => setApps(r.data)).catch(() => {});
    api.listResumes().then((r) => setResumes(r.data)).catch(() => {});
  }, []);

  const stats = [
    { label: "Applications", value: apps.length, href: "/candidate/applications", icon: ClipboardList },
    { label: "Resumes", value: resumes.length, href: "/candidate/resumes", icon: FileText },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}!</h1>
      <p className="text-slate-500 mb-8">Here&apos;s what&apos;s happening with your job search.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, href, icon: Icon }) => (
          <Link key={label} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardBody className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon size={22} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                  <p className="text-sm text-slate-500">{label}</p>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
        <Link href="/candidate/jobs">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardBody className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Briefcase size={22} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Browse Jobs</p>
                <p className="text-xs text-slate-500">Find new opportunities</p>
              </div>
              <ChevronRight size={16} className="text-slate-400 ml-auto" />
            </CardBody>
          </Card>
        </Link>
      </div>

      <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Applications</h2>
      {apps.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12 text-slate-400">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
            <p>No applications yet. <Link href="/candidate/jobs" className="text-indigo-600 hover:underline">Browse jobs</Link></p>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {apps.slice(0, 5).map((a) => (
            <Link key={a.id as string} href={`/candidate/applications/${a.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardBody className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{a.job_title as string}</p>
                    <p className="text-sm text-slate-500">{a.company_name as string}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge label={a.status as string} />
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