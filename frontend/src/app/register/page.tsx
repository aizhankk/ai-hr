import Link from "next/link";
import { Briefcase, Users, Building2 } from "lucide-react";

export default function RegisterChoicePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 font-bold text-xl mb-4">
            <Briefcase size={24} /> AI Recruiter
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Create an account</h1>
          <p className="text-slate-500 text-sm mt-1">Choose how you want to use the platform</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/register/candidate" className="group flex flex-col items-center gap-3 bg-white p-8 rounded-xl border-2 border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all">
            <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <Users size={28} className="text-indigo-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-900">Candidate</p>
              <p className="text-xs text-slate-500 mt-1">Looking for a job</p>
            </div>
          </Link>

          <Link href="/register/recruiter" className="group flex flex-col items-center gap-3 bg-white p-8 rounded-xl border-2 border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all">
            <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <Building2 size={28} className="text-indigo-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-900">Recruiter</p>
              <p className="text-xs text-slate-500 mt-1">Hiring talent</p>
            </div>
          </Link>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}