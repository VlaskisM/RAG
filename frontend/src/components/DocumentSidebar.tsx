import { FileSpreadsheet, FileText, Files, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { KnowledgeDocument } from '../types';
import { cn, fileTypeLabel, formatDate } from '../lib/utils';

interface DocumentSidebarProps {
  documents: KnowledgeDocument[];
  selectedDocumentId?: string;
  highlightedSnippet?: string;
  onSelectDocument: (document: KnowledgeDocument) => void;
  onClose?: () => void;
}

const fileIcon = {
  pdf: FileText,
  docx: FileText,
  xlsx: FileSpreadsheet,
  md: Files,
  html: Files,
};

export function DocumentSidebar({
  documents,
  selectedDocumentId,
  highlightedSnippet,
  onSelectDocument,
  onClose,
}: DocumentSidebarProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [type, setType] = useState('All');

  const categoryOptions = useMemo(
    () => ['All', ...Array.from(new Set(documents.map((document) => document.category)))],
    [documents],
  );
  const fileTypeOptions = useMemo(
    () => ['All', ...Array.from(new Set(documents.map((document) => document.type)))],
    [documents],
  );

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return documents.filter((document) => {
      const matchesSearch =
        !normalizedSearch ||
        document.title.toLowerCase().includes(normalizedSearch) ||
        document.fileName.toLowerCase().includes(normalizedSearch) ||
        document.summary.toLowerCase().includes(normalizedSearch);
      const matchesCategory = category === 'All' || document.category === category;
      const matchesType = type === 'All' || document.type === type;

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [category, documents, search, type]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95 xl:w-[380px]">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
              База документов
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {documents.length} файлов проиндексировано
            </p>
          </div>
          <div className="rounded-lg bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-600 dark:bg-success-500/10 dark:text-success-500">
            Online
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть документы"
              title="Закрыть документы"
              className="ml-2 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white xl:hidden"
            >
              <X size={17} />
            </button>
          ) : null}
        </div>

        <label className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 focus-within:border-brand-500 focus-within:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:focus-within:bg-slate-950">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по документам"
            className="w-full bg-transparent text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'All' ? 'Все категории' : option}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            {fileTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'All' ? 'Все типы' : fileTypeLabel(option)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {filteredDocuments.map((document) => {
          const Icon = fileIcon[document.type as keyof typeof fileIcon] ?? Files;
          const isSelected = document.id === selectedDocumentId;

          return (
            <button
              key={document.id}
              onClick={() => onSelectDocument(document)}
              className={cn(
                'mb-2 w-full rounded-lg border p-3 text-left transition',
                isSelected
                  ? 'border-brand-300 bg-brand-50 shadow-sm dark:border-brand-700 dark:bg-brand-950/30'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/70',
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                      {document.title}
                    </p>
                    <span className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      {fileTypeLabel(document.type)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    {document.fileName}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {document.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{document.category}</span>
                    <span>·</span>
                    <span>{formatDate(document.uploadedAt)}</span>
                    {document.pages ? (
                      <>
                        <span>·</span>
                        <span>{document.pages} стр.</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {highlightedSnippet ? (
        <div className="border-t border-slate-200 bg-amber-50/70 p-4 dark:border-slate-800 dark:bg-amber-950/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Подсвеченный фрагмент
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-800 dark:text-slate-100">
            {highlightedSnippet}
          </p>
        </div>
      ) : null}
    </aside>
  );
}
