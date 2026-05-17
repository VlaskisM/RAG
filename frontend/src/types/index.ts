export type Role = 'user' | 'assistant';

export type FileType = 'pdf' | 'docx' | 'xlsx' | 'txt' | 'csv' | 'md' | 'html' | string;

export type DocumentCategory = string;

export type DocumentStatus = 'uploaded' | 'processing' | 'indexed' | 'failed';

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
  status?: DocumentStatus;
  size?: number;
  chunks?: number;
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
  streamingLabel?: string;
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

export interface NotificationSettings {
  emailDigest: boolean;
  sourceUpdates: boolean;
  failedUploads: boolean;
}

export type AppRoute =
  | '/login'
  | '/register'
  | '/dashboard'
  | '/chat'
  | '/documents'
  | '/settings';

export interface ChatSummary {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface StatsResponse {
  documents: number;
  queries: number;
  sourcesTotal: number;
  chats: number;
}

export interface UploadResult {
  message: string;
  book: string;
  chunks: number;
}

export interface AttachedCode {
  filename: string;
  content: string;
}

export interface CodeReviewResponse {
  review: string;
}
