"use client";
import { useAuth } from "@/hooks/useAuth";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { ChangeEmailForm } from "@/components/settings/ChangeEmailForm";
import { Shield, User, Mail } from "lucide-react";

function AccountSection() {
  const { user } = useAuth();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <h2 className="font-semibold text-slate-900 mb-4">Account information</h2>
      <div className="flex flex-col text-sm">
        <div className="flex justify-between py-3 border-b border-slate-100">
          <span className="text-slate-500">Email</span>
          <span className="text-slate-900 font-medium">{user?.email}</span>
        </div>
        <div className="flex justify-between py-3 border-b border-slate-100">
          <span className="text-slate-500">Role</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
            Candidate
          </span>
        </div>
        <div className="flex justify-between py-3">
          <span className="text-slate-500">User ID</span>
          <span className="text-slate-400 font-mono text-xs">{user?.user_id}</span>
        </div>
      </div>
    </div>
  );
}

function EmailSection() {
  const { user } = useAuth();
  return <ChangeEmailForm currentEmail={user?.email ?? ""} />;
}

export default function CandidateSettingsPage() {
  return (
    <SettingsLayout
      title="Settings"
      subtitle="Manage your account preferences and security"
      sections={[
        {
          id: "account",
          label: "Account",
          icon: <User size={16} />,
          content: <AccountSection />,
        },
        {
          id: "email",
          label: "Change Email",
          icon: <Mail size={16} />,
          content: <EmailSection />,
        },
        {
          id: "security",
          label: "Security",
          icon: <Shield size={16} />,
          content: <SecuritySection />,
        },
      ]}
    />
  );
}