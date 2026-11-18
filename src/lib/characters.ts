// Helpers for WoW Forever character snapshots written by scripts/fetch-characters.mjs.

import type { Member, WowForeverCharacter } from '../data/members';
import { officialWowArmoryUrl, wowCharacterSlug } from '../data/members';

export interface CharacterSnapshot {
  fetchedAt: string;
  memberSlug: string;
  region: string;
  namespace: string;
  locale: string;
  characterSlug: string;
  profile: {
    id?: number;
    name?: string;
    surname?: string;
    name_search?: string;
    level?: number;
    average_item_level?: number;
    equipped_item_level?: number;
    last_login_timestamp?: number;
    faction?: { type?: string; name?: string };
    race?: { name?: string; id?: number };
    character_class?: { name?: string; id?: number };
    gender?: { type?: string; name?: string };
    ruleset?: { name?: string; id?: number };
  };
  equipment?: { equipped_items?: EquippedItem[] };
  specializations?: {
    specialization_groups?: Array<{
      is_active?: boolean;
      specializations?: Array<{
        specialization_name?: string;
        spent_points?: number;
        talents?: Array<{
          talent?: { name?: string; id?: number };
          talent_rank?: number;
          spell_tooltip?: { description?: string; cast_time?: string };
        }>;
      }>;
    }>;
  };
  media?: { assets?: Array<{ key: string; value: string }> };
  professions?: {
    primaries?: ProfessionBlock[];
    secondaries?: ProfessionBlock[];
  };
  itemIcons?: Record<string, string>;
}

export interface EquippedItem {
  name?: string;
  item?: { id?: number };
  slot?: { type?: string; name?: string };
  quality?: { type?: string; name?: string };
  level?: { value?: number; display_string?: string };
}

export interface ProfessionBlock {
  profession?: { name?: string; id?: number };
  tiers?: Array<{ skill_points?: number; max_skill_points?: number; tier?: { name?: string } }>;
}

const snapshotModules = import.meta.glob<{ default: CharacterSnapshot }>('../data/characters/*/*.json', { eager: true });

export const EQUIPMENT_SLOTS: Array<{ type: string; name: string }> = [
  { type: 'HEAD', name: 'Head' },
  { type: 'NECK', name: 'Neck' },
  { type: 'SHOULDER', name: 'Shoulders' },
  { type: 'BACK', name: 'Back' },
  { type: 'CHEST', name: 'Chest' },
  { type: 'SHIRT', name: 'Shirt' },
  { type: 'TABARD', name: 'Tabard' },
  { type: 'WRIST', name: 'Wrist' },
  { type: 'HANDS', name: 'Hands' },
  { type: 'WAIST', name: 'Waist' },
  { type: 'LEGS', name: 'Legs' },
  { type: 'FEET', name: 'Feet' },
  { type: 'FINGER_1', name: 'Ring 1' },
  { type: 'FINGER_2', name: 'Ring 2' },
  { type: 'TRINKET_1', name: 'Trinket 1' },
  { type: 'TRINKET_2', name: 'Trinket 2' },
  { type: 'MAIN_HAND', name: 'Main Hand' },
  { type: 'OFF_HAND', name: 'Off Hand' },
  { type: 'RANGED', name: 'Ranged' },
];

export const PAPERDOLL_LEFT = ['HEAD', 'NECK', 'SHOULDER', 'BACK', 'CHEST', 'SHIRT', 'TABARD', 'WRIST'];
export const PAPERDOLL_RIGHT = ['HANDS', 'WAIST', 'LEGS', 'FEET', 'FINGER_1', 'FINGER_2', 'TRINKET_1', 'TRINKET_2'];
export const PAPERDOLL_BOTTOM = ['MAIN_HAND', 'OFF_HAND', 'RANGED'];

export const QUALITY_TEXT: Record<string, string> = {
  POOR: 'text-[#9d9d9d]',
  COMMON: 'text-zinc-100',
  UNCOMMON: 'text-[#1eff00]',
  RARE: 'text-[#0070dd]',
  EPIC: 'text-[#a335ee]',
  LEGENDARY: 'text-[#ff8000]',
  ARTIFACT: 'text-[#e6cc80]',
  HEIRLOOM: 'text-[#00ccff]',
};

export function loadSnapshot(memberSlug: string, characterSlug: string): CharacterSnapshot | undefined {
  const suffix = `/characters/${memberSlug}/${characterSlug}.json`;
  const hit = Object.entries(snapshotModules).find(([path]) => path.endsWith(suffix));
  return hit?.[1].default;
}

export function loadMemberSnapshots(memberSlug: string): CharacterSnapshot[] {
  const needle = `/characters/${memberSlug}/`;
  return Object.entries(snapshotModules)
    .filter(([path]) => path.includes(needle))
    .map(([, mod]) => mod.default);
}

export function mediaAsset(snapshot: CharacterSnapshot | undefined, key: string): string | undefined {
  return snapshot?.media?.assets?.find((a) => a.key === key)?.value;
}

export function itemBySlot(snapshot: CharacterSnapshot | undefined): Map<string, EquippedItem> {
  const map = new Map<string, EquippedItem>();
  for (const item of snapshot?.equipment?.equipped_items ?? []) {
    if (item.slot?.type) map.set(item.slot.type, item);
  }
  return map;
}

export function itemIcon(snapshot: CharacterSnapshot | undefined, item: EquippedItem | undefined): string | undefined {
  const id = item?.item?.id;
  if (id == null) return undefined;
  return snapshot?.itemIcons?.[String(id)];
}

export function qualityClass(item: EquippedItem | undefined): string {
  const type = item?.quality?.type;
  return (type && QUALITY_TEXT[type]) || 'text-zinc-400';
}

export function activeSpecializations(snapshot: CharacterSnapshot | undefined) {
  const groups = snapshot?.specializations?.specialization_groups ?? [];
  const active = groups.find((g) => g.is_active) ?? groups[0];
  return active?.specializations ?? [];
}

export function characterDisplayName(character: WowForeverCharacter, snapshot?: CharacterSnapshot): string {
  return snapshot?.profile?.name_search || `${character.name} ${character.surname}`;
}

export function factionOf(snapshot: CharacterSnapshot | undefined): 'HORDE' | 'ALLIANCE' | 'UNKNOWN' {
  const type = snapshot?.profile?.faction?.type;
  if (type === 'HORDE' || type === 'ALLIANCE') return type;
  return 'UNKNOWN';
}

export function formatWhen(isoOrMs: string | number): string {
  const date = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Phoenix',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

export function armoryUrl(character: WowForeverCharacter): string {
  return officialWowArmoryUrl(character);
}

export function wowHref(member: Member, character?: WowForeverCharacter): string {
  const base = `/members/${(member.slug ?? member.handle).toLowerCase()}/wow/`;
  return character ? `${base}${wowCharacterSlug(character)}/` : base;
}
