"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, CheckCircle2, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  fileKey: string;
  label: string;
  description: string;
  file: File | null;
  onFileSelect: (key: string, file: File | null) => void;
}

export function UploadZone({
  fileKey,
  label,
  description,
  file,
  onFileSelect,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (f: File | null) => {
      if (f && !f.name.toLowerCase().endsWith(".csv")) return;
      onFileSelect(fileKey, f);
    },
    [fileKey, onFileSelect],
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => {
    setDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0] ?? null);
  };
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
  };

  const activate = () => inputRef.current?.click();
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Cargar ${label}`}
      aria-pressed={!!file}
      onKeyDown={onKeyDown}
      onClick={activate}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-3",
        "min-h-[148px] rounded cursor-pointer select-none",
        "border transition-all duration-200 p-5",
        file
          ? "border-[var(--brand)] bg-[var(--brand-glow)]"
          : dragging
            ? "border-[var(--brand)] bg-[rgba(0,200,160,0.08)] scale-[1.02]"
            : "border-[var(--line-strong)] bg-surface hover:border-[var(--brand)] hover:bg-elevated",
      )}
    >
      {}
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        aria-hidden="true"
        className="sr-only"
        onChange={onInputChange}
      />

      {file ? (
        <>
          <CheckCircle2
            className="w-7 h-7 text-brand shrink-0"
            aria-hidden="true"
          />
          <div className="text-center w-full overflow-hidden">
            <p className="text-ink text-sm font-medium truncate">{file.name}</p>
            <p className="text-ink-muted text-xs font-mono mt-0.5">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>

          {}
          <button
            type="button"
            aria-label={`Eliminar ${file.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onFileSelect(fileKey, null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className={cn(
              "absolute top-2 right-2 p-1 rounded",
              "text-ink-muted hover:text-danger transition-colors",
              "focus-visible:outline-2 focus-visible:outline-danger",
            )}
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <div
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded border transition-colors",
              dragging
                ? "border-brand text-brand"
                : "border-[var(--line-strong)] text-ink-muted group-hover:border-brand group-hover:text-brand",
            )}
            aria-hidden="true"
          >
            {dragging ? (
              <FileText className="w-4 h-4" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </div>

          <div className="text-center">
            <p className="text-ink text-sm font-medium">{label}</p>
            <p className="text-ink-muted text-xs mt-0.5 font-mono">
              {description}
            </p>
          </div>

          <p className="text-ink-muted text-xs font-mono opacity-60">
            {dragging ? "Suelta aquí" : "Arrastra o haz clic · .csv"}
          </p>
        </>
      )}
    </div>
  );
}
