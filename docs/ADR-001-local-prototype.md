# ADR-001. Первый сквозной прототип

Дата: 2026-10-03. Этап P1. Основание: прямое «делай» владельца после обсуждения начала разработки.

## Решение

React + TypeScript + Vite; отдельные чистые модули наблюдений, доказательств и планирования. Локальный сайт на 127.0.0.1. Синтетический профиль и явная маркировка деморежима. Авторизация, база реальных клиентов, внешние ИИ, оплата, push и Swiss Ephemeris не подключаются в P1.

React выбран из кандидатного стека; отдельный backend пока не нужен для проверки переходов и одного синтетического сценария. PostgreSQL/FastAPI остаются кандидатами P2. Прототип не эмулирует защищённый сервер: браузерное состояние доступно владельцу вкладки.

Черновики и изменения демопрофиля сохраняются в sessionStorage только после явного согласия в демонстрационном баннере. До согласия — память вкладки, об этом видно сообщение. Тема — sessionStorage без содержимого анкет. Не используются внешние шрифты, аналитика, изображения, сервисы или сетевые вызовы ИИ. При отказе хранилища запись не объявляется сохранённой.

## Схема данных

DemoState(schemaVersion, subjectId, goal, weeklyMinutes, budget, observations, revisions, approvedPlan, drafts).

Observation(id, subjectId, eventDate, recordedAt, source, minutes, outcome, note, revision, retrospective).

EvidenceSummary(observationIds, recordedCount, doneCount, skippedCount, missingCount, spentMinutes, limitations, revision).

PlanCandidate(id, goal, constraints, items, totalMinutes, cost, basedOnRevision). PlanApproval сохраняет снимок кандидата. Исправления увеличивают revision; ранее утверждённый план явно становится устаревшим.

## Переходы

| Адрес                 | Страница                   | Родитель / основной переход |
| --------------------- | -------------------------- | --------------------------- |
| /today                | Сегодня                    | /today/check-in             |
| /today/check-in       | Короткая отметка           | /today                      |
| /route                | Маршрут и доступное время  | /route/setup, /route/report |
| /route/setup          | Цель и ограничения         | /route                      |
| /route/report         | Сохранённый план           | /route                      |
| /discoveries          | Сводка и журнал            | /discoveries/evidence       |
| /discoveries/evidence | Основания и ограничения    | /discoveries                |
| /profile              | Тема, демоданные и экспорт | /profile/privacy            |
| /profile/privacy      | Режим хранения             | /profile                    |

Back/Forward используют настоящую историю браузера. Короткие настройки открываются нативным dialog, длинные формы — отдельными страницами. Черновик не становится наблюдением без кнопки сохранения.

## Проверка

Чистые тесты: нулевое время/бюджет, пропуски, чужие evidence ID, ревизии, устаревание, идемпотентность. Браузер: сквозной путь, перезагрузка, история, диалог/клавиатура, мобильная ширина, тема, отказ хранилища. Доказательство безопасности production и проверки на физических устройствах не входят в результат P1.

Текущая документация библиотек: https://react.dev/learn/creating-a-react-app ; https://vite.dev/guide/ ; https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog . Проверены 2026-10-03.
