import {
  FileText,
  MessageSquareText,
  SearchCheck,
  Upload,
} from 'lucide-react';
import type {
  AppRoute,
  KnowledgeDocument,
  QueryHistoryItem,
  StatsResponse,
  UserProfile,
} from '../types';
import { fileTypeLabel, formatDate } from '../lib/utils';

interface DashboardPageProps {
  user: UserProfile;
  documents: KnowledgeDocument[];
  history: QueryHistoryItem[];
  stats: StatsResponse | null;
  onNavigate: (route: AppRoute) => void;
}

export function DashboardPage({
  user,
  documents,
  history,
  stats,
  onNavigate,
}: DashboardPageProps) {
  const documentsCount = stats?.documents ?? documents.length;
  const queriesCount = stats?.queries ?? history.length;
  const sourcesCount = stats?.sourcesTotal ?? 0;
  const recentDocuments = documents.slice(0, 4);
  const recentQuestions = history.slice(0, 4);

  return (
    <main className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium text-brand-600 dark:text-brand-100">
              Добро пожаловать
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              {user.name}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Ваша рабочая база знаний готова к поиску: документы, история
              вопросов и проверяемые источники собраны в одном месте.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('/documents')}
              className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Upload size={17} />
              Загрузить файл
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/chat')}
              className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <MessageSquareText size={17} />
              Открыть чат
            </button>
          </div>
        </section>

        <section className="mb-6 grid gap-3 md:grid-cols-3">
          {[
            {
              label: 'Документы',
              value: documentsCount,
              icon: FileText,
            },
            {
              label: 'Запросы',
              value: queriesCount,
              icon: MessageSquareText,
            },
            {
              label: 'Источники',
              value: sourcesCount,
              icon: SearchCheck,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {item.label}
                  </p>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Icon size={18} />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white">
                  {item.value}
                </p>
              </div>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                Последние вопросы
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('/chat')}
                className="text-xs font-semibold text-brand-600 dark:text-brand-100"
              >
                Chat
              </button>
            </div>
            <div className="space-y-2">
              {recentQuestions.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                >
                  <p className="line-clamp-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                    {item.question}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(item.createdAt)} · {item.sourceCount} источн.
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                Последние файлы
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('/documents')}
                className="text-xs font-semibold text-brand-600 dark:text-brand-100"
              >
                Documents
              </button>
            </div>
            <div className="space-y-2">
              {recentDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {document.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(document.uploadedAt)} · {document.owner}
                    </p>
                  </div>
                  <span className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {fileTypeLabel(document.type)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
