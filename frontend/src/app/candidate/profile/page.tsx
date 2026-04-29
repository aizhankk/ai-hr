"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Plus, X } from "lucide-react";

export default function CandidateProfilePage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [skills, setSkills] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [newSkill, setNewSkill] = useState({ skill_name: "", level: "" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getCandidateProfile().then((r) => {
      setProfile(r.data);
      setForm(r.data as Record<string, string | boolean>);
    }).catch(() => {});
    api.getCandidateSkills().then((r) => setSkills(r.data)).catch(() => {});
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.updateCandidateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const addSkill = async () => {
    if (!newSkill.skill_name.trim()) return;
    try {
      await api.addCandidateSkill(newSkill);
      api.getCandidateSkills().then((r) => setSkills(r.data)).catch(() => {});
      setNewSkill({ skill_name: "", level: "" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add skill");
    }
  };

  const removeSkill = async (id: string) => {
    await api.removeCandidateSkill(id).catch(() => {});
    setSkills((prev) => prev.filter((s) => s.id !== id));
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!profile) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">My Profile</h1>

      <Card className="mb-6">
        <CardHeader><h2 className="font-semibold text-slate-800">Personal info</h2></CardHeader>
        <CardBody>
          <form onSubmit={save} className="flex flex-col gap-4">
            {error && <Alert message={error} />}
            {saved && <Alert message="Profile saved!" type="success" />}
            <div className="grid grid-cols-2 gap-4">
              <Input label="First name" value={(form.first_name as string) ?? ""} onChange={set("first_name")} />
              <Input label="Last name" value={(form.last_name as string) ?? ""} onChange={set("last_name")} />
            </div>
            <Input label="Phone" value={(form.phone as string) ?? ""} onChange={set("phone")} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="City" value={(form.city as string) ?? ""} onChange={set("city")} />
              <Input label="Country" value={(form.country as string) ?? ""} onChange={set("country")} />
            </div>
            <Input label="LinkedIn URL" value={(form.linkedin_url as string) ?? ""} onChange={set("linkedin_url")} />
            <Input label="GitHub URL" value={(form.github_url as string) ?? ""} onChange={set("github_url")} />
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Bio</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none h-24 outline-none focus:ring-2 focus:ring-indigo-500"
                value={(form.bio as string) ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="open"
                checked={(form.is_open_to_work as boolean) ?? false}
                onChange={(e) => setForm((f) => ({ ...f, is_open_to_work: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="open" className="text-sm text-slate-700">Open to work</label>
            </div>
            <Button type="submit" loading={loading}>Save changes</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold text-slate-800">Skills</h2></CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map((s) => (
              <span key={s.id as string} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">
                {s.skill_name as string}
                {s.level ? ` · ${s.level}` : ""}
                <button onClick={() => removeSkill(s.id as string)} className="ml-1 hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Skill name"
              value={newSkill.skill_name}
              onChange={(e) => setNewSkill((n) => ({ ...n, skill_name: e.target.value }))}
            />
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newSkill.level}
              onChange={(e) => setNewSkill((n) => ({ ...n, level: e.target.value }))}
            >
              <option value="">Level</option>
              {["beginner", "intermediate", "advanced", "expert"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <Button onClick={addSkill} size="sm"><Plus size={16} /></Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}