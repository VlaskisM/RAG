import { ArrowUp, Code2, Paperclip, X } from 'lucide-react';
import { FormEvent, KeyboardEvent, useRef, useState } from 'react';
import type { AttachedCode } from '../types';
import { IconButton } from './ui/IconButton';

interface ChatComposerProps {
  disabled?: boolean;
  onSubmit: (question: string, codeReviewMode: boolean, attachedCode?: AttachedCode) => void;
}

export function ChatComposer({ disabled, onSubmit }: ChatComposerProps) {
  const [value, setValue] = useState('');
  const [codeReviewMode, setCodeReviewMode] = useState(false);
  const [attachedCode, setAttachedCode] = useState<AttachedCode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const question = value.trim();
    if ((!question && !attachedCode) || disabled) {
      return;
    }
    onSubmit(question, codeReviewMode, attachedCode ?? undefined);
    setValue('');
    setAttachedCode(null);
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setAttachedCode({ filename: file.name, content });
      setCodeReviewMode(true);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const canSubmit = !disabled && (value.trim().length > 0 || attachedCode !== null);

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

      {attachedCode && (
        <div className="mx-2 mb-2 flex items-center gap-2 rounded-md bg-brand-50 px-3 py-1.5 text-xs text-brand-700 dark:bg-brand-950/30 dark:text-brand-400">
          <Paperclip size={12} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate font-medium">{attachedCode.filename}</span>
          <button
            type="button"
            onClick={() => setAttachedCode(null)}
            className="ml-1 shrink-0 rounded hover:text-brand-900 dark:hover:text-brand-200"
            aria-label="Удалить файл"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".py,.js,.ts,.tsx,.jsx,.java,.cs,.go,.rb,.php,.cpp,.c,.h,.rs,.swift,.kt,.scala,.sh,.yaml,.yml,.json,.xml,.html,.css,.sql,.md,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
        <IconButton
          label="Прикрепить файл с кодом"
          className={`mb-0.5 ${attachedCode ? 'text-brand-600 dark:text-brand-400' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <Paperclip size={18} />
        </IconButton>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={
            attachedCode
              ? 'Уточните, что проверить (необязательно)…'
              : 'Задайте вопрос по базе знаний...'
          }
          className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-3 text-sm leading-6 text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={!canSubmit}
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
