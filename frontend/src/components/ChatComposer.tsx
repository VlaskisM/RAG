import { ArrowUp, Paperclip } from 'lucide-react';
import { FormEvent, KeyboardEvent, useState } from 'react';
import { IconButton } from './ui/IconButton';

interface ChatComposerProps {
  disabled?: boolean;
  onSubmit: (question: string) => void;
}

export function ChatComposer({ disabled, onSubmit }: ChatComposerProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    const question = value.trim();

    if (!question || disabled) {
      return;
    }

    onSubmit(question);
    setValue('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-2 shadow-soft dark:border-slate-800 dark:bg-slate-900 dark:shadow-soft-dark"
    >
      <div className="flex items-end gap-2">
        <IconButton label="Прикрепить файл" className="mb-0.5">
          <Paperclip size={18} />
        </IconButton>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Задайте вопрос по базе знаний..."
          className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-3 text-sm leading-6 text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Отправить вопрос"
          title="Отправить вопрос"
          className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
        >
          <ArrowUp size={18} />
        </button>
      </div>
    </form>
  );
}
