import { ArrowUp, Code2, Paperclip } from 'lucide-react';
import { FormEvent, KeyboardEvent, useState } from 'react';
import { IconButton } from './ui/IconButton';

interface ChatComposerProps {
  disabled?: boolean;
  onSubmit: (question: string, codeReviewMode: boolean) => void;
}

export function ChatComposer({ disabled, onSubmit }: ChatComposerProps) {
  const [value, setValue] = useState('');
  const [codeReviewMode, setCodeReviewMode] = useState(false);

  const submit = () => {
    const question = value.trim();

    if (!question || disabled) {
      return;
    }

    onSubmit(question, codeReviewMode);
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
      <div className="mb-2 flex items-center justify-between gap-3 border-b border-slate-100 px-2 pb-2 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Code2 size={15} />
          Code Review
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={codeReviewMode}
          onClick={() => setCodeReviewMode((current) => !current)}
          className={`relative h-6 w-11 rounded-full transition focus:outline-none focus:ring-2 focus:ring-brand-500 ${
            codeReviewMode ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
          }`}
          title="Включить режим Code Review"
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
              codeReviewMode ? 'left-5' : 'left-0.5'
            }`}
          />
        </button>
      </div>
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
