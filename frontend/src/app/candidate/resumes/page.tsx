"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FileText, Upload, Star, Trash2 } from "lucide-react";

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.listResumes().then((r) => setResumes(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      await api.uploadResume(file);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const setPrimary = async (id: string) => {
    await api.setPrimaryResume(id).catch(() => {});
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this resume?")) return;
    await api.deleteResume(id).catch(() => {});
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Resumes</h1>
        <Button onClick={() => fileRef.current?.click()} loading={uploading}>
          <Upload size={16} /> Upload Resume
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
        />
      </div>

      {error ? <div className="mb-4"><Alert message={error} /></div> : null}

      {resumes.length === 0 ? (
        <Card>
          <CardBody className="text-center py-16 text-slate-400">
            <FileText size={40} className="mx-auto mb-3 opacity-40" />
            <p>No resumes yet. Upload your first one!</p>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {resumes.map((r) => (
            <Card key={r.id as string}>
              <CardBody className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 truncate">{r.original_filename as string}</p>
                    {r.is_primary ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Star size={10} fill="currentColor" /> Primary
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-400">
                    {r.file_size_bytes ? `${Math.round((r.file_size_bytes as number) / 1024)} KB · ` : ""}
                    Uploaded {new Date(r.uploaded_at as string).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!r.is_primary ? (
                    <Button variant="secondary" size="sm" onClick={() => setPrimary(r.id as string)}>
                      Set primary
                    </Button>
                  ) : null}
                  <button onClick={() => remove(r.id as string)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}