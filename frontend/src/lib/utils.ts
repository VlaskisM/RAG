import { clsx, type ClassValue } from 'clsx';
import type { FileType } from '../types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(value?: string | null) {
  if (!value) {
    return 'дата неизвестна';
  }

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
  const labels: Record<string, string> = {
    pdf: 'PDF',
    docx: 'DOCX',
    xlsx: 'XLSX',
    txt: 'TXT',
    csv: 'CSV',
    md: 'MD',
    html: 'HTML',
  };

  return labels[type] ?? type.toUpperCase();
}

export function formatBytes(value?: number) {
  if (!value) {
    return 'n/a';
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
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
