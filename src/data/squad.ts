// Squad members shown in the homepage hero panel.
// Add a member here to add a card. Character names stay 'TBD' until confirmed.
// Discord status is a static placeholder until the Discord server widget is wired up.

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
 * WoW Forever has no realms. Characters are unique per Battle.net region
 * by first name + surname. `region` is for a later API lookup, not shown
 * as a realm on the card. `ruleset` is Normal / PvP / Roleplay / Roleplay PvP.
 */
export interface WowForeverCharacter {
  /** Display name. Use 'TBD' until Seth confirms the real name. */
  name: string;
  class?: string;
  level?: number;
  region?: 'us' | 'eu' | 'kr' | 'tw';
  ruleset?: string;
}

export interface SquadMember {
  /** Public handle shown on the card. */
  handle: string;
  /** Optional 1–3 character monogram for the card icon. Defaults to the handle's first letters. */
  mark?: string;
  /** Discord username, used later to match the server widget. */
  discordUsername?: string;
  /**
   * Static for now. A later client or build step can set this from the
   * Discord server widget (presence + voice). 'unknown' until that ships.
   */
  discordStatus: DiscordStatus;
  everquest?: EverQuestCharacter;
  wowForever?: WowForeverCharacter;
}

export const SQUAD: SquadMember[] = [
  {
    handle: 'zTOPN0TCHz',
    discordStatus: 'unknown',
    everquest: { name: 'TBD', server: 'Freeport' },
    wowForever: { name: 'TBD' },
  },
];

export const EVERQUEST_GAME: Game | undefined = GAMES.find((g) => g.slug === 'everquest-legends');
export const WOW_FOREVER_GAME: Game | undefined = GAMES.find((g) => g.slug === 'wow-forever');
