"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Search, MapPin, DollarSign, TrendingUp, Briefcase, Building2, BarChart2 } from "lucide-react";

const EMPLOYMENT_TYPES = ["", "full_time", "part_time", "contract", "internship", "remote"];

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function MarketPage() {
  const [jobs, setJobs] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.listJobs(100, 0, search, type, location);
      setJobs(r.data);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [search, type, location]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(inputValue), 400);
    return () => clearTimeout(t);
  }, [inputValue]);

  // Market analytics
  const avgSalaryMin = jobs.filter((j) => j.salary_min).reduce((s, j) => s + (j.salary_min as number), 0) / (jobs.filter((j) => j.salary_min).length || 1);
  const remoteCount = jobs.filter((j) => j.is_remote).length;
  const companies = new Set(jobs.map((j) => j.company_name)).size;

  const topSkillsMap: Record<string, number> = {};
  // Count employment types
  const typeCount: Record<string, number> = {};
  jobs.forEach((j) => {
    const t = j.employment_type as string;
    typeCount[t] = (typeCount[t] ?? 0) + 1;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp size={22} className="text-indigo-600" /> Market Monitor
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Анализ рынка вакансий — следи за трендами, зарплатами и конкурентами
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Вакансий на рынке" value={jobs.length} icon={Briefcase} color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Компаний" value={companies} icon={Building2} color="bg-purple-50 text-purple-600" />
        <StatCard label="Удалённых позиций" value={remoteCount} icon={TrendingUp} color="bg-green-50 text-green-600" />
        <StatCard
          label="Средн. мин. зарплата"
          value={avgSalaryMin > 0 ? `${Math.round(avgSalaryMin).toLocaleString()}` : "—"}
          icon={DollarSign}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Employment type breakdown */}
      {Object.keys(typeCount).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
          <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <BarChart2 size={15} className="text-slate-400" /> Распределение по типу занятости
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(typeCount).sort((a, b) => b[1] - a[1]).map(([t, count]) => (
              <button
                key={t}
                onClick={() => setType(type === t ? "" : t)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  type === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300"
                }`}
              >
                <span className="capitalize">{t.replace(/_/g, " ")}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${type === t ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search & filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Поиск по названию, компании или описанию…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>
        <div className="relative">
          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="pl-8 pr-4 py-2 text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-44"
            placeholder="Город…"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <select
          className="py-2 px-3 text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {EMPLOYMENT_TYPES.map((t) => (
            <option key={t} value={t}>{t ? t.replace(/_/g, " ") : "Все типы"}</option>
          ))}
        </select>
        {(search || type || location) && (
          <button
            onClick={() => { setInputValue(""); setSearch(""); setType(""); setLocation(""); }}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            Сбросить
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">
          {loading ? "Загрузка…" : `${jobs.length} вакансий`}
        </span>
      </div>

      {/* Jobs list */}
      {jobs.length === 0 && !loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400">
          <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
          <p>Вакансий не найдено.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((j) => (
            <div key={j.id as string} className="bg-white rounded-2xl border border-slate-200 hover:shadow-md hover:border-indigo-200 transition-all p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm">{j.title as string}</h3>
                    {j.is_remote ? <Badge label="remote" /> : null}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Building2 size={12} />
                    <span className="font-medium text-slate-700">{j.company_name as string}</span>
                    {j.location ? <><span>·</span><MapPin size={11} /><span>{j.location as string}</span></> : null}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {j.description as string}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge label={j.employment_type as string} />
                  {(j.salary_min || j.salary_max) ? (
                    <span className="text-xs text-slate-600 flex items-center gap-1">
                      <DollarSign size={11} />
                      {j.salary_min ? Number(j.salary_min).toLocaleString() : "—"}
                      {j.salary_max ? ` – ${Number(j.salary_max).toLocaleString()}` : "+"}
                      <span className="text-slate-400">{j.currency as string}</span>
                    </span>
                  ) : null}
                  <span className="text-[10px] text-slate-400">
                    {j.published_at ? new Date(j.published_at as string).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}