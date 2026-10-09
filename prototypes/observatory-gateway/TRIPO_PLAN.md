# Обсерватория из утверждённого референса — подготовка Tripo

Дата: 2026-10-09. Генерация модели ещё не запускалась. Основной сайт не изменялся.

## Подготовленный исходник

`design/observatory-options-2026-10-09/11-tripo-architecture-reference.png` — отдельное здание, две острые башни, общее основание и короткий мост. Изображение подготовлено встроенным imagegen по утверждённому `10-ice-metal-ring-in-galaxy.png`. Это 2D-референс для 3D-реконструкции, не результат Tripo.

Планеты, кольцо, луч и облака не должны становиться частью меша. После получения архитектуры они остаются самостоятельными объектами и эффектами в PlayCanvas. Материалы стекла и льда настраиваются в движке, структура модели и её геометрия проверяются перед подключением.

## Один платный шаг

1. `POST /v3/generation/image-to-model` — CLI `tripo-v3.1`, API `v3.1-20260211`; исходник выше; `face_limit=20000`, `smart_low_poly=true`, `texture=true`, `pbr=true`, `texture_quality=detailed`, `orientation=align_image`. Ожидаемые результаты: GLB, preview.png, task.json в `prototypes/observatory-gateway/assets/tripo-out/`.

Оценка: 30 кредитов за image-to-model с текстурой + 10 за smart_low_poly + 10 за detailed texture = **50 кредитов**. Дополнительная платная конвертация не нужна. Фактическую сумму следует взять из завершённой задачи; неудачные и отменённые задачи по правилам Tripo не оплачиваются.

Проверка CLI: `dry_run.valid=true`, `errors=[]`, `warnings=[]`. Авторизация и доступ к API подтверждены. Баланс API на момент проверки: **0**, заморожено 0. Локальная история задач пуста. До пополнения и подтверждения согласованного плана генерация не запускалась.

После генерации: проверить preview, размер GLB, геометрию и пропорции; подключить модель только в отдельный прототип; настроить отражения, стекло и свет; сверить реальный кадр с утверждённым изображением. Проверить производительность и управление; не называть результат 1:1 до визуального сравнения.

## Промпт исходника (встроенный imagegen)

Use case: precise-object-edit / 3D asset reference extraction. Input image is the APPROVED architecture reference. Create ONE clean high-resolution studio reference image for image-to-3D reconstruction of EXACTLY its architectural observatory. Preserve the actual silhouette and proportions: two extremely tall razor-sharp tapering faceted ice-and-dark-polished-titanium towers at left and right, each roughly three times the height of the central building; broad low grand glass observatory conservatory pavilion centered between them, multiple layered glass domes, fine structural bronze/titanium ribs and tall glazed windows, central arched doorway, restrained warm interior light, one raised common narrow foundation connecting both towers and pavilion, short straight approach bridge projecting forward. Keep the tower design with irregular triangular metal panels cutting through luminous crystalline ice faces, not smooth cones. Keep the building and bridge recognizable from the reference, no redesigned castle, no extra towers. REMOVE all planets, galaxy, clouds, energy ring, green beam, stars, asteroids, website text and interface. Plain uniform medium gray studio background and even studio lighting, minimal cast shadow. Show the entire architectural asset including tips and full foundation, centered, nearly frontal but very slightly elevated to make its footprint legible; generous margins, no cropping. Material appearance: pale icy blue glass, dark mirrored titanium, silver edges, subtle warm gold structural accents. No neon emission in towers, no magical effects. This is a production reference, not a website illustration. Crisp photorealistic premium architecture, clear separable parts, no text, no watermark.
