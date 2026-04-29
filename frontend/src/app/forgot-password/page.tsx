"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.forgotPasswordRequest(email);
      setMsg("Code sent to your email.");
      setStep("confirm");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.forgotPasswordConfirm(email, code, password);
      setMsg("Password reset successfully. You can now log in.");
      setStep("request");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-8">Reset password</h1>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          {step === "request" ? (
            <form onSubmit={requestCode} className="flex flex-col gap-4">
              {error && <Alert message={error} />}
              {msg && <Alert message={msg} type="success" />}
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Button type="submit" loading={loading} className="w-full">Send reset code</Button>
            </form>
          ) : (
            <form onSubmit={confirmReset} className="flex flex-col gap-4">
              {error && <Alert message={error} />}
              {msg && <Alert message={msg} type="success" />}
              <Input label="Code from email" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required />
              <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              <Button type="submit" loading={loading} className="w-full">Reset password</Button>
            </form>
          )}
        </div>
        <p className="text-center text-sm text-slate-500 mt-4">
          <Link href="/login" className="text-indigo-600 hover:underline">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}