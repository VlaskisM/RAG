import { useEffect, useRef } from 'react';
import type { AnswerSource, ChatMessage } from '../types';
import { suggestedQuestions } from '../data/mockData';
import { ChatComposer } from './ChatComposer';
import { ChatMessage as ChatMessageView } from './ChatMessage';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onAsk: (question: string) => void;
  onOpenSource: (source: AnswerSource) => void;
}

export function ChatPanel({ messages, isLoading, onAsk, onOpenSource }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-white/75 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/75 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {suggestedQuestions.map((question) => (
            <button
              key={question}
              onClick={() => onAsk(question)}
              disabled={isLoading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-700 dark:hover:bg-brand-950/30 dark:hover:text-brand-100"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          {messages.map((message) => (
            <ChatMessageView
              key={message.id}
              message={message}
              onOpenSource={onOpenSource}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/90 md:p-5">
        <div className="mx-auto max-w-5xl">
          <ChatComposer disabled={isLoading} onSubmit={onAsk} />
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            Ответы формируются по проиндексированным документам. Проверяйте источники для критичных решений.
          </p>
        </div>
      </div>
    </main>
  );
}
