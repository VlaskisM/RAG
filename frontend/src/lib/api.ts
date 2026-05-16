import {
  currentUser as mockUser,
  documents as mockDocuments,
  queryHistory as mockQueryHistory,
} from '../data/mockData';
import type {
  AnswerSource,
  ApiAnswerResponse,
  KnowledgeDocument,
  QueryHistoryItem,
  UserProfile,
} from '../types';
import { createId } from './utils';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

interface BackendSource {
  fileName?: string;
  text: string;
  score: number;
  page?: number | null;
  book?: string;
  author?: string | null;
  part?: string;
  chapter?: string;
  section?: string;
  block_type?: string;
}

interface BackendQueryResponse {
  answer: string;
  sources: BackendSource[];
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function sourceSection(source: BackendSource) {
  return source.section || source.chapter || source.part || source.block_type || undefined;
}

export async function askKnowledgeBase(question: string): Promise<ApiAnswerResponse> {
  const response = await request<BackendQueryResponse>('/query/', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });

  return {
    answer: response.answer,
    sources: response.sources.map((source) => ({
      fileName: source.fileName || source.book || 'Документ базы знаний',
      snippet: source.text,
      page: source.page ?? undefined,
      section: sourceSection(source),
      relevance: source.score,
    })),
  };
}

export async function getProfile(): Promise<UserProfile> {
  try {
    const profile = await request<BackendProfileResponse>('/profile/me');

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
  } catch {
    return mockUser;
  }
}

export async function getQueryHistory(): Promise<QueryHistoryItem[]> {
  try {
    const history = await request<BackendHistoryItem[]>('/profile/history');

    return history.map((item) => ({
      id: String(item.id),
      question: item.question,
      answer: item.answer,
      sourceCount: item.source_count,
      createdAt: item.created_at,
    }));
  } catch {
    return mockQueryHistory;
  }
}

export async function getDocuments(): Promise<KnowledgeDocument[]> {
  try {
    const loadedDocuments = await request<KnowledgeDocument[]>('/documents/');

    return loadedDocuments.length > 0 ? loadedDocuments : mockDocuments;
  } catch {
    return mockDocuments;
  }
}

export function enrichSources(sources: ApiAnswerResponse['sources']): AnswerSource[] {
  return sources.map((source) => {
    const document = mockDocuments.find((item) => item.fileName === source.fileName);
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
