"use client";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { uploadBettingFiles } from "@/lib/onboarding/api";
import { useSession } from "next-auth/react";

type BettingSource = {
  id: string;
  label: string;
  image: string;
};

export type UploadHandler = (
  institutionId: string,
  files: File[],
) => Promise<void>;

export default function BettingDropzone({
  source,
  onUpload,
}: {
  source: BettingSource;
  onUpload: UploadHandler;
}) {
  const { data: session } = useSession();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [], "application/pdf": [] },
    multiple: true,
    maxFiles: 5,
    onDrop: (acceptedFiles) => {
      const remaining = 5 - files.length;
      const allowed = acceptedFiles.slice(0, remaining);
      if (allowed.length === 0) return;
      setFiles((prev) => [...prev, ...allowed]);
    },
  });

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      await uploadBettingFiles(source.id, files, session?.accessToken!);
      setSubmitted(true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop zone — hidden once submitted */}
      {!submitted && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-amber-500 bg-amber-500/5"
              : "border-zinc-700 hover:border-zinc-500 bg-black/20",
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            <Image
              src={source.image}
              alt={source.label}
              width={40}
              height={40}
              className="rounded-full object-cover opacity-60"
            />
            <p className="text-zinc-300 text-xs font-medium">
              {isDragActive
                ? `Drop your ${source.label} files here…`
                : `Drag & drop ${source.label} transaction history or slips`}
            </p>
            <p className="text-zinc-600 text-[10px]">
              Click to browse · Images and PDFs accepted
            </p>
          </div>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file) => (
            <li
              key={file.name}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-zinc-500">📄</span>
                <span className="text-zinc-400 truncate">{file.name}</span>
              </div>
              {!submitted && (
                <button
                  type="button"
                  onClick={() => removeFile(file.name)}
                  className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Counter + submit */}
      {files.length > 0 && !submitted && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-zinc-600 text-[10px]">
            {files.length}/5 file{files.length > 1 ? "s" : ""} selected
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold transition-colors"
          >
            {uploading
              ? "Uploading…"
              : `Upload ${files.length} file${files.length > 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {/* Success state */}
      {submitted && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <span className="text-green-400 text-sm">✓</span>
          <p className="text-green-400 text-xs">
            {files.length} file{files.length > 1 ? "s" : ""} uploaded
            successfully
          </p>
        </div>
      )}

      {/* Footer note */}
      {!submitted && (
        <p className="text-zinc-600 text-[10px]">
          Max 5 files · Images and PDFs only
        </p>
      )}
    </div>
  );
}
