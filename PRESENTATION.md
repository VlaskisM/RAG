# RAG-система — шпаргалка для презентации

> Цель этого документа: дать тебе на одну страницу полную картину системы — что, как и почему — чтобы ты мог ответить на любой вопрос экзаменатора/комиссии.

---

## 0. Если спросят «в одном предложении, что это?»

Это RAG-ассистент по PDF-учебнику программирования (TDD/DDD/архитектура): загружаешь PDF — система парсит его в чанки с сохранением структуры (часть → глава → раздел), индексирует в Elasticsearch (плотные векторы + BM25), на запрос делает гибридный поиск, переранжирует cross-encoder'ом и отдаёт LLM (Yandex GPT) только релевантные фрагменты для ответа со ссылками на источники.

---

## 1. Стек технологий

| Слой | Технология | Зачем |
|---|---|---|
| API | **FastAPI** + Uvicorn | async, авто-валидация Pydantic, OpenAPI бесплатно |
| Vector store | **Elasticsearch 9.4** | dense_vector (HNSW) + BM25 в одном движке |
| Реляционная БД | **PostgreSQL 16** (asyncpg + SQLAlchemy 2.0 async) | пользователи, чаты, история запросов |
| PDF → текст | **pymupdf4llm** | превращает PDF в Markdown с заголовками |
| LLM/Embeddings | **Yandex Foundation Models** (OpenAI-compatible API) | `yandexgpt`, `text-search-doc`, `text-search-query` |
| Reranker | **BAAI/bge-reranker-v2-m3** (sentence-transformers CrossEncoder) | улучшение точности top-K |
| Auth | **JWT** (HS256) + **bcrypt** | стандарт |
| Frontend | React + Vite + Tailwind | отдельный SPA, ходит в API через CORS |

---

## 2. Что происходит при загрузке PDF (Ingestion pipeline)

```
PDF → DocumentConversionService → ChunkerService → EmbeddingService → ElasticsearchVectorStore
```

### 2.1. PDF → Markdown — `document_conversion_service.py`
- `pymupdf.open(stream=...)` читает PDF из памяти
- `pymupdf4llm.to_markdown(doc)` отдаёт Markdown с `#`, `##`, кодом в ```fences```, таблицами и т.д.
- Запускается в `asyncio.to_thread`, чтобы не блокировать event loop.

### 2.2. Markdown → чанки — `chunker_service.py` (это самая нетривиальная часть)

Четыре стадии:

**(a) Парсинг (`_parse_blocks`)**  
Делим markdown на блоки по пустым строкам. Кодовые fences ```...``` сохраняются целыми.

**(b) Классификация (`_classify`)**  
Регулярки определяют тип блока:
- `PART` — «## **ЧАСТЬ I**»
- `CHAPTER` — «## ГЛАВА 1» или «# Заголовок» или «Глава 4. ...»
- `SECTION` — другие `##/###` или «Выводы», «Эпилог», «Приложение А.»
- `CODE` — ```python ... ```
- `TABLE` — markdown-таблицы `|...|`
- `DEFINITION` — «Определение:»
- `EXAMPLE` — «Листинг 1.2», «Пример 3.1»
- `NOTE` — «Примечание:»
- `IMAGE` — изображения и «колонтитулы» вида «Глава 1. Название **33**» → **выбрасываются**
- `TEXT` — всё остальное

**(c) Слияние двойных заголовков (`_merge_split_headings`)**  
pymupdf4llm иногда бьёт заголовок главы на два блока:
```
## ГЛАВА 1
## **Доменное моделирование**
```
Сливаем их в `1. Доменное моделирование`.

**(d) Сборка чанков (`_build_chunks`)** — главные правила:
- Текущие `part_title / chapter_title / section_title` запоминаются — каждый чанк получает префикс `[Часть → Глава → Раздел]\n\n...`
- `TEXT`-блоки накапливаются, пока `len(text)//4 < MAX_TOKENS_CHUNK` (800)
- `CODE` — всегда отдельный чанк (не режется!)
- `EXAMPLE` (листинг) + следующий за ним `CODE` склеиваются — листинг с подписью
- `DEFINITION`, `NOTE`, `TABLE` — каждый отдельным чанком (атомарные)
- **Overlap** для TEXT-чанков: последние `CHUNK_OVERLAP * 4 = 200` символов предыдущего текстового чанка добавляются в начало следующего (continuity)
- Сбрасывается на любом заголовке (Part/Chapter/Section)

**`chunk_id`** — `sha1(book | author | part | chapter | section | listing | text)` → идемпотентность: повторная загрузка того же PDF не создаёт дублей.

### 2.3. Эмбеддинги — `embeding_service.py`
- Используется **асимметричная модель Яндекса**: документы эмбеддятся `text-search-doc`, запросы — `text-search-query`. Это важная фишка: модели натренированы как «пара» под retrieval, поэтому пара (doc, query) ближе в латентном пространстве, чем при использовании одной модели.
- Размерность вектора: **256**.
- Параллелизм ограничен `asyncio.Semaphore(EMBEDDING_CONCURRENCY=1)` — Yandex API имеет rate-limits, поэтому идём последовательно. **Это бутылочное горлышко при индексации**.

### 2.4. Сохранение в Elasticsearch — `vectorstore.py`
- Маппинг индекса `rag_chunks`:
  - `text` — `text`, анализатор `russian` (стемминг + стоп-слова)
  - `embedding` — `dense_vector` dims=256, `index=true`, `similarity=cosine` (под HNSW)
  - `book/author/block_type/language/listing_number` — `keyword` (для фильтрации/агрегаций)
  - `part_title/chapter_title/section_title` — `text` с русским анализатором
  - `page` — `integer` (зарезервировано, но не заполняется — см. «известные ограничения»)
- `async_bulk` пишет пачкой; на ошибках бросает исключение.

---

## 3. Что происходит при вопросе (Query pipeline)

```
question → EmbeddingService → ElasticsearchVectorStore.search (hybrid)
        → RerankerService → top_k → ask_prompt → LLMService → answer + sources
```

Это `QueryService.ask()` в `query_service.py:29`. Все стадии замеряются в логе.

### 3.1. Эмбеддинг запроса
Одиночный вызов `text-search-query`. Возвращает вектор 256-d.

### 3.2. Гибридный поиск — `vectorstore.py:299`
Два параллельных запроса в ES (`asyncio.gather`):

**Dense (kNN):**
```json
{ "knn": { "field": "embedding", "query_vector": [...],
           "k": 40, "num_candidates": 300 } }
```
`num_candidates=300` — сколько кандидатов смотрит HNSW, `k=40` — сколько вернёт. Больше `num_candidates` = выше recall, но медленнее.

**Sparse (BM25):**
```json
{ "multi_match": { "query": "...",
                   "fields": ["text^3", "chapter_title^2",
                              "section_title^2", "book", "author"] } }
```
Boost'ы `^3/^2` — текст важнее заголовков, заголовки важнее метаданных.

**Слияние — взвешенное min-max:**
1. Берём raw-скоры с двух каналов
2. min-max нормализация каждого канала независимо в `[0, 1]`
3. `final = 0.7 * dense_norm + 0.3 * sparse_norm` (`HYBRID_DENSE_WEIGHT=0.7`)
4. Сортируем, берём top `RETRIEVAL_K=40`

### 3.3. Реранкинг — `reranker_service.py`
- Модель **BAAI/bge-reranker-v2-m3** (cross-encoder, многоязычный)
- Принципиальное отличие от bi-encoder (embeddings): cross-encoder получает пару `(query, chunk)` вместе и считает релевантность одним проходом трансформера → **гораздо точнее**, но дорого (нельзя предсчитать). Поэтому реранкер ставится **после** дешёвого retrieval'а.
- На вход 40 кандидатов, batch_size=16, `predict` бежит на CPU
- Запускается через `asyncio.to_thread` (модель синхронная)
- Возвращает чанки, отсортированные по новому скору

### 3.4. Топ-K → LLM
- Берём `chunks[:TOP_K]` = 5 чанков
- Склеиваем в контекст: `[1] ... \n\n [2] ... \n\n [3] ...`
- Промпт (`promts/prompt_ask.py`) — system-message:
  - роль: «ассистент по книге о паттернах разработки на Python»
  - правила: отвечать ТОЛЬКО по контексту, цитировать код как есть, при отсутствии — «В предоставленных фрагментах книги эта информация отсутствует.»
  - `temperature=0` — детерминированный режим
- Yandex GPT возвращает ответ строкой
- Эндпоинт возвращает `{answer, sources[]}`, где sources — те же 5 чанков с метаданными для UI (book/author/part/chapter/section/score).

---

## 4. Архитектура слоя API (FastAPI)

- **`main.py`** — `lifespan` создаёт все сервисы один раз при старте и кладёт их в `app.state`. Шифруемое подключение к ES и OpenAI-клиент создаются здесь же.
- **Роутеры** (`routes/`):
  - `auth.py` — `/auth/register`, `/auth/login`, `/auth/me`
  - `queries.py` — `/query/` (одиночный вопрос, пишет в `QueryHistory`)
  - `chats.py` — `/chats/...` CRUD чатов + `/chats/{id}/ask` (вопрос в чате, сохраняет user/assistant сообщения)
  - `data_loading.py` — `/data-loading/` (POST multipart PDF)
  - `documents.py` — `/documents/` (список книг через ES-агрегацию)
  - `profile.py` — `/profile/me`, `/profile/settings`, `/profile/history`, `/profile/stats`
- **Auth** — `OAuth2PasswordBearer` + `get_current_user` зависимость; JWT хранит только `sub=user_id` и `exp` (по умолчанию 720 часов = 30 дней).
- **Пароли** — bcrypt с дефолтной cost (генерируется при каждой регистрации).

### Схема БД (PostgreSQL)
- `users` — id, name, email (unique), password_hash, role, department, avatar, timestamps
- `user_settings` — 1:1 с user (theme/language/show_relevance/save_history)
- `query_history` — id, user_id, question, answer, source_count, created_at
- `chats` — id, user_id, title
- `chat_messages` — id, chat_id, role (user|assistant), content, sources_json (JSON-строка с метаданными), created_at

---

## 5. Ключевые параметры (`.env`)

| Параметр | Значение | Смысл |
|---|---|---|
| `EMBEDDING_DIM` | 256 | размерность векторов |
| `MAX_TOKENS_CHUNK` | 800 | целевой размер TEXT-чанка (по `len/4`) |
| `CHUNK_OVERLAP` | 50 | overlap в «токенах» (≈200 символов) |
| `TOP_K` | 5 | сколько чанков попадает в промпт LLM |
| `RETRIEVAL_K` | 40 | сколько чанков остаётся после слияния и идёт в reranker |
| `DENSE_K` / `SPARSE_K` | 40 / 40 | сколько берём с каждого канала |
| `NUM_CANDIDATES` | 300 | ANN-кандидаты HNSW (recall vs latency) |
| `HYBRID_DENSE_WEIGHT` | 0.7 | вес dense в финальной сумме |
| `EMBEDDING_CONCURRENCY` | 1 | параллелизм при индексации |
| `ENABLE_RERANKER` | true | переключатель |
| `RERANKER_BATCH_SIZE` | 16 | batch для cross-encoder |
| `JWT_EXPIRE_HOURS` | 720 | срок жизни токена |

---

## 6. Почему именно так? (вопросы «почему X, а не Y»)

**Q: Почему Elasticsearch, а не отдельная векторная БД (Qdrant/Weaviate/Pinecone)?**  
A: ES даёт BM25 и vector-search в одном движке → не нужно поднимать вторую БД и синхронизировать индексы. dense_vector с HNSW в ES 8/9 уже на уровне специализированных решений по скорости для наших объёмов. Плюс — русский analyzer из коробки.

**Q: Почему гибридный поиск, а не только embeddings?**  
A: Embeddings промахиваются на редких терминах, аббревиатурах, именах классов, точных названиях паттернов. BM25 ловит лексику дословно. Вместе они закрывают слабые места друг друга. Эмпирически в RAG hybrid стабильно даёт +5–15% recall@k.

**Q: Почему min-max + взвешенное среднее, а не RRF?**  
A: RRF (Reciprocal Rank Fusion) — альтернатива, оперирует рангами, без подбора весов. Min-max с весом 0.7/0.3 даёт больше контроля: знаем, что в нашем домене dense-канал точнее, и хотим явно его усилить. Это решение можно поменять — интерфейс `_weighted_fuse` локализует его в одном месте.

**Q: Почему reranker нужен, если уже есть hybrid?**  
A: bi-encoder (embedding) считает близость независимо для query и chunk → схватывает «тему», но не точное соответствие. Cross-encoder читает (query, chunk) совместно — понимает, отвечает ли фрагмент именно на этот вопрос. На 5–10% выше precision@k за счёт ~50–200 мс CPU.

**Q: Почему чанкуем по структуре, а не по фиксированному размеру (например, 512 токенов с overlap 50)?**  
A: Учебник — структурированный текст: главы, разделы, листинги. Чанк, разорванный посреди определения или листинга кода, теряет смысл. Структурное чанкование сохраняет атомарные единицы знания целиком, и каждый чанк получает контекстный префикс `[Часть → Глава → Раздел]` — это даёт LLM понять, к чему относится фрагмент.

**Q: Почему overlap только для TEXT?**  
A: Код, таблицы, определения — атомарны, их незачем перекрывать. Связный текст — наоборот, чтобы мысль на границе чанка не терялась, добавляем хвост предыдущего.

**Q: Почему асимметричные модели эмбеддингов (doc vs query)?**  
A: Запросы и документы стилистически разные: запрос короткий и вопросительный, документ — повествовательный и длинный. Асимметричные модели тренируются парами, чтобы запрос «как работает Unit of Work» был близок к параграфу-объяснению, а не к другому короткому вопросу. Yandex (как и OpenAI text-embedding-3) даёт две отдельные модели именно для этого.

**Q: Почему temperature=0?**  
A: Воспроизводимость + меньше галлюцинаций. Для QA по документам креативность не нужна.

**Q: Зачем JWT, а не сессии?**  
A: Stateless — нет таблицы сессий, нет похода в БД при каждом запросе для проверки авторизации. SPA + API живут на разных доменах — токен в `Authorization: Bearer` проще, чем cookies + CSRF.

**Q: Почему PostgreSQL, если есть ES?**  
A: Реляционные данные (пользователи, чаты, history) — это транзакции, FK, ACID. ES для этого не подходит. Разделение: ES — для поиска, PG — для состояния.

**Q: Почему ABC-интерфейсы для каждого сервиса?**  
A: Подменяемость в тестах (можно подсунуть `FakeEmbeddingService`), явный контракт. Зависимости передаются через конструкторы — классический DI.

---

## 7. Что можно улучшить (если спросят про слабые места — отвечай честно, это плюс)

### Архитектурные
1. **Чаты не имеют истории в LLM.** `/chats/{id}/ask` каждый раз шлёт только текущий вопрос — предыдущие сообщения не учитываются. Это превращает чат в «список независимых вопросов с общей UI-лентой». Фикс: подмешивать последние N сообщений в промпт, или делать query rewriting (LLM перефразирует вопрос с учётом контекста).
2. **Поле `page` не заполняется.** В маппинге ES оно есть, в `RetrievedChunk` тоже, но `ChunkerService` его не извлекает из pymupdf4llm. На фронте «страница не показывается». Фикс: pymupdf4llm умеет отдавать страницы — нужно при парсинге сохранять номер.
3. **Нет удаления документов.** Загрузил PDF — удалить нельзя. Фикс: эндпоинт `DELETE /documents/{book}` → `_es.delete_by_query({"term": {"book": ...}})`.
4. **Нет фильтрации поиска по метаданным.** Можно было бы давать пользователю выбирать «искать только в книге X / главе Y» — все нужные поля уже `keyword` в индексе.
5. **Нет query rewriting / HyDE.** На коротких или плохо сформулированных вопросах retrieval промахивается. HyDE: LLM сначала генерирует «гипотетический ответ», его эмбеддят и им ищут — улучшает recall.

### Производительность
6. **`EMBEDDING_CONCURRENCY=1`** — индексация книги на 500 чанков занимает ~500 × latency Yandex (минуты). Если API позволяет — повысить до 4–8.
7. **Нет batching эмбеддингов.** Каждый чанк = отдельный HTTP-запрос. Yandex embeddings API поддерживает массивы — за один запрос можно эмбеддить пачку. Сократит и latency, и cost.
8. **Reranker на CPU.** На GPU bge-reranker-v2-m3 быстрее в 10–30 раз. Альтернатива — реранкить меньше кандидатов (например, 20 вместо 40).
9. **Нет стриминга ответа.** Пользователь ждёт всю генерацию. Yandex API стриминг поддерживает (как и OpenAI) — можно отдавать SSE и показывать ответ по токенам.
10. **Reranker грузится синхронно на старте.** Cold start у API заметный.

### Качество ответов
11. **Нет цитирования с привязкой к источнику в самом ответе.** Промпт даёт `[1] [2] [3]`, но просит просто отвечать. Стоило бы заставить модель ставить маркеры `[1]` в тексте, чтобы UI подсветил, какой фрагмент использован для какого утверждения.
12. **Чанки могут дублироваться по содержанию** (например, определение и его повтор в обзорной главе). Можно делать near-dedup перед индексацией.
13. **Single-language assumption** — анализатор русский, промпт русский. Если книга на английском — recall просядет.

### Безопасность и эксплуатация
14. **`xpack.security.enabled=false`** в docker-compose ES — норм для dev, нельзя в prod.
15. **JWT secret в `.env`**, фиксированный. Нет ротации.
16. **Нет rate limiting** — любой пользователь может задать 1000 вопросов и съесть весь Yandex-квоту.
17. **Нет тестов.** Ни unit, ни интеграционных.
18. **Нет метрик/трейсинга.** Сейчас — только логи. Стоило бы Prometheus + хотя бы счётчики латентности по стадиям (логи в `query_service.ask` уже посчитаны — можно экспортнуть).
19. **В `schemas.py:52` оставлен мусорный комментарий `# Хуй`** — почистить перед демо!
20. **Yandex client без таймаута и retry** — при сетевой ошибке ничего не повторяется.

### Чанкер
21. **Хрупкие регулярки.** Если издатель учебника использует другую разметку («Раздел 1.1» вместо «Глава 1»), классификация сломается. Фикс: pluggable стратегии чанкования или обучить лёгкий классификатор на блоки.
22. **`_token_estimate = len/4`** — грубо. Для русского ближе к `/3`. Можно подключить tiktoken/transformers tokenizer.

---

## 8. Метрики, которые имеет смысл показать

В логе после каждого запроса:
```
embed_ms=... search_ms=... rerank_ms=... llm_ms=... total_ms=...
retrieved=40 reranked=40 final=5
```

Типичные значения (примерно):
- `embed_ms` — 100–300 мс (один запрос к Yandex)
- `search_ms` — 20–100 мс (ES локально)
- `rerank_ms` — 200–800 мс (CPU, 40 пар)
- `llm_ms` — 1–3 с (Yandex GPT generation)
- **total** — около 2–5 секунд на вопрос

---

## 9. Демо-сценарий (если попросят показать)

1. **Поднять инфру:** `docker-compose up -d` в `rag_system/` → PG на 5433, ES на 9200.
2. **Запустить API:** `python rag_system/src/run.py` → :8000, авто-reload.
3. **Поднять фронт:** `cd frontend && npm run dev` → :5173.
4. Открыть :5173, зарегистрироваться (`/auth/register`), залогиниться.
5. Загрузить PDF учебника через UI → вызывает `POST /data-loading/`. В логах — стадии ingestion.
6. Задать вопрос («Что такое Unit of Work?») → в логах метрики по стадиям, в UI ответ + блок «Sources» с фрагментами.
7. Создать чат, задать несколько вопросов → история сохраняется в PG (`/chats/{id}/messages`).

---

## 10. Возможные каверзные вопросы и заготовленные ответы

**«А что если в книге нет ответа?»**  
Промпт жёстко требует: «В предоставленных фрагментах книги эта информация отсутствует.» — temperature=0 практически гарантирует именно этот ответ. Это сделано против галлюцинаций.

**«А что если вопрос на английском?»**  
Reranker bge-reranker-v2-m3 многоязычный — отработает. Yandex embeddings и GPT — преимущественно русские, но мультиязычные тоже. Анализатор ES — `russian`, на английском будет хуже стемминг.

**«Сколько чанков выдержит система?»**  
Elasticsearch с HNSW спокойно держит миллионы dense_vector. Bottleneck — индексация (см. EMBEDDING_CONCURRENCY).

**«Что такое HNSW?»**  
Hierarchical Navigable Small World — алгоритм Approximate Nearest Neighbor. Многоуровневый граф, поиск спускается по уровням. `num_candidates=300` — ширина beam-search на нижнем уровне. ANN ≠ точный поиск, но погрешность пренебрежимая при правильных параметрах.

**«Почему 256 dim?»**  
Это размерность модели Яндекса `text-search-doc`. Не выбирали — она задана. На больших корпусах 256 хватает; 1024–1536 (OpenAI) даёт небольшой прирост ценой 4× места.

**«Что будет, если ES упадёт?»**  
`/query/` вернёт 500. Auth-эндпоинты продолжат работать (они на PG). Lifespan не падает — индекс создаётся «ensure» (если нет — создаст; если есть — пропустит).

**«Можно ли расширить на другие домены?»**  
Да. Промпт в `prompt_ask.py` — единственное место, прибитое к книге. Регулярки в чанкере заточены под русскую книгу с «Часть/Глава» — на другом домене (статьи, договоры) их надо переписать. Всё остальное доменно-независимо.

**«А если LLM начнёт врать?»**  
Защита трёхуровневая: (1) промпт жёстко привязывает к контексту, (2) `temperature=0`, (3) фронт показывает sources — пользователь видит, откуда взят ответ, и может проверить.

**«Где CoT / function calling / агенты?»**  
Не нужно. Задача — Q&A по фиксированному корпусу, одношаговый retrieve→generate. Усложнение архитектуры под несуществующую задачу — overengineering.

---

## 11. Файлы по которым тебя могут спросить

| Файл | За что отвечает |
|---|---|
| [rag_system/src/main.py](rag_system/src/main.py) | bootstrap, DI, lifespan |
| [rag_system/src/config.py](rag_system/src/config.py) | pydantic-settings, читает `.env` |
| [rag_system/src/vectorstore.py](rag_system/src/vectorstore.py) | ES: маппинг индекса, hybrid search, слияние |
| [rag_system/src/services/query_service.py](rag_system/src/services/query_service.py) | оркестрация запроса (embed → search → rerank → LLM) |
| [rag_system/src/services/chunker_service.py](rag_system/src/services/chunker_service.py) | парсинг markdown, классификация блоков, сборка чанков |
| [rag_system/src/services/embeding_service.py](rag_system/src/services/embeding_service.py) | вызовы Yandex embeddings (doc/query) |
| [rag_system/src/services/reranker_service.py](rag_system/src/services/reranker_service.py) | cross-encoder rerank |
| [rag_system/src/services/llm_service.py](rag_system/src/services/llm_service.py) | вызов Yandex GPT |
| [rag_system/src/services/document_conversion_service.py](rag_system/src/services/document_conversion_service.py) | PDF → markdown через pymupdf4llm |
| [rag_system/src/services/data_loading_service.py](rag_system/src/services/data_loading_service.py) | оркестрация ingestion |
| [rag_system/src/promts/prompt_ask.py](rag_system/src/promts/prompt_ask.py) | system-prompt |
| [rag_system/src/schemas.py](rag_system/src/schemas.py) | Pydantic-модели чанков |
| [rag_system/src/models.py](rag_system/src/models.py) | ORM (User, Chat, ChatMessage, QueryHistory) |
| [rag_system/src/auth.py](rag_system/src/auth.py) | JWT, bcrypt, get_current_user |

---

## 12. Одно-предложенческие ответы на стандартные вопросы

- **«Что такое RAG?»** — Retrieval-Augmented Generation: вместо того чтобы тренировать модель на наших данных, мы ищем релевантные фрагменты в момент запроса и подкладываем их в контекст LLM.
- **«Чем лучше fine-tuning?»** — Не требует переобучения при обновлении корпуса (загрузил PDF — система уже знает), даёт source-attribution, дешевле, легче дебажить.
- **«Зачем reranker, если есть embeddings?»** — bi-encoder быстрый, но грубый; cross-encoder точный, но дорогой → дешёвый отбирает кандидатов, дорогой их сортирует.
- **«Какой основной риск RAG?»** — Галлюцинации, если retrieval промахнулся, и LLM «дофантазирует» вместо честного «не знаю». Защита — жёсткий промпт + temperature=0 + видимые источники.
