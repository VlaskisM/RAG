export type Role = 'user' | 'assistant';

export type FileType = 'pdf' | 'docx' | 'xlsx' | 'md' | 'html' | string;

export type DocumentCategory = string;

export interface KnowledgeDocument {
  id: string;
  fileName: string;
  title: string;
  type: FileType;
  category: DocumentCategory;
  uploadedAt?: string | null;
  pages?: number;
  owner: string;
  summary: string;
}

export interface AnswerSource {
  id: string;
  documentId: string;
  fileName: string;
  snippet: string;
  page?: number;
  section?: string;
  relevance?: number;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  sources?: AnswerSource[];
  isStreaming?: boolean;
}

export interface ApiAnswerResponse {
  answer: string;
  sources: Array<{
    fileName: string;
    snippet: string;
    page?: number;
    section?: string;
    relevance?: number;
  }>;
}

export interface QueryHistoryItem {
  id: string;
  question: string;
  answer?: string;
  createdAt: string;
  sourceCount: number;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  showRelevance: boolean;
  saveHistory: boolean;
}

export interface UserProfile {
  id?: number;
  name: string;
  email: string;
  role: string;
  department: string;
  avatarUrl?: string;
  settings?: UserSettings;
}
