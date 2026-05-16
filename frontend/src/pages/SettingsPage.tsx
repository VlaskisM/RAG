import { FormEvent, useState } from 'react';
import { Bell, Lock, Mail, UserRound } from 'lucide-react';
import type { NotificationSettings, UserProfile } from '../types';

interface SettingsPageProps {
  user: UserProfile;
  theme: 'light' | 'dark';
  notifications: NotificationSettings;
  onUpdateUser: (user: UserProfile) => void;
  onSetTheme: (theme: 'light' | 'dark') => void;
  onUpdateNotifications: (settings: NotificationSettings) => void;
}

export function SettingsPage({
  user,
  theme,
  notifications,
  onUpdateUser,
  onSetTheme,
  onUpdateNotifications,
}: SettingsPageProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onUpdateUser({ ...user, name, email });
    setPassword('');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <main className="px-4 py-6 md:px-6">
      <div className="mx-auto grid max-w-5xl gap-4 xl:grid-cols-[1fr_360px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Профиль
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Управляйте данными аккаунта и безопасностью.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <UserRound size={16} />
                Имя
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950"
              />
            </label>

            <label className="block">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <Mail size={16} />
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950"
              />
            </label>

            <label className="block">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <Lock size={16} />
                Новый пароль
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Оставьте пустым, если не меняете"
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950"
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-5 h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Сохранить
          </button>
          {saved ? (
            <span className="ml-3 text-sm font-medium text-emerald-600 dark:text-emerald-300">
              Изменения сохранены
            </span>
          ) : null}
        </form>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
              Тема
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(['light', 'dark'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onSetTheme(item)}
                  className={`h-10 rounded-lg border text-sm font-semibold transition ${
                    theme === item
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-100'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {item === 'light' ? 'Light' : 'Dark'}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
              <Bell size={16} />
              Уведомления
            </h3>
            <div className="mt-4 space-y-3">
              {[
                ['emailDigest', 'Еженедельный дайджест'],
                ['sourceUpdates', 'Обновления источников'],
                ['failedUploads', 'Ошибки обработки файлов'],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300"
                >
                  {label}
                  <input
                    type="checkbox"
                    checked={notifications[key as keyof NotificationSettings]}
                    onChange={(event) =>
                      onUpdateNotifications({
                        ...notifications,
                        [key]: event.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-brand-600"
                  />
                </label>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
