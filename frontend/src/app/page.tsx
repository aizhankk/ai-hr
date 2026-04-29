"use client";
import Link from "next/link";
import { Briefcase, Brain, FileText, Video, Users, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-indigo-600 text-xl">
            <Briefcase size={24} />
            AI Recruiter
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium">
              Log in
            </Link>
            <Link href="/register" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-24 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
          <Brain size={14} />
          Powered by AI
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
          Hire smarter with<br />
          <span className="text-indigo-600">AI-driven recruitment</span>
        </h1>
        <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto">
          Automatically rank resumes, analyze video interviews, and find the perfect candidate
          for every role — all in one platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register/recruiter" className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
            I&apos;m a Recruiter <ArrowRight size={16} />
          </Link>
          <Link href="/register/candidate" className="inline-flex items-center gap-2 px-8 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">
            I&apos;m a Candidate <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Everything you need</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Brain, title: "AI Resume Scoring", desc: "Automatically score and rank candidates based on job requirements." },
              { icon: Video, title: "Video Interviews", desc: "Candidates record short video intros analyzed by AI for tone and clarity." },
              { icon: FileText, title: "Smart Job Posting", desc: "Create detailed postings with required skills and salary ranges." },
              { icon: Users, title: "Candidate Tracking", desc: "Track every applicant from pending to hired in one place." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mb-4">
                  <Icon size={20} className="text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-slate-100 text-center text-sm text-slate-400">
        © 2025 AI Recruiter. All rights reserved.
      </footer>
    </div>
  );
}