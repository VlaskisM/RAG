import { useState } from 'react';
import { AccountPanel } from './components/AccountPanel';
import { ChatPanel } from './components/ChatPanel';
import { DocumentSidebar } from './components/DocumentSidebar';
import { Header } from './components/Header';
import {
  chatMessages,
  currentUser,
  documents,
  queryHistory,
} from './data/mockData';
import { useTheme } from './hooks/useTheme';
import { askKnowledgeBase, enrichSources } from './lib/api';
import { createId } from './lib/utils';
import type { AnswerSource, ChatMessage, KnowledgeDocument } from './types';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>(chatMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isDocumentPanelOpen, setIsDocumentPanelOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | undefined>(
    documents[0],
  );
  const [highlightedSnippet, setHighlightedSnippet] = useState<string | undefined>();

  const handleOpenSource = (source: AnswerSource) => {
    const document = documents.find((item) => item.id === source.documentId);
    setSelectedDocument(document);
    setHighlightedSnippet(source.snippet);
    setIsDocumentPanelOpen(true);
  };

  const streamAssistantAnswer = async (
    messageId: string,
    content: string,
    sources: AnswerSource[],
  ) => {
    const words = content.split(' ');
    let visibleContent = '';

    for (const word of words) {
      visibleContent = visibleContent ? `${visibleContent} ${word}` : word;

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                content: visibleContent,
                sources,
                isStreaming: true,
              }
            : message,
        ),
      );

      await new Promise((resolve) => window.setTimeout(resolve, 24));
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content,
              sources,
              isStreaming: false,
            }
          : message,
      ),
    );
  };

  const handleAsk = async (question: string) => {
    if (isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId('message'),
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };
    const assistantMessageId = createId('message');
    const loadingMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage, loadingMessage]);
    setIsLoading(true);

    try {
      const response = await askKnowledgeBase(question);
      const sources = enrichSources(response.sources);

      await streamAssistantAnswer(assistantMessageId, response.answer, sources);

      if (sources[0]) {
        handleOpenSource(sources[0]);
      }
    } catch {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content:
                  'Не удалось получить ответ от сервера. Проверьте подключение к API и попробуйте еще раз.',
                isStreaming: false,
              }
            : message,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="flex h-full">
        <AccountPanel user={currentUser} history={queryHistory} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenDocuments={() => setIsDocumentPanelOpen(true)}
            user={currentUser}
          />
          <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
            <ChatPanel
              messages={messages}
              isLoading={isLoading}
              onAsk={handleAsk}
              onOpenSource={handleOpenSource}
            />
            <div className="hidden min-h-0 xl:block">
              <DocumentSidebar
                documents={documents}
                selectedDocumentId={selectedDocument?.id}
                highlightedSnippet={highlightedSnippet}
                onSelectDocument={(document) => {
                  setSelectedDocument(document);
                  setHighlightedSnippet(undefined);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {isDocumentPanelOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm xl:hidden">
          <div className="absolute inset-y-0 right-0 w-full max-w-[420px] shadow-soft-dark">
            <DocumentSidebar
              documents={documents}
              selectedDocumentId={selectedDocument?.id}
              highlightedSnippet={highlightedSnippet}
              onClose={() => setIsDocumentPanelOpen(false)}
              onSelectDocument={(document) => {
                setSelectedDocument(document);
                setHighlightedSnippet(undefined);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
