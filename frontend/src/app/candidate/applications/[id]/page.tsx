"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Video, Calendar, Clock, Brain, CheckCircle, AlertCircle, Lightbulb, Mic, MessageSquare } from "lucide-react";

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

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Record<string, unknown> | null>(null);
  const [video, setVideo] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.getApplication(id).then((r) => setApp(r.data)).catch(() => {});
    api.getVideo(id).then((r) => setVideo(r.data)).catch(() => {});
  }, [id]);

  if (!app) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  const videoAnalysis = video?.analysis as Record<string, unknown> | null;
  const resumeAI = app.ai_analysis as Record<string, unknown> | null;

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline self-start">← Back</button>

      {/* Application info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{app.job_title as string}</h1>
              <p className="text-slate-500 text-sm">{app.company_name as string}</p>
            </div>
            <Badge label={app.status as string} />
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar size={14} />
              <span>Applied {new Date(app.applied_at as string).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Clock size={14} />
              <span>Updated {new Date(app.updated_at as string).toLocaleDateString()}</span>
            </div>
          </div>
          {app.cover_letter ? (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-700 mb-1">Cover letter</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{app.cover_letter as string}</p>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* AI Resume Analysis */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4">
          <div className="flex items-center gap-2 text-white">
            <Brain size={18} />
            <span className="font-semibold text-sm">AI Resume Analysis</span>
          </div>
          <p className="text-indigo-200 text-xs mt-0.5">How well your CV matches this position</p>
        </div>

        <div className="p-5">
          {resumeAI ? (
            <div className="flex flex-col gap-4">
              {/* Score rings */}
              <div className="flex justify-around">
                <ScoreRing value={resumeAI.matching_score as number} label="Match Score" />
                <ScoreRing value={(resumeAI.skill_overlap as number) ?? 0} label="Skill Overlap" />
                <ScoreRing value={(resumeAI.semantic_score as number) ?? 0} label="Semantic" />
              </div>

              {/* Skills matched */}
              {Array.isArray(resumeAI.skills_matched) && (resumeAI.skills_matched as string[]).length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <CheckCircle size={11} className="text-green-500" /> Detected skills
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(resumeAI.skills_matched as string[]).map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] border border-green-100">{s}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {(resumeAI.experience_years as number) > 0 ? (
                <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-3">
                  <span className="text-slate-500">Experience detected</span>
                  <span className="font-medium text-slate-800">{resumeAI.experience_years as number} years</span>
                </div>
              ) : null}

              {resumeAI.education ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Education</span>
                  <span className="font-medium text-slate-800">{resumeAI.education as string}</span>
                </div>
              ) : null}

              {resumeAI.summary ? (
                <div className="bg-indigo-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-indigo-400 uppercase mb-1">AI Summary</p>
                  <p className="text-xs text-indigo-900 leading-relaxed">{resumeAI.summary as string}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-center py-6">
              <Brain size={36} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm text-slate-500 mb-1">No analysis yet</p>
              <p className="text-xs text-slate-400">The recruiter will run AI analysis on your resume after reviewing your application.</p>
            </div>
          )}
        </div>
      </div>

      {/* Video interview results */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Video size={18} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Interview Recording</h2>
          </div>
        </CardHeader>
        <CardBody>
          {video ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Badge label={video.status as string} />
                {video.recorded_at ? (
                  <span className="text-xs text-slate-400">
                    Recorded {new Date(video.recorded_at as string).toLocaleDateString()}
                  </span>
                ) : null}
              </div>

              {videoAnalysis ? (
                <div className="flex flex-col gap-4">
                  {/* Verdict */}
                  {videoAnalysis.verdict ? (() => {
                    const v = videoAnalysis.verdict as string;
                    const style =
                      v === "Good Fit" ? "bg-green-50 text-green-700 border-green-200" :
                      v === "Not a Fit" ? "bg-red-50 text-red-600 border-red-200" :
                      "bg-yellow-50 text-yellow-700 border-yellow-200";
                    return (
                      <div className={`text-center py-2 rounded-xl border font-semibold text-sm ${style}`}>{v}</div>
                    );
                  })() : null}

                  {/* Score rings */}
                  <div className="grid grid-cols-2 gap-3">
                    <ScoreRing value={videoAnalysis.overall_score as number} label="Overall" />
                    <ScoreRing value={videoAnalysis.speech_clarity_score as number} label="Clarity" />
                    <ScoreRing value={videoAnalysis.confidence_score as number} label="Confidence" />
                    <ScoreRing value={videoAnalysis.emotional_tone_score as number} label="Tone" />
                  </div>

                  {videoAnalysis.ai_summary ? (
                    <div className="bg-indigo-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-indigo-400 uppercase mb-1 flex items-center gap-1">
                        <MessageSquare size={10} /> Summary
                      </p>
                      <p className="text-xs text-indigo-900 leading-relaxed">{videoAnalysis.ai_summary as string}</p>
                    </div>
                  ) : null}

                  {Array.isArray(videoAnalysis.strengths) && (videoAnalysis.strengths as string[]).length > 0 ? (
                    <div className="bg-green-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-green-600 uppercase mb-2 flex items-center gap-1">
                        <CheckCircle size={10} /> Strengths
                      </p>
                      <ul className="flex flex-col gap-1">
                        {(videoAnalysis.strengths as string[]).map((s, i) => (
                          <li key={i} className="text-xs text-green-800 flex items-start gap-1.5">
                            <CheckCircle size={10} className="text-green-500 mt-0.5 shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {Array.isArray(videoAnalysis.concerns) && (videoAnalysis.concerns as string[]).length > 0 ? (
                    <div className="bg-amber-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-amber-600 uppercase mb-2 flex items-center gap-1">
                        <AlertCircle size={10} /> Areas to improve
                      </p>
                      <ul className="flex flex-col gap-1">
                        {(videoAnalysis.concerns as string[]).map((c, i) => (
                          <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                            <Lightbulb size={10} className="text-amber-500 mt-0.5 shrink-0" />{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {videoAnalysis.recommendations ? (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
                        <Lightbulb size={10} /> Recommendation
                      </p>
                      <p className="text-xs text-slate-700">{videoAnalysis.recommendations as string}</p>
                    </div>
                  ) : null}

                  {videoAnalysis.speech_transcript ? (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                        <Mic size={10} /> Transcript
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-6">
                        {videoAnalysis.speech_transcript as string}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-400">The recruiter has uploaded the recording. Analysis pending.</p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Video size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No interview recording yet.</p>
              <p className="text-xs mt-1">The recruiter will upload the recording after your interview.</p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
