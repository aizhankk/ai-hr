"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  Bell, Briefcase, LogOut, Settings, User,
  LayoutDashboard, Search, ClipboardList, FileText, TrendingUp
} from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isRecruiter = user?.role === "recruiter";
  const base = isRecruiter ? "/recruiter" : "/candidate";

  const navLinks = isRecruiter
    ? [
        { href: "/recruiter/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/recruiter/jobs",      label: "My Jobs",   icon: Briefcase },
        { href: "/recruiter/market",    label: "Market",    icon: TrendingUp },
        { href: "/recruiter/profile",   label: "Profile",   icon: User },
      ]
    : [
        { href: "/candidate/dashboard",    label: "Home",         icon: LayoutDashboard },
        { href: "/candidate/jobs",         label: "Jobs",         icon: Search },
        { href: "/candidate/applications", label: "Applications", icon: ClipboardList },
        { href: "/candidate/resumes",      label: "Resumes",      icon: FileText },
        { href: "/candidate/profile",      label: "Profile",      icon: User },
      ];

  return (
    <>
      {/* ── Top bar ── */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            <Link href={base} className="flex items-center gap-2 font-bold text-indigo-600 text-lg">
              <Briefcase size={22} />
              <span className="hidden sm:inline">AI Recruiter</span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith(l.href)
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              <Link
                href={`${base}/notifications`}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <Bell size={18} />
              </Link>
              <Link
                href={`${base}/settings`}
                className={`p-2 rounded-lg transition-colors ${
                  pathname.startsWith(`${base}/settings`)
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Settings size={18} />
              </Link>
              <div className="flex items-center gap-2 pl-2 ml-1 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User size={16} className="text-indigo-600" />
                </div>
                <span className="text-sm text-slate-600 hidden sm:block max-w-[140px] truncate">
                  {user?.email}
                </span>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Bottom tab bar — mobile only ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 safe-bottom">
        <div className="flex items-stretch">
          {navLinks.map((l) => {
            const active = pathname.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-indigo-600" : "text-slate-500"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span>{l.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}