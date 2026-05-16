import { useEffect, useRef } from 'react';
import type { AnswerSource, ChatMessage } from '../types';
import { ChatComposer } from './ChatComposer';
import { ChatMessage as ChatMessageView } from './ChatMessage';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onAsk: (question: string, codeReviewMode: boolean) => void;
  onOpenSource: (source: AnswerSource) => void;
}

export function ChatPanel({ messages, isLoading, onAsk, onOpenSource }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-slate-50 dark:bg-slate-950">
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
