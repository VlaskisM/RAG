import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, UserRound } from 'lucide-react';
import type { AnswerSource, ChatMessage as ChatMessageType } from '../types';
import { cn, formatTime } from '../lib/utils';
import { SourceCard } from './SourceCard';

interface ChatMessageProps {
  message: ChatMessageType;
  onOpenSource: (source: AnswerSource) => void;
}

export function ChatMessage({ message, onOpenSource }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <article className={cn('flex gap-3', isUser && 'justify-end')}>
      {!isUser ? (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
          <Bot size={18} />
        </div>
      ) : null}

      <div
        className={cn(
          'max-w-[820px] flex-1',
          isUser && 'flex max-w-[680px] flex-col items-end',
        )}
      >
        <div
          className={cn(
            'rounded-lg px-4 py-3 shadow-sm',
            isUser
              ? 'bg-brand-600 text-white'
              : 'border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
          )}
        >
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-2 py-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500 [animation-delay:120ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500 [animation-delay:240ms]" />
              <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                Ищу по базе знаний...
              </span>
            </div>
          ) : isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
          ) : (
            <div className="markdown-answer text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className={cn('mt-2 text-xs text-slate-400', isUser && 'pr-1 text-right')}>
          {formatTime(message.createdAt)}
        </div>

        {!isUser && message.sources?.length ? (
          <section className="mt-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                Источники
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {message.sources.length} найдено
              </span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {message.sources.map((source) => (
                <SourceCard key={source.id} source={source} onOpen={onOpenSource} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {isUser ? (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950">
          <UserRound size={18} />
        </div>
      ) : null}
    </article>
  );
}
