"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { MailCheck } from "lucide-react";

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.verifyEmail(email, code);
      saveAuth(res.access_token, "", {
        user_id: res.user.id,
        email: res.user.email,
        role: res.user.role as "candidate" | "recruiter",
      });
      router.push(res.user.role === "recruiter" ? "/recruiter/dashboard" : "/candidate/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await api.resendCode(email);
      setResent(true);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <MailCheck size={32} className="text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
        <p className="text-slate-500 text-sm mb-8">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <form onSubmit={submit} className="flex flex-col gap-4">
            {error && <Alert message={error} />}
            {resent && <Alert message="Code resent!" type="success" />}
            <Input
              label="Verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              required
            />
            <Button type="submit" loading={loading} size="lg" className="w-full">Verify email</Button>
          </form>
        </div>

        <button onClick={resend} className="mt-4 text-sm text-indigo-600 hover:underline">
          Didn&apos;t receive the code? Resend
        </button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}