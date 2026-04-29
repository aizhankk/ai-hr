const colors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  reviewing: "bg-blue-100 text-blue-700",
  shortlisted: "bg-purple-100 text-purple-700",
  interview_scheduled: "bg-indigo-100 text-indigo-700",
  rejected: "bg-red-100 text-red-700",
  hired: "bg-green-100 text-green-700",
  draft: "bg-slate-100 text-slate-600",
  published: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  closed: "bg-red-100 text-red-600",
  full_time: "bg-blue-100 text-blue-700",
  part_time: "bg-cyan-100 text-cyan-700",
  contract: "bg-orange-100 text-orange-700",
  remote: "bg-teal-100 text-teal-700",
  internship: "bg-pink-100 text-pink-700",
};

export function Badge({ label }: { label: string }) {
  const cls = colors[label] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label.replace(/_/g, " ")}
    </span>
  );
}