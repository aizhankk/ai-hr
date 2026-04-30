"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  User, Mail, MapPin, Link2,
  Briefcase, FileText, Brain, CheckCircle, AlertCircle, GitBranch,
  Video, Upload, X, Mic, MessageSquare, TrendingUp, Lightbulb,
} from "lucide-react";

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

export default function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [videoState, setVideoState] = useState<{ file: File | null; uploading: boolean; uploaded: boolean; error: string }>({ file: null, uploading: false, uploaded: false, error: "" });
  const [videoAnalysis, setVideoAnalysis] = useState<Record<string, unknown> | null>(null);
  const [analyzingVideo, setAnalyzingVideo] = useState(false);
  const [videoAnalysisError, setVideoAnalysisError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () =>
    api.getApplicationCandidate(id)
      .then((r) => setData(r.data))
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Failed to load"));

  useEffect(() => {
    load();
    // Проверяем есть ли уже видео и анализ
    api.getVideo(id)
      .then((r) => {
        const v = r.data;
        if (v.status) setVideoState((s) => ({ ...s, uploaded: true }));
        if (v.analysis) setVideoAnalysis(v.analysis as Record<string, unknown>);
      })
      .catch(() => {});
  }, [id]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      await api.analyzeResume(id);
      await load();
    } catch (err: unknown) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const uploadVideo = async () => {
    if (!videoState.file) return;
    setVideoState((s) => ({ ...s, uploading: true, error: "" }));
    try {
      await api.uploadVideo(id, videoState.file);
      setVideoState((s) => ({ ...s, uploading: false, uploaded: true, file: null }));
    } catch (err: unknown) {
      setVideoState((s) => ({ ...s, uploading: false, error: err instanceof Error ? err.message : "Upload failed" }));
    }
  };

  const runVideoAnalysis = async () => {
    setAnalyzingVideo(true);
    setVideoAnalysisError("");
    try {
      const r = await api.analyzeVideo(id);
      setVideoAnalysis(r.data);
    } catch (err: unknown) {
      setVideoAnalysisError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzingVideo(false);
    }
  };

  if (loadError) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <p className="text-red-500 font-medium">{loadError}</p>
      <button onClick={() => { setLoadError(""); load(); }} className="text-sm text-indigo-600 hover:underline">Retry</button>
    </div>
  );

  if (!data) return (
    <div className="flex justify-center py-24">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  const profile = data.profile as Record<string, unknown>;
  const skills = data.skills as Record<string, unknown>[];
  const resumes = data.resumes as Record<string, unknown>[];
  const ai = data.ai_analysis as Record<string, unknown> | null;
  const app = data.application as Record<string, unknown>;

  return (
    <div className="max-w-4xl">
      <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline mb-6">
        ← Back to applications
      </button>

      <div className="grid grid-cols-[1fr_320px] gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-5">

          {/* Profile header */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {String(profile.first_name ?? "?")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-slate-900">
                  {profile.first_name as string} {profile.last_name as string}
                </h1>
                <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-slate-500">
                  {profile.email ? (
                    <span className="flex items-center gap-1"><Mail size={13} />{profile.email as string}</span>
                  ) : null}
                  {profile.city ? (
                    <span className="flex items-center gap-1"><MapPin size={13} />{profile.city as string}{profile.country ? `, ${profile.country as string}` : ""}</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.linkedin_url ? (
                    <a href={profile.linkedin_url as string} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                      <Link2 size={12} /> LinkedIn
                    </a>
                  ) : null}
                  {profile.github_url ? (
                    <a href={profile.github_url as string} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-slate-600 hover:underline">
                      <GitBranch size={12} /> GitHub
                    </a>
                  ) : null}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge label={app.status as string} />
                  <span className="text-xs text-slate-400">
                    Applied {new Date(app.applied_at as string).toLocaleDateString()}
                  </span>
                  {profile.is_open_to_work ? (
                    <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                      Open to work
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {profile.bio ? (
              <p className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600 leading-relaxed">
                {profile.bio as string}
              </p>
            ) : null}
          </div>

          {/* Cover letter */}
          {app.cover_letter ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <FileText size={15} className="text-slate-400" /> Cover Letter
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {app.cover_letter as string}
              </p>
            </div>
          ) : null}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s.id as string}
                    className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                    {s.skill_name as string}
                    {s.level ? <span className="text-indigo-400 ml-1">· {s.level as string}</span> : null}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resumes */}
          {(() => {
            const attached = resumes.find((r) => r.id === app.resume_id);
            const others = resumes.filter((r) => r.id !== app.resume_id);
            const list = attached ? [attached, ...others] : resumes;
            return (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText size={15} className="text-slate-400" /> Resume
                </h2>
                {list.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {list.map((r) => (
                      <div key={r.id as string}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50 gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={14} className="text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-700 truncate">
                            {r.original_filename as string}
                          </span>
                          {r.id === app.resume_id && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full shrink-0">
                              attached
                            </span>
                          )}
                          {Boolean(r.is_primary) && r.id !== app.resume_id && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full shrink-0">
                              primary
                            </span>
                          )}
                        </div>
                        {r.file_url ? (
                          <a href={r.file_url as string} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 shrink-0 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors">
                            <FileText size={11} /> View CV
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No resume attached to this application.</p>
                )}
              </div>
            );
          })()}
        </div>

        {/* Right column — AI Analysis */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4">
              <div className="flex items-center gap-2 text-white">
                <Brain size={18} />
                <span className="font-semibold text-sm">AI Resume Analysis</span>
              </div>
              <p className="text-indigo-200 text-xs mt-0.5">
                Automated match scoring against the job description
              </p>
            </div>

            <div className="p-5">
              {ai ? (
                <div className="flex flex-col gap-4">
                  {/* Match score rings */}
                  <div className="flex justify-around">
                    <ScoreRing value={ai.matching_score as number} label="Match Score" />
                    <ScoreRing value={(ai.skill_overlap as number) ?? 0} label="Skill Overlap" />
                    <ScoreRing value={(ai.semantic_score as number) ?? 0} label="Semantic" />
                  </div>

                  {/* Skills matched */}
                  {Array.isArray(ai.skills_matched) && ai.skills_matched.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                        <CheckCircle size={11} className="text-green-500" /> Detected skills
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(ai.skills_matched as string[]).map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] border border-green-100">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {(ai.experience_years as number) > 0 ? (
                    <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-3">
                      <span className="text-slate-500 flex items-center gap-1"><Briefcase size={13} /> Experience</span>
                      <span className="font-medium text-slate-800">{ai.experience_years as number} years</span>
                    </div>
                  ) : null}
                  {ai.education ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Education</span>
                      <span className="font-medium text-slate-800">{ai.education as string}</span>
                    </div>
                  ) : null}

                  <button onClick={runAnalysis} disabled={analyzing}
                    className="w-full text-xs text-indigo-600 hover:underline disabled:opacity-50 mt-1">
                    {analyzing ? "Re-analyzing…" : "Re-run analysis"}
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Brain size={36} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-sm text-slate-500 mb-1">No analysis yet</p>
                  <p className="text-xs text-slate-400 mb-4">
                    Our AI will compare the candidate's resume with the job description and rank automatically.
                  </p>
                  {analyzeError && (
                    <div className="flex items-start gap-2 bg-red-50 rounded-xl px-3 py-2 mb-3 text-left">
                      <AlertCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-600">{analyzeError}</p>
                    </div>
                  )}
                  <Button onClick={runAnalysis} loading={analyzing} size="sm" className="w-full">
                    <Brain size={14} /> Run AI Analysis
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* How it works */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
              <Brain size={12} /> How AI scoring works
            </p>
            <ul className="text-xs text-slate-500 flex flex-col gap-1.5">
              {[
                ["Match Score", "45% semantic + 40% skill overlap + 15% keywords"],
                ["Skill Overlap", "Detected skills vs job required skills"],
                ["Semantic", "TF-IDF + char n-gram similarity"],
              ].map(([t, d]) => (
                <li key={t as string}><strong className="text-slate-700">{t as string}:</strong> {d as string}</li>
              ))}
            </ul>
          </div>

          {/* Video Interview AI Analysis */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4">
              <div className="flex items-center gap-2 text-white">
                <Video size={18} />
                <span className="font-semibold text-sm">Video Interview AI</span>
              </div>
              <p className="text-violet-200 text-xs mt-0.5">
                Whisper → транскрипция → AI → анализ речи
              </p>
            </div>

            <div className="p-5">
              {/* Upload block */}
              {!videoState.uploaded ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-slate-500">Загрузите запись интервью (Zoom, Meet)</p>
                  <div
                    className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center cursor-pointer hover:border-violet-400 transition-colors"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setVideoState((s) => ({ ...s, file: f })); }}
                  >
                    <Upload size={22} className="mx-auto mb-1.5 text-slate-300" />
                    <p className="text-xs text-slate-400">
                      {videoState.file ? videoState.file.name : "Перетащите или нажмите"}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-0.5">mp4, webm, mov</p>
                    <input ref={fileRef} type="file" accept="video/*" className="hidden"
                      onChange={(e) => setVideoState((s) => ({ ...s, file: e.target.files?.[0] ?? null }))} />
                  </div>
                  {videoState.file ? (
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="flex-1" onClick={uploadVideo} loading={videoState.uploading}>
                        <Upload size={13} /> Загрузить видео
                      </Button>
                      <button onClick={() => setVideoState((s) => ({ ...s, file: null }))} className="text-slate-400 hover:text-red-400">
                        <X size={16} />
                      </button>
                    </div>
                  ) : null}
                  {videoState.error ? <p className="text-xs text-red-500">{videoState.error}</p> : null}
                </div>
              ) : videoAnalysis ? (
                /* Analysis results */
                <div className="flex flex-col gap-4">

                  {/* Verdict */}
                  {videoAnalysis.verdict ? (() => {
                    const v = videoAnalysis.verdict as string;
                    const style =
                      v === "Good Fit" ? "bg-green-50 text-green-700 border-green-200" :
                      v === "Not a Fit" ? "bg-red-50 text-red-600 border-red-200" :
                      "bg-yellow-50 text-yellow-700 border-yellow-200";
                    return (
                      <div className={`text-center py-2 rounded-xl border font-semibold text-sm ${style}`}>
                        {v}
                      </div>
                    );
                  })() : null}

                  {/* Score rings */}
                  <div className="grid grid-cols-2 gap-3">
                    <ScoreRing value={videoAnalysis.overall_score as number} label="Overall" />
                    <ScoreRing value={videoAnalysis.speech_clarity_score as number} label="Clarity" />
                    <ScoreRing value={videoAnalysis.confidence_score as number} label="Confidence" />
                    <ScoreRing value={videoAnalysis.emotional_tone_score as number} label="Tone" />
                  </div>

                  {/* Summary */}
                  {videoAnalysis.ai_summary ? (
                    <div className="bg-indigo-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-indigo-400 uppercase mb-1 flex items-center gap-1">
                        <MessageSquare size={10} /> AI Summary
                      </p>
                      <p className="text-xs text-indigo-900 leading-relaxed">{videoAnalysis.ai_summary as string}</p>
                    </div>
                  ) : null}

                  {/* Strengths */}
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

                  {/* Concerns */}
                  {Array.isArray(videoAnalysis.concerns) && (videoAnalysis.concerns as string[]).length > 0 ? (
                    <div className="bg-amber-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-amber-600 uppercase mb-2 flex items-center gap-1">
                        <AlertCircle size={10} /> Concerns
                      </p>
                      <ul className="flex flex-col gap-1">
                        {(videoAnalysis.concerns as string[]).map((c, i) => (
                          <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                            <AlertCircle size={10} className="text-amber-500 mt-0.5 shrink-0" />{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Recommendations */}
                  {videoAnalysis.recommendations ? (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
                        <Lightbulb size={10} /> Recommendation
                      </p>
                      <p className="text-xs text-slate-700">{videoAnalysis.recommendations as string}</p>
                    </div>
                  ) : null}

                  {/* Transcript */}
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

                  <button onClick={runVideoAnalysis} disabled={analyzingVideo}
                    className="w-full text-xs text-violet-600 hover:underline disabled:opacity-50">
                    {analyzingVideo ? "Analyzing…" : "Re-run analysis"}
                  </button>
                </div>
              ) : (
                /* Video uploaded but no analysis yet */
                <div className="text-center py-4">
                  <div className="flex items-center gap-2 justify-center text-green-600 text-xs mb-4">
                    <CheckCircle size={14} /> Видео загружено
                  </div>
                  {videoAnalysisError ? (
                    <div className="flex items-start gap-2 bg-red-50 rounded-xl px-3 py-2 mb-3 text-left">
                      <AlertCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-600">{videoAnalysisError}</p>
                    </div>
                  ) : null}
                  <p className="text-xs text-slate-400 mb-3">
                    Whisper распознает речь → AI оценит уверенность, чёткость и соответствие вакансии
                  </p>
                  <Button onClick={runVideoAnalysis} loading={analyzingVideo} size="sm" className="w-full bg-violet-600 hover:bg-violet-700">
                    <Brain size={14} /> Запустить AI анализ
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}