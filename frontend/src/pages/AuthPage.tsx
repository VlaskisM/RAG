import { FormEvent, useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { AppRoute, UserProfile } from '../types';

interface AuthPageProps {
  mode: 'login' | 'register';
  onSubmit: (user: UserProfile) => void;
  onNavigate: (route: AppRoute) => void;
}

export function AuthPage({ mode, onSubmit, onNavigate }: AuthPageProps) {
  const [name, setName] = useState('Анна Морозова');
  const [email, setEmail] = useState('anna.morozova@company.ru');
  const [password, setPassword] = useState('password');

  const isRegister = mode === 'register';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    onSubmit({
      name: isRegister ? name : email.split('@')[0].replace('.', ' '),
      email,
      role: 'Knowledge Worker',
      department: 'Operations',
      settings: {
        theme: 'system',
        language: 'ru',
        showRelevance: true,
        saveHistory: true,
      },
    });
  };

  return (
    <main className="grid min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white lg:grid-cols-[1fr_520px]">
      <section className="hidden bg-slate-950 px-10 py-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="font-semibold">Knowledge RAG</p>
            <p className="text-xs text-slate-400">Corporate AI Search</p>
          </div>
        </div>
        <div className="mt-auto max-w-xl">
          <p className="text-4xl font-semibold leading-tight">
            Единая точка доступа к корпоративной базе знаний.
          </p>
          <p className="mt-5 text-sm leading-7 text-slate-300">
            Задавайте вопросы, проверяйте источники, загружайте документы и
            управляйте рабочей историей в одном безопасном интерфейсе.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[420px] rounded-lg border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900 dark:shadow-soft-dark"
        >
          <div className="mb-6">
            <p className="text-2xl font-semibold text-slate-950 dark:text-white">
              {isRegister ? 'Создать аккаунт' : 'Войти в аккаунт'}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Mock authentication сохраняет пользователя в localStorage.
            </p>
          </div>

          {isRegister ? (
            <label className="mb-4 block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Имя
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950"
                required
              />
            </label>
          ) : null}

          <label className="mb-4 block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950"
              required
            />
          </label>

          <label className="mb-5 block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Пароль
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950"
              required
            />
          </label>

          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            {isRegister ? 'Зарегистрироваться' : 'Войти'}
            <ArrowRight size={17} />
          </button>

          <button
            type="button"
            onClick={() => onNavigate(isRegister ? '/login' : '/register')}
            className="mt-4 w-full text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-100"
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </form>
      </section>
    </main>
  );
}
