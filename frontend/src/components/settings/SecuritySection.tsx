"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Eye, EyeOff, CheckCircle, ShieldCheck } from "lucide-react";

function PasswordInput({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            error ? "border-red-400" : "border-slate-300"
          }`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

function StrengthBar({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-green-500"];
  const textColors = ["", "text-red-500", "text-yellow-500", "text-blue-500", "text-green-600"];

  if (!password) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? colors[score] : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${textColors[score]}`}>{labels[score]}</span>
    </div>
  );
}

export function SecuritySection() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.current) e.current = "Required";
    if (form.next.length < 6) e.next = "At least 6 characters";
    if (form.next !== form.confirm) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.changePassword(form.current, form.next);
      setDone(true);
      setForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setDone(false), 5000);
    } catch (err: unknown) {
      setErrors({ current: err instanceof Error ? err.message : "Incorrect password" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <ShieldCheck size={18} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Change Password</h2>
            <p className="text-xs text-slate-400">Update your password to keep your account secure</p>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {done && (
          <div className="flex items-center gap-3 bg-green-50 border-b border-green-100 px-6 py-3">
            <CheckCircle size={16} className="text-green-600 shrink-0" />
            <p className="text-sm text-green-700 font-medium">Password updated successfully!</p>
          </div>
        )}

        <form onSubmit={submit} className="p-6 flex flex-col gap-5">
          <PasswordInput
            label="Current password"
            value={form.current}
            onChange={(v) => setForm((f) => ({ ...f, current: v }))}
            error={errors.current}
          />

          <div className="border-t border-slate-100" />

          <div className="flex flex-col gap-2">
            <PasswordInput
              label="New password"
              value={form.next}
              onChange={(v) => setForm((f) => ({ ...f, next: v }))}
              error={errors.next}
            />
            {form.next && <StrengthBar password={form.next} />}
          </div>

          <PasswordInput
            label="Confirm new password"
            value={form.confirm}
            onChange={(v) => setForm((f) => ({ ...f, confirm: v }))}
            error={errors.confirm}
          />

          {/* Password rules */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-xs font-medium text-slate-500 mb-2">Password requirements</p>
            <ul className="grid grid-cols-2 gap-1">
              {[
                ["At least 6 characters", form.next.length >= 6],
                ["One uppercase letter", /[A-Z]/.test(form.next)],
                ["One number", /[0-9]/.test(form.next)],
                ["One special character", /[^A-Za-z0-9]/.test(form.next)],
              ].map(([rule, met]) => (
                <li key={rule as string} className={`flex items-center gap-1.5 text-xs ${met ? "text-green-600" : "text-slate-400"}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${met ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-400"}`}>
                    {met ? "✓" : "·"}
                  </span>
                  {rule as string}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" loading={loading} size="lg">
              Update password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}