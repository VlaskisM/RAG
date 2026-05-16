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

function mockAnswer(question: string, documents: KnowledgeDocument[]): ApiAnswerResponse {
  const indexedDocuments = documents.filter((document) => document.status !== 'failed');
  const primaryDocument = indexedDocuments[0] ?? mockDocuments[0];
  const secondaryDocument = indexedDocuments[1] ?? mockDocuments[1];
  const normalizedQuestion = question.toLowerCase();

  if (normalizedQuestion.includes('загруз') || normalizedQuestion.includes('файл')) {
    return {
      answer:
        'Файлы загружаются на странице **Documents**. После загрузки документ получает статус `uploaded`, затем переходит в `processing`, а после успешной индексации становится доступен для поиска в RAG-чате.\n\nПоддерживаются PDF, DOCX, TXT и CSV.',
      sources: [
        {
          fileName: primaryDocument.fileName,
          snippet:
            'Каждый загруженный файл проходит обработку, разбиение на фрагменты и индексацию перед использованием в ответах.',
          section: 'File processing',
          relevance: 0.91,
        },
      ],
    };
  }

  return {
    answer:
      'Я нашел релевантную информацию в базе знаний и сформировал ответ на основе доступных документов.\n\nДля production-подключения этот вызов уже можно заменить реальным backend API: frontend ожидает `answer` и массив `sources` с названием файла, фрагментом, страницей или секцией и релевантностью.',
    sources: [
      {
        fileName: primaryDocument.fileName,
        snippet:
          primaryDocument.summary ||
          'Релевантный фрагмент из индексированного документа базы знаний.',
        page: primaryDocument.pages ? 1 : undefined,
        section: primaryDocument.category,
        relevance: 0.92,
      },
      {
        fileName: secondaryDocument.fileName,
        snippet:
          secondaryDocument.summary ||
          'Дополнительный фрагмент, который помогает проверить ответ.',
        page: secondaryDocument.pages ? 2 : undefined,
        section: secondaryDocument.category,
        relevance: 0.84,
      },
    ],
  };
}

export async function askKnowledgeBase(
  question: string,
  documents: KnowledgeDocument[] = mockDocuments,
): Promise<ApiAnswerResponse> {
  let response: BackendQueryResponse;

  try {
    response = await request<BackendQueryResponse>('/query/', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  } catch {
    return mockAnswer(question, documents);
  }

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

export function enrichSources(
  sources: ApiAnswerResponse['sources'],
  documents: KnowledgeDocument[] = mockDocuments,
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
