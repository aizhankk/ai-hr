"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Video, Calendar, Clock } from "lucide-react";

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

  const analysis = video?.analysis as Record<string, unknown> | null;

  return (
    <div className="max-w-2xl">
      <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline mb-6">← Back</button>

      <Card className="mb-6">
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

      {/* Video interview — только просмотр результатов анализа */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Video size={18} className="text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Interview Recording</h2>
          </div>
        </CardHeader>
        <CardBody>
          {video ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Badge label={video.status as string} />
                {video.recorded_at ? (
                  <span className="text-xs text-slate-400">
                    Recorded {new Date(video.recorded_at as string).toLocaleDateString()}
                  </span>
                ) : null}
              </div>

              {analysis ? (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">AI Analysis</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "overall_score", label: "Overall" },
                      { key: "confidence_score", label: "Confidence" },
                      { key: "speech_clarity_score", label: "Clarity" },
                      { key: "emotional_tone_score", label: "Tone" },
                    ].map(({ key, label }) => {
                      const val = analysis[key];
                      if (!val) return null;
                      const score = Math.round(val as number);
                      const color = score >= 80 ? "text-green-600" : score >= 60 ? "text-indigo-600" : "text-yellow-600";
                      return (
                        <div key={key} className="bg-slate-50 rounded-xl p-4 text-center">
                          <p className={`text-3xl font-bold ${color}`}>{score}</p>
                          <p className="text-xs text-slate-500 mt-1">{label}</p>
                        </div>
                      );
                    })}
                  </div>
                  {analysis.ai_summary ? (
                    <div className="mt-4 p-3 bg-indigo-50 rounded-xl">
                      <p className="text-xs font-medium text-indigo-700 mb-1">Summary</p>
                      <p className="text-sm text-indigo-900">{analysis.ai_summary as string}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-400">The recruiter has uploaded the recording. Analysis in progress.</p>
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