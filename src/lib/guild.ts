// Game-agnostic guild template: per-game config, calendar events, and group plans.
// Data lives in src/data/guild/{game}/ (config.json, events.json, plans/*.json,
// optional blizzard-media.json). Add a folder to add a game; pages pick it up.

import { memberSlug, visibleMembers, wowCharacterSlug, wowCharacters } from '../data/members';
import { characterDisplayName, loadSnapshot, wowHref } from './characters';

export interface GuildRole { id: string; label: string; color: string; icon: 'shield' | 'cross' | 'sword' | string }
export interface GuildClass { id: string; name: string; color: string; blizzardId?: number }
export interface GuildEventType { id: string; label: string; color: string }
/** Optional map art. image is a path under /public; credit + license are shown under the map and listed in CREDITS.md. */
export interface GuildMap { image: string; credit: string; license: string; aspect?: number }
export interface GuildBoss { id: string; name: string; wing?: string; optional?: boolean; map?: GuildMap }
export interface GuildInstance {
  id: string;
  name: string;
  type: 'dungeon' | 'raid' | string;
  /** live = in the game now (or opening on a set date); upcoming = announced, details TBA. */
  status: 'live' | 'upcoming';
  /** New to WoW: Forever (not in Classic). */
  new?: boolean;
  level?: string;
  size?: number;
  location?: string;
  /** Opening date (YYYY-MM-DD) for live content that is not open yet. */
  opens?: string;
  /** Roadmap window for upcoming content, e.g. "Spring 2027". */
  when?: string;
  note?: string;
  /** Retail journal name used only to fetch banner art for classic instances. */
  journalName?: string;
  /** Default map for every boss in the instance (a boss map overrides it). */
  map?: GuildMap;
  bosses: GuildBoss[];
  sources?: string[];
}
export interface GuildConfig {
  slug: string;
  gameSlug: string;
  name: string;
  shortName: string;
  guildName: string | null;
  rosterSource: 'wowForever' | 'none' | string;
  roles: GuildRole[];
  classes: GuildClass[];
  eventTypes: GuildEventType[];
  instances: GuildInstance[];
}
export interface GuildEvent {
  id: string;
  example?: boolean;
  title: string;
  type: string;
  start: string;
  end?: string;
  instance?: string;
  plan?: string;
  description?: string;
}
export interface PlanSlot { role: string; character?: string; name?: string; class?: string }
export interface PlanGroup { id: string; name: string; color?: string; slots: PlanSlot[] }
export interface PlanPoint { x: number; y: number }
export interface PlanEncounter {
  boss: string;
  notes?: string;
  bossMarker?: PlanPoint;
  positions: Array<PlanPoint & { group: string }>;
}
export interface GuildPlan {
  id: string;
  example?: boolean;
  title: string;
  instance: string;
  event?: string;
  leader?: string;
  notes?: string;
  groups: PlanGroup[];
  encounters: PlanEncounter[];
}
export interface MediaFile { classIcons?: Record<string, string>; instanceTiles?: Record<string, string> }

/** One playable character a raid leader can assign. key is stable across refreshes. */
export interface RosterEntry {
  key: string;
  name: string;
  classId?: string;
  level?: number;
  member: string;
  href?: string;
}

/** A slot after resolving its character against the roster. */
export interface ResolvedSlot {
  role?: GuildRole;
  name?: string;
  classInfo?: GuildClass;
  classIcon?: string;
  href?: string;
  open: boolean;
  external: boolean;
}

const configs = import.meta.glob<{ default: GuildConfig }>('../data/guild/*/config.json', { eager: true });
const eventFiles = import.meta.glob<{ default: { events: GuildEvent[] } }>('../data/guild/*/events.json', { eager: true });
const planFiles = import.meta.glob<{ default: GuildPlan }>('../data/guild/*/plans/*.json', { eager: true });
const mediaFiles = import.meta.glob<{ default: MediaFile }>('../data/guild/*/blizzard-media.json', { eager: true });

function folderOf(path: string): string {
  return path.split('/data/guild/')[1].split('/')[0];
}

export function guildGames(): GuildConfig[] {
  return Object.entries(configs).map(([, m]) => m.default);
}

export function guildConfig(slug: string): GuildConfig | undefined {
  return guildGames().find((c) => c.slug === slug);
}

export function guildMedia(slug: string): MediaFile {
  const hit = Object.entries(mediaFiles).find(([p]) => folderOf(p) === slug);
  return hit?.[1].default ?? {};
}

export function guildEvents(slug: string): GuildEvent[] {
  const hit = Object.entries(eventFiles).find(([p]) => folderOf(p) === slug);
  return [...(hit?.[1].default.events ?? [])].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

export function guildPlans(slug: string): GuildPlan[] {
  return Object.entries(planFiles)
    .filter(([p]) => folderOf(p) === slug)
    .map(([, m]) => m.default);
}

export function guildPlan(slug: string, id: string): GuildPlan | undefined {
  return guildPlans(slug).find((p) => p.id === id);
}

export function instanceOf(config: GuildConfig, id?: string): GuildInstance | undefined {
  return config.instances.find((i) => i.id === id);
}

export function guildHref(config: GuildConfig): string {
  return `/guild/${config.slug}/`;
}

export function planHref(config: GuildConfig, plan: GuildPlan | string): string {
  return `/guild/${config.slug}/plans/${typeof plan === 'string' ? plan : plan.id}/`;
}

/** Characters the template can assign. Hidden members are never included. */
export function guildRoster(config: GuildConfig): RosterEntry[] {
  if (config.rosterSource !== 'wowForever') return [];
  return visibleMembers().flatMap((member) =>
    wowCharacters(member).map((character) => {
      const ms = memberSlug(member);
      const cs = wowCharacterSlug(character);
      const snap = loadSnapshot(ms, cs);
      const className = snap?.profile?.character_class?.name;
      const classId = config.classes.find((c) => c.name === className)?.id;
      return {
        key: `${ms}/${cs}`,
        name: characterDisplayName(character, snap),
        classId,
        level: snap?.profile?.level,
        member: member.handle,
        href: wowHref(member, character),
      };
    }),
  );
}

export function resolveSlot(config: GuildConfig, roster: RosterEntry[], slot: PlanSlot): ResolvedSlot {
  const media = guildMedia(config.slug);
  const role = config.roles.find((r) => r.id === slot.role);
  const rosterHit = slot.character ? roster.find((r) => r.key === slot.character) : undefined;
  const classId = rosterHit?.classId ?? slot.class;
  const classInfo = config.classes.find((c) => c.id === classId);
  // A character key that is not on the visible roster (e.g. a hidden member) renders as an open slot.
  const name = rosterHit?.name ?? (slot.character ? undefined : slot.name);
  return {
    role,
    name,
    classInfo: name ? classInfo : undefined,
    classIcon: name && classId ? media.classIcons?.[classId] : undefined,
    href: rosterHit?.href,
    open: !name,
    external: Boolean(name && !rosterHit),
  };
}

export function bossMap(inst: GuildInstance, boss: GuildBoss): GuildMap | undefined {
  return boss.map ?? inst.map;
}

export function bossLabel(boss: GuildBoss): string {
  return `${boss.wing ? `${boss.wing}: ` : ''}${boss.name}${boss.optional ? ' (optional)' : ''}`;
}

export function eventType(config: GuildConfig, id: string): GuildEventType {
  return config.eventTypes.find((t) => t.id === id) ?? { id, label: id, color: '#71717a' };
}

/** Validate plans at build time so a bad PR fails the build instead of rendering nonsense. */
export function validatePlan(config: GuildConfig, plan: GuildPlan): void {
  const where = `guild/${config.slug}/plans/${plan.id}.json`;
  const inst = instanceOf(config, plan.instance);
  if (!inst) throw new Error(`${where}: unknown instance "${plan.instance}"`);
  if (inst.status !== 'live') throw new Error(`${where}: ${inst.id} is upcoming; plans need a live instance`);
  const groupIds = new Set(plan.groups.map((g) => g.id));
  for (const g of plan.groups) {
    for (const s of g.slots) {
      if (!config.roles.some((r) => r.id === s.role)) throw new Error(`${where}: group ${g.id} has unknown role "${s.role}"`);
      if (s.class && !config.classes.some((c) => c.id === s.class)) throw new Error(`${where}: unknown class "${s.class}"`);
    }
  }
  for (const e of plan.encounters) {
    if (!inst.bosses.some((b) => b.id === e.boss)) throw new Error(`${where}: unknown boss "${e.boss}" for ${inst.id}`);
    for (const p of e.positions) {
      if (!groupIds.has(p.group)) throw new Error(`${where}: position for unknown group "${p.group}"`);
      if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) throw new Error(`${where}: position out of range (0–100)`);
    }
  }
}
