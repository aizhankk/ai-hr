"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Lock } from "lucide-react";

export function ChangePasswordForm() {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.new_password !== form.confirm_password) {
      setError("New passwords do not match");
      return;
    }
    if (form.new_password.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await api.changePassword(form.current_password, form.new_password);
      setSuccess(true);
      setForm({ current_password: "", new_password: "", confirm_password: "" });
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800">Change Password</h2>
        </div>
      </CardHeader>
      <CardBody>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && <Alert message={error} />}
          {success && <Alert message="Password changed successfully!" type="success" />}
          <Input
            label="Current password"
            type="password"
            value={form.current_password}
            onChange={set("current_password")}
            required
          />
          <Input
            label="New password"
            type="password"
            value={form.new_password}
            onChange={set("new_password")}
            required
            minLength={6}
          />
          <Input
            label="Confirm new password"
            type="password"
            value={form.confirm_password}
            onChange={set("confirm_password")}
            required
          />
          <Button type="submit" loading={loading} variant="secondary">
            Update password
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}