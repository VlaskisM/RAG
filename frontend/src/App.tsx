import { useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/AppShell';
import { DocumentSidebar } from './components/DocumentSidebar';
import {
  chatMessages,
  currentUser,
  documents as mockDocuments,
  queryHistory as mockQueryHistory,
} from './data/mockData';
import { useTheme } from './hooks/useTheme';
import {
  askKnowledgeBase,
  enrichSources,
  getDocuments,
} from './lib/api';
import { createId } from './lib/utils';
import { AuthPage } from './pages/AuthPage';
import { ChatPage } from './pages/ChatPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { SettingsPage } from './pages/SettingsPage';
import type {
  AnswerSource,
  AppRoute,
  ChatMessage,
  DocumentStatus,
  KnowledgeDocument,
  NotificationSettings,
  QueryHistoryItem,
  UserProfile,
} from './types';

const authStorageKey = 'knowledge-rag-user';
const documentsStorageKey = 'knowledge-rag-documents';
const historyStorageKey = 'knowledge-rag-history';
const notificationsStorageKey = 'knowledge-rag-notifications';

const routeTitles: Record<AppRoute, { title: string; description: string }> = {
  '/login': { title: 'Login', description: 'Mock authentication' },
  '/register': { title: 'Register', description: 'Create an account' },
  '/dashboard': {
    title: 'Dashboard',
    description: 'Обзор документов, запросов и последних действий',
  },
  '/chat': {
    title: 'RAG Chat',
    description: 'Задавайте вопросы и проверяйте источники ответа',
  },
  '/documents': {
    title: 'Documents',
    description: 'Загрузка, обработка и индексация файлов базы знаний',
  },
  '/settings': {
    title: 'Settings',
    description: 'Профиль, безопасность, тема и уведомления',
  },
};

const defaultNotifications: NotificationSettings = {
  emailDigest: true,
  sourceUpdates: true,
  failedUploads: true,
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function currentPath(): AppRoute {
  const path = window.location.pathname as AppRoute;
  const knownRoutes = Object.keys(routeTitles) as AppRoute[];

  return knownRoutes.includes(path) ? path : '/dashboard';
}

function fileType(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || 'txt';
}

export default function App() {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [route, setRoute] = useState<AppRoute>(currentPath);
  const [user, setUser] = useState<UserProfile | null>(() =>
    readJson<UserProfile | null>(authStorageKey, null),
  );
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocument[]>(
    () => readJson<KnowledgeDocument[]>(documentsStorageKey, mockDocuments),
  );
  const [history, setHistory] = useState<QueryHistoryItem[]>(() =>
    readJson<QueryHistoryItem[]>(historyStorageKey, mockQueryHistory),
  );
  const [notifications, setNotifications] = useState<NotificationSettings>(() =>
    readJson<NotificationSettings>(notificationsStorageKey, defaultNotifications),
  );
  const [messages, setMessages] = useState<ChatMessage[]>(chatMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | undefined>(
    knowledgeDocuments[0],
  );
  const [highlightedSnippet, setHighlightedSnippet] = useState<string | undefined>();

  const activeRoute = useMemo(() => {
    if (!user && route !== '/login' && route !== '/register') {
      return '/login';
    }

    if (user && (route === '/login' || route === '/register')) {
      return '/dashboard';
    }

    return route;
  }, [route, user]);

  const navigate = (nextRoute: AppRoute) => {
    window.history.pushState({}, '', nextRoute);
    setRoute(nextRoute);
  };

  useEffect(() => {
    const handlePopState = () => setRoute(currentPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (activeRoute !== route) {
      window.history.replaceState({}, '', activeRoute);
      setRoute(activeRoute);
    }
  }, [activeRoute, route]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(authStorageKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(authStorageKey);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(documentsStorageKey, JSON.stringify(knowledgeDocuments));
  }, [knowledgeDocuments]);

  useEffect(() => {
    localStorage.setItem(historyStorageKey, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(notificationsStorageKey, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void getDocuments().then((loadedDocuments) => {
      setKnowledgeDocuments((currentDocuments) => {
        const uploadedDocuments = currentDocuments.filter(
          (document) => !mockDocuments.some((mock) => mock.id === document.id),
        );
        return [...loadedDocuments, ...uploadedDocuments];
      });
    });
  }, [user]);

  const handleAuth = (nextUser: UserProfile) => {
    setUser(nextUser);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const handleOpenSource = (source: AnswerSource) => {
    const document = knowledgeDocuments.find(
      (item) => item.id === source.documentId || item.fileName === source.fileName,
    );
    setSelectedDocument(document);
    setHighlightedSnippet(source.snippet);
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

      await new Promise((resolve) => window.setTimeout(resolve, 18));
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
      const response = await askKnowledgeBase(question, knowledgeDocuments);
      const sources = enrichSources(response.sources, knowledgeDocuments);

      await streamAssistantAnswer(assistantMessageId, response.answer, sources);

      if (sources[0]) {
        handleOpenSource(sources[0]);
      }

      setHistory((currentHistory) => [
        {
          id: createId('history'),
          question,
          answer: response.answer,
          sourceCount: sources.length,
          createdAt: new Date().toISOString(),
        },
        ...currentHistory,
      ]);
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

  const updateDocumentStatus = (documentId: string, status: DocumentStatus) => {
    setKnowledgeDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === documentId ? { ...document, status } : document,
      ),
    );
  };

  const handleUpload = (files: File[]) => {
    const uploadedDocuments = files.map<KnowledgeDocument>((file) => {
      const type = fileType(file.name);

      return {
        id: createId('doc'),
        fileName: file.name,
        title: file.name.replace(/\.[^.]+$/, ''),
        type,
        category: 'Uploaded',
        uploadedAt: new Date().toISOString(),
        owner: user?.name ?? currentUser.name,
        summary: 'Файл загружен и ожидает обработки перед индексацией.',
        status: 'uploaded',
        size: file.size,
        chunks: 0,
      };
    });

    setKnowledgeDocuments((currentDocuments) => [
      ...uploadedDocuments,
      ...currentDocuments,
    ]);

    uploadedDocuments.forEach((document, index) => {
      window.setTimeout(() => updateDocumentStatus(document.id, 'processing'), 500);
      window.setTimeout(() => {
        const shouldFail = document.fileName.toLowerCase().includes('fail');
        setKnowledgeDocuments((currentDocuments) =>
          currentDocuments.map((item) =>
            item.id === document.id
              ? {
                  ...item,
                  status: shouldFail ? 'failed' : 'indexed',
                  chunks: shouldFail ? 0 : 24 + index * 7,
                  summary: shouldFail
                    ? 'Не удалось обработать файл. Проверьте формат и повторите загрузку.'
                    : 'Файл обработан, разбит на фрагменты и доступен в RAG-чате.',
                }
              : item,
          ),
        );
      }, 2200 + index * 400);
    });
  };

  const handleDeleteDocument = (documentId: string) => {
    setKnowledgeDocuments((currentDocuments) =>
      currentDocuments.filter((document) => document.id !== documentId),
    );
    setSelectedDocument((currentDocument) =>
      currentDocument?.id === documentId ? undefined : currentDocument,
    );
  };

  if (activeRoute === '/login' || activeRoute === '/register') {
    return (
      <AuthPage
        mode={activeRoute === '/register' ? 'register' : 'login'}
        onSubmit={handleAuth}
        onNavigate={navigate}
      />
    );
  }

  const routeMeta = routeTitles[activeRoute];

  return (
    <AppShell
      currentRoute={activeRoute}
      title={routeMeta.title}
      description={routeMeta.description}
      user={user ?? currentUser}
      theme={theme}
      onNavigate={navigate}
      onToggleTheme={toggleTheme}
      onLogout={handleLogout}
    >
      {activeRoute === '/dashboard' ? (
        <DashboardPage
          user={user ?? currentUser}
          documents={knowledgeDocuments}
          history={history}
          messages={messages}
          onNavigate={navigate}
        />
      ) : null}

      {activeRoute === '/chat' ? (
        <ChatPage
          documents={knowledgeDocuments}
          messages={messages}
          isLoading={isLoading}
          selectedDocument={selectedDocument}
          highlightedSnippet={highlightedSnippet}
          onAsk={handleAsk}
          onOpenSource={handleOpenSource}
          onSelectDocument={(document) => {
            setSelectedDocument(document);
            setHighlightedSnippet(undefined);
          }}
        />
      ) : null}

      {activeRoute === '/documents' ? (
        <DocumentsPage
          documents={knowledgeDocuments}
          user={user ?? currentUser}
          onUpload={handleUpload}
          onDelete={handleDeleteDocument}
        />
      ) : null}

      {activeRoute === '/settings' ? (
        <SettingsPage
          user={user ?? currentUser}
          theme={theme}
          notifications={notifications}
          onUpdateUser={setUser}
          onSetTheme={setTheme}
          onUpdateNotifications={setNotifications}
        />
      ) : null}

      <div className="xl:hidden">
        {activeRoute === '/chat' && selectedDocument ? (
          <DocumentSidebar
            documents={knowledgeDocuments}
            selectedDocumentId={selectedDocument.id}
            highlightedSnippet={highlightedSnippet}
            onSelectDocument={(document) => setSelectedDocument(document)}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
