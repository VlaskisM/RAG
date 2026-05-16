import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/AppShell';
import { DocumentSidebar } from './components/DocumentSidebar';
import { ChatList } from './components/ChatList';
import { HighlightedSnippetModal } from './components/HighlightedSnippetModal';
import { useTheme } from './hooks/useTheme';
import {
  ApiError,
  askInChat,
  createChat as apiCreateChat,
  deleteChat as apiDeleteChat,
  fetchMe,
  getChatMessages,
  getChats,
  getDocuments,
  getQueryHistory,
  getStats,
  logout as apiLogout,
  uploadDocument,
} from './lib/api';
import { AuthPage } from './pages/AuthPage';
import { ChatPage } from './pages/ChatPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { SettingsPage } from './pages/SettingsPage';
import type {
  AnswerSource,
  AppRoute,
  ChatMessage,
  ChatSummary,
  DocumentStatus,
  KnowledgeDocument,
  NotificationSettings,
  QueryHistoryItem,
  StatsResponse,
  UserProfile,
} from './types';

const notificationsStorageKey = 'knowledge-rag-notifications';
const chatListCollapsedStorageKey = 'knowledge-rag-chat-list-collapsed';
const documentListCollapsedStorageKey = 'knowledge-rag-document-list-collapsed';
const appSidebarCollapsedStorageKey = 'knowledge-rag-sidebar-collapsed';
const documentMetadataStorageKey = 'knowledge-rag-document-metadata';

const routeTitles: Record<AppRoute, { title: string; description: string }> = {
  '/login': { title: 'Login', description: 'Вход в аккаунт' },
  '/register': { title: 'Register', description: 'Создание аккаунта' },
  '/dashboard': {
    title: 'Dashboard',
    description: 'Обзор документов, запросов и последних действий',
  },
  '/chat': {
    title: 'Chats',
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

interface UploadingDocument extends KnowledgeDocument {
  localKey: string;
}

type DocumentMetadataCache = Record<
  string,
  Partial<KnowledgeDocument>
>;

function stripKnownExtension(value: string) {
  return value.replace(/\.(pdf|docx|xlsx|txt|csv|md|html)$/i, '');
}

function documentMergeKey(document: KnowledgeDocument) {
  return stripKnownExtension(document.fileName || document.title || document.id)
    .trim()
    .toLowerCase();
}

function readDocumentMetadataCache(): DocumentMetadataCache {
  return readJson<DocumentMetadataCache>(documentMetadataStorageKey, {});
}

function readStoredDocumentMetadata(document: KnowledgeDocument) {
  return readDocumentMetadataCache()[documentMergeKey(document)];
}

function saveDocumentMetadata(document: KnowledgeDocument) {
  const key = documentMergeKey(document);
  if (!key) {
    return;
  }

  const cache = readDocumentMetadataCache();
  cache[key] = {
    fileName: document.fileName,
    owner: document.owner,
    size: document.size,
    type: document.type,
    uploadedAt: document.uploadedAt,
  };
  localStorage.setItem(documentMetadataStorageKey, JSON.stringify(cache));
}

function removeDocumentMetadata(document: KnowledgeDocument) {
  const key = documentMergeKey(document);
  if (!key) {
    return;
  }

  const cache = readDocumentMetadataCache();
  delete cache[key];
  localStorage.setItem(documentMetadataStorageKey, JSON.stringify(cache));
}

function mergeDocumentMetadata(
  serverDocument: KnowledgeDocument,
  localDocument?: KnowledgeDocument,
): KnowledgeDocument {
  const preservedDocument = {
    ...readStoredDocumentMetadata(serverDocument),
    ...localDocument,
  };

  if (!preservedDocument.fileName && !preservedDocument.uploadedAt && !preservedDocument.size) {
    return {
      ...serverDocument,
      status: serverDocument.status ?? 'indexed',
    };
  }

  return {
    ...serverDocument,
    fileName: preservedDocument.fileName || serverDocument.fileName,
    title: serverDocument.title || preservedDocument.title || serverDocument.fileName,
    type: preservedDocument.type || serverDocument.type,
    category: serverDocument.category || preservedDocument.category || 'Knowledge',
    uploadedAt: serverDocument.uploadedAt ?? preservedDocument.uploadedAt,
    pages: serverDocument.pages ?? preservedDocument.pages,
    owner: serverDocument.owner || preservedDocument.owner || '',
    summary: serverDocument.summary || preservedDocument.summary || '',
    status: serverDocument.status ?? preservedDocument.status ?? 'indexed',
    size: serverDocument.size ?? preservedDocument.size,
    chunks: serverDocument.chunks ?? preservedDocument.chunks,
  };
}

function mergeDocuments(
  serverDocuments: KnowledgeDocument[],
  currentDocuments: KnowledgeDocument[],
) {
  const currentByKey = new Map(
    currentDocuments.map((document) => [documentMergeKey(document), document]),
  );
  const serverKeys = new Set(serverDocuments.map(documentMergeKey));
  const mergedServerDocuments = serverDocuments.map((document) =>
    mergeDocumentMetadata(document, currentByKey.get(documentMergeKey(document))),
  );
  const localOnlyDocuments = currentDocuments.filter(
    (document) => !serverKeys.has(documentMergeKey(document)),
  );

  return [...mergedServerDocuments, ...localOnlyDocuments];
}

export default function App() {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [route, setRoute] = useState<AppRoute>(currentPath);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocument[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState<UploadingDocument[]>([]);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings>(() =>
    readJson<NotificationSettings>(notificationsStorageKey, defaultNotifications),
  );

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() =>
    readJson<boolean>(appSidebarCollapsedStorageKey, false),
  );
  const [isChatListCollapsed, setIsChatListCollapsed] = useState(() =>
    readJson<boolean>(chatListCollapsedStorageKey, false),
  );
  const [isDocumentListCollapsed, setIsDocumentListCollapsed] = useState(() =>
    readJson<boolean>(documentListCollapsedStorageKey, false),
  );
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | undefined>();
  const [highlightedSnippet, setHighlightedSnippet] = useState<string | undefined>();

  const allDocuments = useMemo(
    () => [...uploadingDocs, ...knowledgeDocuments],
    [uploadingDocs, knowledgeDocuments],
  );

  const activeRoute = useMemo(() => {
    if (!user && route !== '/login' && route !== '/register') {
      return '/login';
    }
    if (user && (route === '/login' || route === '/register')) {
      return '/dashboard';
    }
    return route;
  }, [route, user]);

  const navigate = useCallback((nextRoute: AppRoute) => {
    window.history.pushState({}, '', nextRoute);
    setRoute(nextRoute);
  }, []);

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
    localStorage.setItem(notificationsStorageKey, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(
      appSidebarCollapsedStorageKey,
      JSON.stringify(isSidebarCollapsed),
    );
  }, [isSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem(
      chatListCollapsedStorageKey,
      JSON.stringify(isChatListCollapsed),
    );
  }, [isChatListCollapsed]);

  useEffect(() => {
    localStorage.setItem(
      documentListCollapsedStorageKey,
      JSON.stringify(isDocumentListCollapsed),
    );
  }, [isDocumentListCollapsed]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchMe();
        if (!cancelled) {
          setUser(profile);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshDocuments = useCallback(async () => {
    try {
      const docs = await getDocuments();
      setKnowledgeDocuments((currentDocuments) =>
        mergeDocuments(docs, currentDocuments),
      );
    } catch {
      // ignore — user may have just logged out
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      setStats(await getStats());
    } catch {
      // ignore
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await getQueryHistory());
    } catch {
      // ignore
    }
  }, []);

  const refreshChats = useCallback(async () => {
    try {
      const list = await getChats();
      setChats(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setKnowledgeDocuments([]);
      setHistory([]);
      setStats(null);
      setChats([]);
      setMessages([]);
      setActiveChatId(null);
      return;
    }

    void refreshDocuments();
    void refreshStats();
    void refreshHistory();
    void refreshChats().then((list) => {
      if (list.length > 0) {
        setActiveChatId((current) => current ?? list[0].id);
      }
    });
  }, [user, refreshDocuments, refreshStats, refreshHistory, refreshChats]);

  useEffect(() => {
    if (!user || activeChatId == null) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getChatMessages(activeChatId);
        if (!cancelled) {
          setMessages(data.messages);
        }
      } catch {
        if (!cancelled) {
          setMessages([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, activeChatId]);

  const handleAuth = (nextUser: UserProfile) => {
    setUser(nextUser);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    apiLogout();
    setUser(null);
    navigate('/login');
  };

  const handleOpenSource = (source: AnswerSource) => {
    const document = allDocuments.find(
      (item) => item.id === source.documentId || item.fileName === source.fileName,
    );
    setSelectedDocument(document);
    setHighlightedSnippet(source.snippet);
  };

  const ensureActiveChat = async (): Promise<number | null> => {
    if (activeChatId != null) {
      return activeChatId;
    }
    try {
      setIsCreatingChat(true);
      const chat = await apiCreateChat();
      setChats((current) => [chat, ...current]);
      setActiveChatId(chat.id);
      return chat.id;
    } catch {
      return null;
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleAsk = async (question: string, codeReviewMode = false) => {
    if (isLoading) {
      return;
    }
    const chatId = await ensureActiveChat();
    if (chatId == null) {
      return;
    }

    const placeholderId = `pending-${Date.now()}`;
    setMessages((current) => [
      ...current,
      {
        id: `local-user-${Date.now()}`,
        role: 'user',
        content: question,
        createdAt: new Date().toISOString(),
      },
      {
        id: placeholderId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        isStreaming: true,
      },
    ]);
    setIsLoading(true);

    try {
      const backendQuestion = codeReviewMode
        ? [
            'Режим Code Review включен.',
            'Проанализируй вопрос как senior reviewer: сначала укажи проблемы, риски, регрессии и недостающие проверки, затем коротко предложи исправления.',
            '',
            question,
          ].join('\n')
        : question;
      const response = await askInChat(chatId, backendQuestion);
      setMessages((current) => {
        const filtered = current.filter(
          (msg) =>
            msg.id !== placeholderId &&
            !(msg.role === 'user' && msg.content === question && msg.id.startsWith('local-user-')),
        );
        return [
          ...filtered,
          { ...response.userMessage, content: question },
          response.assistantMessage,
        ];
      });

      setChats((current) => {
        const without = current.filter((c) => c.id !== response.chat.id);
        return [response.chat, ...without];
      });
      void refreshStats();
      void refreshHistory();
    } catch (caught) {
      const message =
        caught instanceof ApiError && caught.status === 401
          ? 'Сессия истекла. Войдите снова.'
          : 'Не удалось получить ответ от сервера. Проверьте подключение к API и попробуйте ещё раз.';
      setMessages((current) =>
        current.map((msg) =>
          msg.id === placeholderId
            ? { ...msg, content: message, isStreaming: false }
            : msg,
        ),
      );
      if (caught instanceof ApiError && caught.status === 401) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateChat = async () => {
    if (isCreatingChat) {
      return;
    }
    try {
      setIsCreatingChat(true);
      const chat = await apiCreateChat();
      setChats((current) => [chat, ...current]);
      setActiveChatId(chat.id);
      setMessages([]);
      navigate('/chat');
    } catch {
      // ignore
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleSelectChat = (chatId: number) => {
    setActiveChatId(chatId);
  };

  const handleDeleteChat = async (chatId: number) => {
    try {
      await apiDeleteChat(chatId);
      setChats((current) => current.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) {
        const remaining = chats.filter((c) => c.id !== chatId);
        setActiveChatId(remaining[0]?.id ?? null);
      }
      void refreshStats();
    } catch {
      // ignore
    }
  };

  const setKnowledgeUploadingStatus = (localKey: string, status: DocumentStatus, patch?: Partial<KnowledgeDocument>) => {
    setUploadingDocs((current) =>
      current.map((doc) =>
        doc.localKey === localKey ? { ...doc, ...patch, status } : doc,
      ),
    );
  };

  const handleUpload = async (files: File[]) => {
    const tickets: UploadingDocument[] = files.map((file) => ({
      localKey: `upload-${Date.now()}-${file.name}`,
      id: `pending-${Date.now()}-${file.name}`,
      fileName: file.name,
      title: file.name.replace(/\.[^.]+$/, ''),
      type: 'pdf',
      category: 'Uploading',
      uploadedAt: new Date().toISOString(),
      owner: user?.name ?? '',
      summary: 'Файл отправляется на сервер.',
      status: 'uploaded',
      size: file.size,
      chunks: 0,
    }));

    setUploadingDocs((current) => [...tickets, ...current]);

    for (const ticket of tickets) {
      const file = files.find((f) => f.name === ticket.fileName);
      if (!file) {
        continue;
      }
      setKnowledgeUploadingStatus(ticket.localKey, 'processing', {
        summary: 'Сервер обрабатывает файл: конвертация, чанкование, эмбеддинги.',
      });
      try {
        const book = ticket.title || file.name;
        const result = await uploadDocument(file, book, user?.name);
        const indexedDocument: KnowledgeDocument = {
          id: ticket.id,
          fileName: ticket.fileName,
          title: ticket.title,
          type: ticket.type,
          category: ticket.category,
          uploadedAt: ticket.uploadedAt,
          owner: ticket.owner,
          summary: `Проиндексировано ${result.chunks} фрагментов. Файл доступен в RAG-чате.`,
          status: 'indexed',
          size: ticket.size,
          chunks: result.chunks,
        };

        saveDocumentMetadata(indexedDocument);
        setKnowledgeDocuments((currentDocuments) => {
          const existingIndex = currentDocuments.findIndex(
            (document) =>
              documentMergeKey(document) === documentMergeKey(indexedDocument),
          );

          if (existingIndex === -1) {
            return [indexedDocument, ...currentDocuments];
          }

          const nextDocuments = [...currentDocuments];
          nextDocuments[existingIndex] = mergeDocumentMetadata(
            nextDocuments[existingIndex],
            indexedDocument,
          );
          return nextDocuments;
        });
        setKnowledgeUploadingStatus(ticket.localKey, 'indexed', {
          summary: `Проиндексировано ${result.chunks} фрагментов. Файл доступен в RAG-чате.`,
          chunks: result.chunks,
        });
        setTimeout(() => {
          setUploadingDocs((current) => current.filter((d) => d.localKey !== ticket.localKey));
          void refreshDocuments();
          void refreshStats();
        }, 1500);
      } catch (caught) {
        const detail =
          caught instanceof ApiError ? caught.message : 'Не удалось загрузить файл';
        setKnowledgeUploadingStatus(ticket.localKey, 'failed', { summary: detail });
        if (caught instanceof ApiError && caught.status === 401) {
          handleLogout();
        }
      }
    }
  };

  const handleDeleteDocument = (documentId: string) => {
    const deletedDocument = allDocuments.find((document) => document.id === documentId);
    if (deletedDocument) {
      removeDocumentMetadata(deletedDocument);
    }
    setKnowledgeDocuments((currentDocuments) =>
      currentDocuments.filter((document) => document.id !== documentId),
    );
    setUploadingDocs((current) => current.filter((d) => d.id !== documentId));
    setSelectedDocument((currentDocument) =>
      currentDocument?.id === documentId ? undefined : currentDocument,
    );
  };

  if (bootstrapping) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Загрузка…
      </main>
    );
  }

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
      user={user!}
      theme={theme}
      onNavigate={navigate}
      onToggleTheme={toggleTheme}
      onLogout={handleLogout}
      isSidebarCollapsed={isSidebarCollapsed}
      onToggleSidebar={() => setIsSidebarCollapsed((current) => !current)}
    >
      {activeRoute === '/dashboard' ? (
        <DashboardPage
          user={user!}
          documents={allDocuments}
          history={history}
          stats={stats}
          onNavigate={navigate}
        />
      ) : null}

      {activeRoute === '/chat' ? (
        <div className="flex h-full min-h-0">
          <ChatList
            chats={chats}
            activeChatId={activeChatId}
            onCreate={handleCreateChat}
            onSelect={handleSelectChat}
            onDelete={handleDeleteChat}
            isCollapsed={isChatListCollapsed}
            onToggleCollapsed={() => setIsChatListCollapsed((current) => !current)}
            isCreating={isCreatingChat}
          />
          <div className="min-w-0 flex-1">
            <ChatPage
              documents={allDocuments}
              messages={messages}
              isLoading={isLoading}
              selectedDocument={selectedDocument}
              isDocumentListCollapsed={isDocumentListCollapsed}
              onAsk={handleAsk}
              onOpenSource={handleOpenSource}
              onSelectDocument={(document) => {
                setSelectedDocument(document);
                setHighlightedSnippet(undefined);
              }}
              onToggleDocumentList={() =>
                setIsDocumentListCollapsed((current) => !current)
              }
            />
          </div>
        </div>
      ) : null}

      {activeRoute === '/documents' ? (
        <DocumentsPage
          documents={allDocuments}
          user={user!}
          onUpload={handleUpload}
          onDelete={handleDeleteDocument}
        />
      ) : null}

      {activeRoute === '/settings' ? (
        <SettingsPage
          user={user!}
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
            documents={allDocuments}
            selectedDocumentId={selectedDocument.id}
            onSelectDocument={(document) => setSelectedDocument(document)}
          />
        ) : null}
      </div>
      {activeRoute === '/chat' && highlightedSnippet ? (
        <HighlightedSnippetModal
          snippet={highlightedSnippet}
          document={selectedDocument}
          onClose={() => setHighlightedSnippet(undefined)}
        />
      ) : null}
    </AppShell>
  );
}
