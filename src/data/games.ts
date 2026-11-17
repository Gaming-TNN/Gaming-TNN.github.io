// Games TNG plays. Add an entry here to add a card to /games/ and the homepage strip.
// Keep descriptions neutral and factual. No official logos or art: cards use a typographic emblem (`mark`).

export interface Game {
  /** URL-safe id, used for the card anchor (/games/#slug). */
  slug: string;
  /** Full display name. */
  name: string;
  /** 2–3 character monogram shown in the emblem. */
  mark: string;
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
    slug: 'everquest',
    name: 'EverQuest',
    mark: 'EQ',
    genre: 'MMORPG',
    description: 'The long-running fantasy MMORPG set in the world of Norrath.',
    guild: null,
  },
  {
    slug: 'wow-forever',
    name: 'World of Warcraft: Forever',
    mark: 'WF',
    genre: 'MMORPG',
    description: "Blizzard's reimagined original Azeroth: a level 1–60 journey alongside modern and Classic WoW.",
    guild: null,
  },
];
