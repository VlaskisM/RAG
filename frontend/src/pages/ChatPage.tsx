import type { AnswerSource, ChatMessage, KnowledgeDocument } from '../types';
import { ChatPanel } from '../components/ChatPanel';
import { DocumentSidebar } from '../components/DocumentSidebar';

interface ChatPageProps {
  documents: KnowledgeDocument[];
  messages: ChatMessage[];
  isLoading: boolean;
  selectedDocument?: KnowledgeDocument;
  highlightedSnippet?: string;
  onAsk: (question: string) => void;
  onOpenSource: (source: AnswerSource) => void;
  onSelectDocument: (document: KnowledgeDocument) => void;
}

export function ChatPage({
  documents,
  messages,
  isLoading,
  selectedDocument,
  highlightedSnippet,
  onAsk,
  onOpenSource,
  onSelectDocument,
}: ChatPageProps) {
  return (
    <div className="flex h-full min-h-0 flex-col xl:flex-row">
      <ChatPanel
        messages={messages}
        isLoading={isLoading}
        onAsk={onAsk}
        onOpenSource={onOpenSource}
      />
      <div className="hidden min-h-0 xl:block">
        <DocumentSidebar
          documents={documents}
          selectedDocumentId={selectedDocument?.id}
          highlightedSnippet={highlightedSnippet}
          onSelectDocument={onSelectDocument}
        />
      </div>
    </div>
  );
}
