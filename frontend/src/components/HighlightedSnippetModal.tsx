import { FileText, X } from 'lucide-react';
import { useEffect } from 'react';
import type { KnowledgeDocument } from '../types';
import { fileTypeLabel, formatDate } from '../lib/utils';

interface HighlightedSnippetModalProps {
  snippet: string;
  document?: KnowledgeDocument;
  onClose: () => void;
}

export function HighlightedSnippetModal({
  snippet,
  document,
  onClose,
}: HighlightedSnippetModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="highlighted-snippet-title"
      onMouseDown={onClose}
    >
      <section
        className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <h2
                id="highlighted-snippet-title"
                className="text-base font-semibold text-slate-950 dark:text-white"
              >
                Подсвеченный фрагмент
              </h2>
              {document ? (
                <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                  {document.fileName} · {fileTypeLabel(document.type)} ·{' '}
                  {formatDate(document.uploadedAt)}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Закрыть подсвеченный фрагмент"
            title="Закрыть подсвеченный фрагмент"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-amber-50/60 p-5 dark:bg-amber-950/20">
          <p className="whitespace-pre-wrap rounded-lg border border-amber-100 bg-white p-4 text-sm leading-7 text-slate-800 dark:border-amber-900/50 dark:bg-slate-900 dark:text-slate-100">
            {snippet}
          </p>
        </div>
      </section>
    </div>
  );
}
