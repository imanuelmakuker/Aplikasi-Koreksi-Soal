import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function SchoolCrest({ className = 'w-11 h-11' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Logo Sekolah"
    >
      <path
        d="M32 4L56 12V31C56 45.2 45.6 55.8 32 60C18.4 55.8 8 45.2 8 31V12L32 4Z"
        fill="#0B2447"
        stroke="#D4A62A"
        strokeWidth="2.5"
      />
      <path
        d="M32 9L51 15.5V30.5C51 42 42.6 50.6 32 54.4C21.4 50.6 13 42 13 30.5V15.5L32 9Z"
        stroke="#EBC556"
        strokeWidth="1"
        strokeOpacity="0.6"
      />
      <path
        d="M21 25C25 23.2 28.8 23.5 32 25.5C35.2 23.5 39 23.2 43 25V41C39 39.4 35.2 39.7 32 41.5C28.8 39.7 25 39.4 21 41V25Z"
        fill="#FFFFFF"
        fillOpacity="0.95"
      />
      <path d="M32 25.5V41.5" stroke="#0B2447" strokeWidth="1.5" />
      <circle cx="32" cy="18" r="3" fill="#EBC556" />
    </svg>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (nextPage: number) => void;
}

export function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/70 text-xs text-slate-600">
      <div className="tabular-nums">
        Menampilkan <span className="font-semibold text-slate-900">{start}</span>–
        <span className="font-semibold text-slate-900">{end}</span> dari{' '}
        <span className="font-semibold text-slate-900">{totalItems}</span> data
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Sebelumnya
        </button>
        <span className="px-2.5 py-1.5 font-mono tabular-nums text-slate-800">
          {page} / {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
        >
          Berikutnya
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
