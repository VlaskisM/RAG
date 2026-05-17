import { FormEvent, useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { AppRoute, UserProfile } from '../types';
import { ApiError, login, register } from '../lib/api';

interface AuthPageProps {
  mode: 'login' | 'register';
  onSubmit: (user: UserProfile) => void;
  onNavigate: (route: AppRoute) => void;
}

export function AuthPage({ mode, onSubmit, onNavigate }: AuthPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = isRegister
        ? await register(name.trim(), email.trim(), password)
        : await login(email.trim(), password);
      onSubmit(user);
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.status === 401) {
          setError('Неверный email или пароль');
        } else if (caught.status === 409) {
          setError('Этот email уже зарегистрирован');
        } else if (caught.status === 422) {
          setError('Проверьте корректность данных формы');
        } else {
          setError(caught.message || 'Не удалось выполнить запрос');
        }
      } else {
        setError('Сервер недоступен. Проверьте подключение к API.');
      }
    } finally {
      setIsSubmitting(false);
    }
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
              {isRegister
                ? 'Создайте учётную запись для доступа к базе знаний.'
                : 'Введите данные учётной записи для входа.'}
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
                minLength={1}
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
              minLength={6}
            />
          </label>

          {error ? (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Подождите…' : isRegister ? 'Зарегистрироваться' : 'Войти'}
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
