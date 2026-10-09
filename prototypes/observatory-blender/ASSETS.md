# Источники изображений — revision 2, 2026-10-09

Использован навык imagegen, встроенный инструмент генерации (не CLI/API). Изображения ниже — отдельные слои окружения; они не заменяют здание плоским рендером.

## Точные пользовательские исходники

- `assets/architecture-reference-v2.png` — неизменённая копия `C:/Users/Admin/Downloads/абс.png`. SHA256: `080F46FA3382EE08FDB9AD0ACF7151BE9F741B251715014359EBFC75DF7CD733`. Используется для проекционной текстуры на реальной геометрии шпилей и переднего остекления. Содержит нарисованные блики: это не физически пересчитываемое отражение.
- `assets/scene-reference-v2.png` — неизменённая копия `C:/Users/Admin/Downloads/абс2.png`. SHA256 исходника: `805DF6A48DA9013688D5D1372CC6154BDBF10CB6AFB8056EE9354C43F23F3ED0`. Открывается кнопкой «Эталон»; не подменяет сцену.

## Облачный слой

Сохранён в `assets/cloud-bank-v2.png`, с прозрачностью. Исходник генерации: `C:/Users/Admin/.codex/generated_images/01a10175-2ab7-7792-9e1b-eb180e7b0205/exec-e8db079f-998e-41be-ba23-bb696dc043c0.png`.

Вход: `абс2.png`, только стилистический эталон облаков. `transparent_background=true`.

Полный промпт:

> Use case: background-extraction / game VFX texture asset. Input image is a STYLE REFERENCE ONLY: extract the look of the photorealistic white cumulus clouds below the observatory. Create a single isolated wide fluffy white cloud bank on truly transparent background for compositing as a 3D game sprite. Broad horizontal cluster, detailed rounded cumulus lobes, three dimensional silver-white tops, pale lavender-blue shadowed bottoms, subtle warm champagne highlights from upper front left. Dense varied puffy cloud masses in center, graceful irregular wisps thinning out on left and right. All outside edges must fade naturally to transparent alpha. 3:2 wide canvas. Cloud cluster fills middle horizontal half of canvas with completely transparent margin all around. Very high detail, realistic cinematic volumetric light, NOT stylized cartoon or smoke. No buildings, spires, rings, beams, planets, stars, ground, horizon, sky, text, border, or other objects. Do not reproduce the scene. This is an isolated reusable cloud sprite asset only.

Это 18 экземпляров спрайта, отрисованных одним instanced-вызовом, а не полноценная объёмная симуляция.

## Космический фон

Сохранён в `assets/nebula-reference-v2.png`. Исходник генерации: `C:/Users/Admin/.codex/generated_images/01a10175-2ab7-7792-9e1b-eb180e7b0205/exec-ded8b42a-6d86-41d7-9b3d-2f37147796fd.png`.

Вход: `абс2.png`, цель редактирования — выделить фон. `transparent_background=false`.

Полный промпт:

> Use case: precise-object-edit. Input is the approved ASTRA scene. Produce ONLY the deep-space background plate for the actual interactive 3D scene, keeping the background's original colors and placement. Remove ALL architecture, bridge, clouds in foreground, planets, asteroids, red ring, vertical beam, all text, navigation and browser chrome. Fill removed areas naturally with the same deep navy-black starfield and nebula. Preserve a delicate blue-violet gaseous arc diagonally behind where the ring was, dense vivid pink-magenta nebula band across the right middle-lower area, faint cyan dust upper right, small sharply resolved stars with varied tiny scale. Dark black-blue negative space upper left. No objects or architectural silhouettes. Wide 16:9 landscape texture, cinematic sharp photographic interstellar detail, no gradients replacing fine structure, no UI, no central bright white light. This is a compositing background texture, not a new observatory design.

Результат сохраняет общую палитру, но не точное расположение каждого облака эталона. Это известное расхождение, а не подтверждённое совпадение.

## Остальные материалы

Три текстуры планет взяты из существующего `public/universe/`, не изменены. Кольцо и луч — процедурные шейдеры. Здание и мост — локально созданный Blender/GLB. Пользовательские анкеты, данные рождения и переписка не передавались генератору.
