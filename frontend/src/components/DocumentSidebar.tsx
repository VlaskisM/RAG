import { PanelRightClose, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { KnowledgeDocument } from '../types';
import { cn } from '../lib/utils';

interface DocumentSidebarProps {
  documents: KnowledgeDocument[];
  selectedDocumentId?: string;
  onSelectDocument: (document: KnowledgeDocument) => void;
  onCollapse?: () => void;
  onClose?: () => void;
}

export function DocumentSidebar({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onCollapse,
  onClose,
}: DocumentSidebarProps) {
  const [search, setSearch] = useState('');

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return documents.filter((document) => {
      const matchesSearch =
        !normalizedSearch ||
        document.title.toLowerCase().includes(normalizedSearch) ||
        document.fileName.toLowerCase().includes(normalizedSearch) ||
        document.summary.toLowerCase().includes(normalizedSearch);

      return matchesSearch;
    });
  }, [documents, search]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95 xl:w-[300px]">
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
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Скрыть базу документов"
              title="Скрыть базу документов"
              className="ml-2 hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white xl:flex"
            >
              <PanelRightClose size={17} />
            </button>
          ) : null}
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filteredDocuments.map((document) => {
          const isSelected = document.id === selectedDocumentId;

          return (
            <button
              key={document.id}
              onClick={() => onSelectDocument(document)}
              className={cn(
                'mb-1.5 flex h-10 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition',
                isSelected
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-100'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
              )}
              title={document.fileName}
            >
              <span className="truncate">{document.fileName || document.title}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
