# Планетные текстуры 4K — 17 октября 2026

Основание: просьба владельца продолжить яркое оформление и придать поверхности более естественный характер, ориентируясь на материалы и свет качественной космической игры. Подготовлены новые карты Авроры, Велира, Нереи и Солиса; в публикацию также включена ранее подготовленная карта Истока. Камера, маршруты и оформление залов этой правкой не перестраиваются.

## Файлы и загрузка

| Мир | Файл в `public/universe/` | Размер | Объём |
| --- | --- | --- | --- |
| Исток | `origin-moon-detailed-v2-4096.webp` | 4096×2048 | 4 113 392 байт |
| Аврора | `aurora-detailed-v2-4096.webp` | 4096×2048 | 2 082 320 байт |
| Велир | `velir-detailed-v2-4096.webp` | 4096×2048 | 2 134 392 байт |
| Нерея | `nereya-detailed-v2-4096.webp` | 4096×2048 | 2 393 744 байт |
| Солис | `solis-detailed-v2-4096.webp` | 4096×2048 | 1 593 952 байт |

Начальные карты остаются видимыми, пока загружается детальная. 4K-карта запрашивается при выборе мира либо при приближении камеры; загрузки не повторяются после успешной замены. Исток ограничен 4K и на ПК, и на телефоне. Для его облегчённого первого вида и устройств с ограничением 2048 сохранена версия `origin-moon-detailed-v2-2048.webp`, полученная уменьшением новой карты. Пути проходят через `assetUrl`, включая развёртывание в `/astra/`.

Материал использует цветовые каналы самой карты как приблизительные маски отражения: вода/лёд и металлические участки реагируют по-разному. У Солиса карта также даёт слабое свечение огней. Это экономный художественный приём, а не отдельные измеренные PBR-карты шероховатости и металличности.

## Происхождение изображений

Использован встроенный `image_gen`, без нового API-ключа. Это сгенерированные вымышленные поверхности; они не являются фотографиями реальных планет. Приглушённый вариант Нереи, который владелец отклонил, не подключён.

Для четырёх новых карт отдельно перерисованы четыре сектора каждой поверхности. Выход каждого сектора — 1774×887, затем он размещён в области 2048×1024 со смягчением границ на исходной общей карте. Поэтому 4K обозначает размер готового атласа; это не заявление о нативном однокадровом 4K-выходе генератора. Новая мелкая детализация получена при перерисовке секторов, а не одним увеличением старой карты. Исток ранее собран из 16 секторов с последующим уменьшением до 4K. Исходные версии сохранены для сравнения и отката.

## Финальные промпты

Каждый промпт применён отдельно к секторам `0-0`, `0-1`, `1-0`, `1-1`; `{Q}` — координаты сектора. Изображение-цель — соответствующий участок карты. Для Авроры и Велира использована промежуточная перерисовка материалов с сохранением географии; для Нереи и Солиса — участки исходных утверждённых карт.

**Аврора**

> Use case: photorealistic-natural. Asset: quadrant {Q} of an equirectangular diffuse texture for a real-looking ocean planet. Edit target is the supplied exact image crop. Keep exact islands, coastlines, positions, top-down projection, green/teal/navy identity, and adjacent-edge content. Add convincing photographic satellite detail at smaller scale: individual forest canopy clusters, mineral shoreline transitions, submerged sand and reefs, natural deep-water texture. Physical plausibility is paramount: avoid illustrated brush marks, map outlines, cartoon saturation, graphic symbols, clouds, text, horizon or a sphere. Output a crisp 2:1 map tile.

**Велир**

> Use case: photorealistic-natural. Asset: quadrant {Q} of an equirectangular diffuse texture for a real-looking futuristic icy planet. Edit target is the supplied exact image crop. Preserve exact geography, city rings, route alignments, polar caps, blue/white/silver identity, top-down projection and edge continuity. Add physically convincing photographic microdetail: fine snow and crevasses, natural ocean texture, believable white ceramic and metallic architecture with subtle cast shadows and scale, not line-art. Avoid painted map strokes, cartoons, exaggerated glow, labels, clouds, horizon, sphere. Output a crisp 2:1 map tile.

**Нерея**

> Use case: photorealistic-natural. Asset: quadrant {Q} of Nereya equirectangular 3D planet surface. Edit THIS exact reference quadrant, keeping broad land shape, gear-city hub positions, route placements, rich bronze and deep emerald palette. Render it like expensive photoreal space-game environment art, not painted/cartoon. Surface is physically textured: aged brass, copper, patina, mineral rock, water reflections, tiny architectural machinery with realistic shadows. Keep vivid cinematic color and luminous amber accents, not dull desaturation. Fine detail must be genuinely resolved, not sharpened paint. Flat continuous top-down texture, 2:1, no globe, no labels, no sky.

**Солис**

> Use case: photorealistic-natural. Asset: quadrant {Q} of Solis equirectangular 3D planet surface. Edit THIS exact reference quadrant, preserving continent silhouettes, major network positions and hubs, vivid magenta and electric cyan on deep obsidian-purple. Render as expensive photoreal space-game orbital night imagery, not cartoon map art. Dark fractured rocky material, metallic cities at credible scale, thousands of tiny photometric lights, thin luminous transit lines with physically plausible falloff, restrained bloom. Keep vivid cinematic contrast but no flat vector lines, no diagram circles, no giant glowing symbols. Flat continuous top-down texture, 2:1, no sphere, no labels, no sky.

## Проверка

См. запись от 17 октября 2026 в `docs/VERIFICATION.md`. Проверка файла и успешная загрузка 4K не доказывают равенство графике коммерческих AAA-игр; визуальная приёмка владельцем остаётся самостоятельной оценкой.
