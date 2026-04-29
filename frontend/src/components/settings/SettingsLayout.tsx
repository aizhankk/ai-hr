"use client";
import { useState } from "react";
import { Shield, User, Bell } from "lucide-react";

interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface SettingsLayoutProps {
  title: string;
  subtitle: string;
  sections: Section[];
}

export function SettingsLayout({ title, subtitle, sections }: SettingsLayoutProps) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const current = sections.find((s) => s.id === active);

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-52 shrink-0">
          <nav className="flex flex-col gap-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors w-full ${
                  active === s.id
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className={active === s.id ? "text-indigo-600" : "text-slate-400"}>
                  {s.icon}
                </span>
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">{current?.content}</div>
      </div>
    </div>
  );
}