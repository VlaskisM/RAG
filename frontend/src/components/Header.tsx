import { Library, ShieldCheck } from 'lucide-react';
import type { UserProfile } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { IconButton } from './ui/IconButton';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenDocuments: () => void;
  user: UserProfile;
}

export function Header({ theme, onToggleTheme, onOpenDocuments, user }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 md:px-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">
              Knowledge-Ai
            </p>
            <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
              Поиск по корпоративной базе знаний
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <IconButton
          label="Открыть документы"
          onClick={onOpenDocuments}
          className="xl:hidden"
        >
          <Library size={18} />
        </IconButton>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <button className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
            {user.name
              .split(' ')
              .map((item) => item[0])
              .join('')}
          </div>
          <span className="hidden max-w-[150px] truncate text-sm font-medium text-slate-700 dark:text-slate-200 md:inline">
            {user.name}
          </span>
        </button>
      </div>
    </header>
  );
}
