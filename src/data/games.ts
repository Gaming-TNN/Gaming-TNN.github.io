// Games TNG plays. Add an entry here to add a card to /games/ and the homepage strip.
// Keep descriptions neutral and factual, and cite where facts and logos came from (see README).

export interface GameLogo {
  /** Base path without size suffix; files are `${src}-800.webp` and `${src}-400.webp`. */
  src: string;
  /** Intrinsic size of the 800w file (for layout). */
  width: number;
  height: number;
  alt: string;
}

export interface Game {
  /** URL-safe id, used for the card anchor (/games/#slug). */
  slug: string;
  /** Full display name. */
  name: string;
  /** 2–3 character monogram, used only when no official logo is set. */
  mark: string;
  /** Official logo (from the publisher's press kit). Optional. */
  logo?: GameLogo;
  /** Short genre tag. */
  genre: string;
  /** One-line, neutral description. */
  description: string;
  /**
   * Clan/guild info. Leave null until confirmed; the card shows "Coming soon".
   * Example: { name: 'Guild Name', server: 'Server', details: 'Recruiting all classes', url: 'https://...' }
   */
  guild: null | { name: string; server?: string; details?: string; url?: string };
}

export const GAMES: Game[] = [
  {
    slug: 'everquest-legends',
    name: 'EverQuest Legends',
    mark: 'EQL',
    logo: {
      src: '/images/games/everquest-legends-logo',
      width: 800,
      height: 392,
      alt: 'EverQuest Legends logo',
    },
    genre: 'MMORPG',
    // Source: Daybreak Games press release, 07/28/2026
    // https://www.daybreakgames.com/press/eqlegends/article/eql-now-available
    description: 'A casual, solo-friendly version of the 1999 classic MMORPG EverQuest, from Daybreak Games and Game Jawn.',
    guild: null,
  },
  {
    slug: 'wow-forever',
    name: 'World of Warcraft: Forever',
    mark: 'WF',
    logo: {
      src: '/images/games/wow-forever-logo',
      width: 800,
      height: 652,
      alt: 'World of Warcraft: Forever logo',
    },
    genre: 'MMORPG',
    // Source: Blizzard, "World of Warcraft: Forever Now Live!"
    // https://news.blizzard.com/en-us/article/24315820/world-of-warcraft-forever-now-live
    description: "Blizzard's reimagined original Azeroth: a level 1–60 journey alongside modern and Classic WoW.",
    guild: null,
  },
];

/** Trademark credit shown under the games list. Owner names as published by Daybreak and Blizzard. */
export const GAMES_TRADEMARK_NOTICE =
  'EverQuest is a registered trademark, and EverQuest Legends is a trademark or registered trademark, of Daybreak Game Company LLC. ' +
  'World of Warcraft and Warcraft are trademarks or registered trademarks of Blizzard Entertainment, Inc. ' +
  'Logos are used for fan/community reference only; Top-Notch Gaming is not affiliated with or endorsed by Daybreak Game Company LLC or Blizzard Entertainment, Inc.';
