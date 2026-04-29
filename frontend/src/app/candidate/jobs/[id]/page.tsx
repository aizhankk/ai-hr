"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { MapPin, DollarSign, Building2, CheckCircle } from "lucide-react";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [resumes, setResumes] = useState<Record<string, unknown>[]>([]);
  const [selectedResume, setSelectedResume] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getJob(id).then((r) => setJob(r.data)).catch(() => {});
    api.listResumes().then((r) => {
      setResumes(r.data);
      const primary = r.data.find((r) => r.is_primary);
      if (primary) setSelectedResume(primary.id as string);
    }).catch(() => {});
  }, [id]);

  const apply = async () => {
    setError("");
    setLoading(true);
    try {
      await api.apply({
        job_posting_id: id,
        resume_id: selectedResume || undefined,
        cover_letter: coverLetter || undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to apply");
    } finally {
      setLoading(false);
    }
  };

  if (!job) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;

  const skills = (job.skills as Record<string, unknown>[]) ?? [];

  return (
    <div className="max-w-3xl">
      <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline mb-6 flex items-center gap-1">← Back</button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{job.title as string}</h1>
              <div className="flex items-center gap-2 mt-1 text-slate-600">
                <Building2 size={15} />
                <span className="text-sm">{job.company_name as string}</span>
              </div>
            </div>
            <Badge label={job.employment_type as string} />
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500">
            {job.location ? <span className="flex items-center gap-1"><MapPin size={14} />{job.location as string}</span> : null}
            {job.is_remote ? <Badge label="remote" /> : null}
            {(job.salary_min || job.salary_max) ? (
              <span className="flex items-center gap-1">
                <DollarSign size={14} />
                {job.salary_min as number} — {job.salary_max as number} {job.currency as string}
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardBody>
          <h3 className="font-semibold text-slate-800 mb-2">Description</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{job.description as string}</p>
          {job.requirements ? (
            <>
              <h3 className="font-semibold text-slate-800 mb-2">Requirements</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{job.requirements as string}</p>
            </>
          ) : null}
          {skills.length > 0 ? (
            <>
              <h3 className="font-semibold text-slate-800 mb-2">Required skills</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s.id as string} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                    {s.skill_name as string} {s.level ? `· ${s.level}` : ""}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </CardBody>
      </Card>

      {success ? (
        <Card>
          <CardBody className="text-center py-10">
            <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-slate-900">Application submitted!</p>
            <p className="text-sm text-slate-500 mt-1">The recruiter will review your application.</p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader><h2 className="font-semibold text-slate-800">Apply for this job</h2></CardHeader>
          <CardBody className="flex flex-col gap-4">
            {error && <Alert message={error} />}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Resume</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={selectedResume}
                onChange={(e) => setSelectedResume(e.target.value)}
              >
                <option value="">No resume</option>
                {resumes.map((r) => (
                  <option key={r.id as string} value={r.id as string}>
                    {r.original_filename as string} {r.is_primary ? "(primary)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Cover letter (optional)</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none h-28 outline-none focus:ring-2 focus:ring-indigo-500"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Tell us why you're a good fit…"
              />
            </div>
            <Button onClick={apply} loading={loading} size="lg">Submit Application</Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}