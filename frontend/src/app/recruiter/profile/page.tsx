"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export default function RecruiterProfilePage() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getRecruiterProfile()
      .then((r) => setForm(r.data as Record<string, string>))
      .catch(() => {});
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.updateRecruiterProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Company Profile</h1>
      <Card>
        <CardHeader><h2 className="font-semibold text-slate-800">Company information</h2></CardHeader>
        <CardBody>
          <form onSubmit={save} className="flex flex-col gap-4">
            {error && <Alert message={error} />}
            {saved && <Alert message="Profile saved!" type="success" />}
            <Input label="Company name" value={form.company_name ?? ""} onChange={set("company_name")} required />
            <Input label="Your position" value={form.position ?? ""} onChange={set("position")} />
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Company description</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none h-24 outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.company_description ?? ""}
                onChange={set("company_description")}
              />
            </div>
            <Input label="Phone" value={form.phone ?? ""} onChange={set("phone")} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="City" value={form.city ?? ""} onChange={set("city")} />
              <Input label="Country" value={form.country ?? ""} onChange={set("country")} />
            </div>
            <Input label="Website" value={form.website ?? ""} onChange={set("website")} />
            <Button type="submit" loading={loading}>Save changes</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}