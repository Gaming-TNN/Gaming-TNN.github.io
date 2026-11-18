// Squad members shown in the homepage hero panel and /squad/ pages.
// Discord status is a static placeholder until the Discord server widget is wired up.
// EverQuest types stay here so EQ can return to member cards later; it is omitted from
// members for now. WoW Forever supports multiple characters per member (Horde and Alliance).

import type { Game } from './games';
import { GAMES } from './games';

/** Presence values the Discord widget can later fill in. */
export type DiscordStatus = 'online' | 'idle' | 'dnd' | 'offline' | 'unknown';

export const DISCORD_STATUS_LABEL: Record<DiscordStatus, string> = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do not disturb',
  offline: 'Offline',
  unknown: 'Offline/unknown',
};

export interface EverQuestCharacter {
  /** Display name. Use 'TBD' until Seth confirms the real name. */
  name: string;
  class?: string;
  level?: number;
  /** EverQuest Legends server, e.g. 'Freeport'. */
  server?: string;
}

/**
 * One WoW Forever character. There are no realms: identity is region + first name + surname.
 * Faction, class, race, level, and ruleset come from the Battle.net snapshot when present.
 */
export interface WowForeverCharacter {
  name: string;
  surname: string;
  region: 'us' | 'eu' | 'kr' | 'tw';
}

export interface SquadMember {
  /** Public handle shown on the card. */
  handle: string;
  /** URL slug; defaults to the lowercased handle. */
  slug?: string;
  /** Optional 1–3 character monogram for the card icon. Defaults to the handle's first letters. */
  mark?: string;
  /** Discord username, used later to match the server widget. */
  discordUsername?: string;
  /**
   * Static for now. A later client or build step can set this from the
   * Discord server widget (presence + voice). 'unknown' until that ships.
   */
  discordStatus: DiscordStatus;
  /** Omitted on members for now; kept so EQ can return later. */
  everquest?: EverQuestCharacter | EverQuestCharacter[];
  /** Zero or more WoW Forever characters (Alliance and/or Horde). */
  wowForever?: WowForeverCharacter[];
}

export const SQUAD: SquadMember[] = [
  {
    handle: 'zTOPN0TCHz',
    discordStatus: 'unknown',
    wowForever: [{ name: 'Vhexz', surname: 'Warfarin', region: 'us' }],
  },
];

export const EVERQUEST_GAME: Game | undefined = GAMES.find((g) => g.slug === 'everquest-legends');
export const WOW_FOREVER_GAME: Game | undefined = GAMES.find((g) => g.slug === 'wow-forever');

export function memberSlug(member: SquadMember): string {
  return (member.slug ?? member.handle).toLowerCase();
}

export function wowCharacterSlug(character: WowForeverCharacter): string {
  return `${character.name}-${character.surname}`.toLowerCase();
}

export function wowCharacters(member: SquadMember): WowForeverCharacter[] {
  return member.wowForever ?? [];
}

export function findMember(slug: string): SquadMember | undefined {
  return SQUAD.find((m) => memberSlug(m) === slug);
}

export function officialWowArmoryUrl(character: WowForeverCharacter): string {
  return `https://worldofwarcraft.blizzard.com/en-us/forever/${character.region}/armory/character/${wowCharacterSlug(character)}/`;
}
