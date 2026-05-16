import { MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Trash2 } from 'lucide-react';
import type { ChatSummary } from '../types';
import { cn, formatDate } from '../lib/utils';

interface ChatListProps {
  chats: ChatSummary[];
  activeChatId: number | null;
  onCreate: () => void;
  onSelect: (chatId: number) => void;
  onDelete: (chatId: number) => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  isCreating?: boolean;
}

export function ChatList({
  chats,
  activeChatId,
  onCreate,
  onSelect,
  onDelete,
  isCollapsed,
  onToggleCollapsed,
  isCreating,
}: ChatListProps) {
  if (isCollapsed) {
    return (
      <aside className="flex h-full w-[56px] shrink-0 flex-col items-center gap-2 border-r border-slate-200 bg-white px-2 py-3 dark:border-slate-800 dark:bg-slate-950">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
          aria-label="Показать список чатов"
          title="Показать список чатов"
        >
          <PanelLeftOpen size={18} />
        </button>
        <button
          type="button"
          onClick={onCreate}
          disabled={isCreating}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Новый чат"
          title="Новый чат"
        >
          <MessageSquarePlus size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-full max-w-[260px] flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="space-y-2 border-b border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Чаты
          </p>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Скрыть список чатов"
            title="Скрыть список чатов"
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
        <button
          type="button"
          onClick={onCreate}
          disabled={isCreating}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MessageSquarePlus size={17} />
          Новый чат
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Пока нет чатов. Создайте первый.
          </p>
        ) : (
          <ul className="space-y-1 px-2 py-2">
            {chats.map((chat) => {
              const isActive = chat.id === activeChatId;
              return (
                <li key={chat.id}>
                  <div
                    className={cn(
                      'group flex items-center gap-2 rounded-lg px-2 py-2 transition',
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(chat.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p
                        className={cn(
                          'truncate text-sm font-medium',
                          isActive
                            ? 'text-slate-950 dark:text-white'
                            : 'text-slate-700 dark:text-slate-200',
                        )}
                      >
                        {chat.title || 'Новый чат'}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(chat.updatedAt)} · {chat.messageCount} сообщ.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(chat.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:text-slate-500 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                      aria-label="Удалить чат"
                      title="Удалить чат"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
