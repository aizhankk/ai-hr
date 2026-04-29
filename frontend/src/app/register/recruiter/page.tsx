"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Briefcase } from "lucide-react";

export default function RegisterRecruiterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "", password: "", first_name: "", last_name: "",
    company_name: "", position: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.registerRecruiter(form);
      router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 font-bold text-xl mb-4">
            <Briefcase size={24} /> AI Recruiter
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Create recruiter account</h1>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <form onSubmit={submit} className="flex flex-col gap-4">
            {error && <Alert message={error} />}
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" value={form.first_name} onChange={set("first_name")} required />
              <Input label="Last name" value={form.last_name} onChange={set("last_name")} required />
            </div>
            <Input label="Email" type="email" value={form.email} onChange={set("email")} required />
            <Input label="Password (min 8 chars, must include a letter and a digit)" type="password" value={form.password} onChange={set("password")} required minLength={8} />
            <Input label="Company name" value={form.company_name} onChange={set("company_name")} required />
            <Input label="Your position" value={form.position} onChange={set("position")} required />
            <Button type="submit" loading={loading} size="lg" className="w-full">Create account</Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          <Link href="/register" className="text-indigo-600 hover:underline">← Back</Link>
        </p>
      </div>
    </div>
  );
}