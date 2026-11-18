import catalog from '../data/professions/forever-us.json';

export interface ProfessionIconEntry {
  id: number;
  name: string;
  icon?: string;
  iconSource?: string;
}

const professions = (catalog as { professions: ProfessionIconEntry[] }).professions ?? [];
const byId = new Map(professions.map((p) => [p.id, p]));

export const PROFESSION_ICON_SOURCE = {
  fetchedAt: (catalog as { fetchedAt?: string }).fetchedAt,
  namespace: (catalog as { namespace?: string }).namespace,
  source: (catalog as { source?: string }).source,
};

export function professionIcon(id?: number, name?: string): string | undefined {
  if (id != null && byId.get(id)?.icon) return byId.get(id)?.icon;
  if (name) {
    const match = professions.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (match?.icon) return match.icon;
  }
  return undefined;
}
