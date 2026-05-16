"use client";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";


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
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedIds, setUploadedIds] = useState<Set<string>>(new Set());

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [], "application/pdf": [] },
    multiple: true,
    maxFiles: 5,
    onDrop: async (acceptedFiles) => {
      const remaining = 5 - files.length; // ← how many slots are left
      const allowed = acceptedFiles.slice(0, remaining); // ← trim the excess
      if (allowed.length === 0) return;
      setFiles((prev) => [...prev, ...acceptedFiles]);
      setUploading(true);
      try {
        // ── Upload handler ────────────────────────────────────────────────
        // Wire your real upload logic here. `onUpload` receives the
        // institution id and the newly dropped files.
        await onUpload(source.id, acceptedFiles);
        setUploadedIds((prev) => {
          const next = new Set(prev);
          acceptedFiles.forEach((f) => next.add(f.name));
          return next;
        });
      } finally {
        setUploading(false);
      }
    },
  });

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setUploadedIds((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  };

  return (
    <div className='mt-3 rounded-xl border border-amber-500/30 bg-black/20 p-4 space-y-3'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Image
            src={source.image}
            alt={source.label}
            width={24}
            height={24}
            className='rounded-full object-cover'
          />
          <span className='text-white text-sm font-medium'>{source.label}</span>
          <span className='text-[9px] font-bold bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-widest'>
            Transaction History
          </span>
        </div>
        {/* <button
          type="button"
          // onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors text-xs"
        >
          ✕ (xx)
        </button> */}
      </div>

      {/* Drop zone */}
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
        <div className='flex flex-col items-center gap-2'>
          <Image
            src={source.image}
            alt={source.label}
            width={40}
            height={40}
            className='rounded-full object-cover opacity-60'
          />
          <p className='text-zinc-300 text-xs font-medium'>
            {isDragActive
              ? `Drop your ${source.label} files here…`
              : `Drag & drop ${source.label} transaction history or slips`}
          </p>
          <p className='text-zinc-600 text-[10px]'>
            Click to browse · Images and PDFs accepted
          </p>
        </div>
      </div>

      {/* Immediate upload notice */}
      <p className='text-amber-500/70 text-[10px] flex items-center gap-1'>
        <span>⚡</span>
        Images and documents are uploaded immediately on drop
      </p>

      {/* File list */}
      {files.length > 0 && (
        <ul className='space-y-1.5'>
          {files.map((file) => {
            const isUploaded = uploadedIds.has(file.name);
            return (
              <li
                key={file.name}
                className='flex items-center justify-between gap-2 text-xs'
              >
                <div className='flex items-center gap-2 min-w-0'>
                  <span
                    className={isUploaded ? "text-green-400" : "text-amber-400"}
                  >
                    {isUploaded ? "✓" : "↑"}
                  </span>
                  <span className='text-zinc-400 truncate'>{file.name}</span>
                </div>
                <button
                  type='button'
                  onClick={() => removeFile(file.name)}
                  className='text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0'
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {uploading && (
        <p className='text-amber-400 text-[10px] animate-pulse'>Uploading…</p>
      )}
    </div>
  );
}
