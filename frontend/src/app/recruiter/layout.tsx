"use client";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Navbar } from "@/components/layout/Navbar";

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="recruiter">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">{children}</main>
    </AuthGuard>
  );
}