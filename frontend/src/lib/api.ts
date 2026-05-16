import type {
  AnswerSource,
  ApiAnswerResponse,
  ChatMessage,
  ChatSummary,
  KnowledgeDocument,
  QueryHistoryItem,
  StatsResponse,
  UploadResult,
  UserProfile,
} from '../types';
import { createId } from './utils';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const TOKEN_STORAGE_KEY = 'knowledge-rag-token';

interface BackendSource {
  fileName?: string;
  text?: string;
  snippet?: string;
  score?: number;
  page?: number | null;
  book?: string;
  author?: string | null;
  part?: string;
  chapter?: string;
  section?: string;
  block_type?: string;
}

interface BackendProfileResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar_url?: string | null;
  settings?: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    show_relevance: boolean;
    save_history: boolean;
  };
}

interface BackendHistoryItem {
  id: number;
  question: string;
  answer: string;
  source_count: number;
  created_at: string;
}

interface BackendAuthResponse {
  token: string;
  profile: BackendProfileResponse;
}

interface BackendStatsResponse {
  documents: number;
  queries: number;
  sources_total: number;
  chats: number;
}

interface BackendChatSummary {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface BackendChatMessage {
  id: number;
  role: string;
  content: string;
  created_at: string;
  sources: BackendSource[];
}

interface BackendChatMessagesResponse {
  chat: BackendChatSummary;
  messages: BackendChatMessage[];
}

interface BackendChatAskResponse {
  chat: BackendChatSummary;
  user_message: BackendChatMessage;
  assistant_message: BackendChatMessage;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    let detail = '';
    try {
      const data = await response.json();
      detail = data?.detail ?? '';
    } catch {
      // ignore
    }
    throw new ApiError(response.status, detail || `API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }
  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function mapBackendProfile(profile: BackendProfileResponse): UserProfile {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    department: profile.department,
    avatarUrl: profile.avatar_url ?? undefined,
    settings: profile.settings
      ? {
          theme: profile.settings.theme,
          language: profile.settings.language,
          showRelevance: profile.settings.show_relevance,
          saveHistory: profile.settings.save_history,
        }
      : undefined,
  };
}

function sourceSection(source: BackendSource) {
  return source.section || source.chapter || source.part || source.block_type || undefined;
}

function mapSources(sources: BackendSource[]): ApiAnswerResponse['sources'] {
  return sources.map((source) => ({
    fileName: source.fileName || source.book || 'Документ базы знаний',
    snippet: source.text ?? source.snippet ?? '',
    page: source.page ?? undefined,
    section: sourceSection(source),
    relevance: source.score,
  }));
}

function mapChatMessage(message: BackendChatMessage): ChatMessage {
  return {
    id: String(message.id),
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content,
    createdAt: message.created_at,
    sources: message.sources?.length
      ? enrichSources(mapSources(message.sources))
      : undefined,
  };
}

function mapChatSummary(chat: BackendChatSummary): ChatSummary {
  return {
    id: chat.id,
    title: chat.title,
    createdAt: chat.created_at,
    updatedAt: chat.updated_at,
    messageCount: chat.message_count,
  };
}

export async function login(email: string, password: string): Promise<UserProfile> {
  const response = await request<BackendAuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setStoredToken(response.token);
  return mapBackendProfile(response.profile);
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<UserProfile> {
  const response = await request<BackendAuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  setStoredToken(response.token);
  return mapBackendProfile(response.profile);
}

export async function fetchMe(): Promise<UserProfile> {
  const profile = await request<BackendProfileResponse>('/auth/me');
  return mapBackendProfile(profile);
}

export function logout() {
  setStoredToken(null);
}

export async function getProfile(): Promise<UserProfile> {
  const profile = await request<BackendProfileResponse>('/profile/me');
  return mapBackendProfile(profile);
}

export async function getQueryHistory(): Promise<QueryHistoryItem[]> {
  const history = await request<BackendHistoryItem[]>('/profile/history');
  return history.map((item) => ({
    id: String(item.id),
    question: item.question,
    answer: item.answer,
    sourceCount: item.source_count,
    createdAt: item.created_at,
  }));
}

export async function getDocuments(): Promise<KnowledgeDocument[]> {
  return await request<KnowledgeDocument[]>('/documents/');
}

export async function getStats(): Promise<StatsResponse> {
  const response = await request<BackendStatsResponse>('/profile/stats');
  return {
    documents: response.documents,
    queries: response.queries,
    sourcesTotal: response.sources_total,
    chats: response.chats,
  };
}

export async function uploadDocument(file: File, book: string, author?: string): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('book', book);
  if (author) {
    form.append('author', author);
  }
  return await request<UploadResult>('/data-loading/', {
    method: 'POST',
    body: form,
  });
}

export async function getChats(): Promise<ChatSummary[]> {
  const response = await request<BackendChatSummary[]>('/chats/');
  return response.map(mapChatSummary);
}

export async function createChat(title?: string): Promise<ChatSummary> {
  const response = await request<BackendChatSummary>('/chats/', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  return mapChatSummary(response);
}

export async function deleteChat(chatId: number): Promise<void> {
  await request<void>(`/chats/${chatId}`, { method: 'DELETE' });
}

export async function getChatMessages(chatId: number): Promise<{
  chat: ChatSummary;
  messages: ChatMessage[];
}> {
  const response = await request<BackendChatMessagesResponse>(`/chats/${chatId}/messages`);
  return {
    chat: mapChatSummary(response.chat),
    messages: response.messages.map(mapChatMessage),
  };
}

export async function askInChat(
  chatId: number,
  question: string,
): Promise<{
  chat: ChatSummary;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}> {
  const response = await request<BackendChatAskResponse>(`/chats/${chatId}/ask`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
  return {
    chat: mapChatSummary(response.chat),
    userMessage: mapChatMessage(response.user_message),
    assistantMessage: mapChatMessage(response.assistant_message),
  };
}

export function enrichSources(
  sources: ApiAnswerResponse['sources'],
  documents: KnowledgeDocument[] = [],
): AnswerSource[] {
  return sources.map((source) => {
    const document = documents.find((item) => item.fileName === source.fileName);
    const documentId = document?.id ?? source.fileName;

    return {
      id: createId('source'),
      documentId,
      fileName: source.fileName,
      snippet: source.snippet,
      page: source.page,
      section: source.section,
      relevance: source.relevance,
    };
  });
}
