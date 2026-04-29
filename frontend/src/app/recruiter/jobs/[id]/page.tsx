"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { Plus, X, Users, Pencil } from "lucide-react";

const JOB_STATUSES = ["draft", "published", "paused", "closed"];

export default function RecruiterJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [newSkill, setNewSkill] = useState({ skill_name: "", level: "", is_required: true });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => api.getJob(id).then((r) => { setJob(r.data); setForm(r.data); }).catch(() => {});
  useEffect(() => { load(); }, [id]);

  const saveJob = async () => {
    setSaving(true);
    setError("");
    try {
      await api.updateJob(id, {
        title: form.title, description: form.description,
        requirements: form.requirements, location: form.location,
        salary_min: form.salary_min, salary_max: form.salary_max,
      });
      setEditMode(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: string) => {
    await api.changeJobStatus(id, status).catch(() => {});
    load();
  };

  const addSkill = async () => {
    if (!newSkill.skill_name.trim()) return;
    await api.addJobSkill(id, newSkill).catch(() => {});
    setNewSkill({ skill_name: "", level: "", is_required: true });
    load();
  };

  const removeSkill = async (skillId: string) => {
    await api.removeJobSkill(id, skillId).catch(() => {});
    load();
  };

  const deleteJob = async () => {
    if (!confirm("Delete this job posting?")) return;
    await api.deleteJob(id);
    router.push("/recruiter/jobs");
  };

  if (!job) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;

  const skills = (job.skills as Record<string, unknown>[]) ?? [];

  return (
    <div className="max-w-3xl">
      <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline mb-4">← My Jobs</button>

      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{job.title as string}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge label={job.status as string} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/recruiter/jobs/${id}/applications`}>
            <Button variant="secondary" size="sm"><Users size={14} /> Applications</Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setEditMode(!editMode)}>
            <Pencil size={14} /> {editMode ? "Cancel" : "Edit"}
          </Button>
        </div>
      </div>

      {error ? <div className="mb-4"><Alert message={error} /></div> : null}

      <Card className="mb-4">
        <CardBody>
          <p className="text-sm font-medium text-slate-700 mb-2">Change status</p>
          <div className="flex gap-2 flex-wrap">
            {JOB_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  job.status === s
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader><h2 className="font-semibold text-slate-800">Details</h2></CardHeader>
        <CardBody>
          {editMode ? (
            <div className="flex flex-col gap-4">
              <Input label="Title" value={(form.title as string) ?? ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
                <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm h-28 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  value={(form.description as string) ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Requirements</label>
                <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm h-20 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  value={(form.requirements as string) ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))} />
              </div>
              <Input label="Location" value={(form.location as string) ?? ""} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              <div className="flex gap-3">
                <Button onClick={saveJob} loading={saving}>Save</Button>
                <Button variant="secondary" onClick={() => setEditMode(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{job.description as string}</p>
              {job.requirements ? (
                <>
                  <p className="text-sm font-medium text-slate-700 mb-1">Requirements</p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{job.requirements as string}</p>
                </>
              ) : null}
            </>
          )}
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader><h2 className="font-semibold text-slate-800">Required Skills</h2></CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map((s) => (
              <span key={s.id as string} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">
                {s.skill_name as string}{s.level ? ` · ${s.level}` : ""}
                <button onClick={() => removeSkill(s.id as string)} className="ml-1 hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Add skill" value={newSkill.skill_name}
              onChange={(e) => setNewSkill((n) => ({ ...n, skill_name: e.target.value }))} />
            <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newSkill.level}
              onChange={(e) => setNewSkill((n) => ({ ...n, level: e.target.value }))}>
              <option value="">Level</option>
              {["beginner", "intermediate", "advanced", "expert"].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <Button size="sm" onClick={addSkill}><Plus size={16} /></Button>
          </div>
        </CardBody>
      </Card>

      <Button variant="danger" onClick={deleteJob}>Delete job posting</Button>
    </div>
  );
}