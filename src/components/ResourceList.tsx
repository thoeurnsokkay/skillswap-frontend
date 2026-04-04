"use client";
import { useRef, useState } from "react";
import { Resource } from "@/types";
import { FileText, Download, Trash2, Plus, Loader2, 
         Image, Link2, ExternalLink, X, 
         ChevronLeft, ChevronRight, Video } from 'lucide-react'

interface Props {
  resources?: Resource[];
  loading: boolean;
  uploaderId: number;
  onUpload: (file: File) => void;
  onDelete: (id: number) => void;
  canUpload?: boolean;
}

function FileIcon({ fileType }: { fileType: string }) {
  if (fileType?.includes('pdf'))   return <FileText size={16} className="text-red-500" />
  if (fileType?.includes('image')) return <Image    size={16} className="text-blue-500" />
  if (fileType?.includes('video')) return <Video    size={16} className="text-purple-500" /> 
  return <Link2 size={16} className="text-amber-500" />
}

function iconBg(fileType: string): string {
  if (fileType?.includes('pdf'))   return 'bg-red-100'
  if (fileType?.includes('image')) return 'bg-blue-100'
  if (fileType?.includes('video')) return 'bg-purple-100' 
  return 'bg-amber-100'
}

// Build a usable file URL for viewer/downloads. Handles absolute URLs and API proxy paths.
function getFileUrl(resource: Resource) {
  if (!resource || !resource.fileUrl) return "";
  const raw = resource.fileUrl;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `http://localhost:9090${raw}`;
}

// ── Viewer Modal ──────────────────────────────────────────────────────────────
function ViewerModal({
  resource,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  resource: Resource;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const fileUrl = getFileUrl(resource);
  const isPdf = resource.fileType?.includes("pdf");
  const isImage = resource.fileType?.includes("image");
  const isVideo = resource.fileType?.includes('video')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg ${iconBg(resource.fileType)} flex items-center justify-center flex-shrink-0`}
            >
              <FileIcon fileType={resource.fileType} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {resource.fileName}
              </p>
              <p className="text-xs text-slate-400">{resource.fileSize}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <a
              href={fileUrl}
              download={resource.fileName}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-500 transition-colors"
              title="Download"
            >
              <Download size={15} />
            </a>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-500 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={15} />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors ml-1"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto bg-slate-50 min-h-0">
          {isPdf && (
            <div
              className="flex flex-col items-center justify-center gap-4 p-8"
              style={{ minHeight: "60vh" }}
            >
              <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
                <FileText size={32} className="text-red-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-800 mb-1">
                  {resource.fileName}
                </p>
                <p className="text-sm text-slate-400 mb-4">
                  {resource.fileSize}
                </p>
              </div>
              <div className="flex gap-3">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink size={15} />
                  Open PDF
                </a>
                <a
                  href={fileUrl}
                  download={resource.fileName}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  <Download size={15} />
                  Download
                </a>
              </div>
            </div>
          )}

          {isImage && (
            <div
              className="flex items-center justify-center w-full p-6"
              style={{ minHeight: "60vh" }}
            >
              <img
                src={fileUrl}
                alt={resource.fileName}
                className="max-w-full max-h-[65vh] object-contain rounded-lg shadow"
              />
            </div>
          )}

          {isVideo && (
  <div className="flex items-center justify-center w-full p-4 bg-black" style={{ minHeight: '60vh' }}>
    <video
      src={fileUrl}
      controls
      className="max-w-full max-h-[65vh] rounded-lg"
      style={{ maxHeight: '65vh' }}
    >
      Your browser does not support video.
    </video>
  </div>
)}

          {!isPdf && !isImage && (
            <div
              className="flex flex-col items-center justify-center gap-4 text-slate-400 p-8"
              style={{ minHeight: "40vh" }}
            >
              <Link2 size={40} className="text-amber-400" />
              <p className="text-sm font-medium text-slate-600">
                Preview not available for this file type.
              </p>
              <a
                href={fileUrl}
                download={resource.fileName}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors"
              >
                <Download size={14} />
                Download File
              </a>
            </div>
          )}
        </div>

        {/* ── Prev / Next ── */}
        {(hasPrev || hasNext) && (
          <div className="flex items-center justify-between px-5 py-2 border-t border-slate-100 flex-shrink-0">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ResourceList({
  resources = [],
  loading,
  uploaderId,
  onUpload,
  onDelete,
  canUpload = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [viewIndex, setViewIndex] = useState<number | null>(null);

  const openViewer = (i: number) => setViewIndex(i);
  const closeViewer = () => setViewIndex(null);
  const goPrev = () => setViewIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  const goNext = () =>
    setViewIndex((i) => (i !== null && i < resources.length - 1 ? i + 1 : i));

  return (
    <>
      {viewIndex !== null && resources[viewIndex] && (
        <ViewerModal
          resource={resources[viewIndex]}
          onClose={closeViewer}
          onPrev={goPrev}
          onNext={goNext}
          hasPrev={viewIndex > 0}
          hasNext={viewIndex < resources.length - 1}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {canUpload && (
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx,.mp4,.mov,.avi,.mkv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                onUpload(e.target.files[0]);
                e.target.value = "";
              }
            }}
          />
        )}

        {resources.map((r, index) => (
          <div
            key={r.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all"
          >
            {/* Icon — click to open viewer */}
            <button
              onClick={() => openViewer(index)}
              className={`w-9 h-9 rounded-xl ${iconBg(r.fileType)} flex items-center justify-center flex-shrink-0 hover:scale-110 transition-transform`}
              title="View file"
            >
              <FileIcon fileType={r.fileType} />
            </button>

            {/* File name — click to open viewer */}
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => openViewer(index)}
            >
              <p className="text-sm font-semibold text-slate-800 truncate hover:text-blue-600 transition-colors">
                {r.fileName}
              </p>
              <p className="text-xs text-slate-400">{r.fileSize}</p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* View button */}
              <button
                onClick={() => openViewer(index)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-500 transition-colors"
                title="View file"
              >
                <ExternalLink size={14} />
              </button>

              {/* Download button */}
              <a
                href={getFileUrl(r)}
                download={r.fileName}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-500 transition-colors"
                title="Download"
              >
                <Download size={14} />
              </a>

              {r.uploaderId === uploaderId && (
                <button
                  onClick={() => onDelete(r.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}

        {resources.length === 0 && !loading && (
          <div className="col-span-2 py-6 text-center text-slate-400 text-sm">
            No resources yet. Upload your first file!
          </div>
        )}

        {canUpload && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 text-slate-400 hover:text-blue-500 text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Plus size={15} />
                Add New Resource
              </>
            )}
          </button>
        )}
      </div>
    </>
  );
}
