import { clsx, type ClassValue } from 'clsx';
import type { FileType } from '../types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function fileTypeLabel(type: FileType) {
  const labels: Record<FileType, string> = {
    pdf: 'PDF',
    docx: 'DOCX',
    xlsx: 'XLSX',
    md: 'MD',
    html: 'HTML',
  };

  return labels[type];
}

export function relevanceLabel(value?: number) {
  if (typeof value !== 'number') {
    return 'n/a';
  }

  return `${Math.round(value * 100)}%`;
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
