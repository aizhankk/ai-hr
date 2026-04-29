"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship", "remote"];

export default function NewJobPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", description: "", requirements: "",
    employment_type: "full_time", location: "",
    is_remote: false, salary_min: "", salary_max: "", currency: "USD",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        salary_min: form.salary_min ? parseFloat(form.salary_min) : undefined,
        salary_max: form.salary_max ? parseFloat(form.salary_max) : undefined,
      };
      const res = await api.createJob(payload) as { data: { id: string } };
      router.push(`/recruiter/jobs/${res.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline mb-6">← Back</button>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Post a New Job</h1>

      <Card>
        <CardHeader><h2 className="font-semibold text-slate-800">Job details</h2></CardHeader>
        <CardBody>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {error && <Alert message={error} />}
            <Input label="Job title" value={form.title} onChange={set("title")} required />
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Description *</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none h-32 outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.description}
                onChange={set("description")}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Requirements</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none h-24 outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.requirements}
                onChange={set("requirements")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Employment type</label>
                <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.employment_type} onChange={set("employment_type")}>
                  {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                </select>
              </div>
              <Input label="Location" value={form.location} onChange={set("location")} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Min salary" type="number" value={form.salary_min} onChange={set("salary_min")} />
              <Input label="Max salary" type="number" value={form.salary_max} onChange={set("salary_max")} />
              <Input label="Currency" value={form.currency} onChange={set("currency")} maxLength={5} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remote"
                checked={form.is_remote}
                onChange={(e) => setForm((f) => ({ ...f, is_remote: e.target.checked }))}
              />
              <label htmlFor="remote" className="text-sm text-slate-700">Remote position</label>
            </div>
            <Button type="submit" loading={loading} size="lg">Create job posting</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}