import { ExternalLink } from 'lucide-react';
import type { AnswerSource } from '../types';
import { relevanceLabel } from '../lib/utils';

interface SourceCardProps {
  source: AnswerSource;
  onOpen: (source: AnswerSource) => void;
}

export function SourceCard({ source, onOpen }: SourceCardProps) {
  return (
    <button
      onClick={() => onOpen(source)}
      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-brand-700 dark:hover:bg-brand-950/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
            {source.fileName}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {source.page ? `стр. ${source.page}` : source.section ?? 'секция не указана'} ·{' '}
            {relevanceLabel(source.relevance)}
          </p>
        </div>
        <ExternalLink className="shrink-0 text-slate-400" size={16} />
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
        {source.snippet}
      </p>
    </button>
  );
}
