import type {
  AnswerSource,
  ChatMessage,
  KnowledgeDocument,
  QueryHistoryItem,
  UserProfile,
} from '../types';

export const currentUser: UserProfile = {
  name: 'Анна Морозова',
  email: 'anna.morozova@company.ru',
  role: 'Product Operations Lead',
  department: 'Operations',
};

export const documents: KnowledgeDocument[] = [
  {
    id: 'doc-hr-01',
    fileName: 'HR_policy.pdf',
    title: 'HR Policy 2026',
    type: 'pdf',
    category: 'HR',
    uploadedAt: '2026-04-22T09:00:00.000Z',
    pages: 18,
    owner: 'HR Team',
    summary: 'Правила отпусков, компенсаций, удаленной работы и внутренней мобильности.',
  },
  {
    id: 'doc-fin-02',
    fileName: 'travel_expenses.xlsx',
    title: 'Travel Expenses Matrix',
    type: 'xlsx',
    category: 'Finance',
    uploadedAt: '2026-03-12T12:30:00.000Z',
    owner: 'Finance Operations',
    summary: 'Лимиты командировочных расходов по регионам, ролям и типам поездок.',
  },
  {
    id: 'doc-eng-03',
    fileName: 'incident_response.md',
    title: 'Incident Response Playbook',
    type: 'md',
    category: 'Engineering',
    uploadedAt: '2026-05-03T14:10:00.000Z',
    owner: 'Platform Engineering',
    summary: 'Процесс классификации инцидентов, роли дежурных инженеров и шаблоны коммуникации.',
  },
  {
    id: 'doc-legal-04',
    fileName: 'nda_guidelines.docx',
    title: 'NDA Guidelines',
    type: 'docx',
    category: 'Legal',
    uploadedAt: '2026-01-27T08:45:00.000Z',
    pages: 9,
    owner: 'Legal',
    summary: 'Рекомендации по подписанию NDA с подрядчиками, клиентами и партнерами.',
  },
  {
    id: 'doc-sales-05',
    fileName: 'enterprise_pricing.html',
    title: 'Enterprise Pricing',
    type: 'html',
    category: 'Sales',
    uploadedAt: '2026-02-18T11:20:00.000Z',
    owner: 'Revenue Enablement',
    summary: 'Пакеты, скидки, правила согласования нестандартных коммерческих условий.',
  },
  {
    id: 'doc-ops-06',
    fileName: 'onboarding_checklist.pdf',
    title: 'Employee Onboarding Checklist',
    type: 'pdf',
    category: 'Operations',
    uploadedAt: '2026-05-08T10:15:00.000Z',
    pages: 12,
    owner: 'People Operations',
    summary: 'Пошаговый процесс подключения нового сотрудника к системам и внутренним сервисам.',
  },
];

export const initialSources: AnswerSource[] = [
  {
    id: 'source-1',
    documentId: 'doc-hr-01',
    fileName: 'HR_policy.pdf',
    snippet:
      'Сотрудник может работать удаленно до трех дней в неделю при согласовании с руководителем команды и фиксации графика в HRIS.',
    page: 4,
    relevance: 0.92,
  },
  {
    id: 'source-2',
    documentId: 'doc-ops-06',
    fileName: 'onboarding_checklist.pdf',
    snippet:
      'Для доступа к внутренним сервисам необходимо создать заявку в Service Desk не позднее первого рабочего дня сотрудника.',
    page: 7,
    relevance: 0.86,
  },
];

export const chatMessages: ChatMessage[] = [
  {
    id: 'message-1',
    role: 'assistant',
    createdAt: '2026-05-16T08:25:00.000Z',
    content:
      'Здравствуйте. Я помогу найти ответы в базе знаний компании и покажу документы, на которые опирается ответ.',
  },
  {
    id: 'message-2',
    role: 'user',
    createdAt: '2026-05-16T08:26:00.000Z',
    content: 'Сколько дней в неделю сотрудник может работать удаленно?',
  },
  {
    id: 'message-3',
    role: 'assistant',
    createdAt: '2026-05-16T08:26:08.000Z',
    content:
      'Сотрудник может работать удаленно **до трех дней в неделю**, если график согласован с руководителем и зафиксирован в HRIS.\n\nЕсли для роли требуется постоянное присутствие в офисе, условия могут отличаться и должны быть подтверждены руководителем подразделения.',
    sources: initialSources,
  },
];

export const queryHistory: QueryHistoryItem[] = [
  {
    id: 'history-1',
    question: 'Сколько дней можно работать удаленно?',
    createdAt: '2026-05-16T08:26:00.000Z',
    sourceCount: 2,
  },
  {
    id: 'history-2',
    question: 'Какие лимиты на командировку в Берлин?',
    createdAt: '2026-05-15T15:10:00.000Z',
    sourceCount: 1,
  },
  {
    id: 'history-3',
    question: 'Кого уведомлять при SEV-2 инциденте?',
    createdAt: '2026-05-14T19:42:00.000Z',
    sourceCount: 3,
  },
];

export const suggestedQuestions = [
  'Как оформить командировочные расходы?',
  'Что делать при SEV-2 инциденте?',
  'Какие документы нужны для NDA?',
  'Какой порядок онбординга нового сотрудника?',
];
