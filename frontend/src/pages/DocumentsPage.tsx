import {
  FileSpreadsheet,
  FileText,
  Files,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { ChangeEvent, DragEvent, useMemo, useRef, useState } from 'react';
import type { DocumentStatus, KnowledgeDocument, UserProfile } from '../types';
import { cn, fileTypeLabel, formatBytes, formatDate } from '../lib/utils';

interface DocumentsPageProps {
  documents: KnowledgeDocument[];
  user: UserProfile;
  onUpload: (files: File[]) => void;
  onDelete: (documentId: string) => void;
}

const acceptedTypes = ['pdf', 'docx', 'txt', 'csv'];

const statusLabel: Record<DocumentStatus, string> = {
  uploaded: 'Uploaded',
  processing: 'Processing',
  indexed: 'Indexed',
  failed: 'Failed',
};

const statusClass: Record<DocumentStatus, string> = {
  uploaded:
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  processing:
    'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  indexed:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
  failed: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
};

const fileIcon = {
  pdf: FileText,
  docx: FileText,
  txt: FileText,
  csv: FileSpreadsheet,
};

function getFileType(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

export function DocumentsPage({
  documents,
  user,
  onUpload,
  onDelete,
}: DocumentsPageProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DocumentStatus | 'All'>('All');
  const [isDragging, setIsDragging] = useState(false);

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return documents.filter((document) => {
      const matchesSearch =
        !normalizedSearch ||
        document.title.toLowerCase().includes(normalizedSearch) ||
        document.fileName.toLowerCase().includes(normalizedSearch) ||
        document.summary.toLowerCase().includes(normalizedSearch);
      const matchesStatus = status === 'All' || document.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [documents, search, status]);

  const handleFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((file) =>
      acceptedTypes.includes(getFileType(file.name)),
    );

    if (validFiles.length > 0) {
      onUpload(validFiles);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFiles(event.target.files);
      event.target.value = '';
    }
  };

  return (
    <main className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl">
        <section
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'mb-5 rounded-lg border border-dashed bg-white p-6 text-center shadow-sm transition dark:bg-slate-900',
            isDragging
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
              : 'border-slate-300 dark:border-slate-700',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.csv"
            onChange={handleInputChange}
            className="hidden"
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-100">
            <UploadCloud size={24} />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">
            Загрузите документы в базу знаний
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Перетащите PDF, DOCX, TXT или CSV сюда. После загрузки файл пройдет
            mock-обработку и появится в источниках RAG-чата.
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Выбрать файлы
          </button>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 focus-within:border-brand-500 dark:border-slate-800 dark:bg-slate-950">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по файлам"
                className="w-full bg-transparent text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
              />
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as DocumentStatus | 'All')}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="All">Все статусы</option>
              {Object.keys(statusLabel).map((item) => (
                <option key={item} value={item}>
                  {statusLabel[item as DocumentStatus]}
                </option>
              ))}
            </select>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredDocuments.map((document) => {
              const Icon =
                fileIcon[document.type as keyof typeof fileIcon] ?? Files;
              const currentStatus = document.status ?? 'indexed';

              return (
                <div
                  key={document.id}
                  className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                          {document.title}
                        </p>
                        <span
                          className={cn(
                            'rounded-md px-2 py-1 text-[11px] font-semibold',
                            statusClass[currentStatus],
                          )}
                        >
                          {statusLabel[currentStatus]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {document.fileName} · {fileTypeLabel(document.type)} ·{' '}
                        {formatBytes(document.size)} · {formatDate(document.uploadedAt)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {document.summary || `Загружено пользователем ${user.name}`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDelete(document.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-800 dark:text-slate-400 dark:hover:border-red-900 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                    aria-label="Удалить документ"
                    title="Удалить документ"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
