"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import {
  MapPin, DollarSign, Building2, CheckCircle,
  Brain, Sparkles, Send, Bot, User as UserIcon,
} from "lucide-react";

type MatchPreview = {
  matching_score: number;
  skill_overlap: number;
  semantic_score: number;
  experience_years: number;
  education: string;
  skills_matched: string[];
  summary: string;
  resume_id: string;
  resume_filename: string;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

function ScoreRing({ value, label }: { value: number; label: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#6366f1" : pct >= 40 ? "#facc15" : "#ef4444";
  const r = 36, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-slate-900">{Math.round(pct)}</span>
        </div>
      </div>
      <span className="text-xs text-slate-500 text-center">{label}</span>
    </div>
  );
}

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

  const [match, setMatch] = useState<MatchPreview | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState("");

  const [chatOpen, setChatOpen] = useState(false);
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

  const checkMatch = async () => {
    setMatchError("");
    setMatchLoading(true);
    try {
      const res = await api.aiMatchPreview(id, selectedResume || undefined);
      setMatch(res.data);
    } catch (err: unknown) {
      setMatchError(err instanceof Error ? err.message : "Failed to analyze");
    } finally {
      setMatchLoading(false);
    }
  };

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

  return (
    <div className="max-w-3xl">
      <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline mb-6 flex items-center gap-1">← Back</button>

      <Card className="mb-6">
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

      {/* AI Match Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Brain size={18} />
            <div>
              <p className="font-semibold text-sm">AI Match Analysis</p>
              <p className="text-indigo-200 text-xs mt-0.5">See how well your CV fits before applying</p>
            </div>
          </div>
          <Sparkles size={18} className="text-indigo-200" />
        </div>
        <div className="p-5">
          {matchError && <div className="mb-3"><Alert message={matchError} /></div>}
          {match ? (
            <div className="flex flex-col gap-4">
              <div className="flex justify-around">
                <ScoreRing value={match.matching_score} label="Match" />
                <ScoreRing value={match.skill_overlap} label="Skill Overlap" />
                <ScoreRing value={match.semantic_score} label="Semantic" />
              </div>

              {match.skills_matched.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <CheckCircle size={11} className="text-green-500" /> Detected skills
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {match.skills_matched.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] border border-green-100">{s}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4 text-sm border-t border-slate-100 pt-3">
                {match.experience_years > 0 ? (
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500">Experience detected</span>
                    <span className="font-medium text-slate-800">{match.experience_years} years</span>
                  </div>
                ) : null}
                {match.education ? (
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500">Education</span>
                    <span className="font-medium text-slate-800">{match.education}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={checkMatch} loading={matchLoading} size="sm">Re-run analysis</Button>
                <button
                  onClick={() => setChatOpen(true)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors flex items-center gap-1"
                >
                  <Bot size={13} /> Ask AI about these results
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Brain size={36} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm text-slate-700 mb-1">Curious how you score?</p>
              <p className="text-xs text-slate-500 mb-4">
                Run AI analysis to see your match score against this job. We&apos;ll use the resume selected below.
              </p>
              <Button
                onClick={checkMatch}
                loading={matchLoading}
                disabled={resumes.length === 0}
                size="sm"
              >
                {resumes.length === 0 ? "Upload a resume first" : "Check my match"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* AI Chat */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <button
          onClick={() => setChatOpen((s) => !s)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-indigo-600" />
            <div className="text-left">
              <p className="font-semibold text-sm text-slate-800">Chat with AI</p>
              <p className="text-xs text-slate-500">Ask anything about this role or your CV</p>
            </div>
          </div>
          <span className="text-xs text-indigo-600">{chatOpen ? "Hide" : "Open"}</span>
        </button>

        {chatOpen ? (
          <div className="border-t border-slate-100">
            <div ref={chatScrollRef} className="max-h-80 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50">
              {chatMessages.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-6">
                  Try asking: <span className="italic">&quot;What skills am I missing for this role?&quot;</span>
                </div>
              ) : null}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" ? (
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Bot size={14} />
                    </div>
                  ) : null}
                  <div
                    className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-700 border border-slate-200"
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.role === "user" ? (
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                      <UserIcon size={14} />
                    </div>
                  ) : null}
                </div>
              ))}
              {chatLoading ? (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <Bot size={14} />
                  </div>
                  <div className="bg-white text-slate-400 border border-slate-200 rounded-2xl px-3 py-2 text-sm">
                    Thinking…
                  </div>
                </div>
              ) : null}
            </div>
            {chatError ? <div className="px-4 pt-3"><Alert message={chatError} /></div> : null}
            <div className="p-3 border-t border-slate-100 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder="Ask about the job, your CV, or how to improve…"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={chatLoading}
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="bg-indigo-600 text-white rounded-lg px-3 py-2 text-sm flex items-center gap-1 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={14} /> Send
              </button>
            </div>
          </div>
        ) : null}
      </div>

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
              <p className="text-xs text-slate-400 mt-1">The same resume is used for the AI match analysis above.</p>
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
  );
}
