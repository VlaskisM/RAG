import type { ReactNode } from 'react';
import {
  BarChart3,
  Bell,
  FileText,
  LogOut,
  MessageSquareText,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import type { AppRoute, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { IconButton } from './ui/IconButton';

interface AppShellProps {
  children: ReactNode;
  currentRoute: AppRoute;
  title: string;
  description: string;
  user: UserProfile;
  theme: 'light' | 'dark';
  onNavigate: (route: AppRoute) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

const navItems: Array<{
  route: AppRoute;
  label: string;
  icon: typeof BarChart3;
}> = [
  { route: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { route: '/chat', label: 'Chat', icon: MessageSquareText },
  { route: '/documents', label: 'Documents', icon: FileText },
  { route: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({
  children,
  currentRoute,
  title,
  description,
  user,
  theme,
  onNavigate,
  onToggleTheme,
  onLogout,
}: AppShellProps) {
  const initials = user.name
    .split(' ')
    .map((item) => item[0])
    .join('')
    .slice(0, 2);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <aside className="hidden w-[264px] shrink-0 border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-950 lg:flex lg:flex-col">
        <button
          type="button"
          onClick={() => onNavigate('/dashboard')}
          className="flex items-center gap-3 rounded-lg px-1 text-left"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">
              Knowledge RAG
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Corporate AI Search
            </p>
          </div>
        </button>

        <nav className="mt-7 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;

            return (
              <button
                key={item.route}
                type="button"
                onClick={() => onNavigate(item.route)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                )}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                {user.name}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {user.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 md:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-950 dark:text-white">
              {title}
            </h1>
            <p className="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">
              {description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <IconButton label="Notifications">
              <Bell size={18} />
            </IconButton>
            <button
              type="button"
              onClick={() => onNavigate('/settings')}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-slate-950"
            >
              {initials}
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
