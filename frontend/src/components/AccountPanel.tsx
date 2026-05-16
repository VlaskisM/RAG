import { LogOut, Settings, UserRound } from 'lucide-react';
import type { QueryHistoryItem, UserProfile } from '../types';
import { formatDate } from '../lib/utils';

interface AccountPanelProps {
  user: UserProfile;
  history: QueryHistoryItem[];
}

export function AccountPanel({ user, history }: AccountPanelProps) {
  return (
    <aside className="hidden w-[280px] shrink-0 border-r border-slate-200 bg-white/80 px-4 py-5 dark:border-slate-800 dark:bg-slate-950/80 lg:flex lg:flex-col">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white">
          {user.name
            .split(' ')
            .map((item) => item[0])
            .join('')}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
            {user.name}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {user.department}
          </p>
        </div>
      </div>

      <nav className="mt-6 space-y-1">
        <button className="flex w-full items-center gap-3 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-950 dark:bg-slate-800 dark:text-white">
          <UserRound size={17} />
          Профиль
        </button>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
          <Settings size={17} />
          Настройки
        </button>
      </nav>

      <section className="mt-7 min-h-0 flex-1">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            История запросов
          </h2>
        </div>
        <div className="space-y-2 overflow-y-auto pr-1">
          {history.map((item) => (
            <button
              key={item.id}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-brand-200 hover:bg-brand-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-slate-900/70"
            >
              <p className="line-clamp-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                {item.question}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {formatDate(item.createdAt)} · {item.sourceCount} источн.
              </p>
            </button>
          ))}
        </div>
      </section>

      <button className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-300">
        <LogOut size={17} />
        Выйти
      </button>
    </aside>
  );
}
