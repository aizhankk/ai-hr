"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { clearAuth } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Mail, ArrowRight, CheckCircle, LogOut } from "lucide-react";

type Step = "input" | "verify" | "done";

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    if (newEmail === currentEmail) {
      setError("New email must be different from the current one");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.changeEmailRequest(newEmail);
      setStep("verify");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) { setError("Enter the 6-digit code"); return; }
    setError("");
    setLoading(true);
    try {
      await api.changeEmailConfirm(newEmail, code);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError("");
    try {
      await api.changeEmailRequest(newEmail);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setResending(false);
    }
  };

  const logout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Mail size={16} className="text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Change Email</p>
          <p className="text-xs text-slate-400">Current: <span className="font-medium text-slate-600">{currentEmail}</span></p>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { n: 1, label: "New email", active: step === "input", done: step !== "input" },
            { n: 2, label: "Verify code", active: step === "verify", done: step === "done" },
            { n: 3, label: "Done", active: step === "done", done: false },
          ].map(({ n, label, active, done }, i) => (
            <div key={n} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done ? "bg-green-500 text-white" : active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
                }`}>
                  {done ? "✓" : n}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${active ? "text-slate-900" : "text-slate-400"}`}>
                  {label}
                </span>
              </div>
              {i < 2 && <div className="w-8 h-px bg-slate-200" />}
            </div>
          ))}
        </div>

        {/* Step 1 — enter new email */}
        {step === "input" && (
          <form onSubmit={requestCode} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>
            )}
            <Input
              label="New email address"
              type="email"
              placeholder="new@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <p className="text-xs text-slate-400">
              We'll send a 6-digit verification code to the new address.
              After confirmation you'll be logged out.
            </p>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                Send verification code <ArrowRight size={15} />
              </Button>
            </div>
          </form>
        )}

        {/* Step 2 — verify code */}
        {step === "verify" && (
          <form onSubmit={confirm} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>
            )}
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 flex items-start gap-3">
              <Mail size={16} className="text-indigo-600 mt-0.5 shrink-0" />
              <p className="text-sm text-indigo-700">
                Code sent to <strong>{newEmail}</strong>. Check your inbox.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Verification code</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                maxLength={6}
                placeholder="──────"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={resend}
                disabled={resending}
                className="text-sm text-indigo-600 hover:underline disabled:opacity-50"
              >
                {resending ? "Sending…" : "Resend code"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("input"); setCode(""); setError(""); }}
                className="text-sm text-slate-400 hover:text-slate-600"
              >
                Change email
              </button>
            </div>
            <Button type="submit" loading={loading} size="lg" className="w-full">
              Confirm email change
            </Button>
          </form>
        )}

        {/* Step 3 — success */}
        {step === "done" && (
          <div className="text-center py-4 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Email changed successfully!</p>
              <p className="text-sm text-slate-500 mt-1">
                Your email is now <strong>{newEmail}</strong>.
                Please log in again with your new email.
              </p>
            </div>
            <Button onClick={logout} size="lg">
              <LogOut size={16} /> Log in with new email
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}