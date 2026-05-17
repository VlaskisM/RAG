import { Files, PanelRightOpen } from 'lucide-react';
import type { AnswerSource, AttachedCode, ChatMessage, KnowledgeDocument } from '../types';
import { ChatPanel } from '../components/ChatPanel';
import { DocumentSidebar } from '../components/DocumentSidebar';

interface ChatPageProps {
  documents: KnowledgeDocument[];
  messages: ChatMessage[];
  isLoading: boolean;
  selectedDocument?: KnowledgeDocument;
  isDocumentListCollapsed: boolean;
  onAsk: (question: string, codeReviewMode: boolean, attachedCode?: AttachedCode) => void;
  onOpenSource: (source: AnswerSource) => void;
  onSelectDocument: (document: KnowledgeDocument) => void;
  onToggleDocumentList: () => void;
}

export function ChatPage({
  documents,
  messages,
  isLoading,
  selectedDocument,
  isDocumentListCollapsed,
  onAsk,
  onOpenSource,
  onSelectDocument,
  onToggleDocumentList,
}: ChatPageProps) {
  return (
    <div className="flex h-full min-h-0 flex-col xl:flex-row">
      <ChatPanel
        messages={messages}
        isLoading={isLoading}
        onAsk={onAsk}
        onOpenSource={onOpenSource}
      />
      {isDocumentListCollapsed ? (
        <aside className="hidden w-14 shrink-0 border-l border-slate-200 bg-white/95 py-4 dark:border-slate-800 dark:bg-slate-950/95 xl:flex xl:flex-col xl:items-center">
          <button
            type="button"
            onClick={onToggleDocumentList}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Показать базу документов"
            title="Показать базу документов"
          >
            <PanelRightOpen size={18} />
          </button>
          <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
            <Files size={18} />
          </div>
        </aside>
      ) : (
      <div className="hidden min-h-0 xl:block">
        <DocumentSidebar
          documents={documents}
          selectedDocumentId={selectedDocument?.id}
          onSelectDocument={onSelectDocument}
          onCollapse={onToggleDocumentList}
        />
      </div>
      )}
    </div>
  );
}
