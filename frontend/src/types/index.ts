export type Role = 'user' | 'assistant';

export type FileType = 'pdf' | 'docx' | 'xlsx' | 'md' | 'html';

export type DocumentCategory =
  | 'HR'
  | 'Finance'
  | 'Legal'
  | 'Engineering'
  | 'Sales'
  | 'Operations';

export interface KnowledgeDocument {
  id: string;
  fileName: string;
  title: string;
  type: FileType;
  category: DocumentCategory;
  uploadedAt: string;
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
  createdAt: string;
  sourceCount: number;
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  department: string;
  avatarUrl?: string;
}
