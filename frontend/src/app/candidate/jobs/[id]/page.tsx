"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import {
  MapPin, DollarSign, Building2, CheckCircle, /* Sparkles, */ Send,
} from "lucide-react";

// AI match feature commented out
// type MatchPreview = {
//   matching_score: number;
//   skill_overlap: number;
//   semantic_score: number;
//   experience_years: number;
//   education: string;
//   skills_matched: string[];
//   summary: string;
//   resume_id: string;
//   resume_filename: string;
// };

type ChatMessage = { role: "user" | "assistant"; content: string };

// function ScoreBar({ value, label }: { value: number; label: string }) {
//   const pct = Math.min(100, Math.max(0, Math.round(value)));
//   return (
//     <div>
//       <div className="flex items-center justify-between text-xs mb-1">
//         <span className="text-slate-500">{label}</span>
//         <span className="text-slate-700 font-medium">{pct}%</span>
//       </div>
//       <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
//         <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
//       </div>
//     </div>
//   );
// }

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [resumes, setResumes] = useState<Record<string, unknown>[]>([]);
  const [selectedResume, setSelectedResume] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // AI match feature commented out
  // const [match, setMatch] = useState<MatchPreview | null>(null);
  // const [matchLoading, setMatchLoading] = useState(false);
  // const [matchError, setMatchError] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getJob(id).then((r) => setJob(r.data)).catch(() => {});
    api.listResumes().then((r) => {
      setResumes(r.data);
      const primary = r.data.find((x) => x.is_primary);
      if (primary) setSelectedResume(primary.id as string);
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  const apply = async () => {
    setError("");
    setLoading(true);
    try {
      await api.apply({
        job_posting_id: id,
        resume_id: selectedResume || undefined,
        cover_letter: coverLetter || undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to apply");
    } finally {
      setLoading(false);
    }
  };

  // AI match feature commented out
  // const checkMatch = async () => {
  //   setMatchError("");
  //   setMatchLoading(true);
  //   try {
  //     const res = await api.aiMatchPreview(id, selectedResume || undefined);
  //     setMatch(res.data);
  //   } catch (err: unknown) {
  //     setMatchError(err instanceof Error ? err.message : "Failed to analyze");
  //   } finally {
  //     setMatchLoading(false);
  //   }
  // };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const next: ChatMessage[] = [...chatMessages, { role: "user", content: text }];
    setChatMessages(next);
    setChatInput("");
    setChatError("");
    setChatLoading(true);
    try {
      const res = await api.aiChat(next, id, selectedResume || undefined);
      setChatMessages([...next, { role: "assistant", content: res.data.reply }]);
    } catch (err: unknown) {
      setChatError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setChatLoading(false);
    }
  };

  if (!job) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;

  const skills = (job.skills as Record<string, unknown>[]) ?? [];
  // const overall = match ? Math.round(match.matching_score) : 0;

  return (
    <div className="max-w-6xl">
      <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline mb-6 flex items-center gap-1">← Back</button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* LEFT: job + apply */}
        <div className="flex flex-col gap-6 min-w-0">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{job.title as string}</h1>
                  <div className="flex items-center gap-2 mt-1 text-slate-600">
                    <Building2 size={15} />
                    <span className="text-sm">{job.company_name as string}</span>
                  </div>
                </div>
                <Badge label={job.employment_type as string} />
              </div>
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500">
                {job.location ? <span className="flex items-center gap-1"><MapPin size={14} />{job.location as string}</span> : null}
                {job.is_remote ? <Badge label="remote" /> : null}
                {(job.salary_min || job.salary_max) ? (
                  <span className="flex items-center gap-1">
                    <DollarSign size={14} />
                    {job.salary_min as number} — {job.salary_max as number} {job.currency as string}
                  </span>
                ) : null}
              </div>
            </CardHeader>
            <CardBody>
              <h3 className="font-semibold text-slate-800 mb-2">Description</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{job.description as string}</p>
              {job.requirements ? (
                <>
                  <h3 className="font-semibold text-slate-800 mb-2">Requirements</h3>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{job.requirements as string}</p>
                </>
              ) : null}
              {skills.length > 0 ? (
                <>
                  <h3 className="font-semibold text-slate-800 mb-2">Required skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <span key={s.id as string} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                        {s.skill_name as string} {s.level ? `· ${s.level}` : ""}
                      </span>
                    ))}
                  </div>
                </>
              ) : null}
            </CardBody>
          </Card>

          {success ? (
            <Card>
              <CardBody className="text-center py-10">
                <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-slate-900">Application submitted!</p>
                <p className="text-sm text-slate-500 mt-1">The recruiter will review your application.</p>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader><h2 className="font-semibold text-slate-800">Apply for this job</h2></CardHeader>
              <CardBody className="flex flex-col gap-4">
                {error && <Alert message={error} />}
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Resume</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={selectedResume}
                    onChange={(e) => setSelectedResume(e.target.value)}
                  >
                    <option value="">No resume</option>
                    {resumes.map((r) => (
                      <option key={r.id as string} value={r.id as string}>
                        {r.original_filename as string} {r.is_primary ? "(primary)" : ""}
                      </option>
                    ))}
                  </select>
                  {/* <p className="text-xs text-slate-400 mt-1">Used for the AI match analysis on the right too.</p> */}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Cover letter (optional)</label>
                  <textarea
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none h-28 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Tell us why you're a good fit…"
                  />
                </div>
                <Button onClick={apply} loading={loading} size="lg">Submit Application</Button>
              </CardBody>
            </Card>
          )}
        </div>

        {/* RIGHT: AI sidebar */}
        <div className="flex flex-col gap-4">
          {/* AI match feature commented out */}
          {/* <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">AI match</h3>

            {matchError && <div className="mb-3"><Alert message={matchError} /></div>}

            {match ? (
              <div className="flex flex-col gap-4">
                <div className="text-center py-2">
                  <div className="text-4xl font-semibold text-slate-900">{overall}%</div>
                  <div className="text-xs text-slate-500 mt-0.5">overall match</div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <ScoreBar value={match.skill_overlap} label="Skill overlap" />
                  <ScoreBar value={match.semantic_score} label="Semantic" />
                </div>

                {match.skills_matched.length > 0 ? (
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-500 mb-1.5">Detected skills</p>
                    <div className="flex flex-wrap gap-1">
                      {match.skills_matched.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">{s}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-1 text-xs text-slate-500 border-t border-slate-100 pt-3">
                  {match.experience_years > 0 ? (
                    <div className="flex justify-between"><span>Experience</span><span className="text-slate-700">{match.experience_years} years</span></div>
                  ) : null}
                  {match.education ? (
                    <div className="flex justify-between"><span>Education</span><span className="text-slate-700">{match.education}</span></div>
                  ) : null}
                </div>

                <button
                  onClick={checkMatch}
                  disabled={matchLoading}
                  className="text-xs text-indigo-600 hover:underline self-start disabled:opacity-50"
                >
                  {matchLoading ? "Re-running…" : "Re-run analysis"}
                </button>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-slate-600 mb-1">See how your CV scores</p>
                <p className="text-xs text-slate-400 mb-4">
                  We&apos;ll compare your selected resume to this job.
                </p>
                <Button
                  onClick={checkMatch}
                  loading={matchLoading}
                  disabled={resumes.length === 0}
                  size="sm"
                >
                  <Sparkles size={13} className="mr-1" />
                  {resumes.length === 0 ? "Upload a resume first" : "Check my match"}
                </Button>
              </div>
            )}
          </div> */}

          {/* AI chat */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Rewrite my CV</h3>
              <p className="text-xs text-slate-400">Line-by-line suggestions tailored to this job</p>
            </div>

            <div ref={chatScrollRef} className="h-72 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  Try: <span className="italic">&quot;Which lines in my CV should I rewrite?&quot;</span>
                </p>
              ) : null}
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`text-sm rounded-lg px-3 py-2 max-w-[85%] whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-indigo-50 text-indigo-900 self-end"
                      : "bg-slate-50 text-slate-700 self-start"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {chatLoading ? (
                <div className="bg-slate-50 text-slate-400 rounded-lg px-3 py-2 text-sm self-start">
                  Thinking…
                </div>
              ) : null}
            </div>

            {chatError ? <div className="px-4 pb-2"><Alert message={chatError} /></div> : null}

            <div className="px-3 py-3 border-t border-slate-100 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder="Ask a question…"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={chatLoading}
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="bg-indigo-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
