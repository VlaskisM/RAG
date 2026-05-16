# Knowledge RAG Frontend

## Краткая концепция

Frontend спроектирован как рабочий SaaS-инструмент для сотрудников: в центре расположен чат с RAG-ответами, слева личный кабинет с профилем и историей запросов, справа база документов с поиском, фильтрами и подсветкой фрагмента, из которого был получен ответ.

Интерфейс поддерживает светлую и темную тему, markdown в ответах, loading/streaming-состояние, mock-данные и отдельный API-слой для дальнейшего подключения backend.

## UX-структура экранов

- Личный кабинет: профиль, роль, подразделение, история запросов, настройки, выход.
- Главный экран: чат, быстрые вопросы, поле ввода, markdown-ответы, состояние поиска по базе знаний.
- Документы: боковая панель со списком файлов, поиск, фильтры по категории и типу, дата загрузки, владелец и краткое описание.
- Источники ответа: карточки под каждым ответом с названием файла, фрагментом, страницей или секцией, релевантностью и действием открытия источника.

## Структура проекта

```txt
frontend/
  src/
    components/
      AccountPanel.tsx
      ChatComposer.tsx
      ChatMessage.tsx
      ChatPanel.tsx
      DocumentSidebar.tsx
      Header.tsx
      SourceCard.tsx
      ThemeToggle.tsx
      ui/IconButton.tsx
    data/mockData.ts
    hooks/useTheme.ts
    lib/api.ts
    lib/utils.ts
    types/index.ts
    App.tsx
    main.tsx
    index.css
  index.html
  package.json
  tailwind.config.ts
  vite.config.ts
```

## Основные компоненты

- `App.tsx` управляет состоянием чата, выбранным документом, темой и mock API.
- `ChatPanel.tsx` отвечает за ленту сообщений, быстрые вопросы и composer.
- `ChatMessage.tsx` рендерит user/assistant сообщения, markdown и блок источников.
- `SourceCard.tsx` показывает файл, релевантность, страницу/секцию и фрагмент.
- `DocumentSidebar.tsx` реализует поиск, фильтры и preview подсвеченного фрагмента.
- `AccountPanel.tsx` закрывает требования личного кабинета.
- `lib/api.ts` содержит mock-функцию `askKnowledgeBase` и нормализацию источников.

## Полный пример кода главного экрана

Главный экран собран в `src/App.tsx` из трех рабочих зон:

- `AccountPanel` для профиля, истории, настроек и выхода.
- `ChatPanel` для чата, streaming/loading-состояния, markdown-ответов и поля ввода.
- `DocumentSidebar` для списка документов, поиска, фильтров и подсветки источника.

Логика mock-запроса, нормализации источников и имитации streaming находится в `src/lib/api.ts` и `src/App.tsx`.

## Mock data

Mock-данные лежат в `src/data/mockData.ts`:

- `currentUser` - профиль сотрудника.
- `documents` - файлы базы знаний с типом, категорией, датой загрузки, владельцем и описанием.
- `chatMessages` - стартовая история чата.
- `initialSources` - примеры источников с фрагментами, страницами и релевантностью.
- `queryHistory` - история запросов для личного кабинета.
- `suggestedQuestions` - быстрые вопросы над чатом.

## API assumptions

Ожидаемый формат ответа backend:

```json
{
  "answer": "Текст ответа...",
  "sources": [
    {
      "fileName": "HR_policy.pdf",
      "snippet": "Фрагмент текста, откуда была взята информация...",
      "page": 4,
      "relevance": 0.92
    }
  ]
}
```

## Подключение к реальному API

Замените `askKnowledgeBase` в `src/lib/api.ts` на `fetch` к backend:

```ts
export async function askKnowledgeBase(question: string): Promise<ApiAnswerResponse> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/queries/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error('Failed to ask knowledge base');
  }

  return response.json();
}
```

Для настоящего streaming можно заменить mock-loading на `ReadableStream`/SSE:

- backend отправляет токены ответа через `text/event-stream`;
- frontend накапливает chunks и обновляет `content` у assistant-сообщения;
- источники лучше присылать финальным событием `sources`, когда генерация завершена.

## Запуск

```bash
npm install
npm run dev
```
