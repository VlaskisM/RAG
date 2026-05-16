import { documents } from '../data/mockData';
import type { AnswerSource, ApiAnswerResponse } from '../types';
import { createId } from './utils';

const mockLatency = 650;

export async function askKnowledgeBase(question: string): Promise<ApiAnswerResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, mockLatency));

  const normalizedQuestion = question.toLowerCase();
  const hrDocument = documents.find((document) => document.fileName === 'HR_policy.pdf');
  const incidentDocument = documents.find(
    (document) => document.fileName === 'incident_response.md',
  );
  const financeDocument = documents.find(
    (document) => document.fileName === 'travel_expenses.xlsx',
  );

  if (normalizedQuestion.includes('инцидент') || normalizedQuestion.includes('sev')) {
    return {
      answer:
        'Для **SEV-2** инцидента нужно уведомить дежурного инженера, Incident Commander и владельца затронутого сервиса. Первое обновление в статус-канале публикуется в течение 15 минут, затем обновления выходят каждые 30 минут до стабилизации.\n\nПосле восстановления сервиса команда готовит краткий postmortem с причиной, влиянием и корректирующими действиями.',
      sources: [
        {
          fileName: 'incident_response.md',
          snippet:
            'SEV-2 требует назначения Incident Commander, уведомления владельца сервиса и регулярных обновлений статуса каждые 30 минут.',
          section: 'Escalation matrix',
          relevance: 0.95,
        },
      ],
    };
  }

  if (normalizedQuestion.includes('команд') || normalizedQuestion.includes('расход')) {
    return {
      answer:
        'Командировочные расходы оформляются через Finance Portal. Для компенсации нужны маршрут, чек или счет, цель поездки и центр затрат. Нестандартные расходы лучше согласовать до поездки, чтобы избежать ручного approval.',
      sources: [
        {
          fileName: 'travel_expenses.xlsx',
          snippet:
            'Заявка на компенсацию должна включать подтверждающий документ, цель поездки, маршрут и cost center подразделения.',
          section: 'Reimbursement rules',
          relevance: 0.9,
        },
      ],
    };
  }

  return {
    answer:
      'По текущей политике сотрудник может работать удаленно **до трех дней в неделю**. График должен быть согласован с руководителем команды и зафиксирован в HRIS.\n\nДля ролей с обязательным офисным присутствием действуют отдельные условия, поэтому финальное решение остается за руководителем подразделения.',
    sources: [
      {
        fileName: hrDocument?.fileName ?? 'HR_policy.pdf',
        snippet:
          'Сотрудник может работать удаленно до трех дней в неделю при согласовании с руководителем команды и фиксации графика в HRIS.',
        page: 4,
        relevance: 0.92,
      },
      {
        fileName: financeDocument?.fileName ?? 'travel_expenses.xlsx',
        snippet:
          'Расходы, связанные с обязательными офисными визитами, компенсируются согласно матрице командировочных лимитов.',
        section: 'Office visits',
        relevance: 0.74,
      },
      {
        fileName: incidentDocument?.fileName ?? 'incident_response.md',
        snippet:
          'Для критичных ролей график доступности должен учитывать участие в on-call ротации и поддержку инцидентов.',
        section: 'On-call availability',
        relevance: 0.68,
      },
    ],
  };
}

export function enrichSources(sources: ApiAnswerResponse['sources']): AnswerSource[] {
  return sources.map((source) => {
    const document = documents.find((item) => item.fileName === source.fileName);

    return {
      id: createId('source'),
      documentId: document?.id ?? createId('doc'),
      fileName: source.fileName,
      snippet: source.snippet,
      page: source.page,
      section: source.section,
      relevance: source.relevance,
    };
  });
}
