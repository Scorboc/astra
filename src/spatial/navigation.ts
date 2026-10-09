export const worldIds = ['garden', 'orbit', 'room'] as const;
export const sectionIds = ['today', 'route', 'discoveries', 'profile'] as const;
export type WorldId = (typeof worldIds)[number];
export type SectionId = (typeof sectionIds)[number];
export interface SpatialLocation { world: WorldId; section: SectionId | null }

export function parseLocation(hash: string): SpatialLocation {
  const [world, section] = hash.replace(/^#\/?/, '').split('/');
  return {
    world: worldIds.includes(world as WorldId) ? world as WorldId : 'garden',
    section: sectionIds.includes(section as SectionId) ? section as SectionId : null,
  };
}
export function locationHash(location: SpatialLocation): string {
  return `#${location.world}${location.section ? '/' + location.section : ''}`;
}
export function isTap(start: {x: number; y: number}, end: {x: number; y: number}): boolean {
  return Math.hypot(end.x - start.x, end.y - start.y) < 7;
}
export function smoothStep(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return t * t * (3 - 2 * t);
}

export const sections: Record<SectionId, { title: string; subtitle: string; description: string; href: string; action: string }> = {
  today: { title: 'Сегодня', subtitle: 'Маленькое действие. Настоящее открытие.', description: 'Найдите один привычный предмет и придумайте ему необычное применение. Это пример короткой пробы — результат можно записать в рабочем прототипе.', href: '/today/check-in', action: 'Перейти к отметке' },
  route: { title: 'Маршрут', subtitle: 'Не лестница успеха. Ваш собственный путь.', description: 'Выберите цель и доступное время. Здесь пространство становится картой: каждое направление — отдельный объект, к которому можно приблизиться.', href: '/route', action: 'Настроить маршрут' },
  discoveries: { title: 'Открытия', subtitle: 'Коллекция того, что вы попробовали.', description: 'Здесь будут ваши наблюдения и результаты. Предметы в этом 3D-прототипе демонстрационные: они не означают измеренные способности или личные достижения.', href: '/discoveries', action: 'Открыть журнал' },
  profile: { title: 'Профиль', subtitle: 'Место, которое становится вашим.', description: 'Личный уголок исследователя. В рабочем прототипе доступны настройки и управление вымышленными данными. Реальные анкеты здесь не используются.', href: '/profile', action: 'Перейти к настройкам' },
};
