# Credits and attribution

## Guild pages (`/guild/`)

### Images used
| What | Source | Terms |
| --- | --- | --- |
| Class icons | Blizzard Game Data API, `static-forever-us`, `/data/wow/media/playable-class/{id}`; served from Blizzard's render CDN | © Blizzard Entertainment. Used under the [Blizzard Legal FAQ](https://www.blizzard.com/en-us/legal/c1ae32ac-7ff9-4ac3-a03b-fc04b8697010/blizzard-legal-faq) fan-site permission (noncommercial, notices kept). |
| Instance banner art (classic dungeons and Onyxia's Lair only) | Blizzard Game Data API, `static-us` journal, `/data/wow/media/journal-instance/{id}` | Same as above. |
| Role glyphs (shield / cross / sword) | Drawn for this site (inline SVG) | Site's own. |

### Boss and dungeon maps
All boss maps are a **labeled placeholder grid**; no map images are shipped. Research (November 2026):

- **WoW: Forever has no dungeon or raid maps in the game.** The Forever client's map tables (`UiMap`, build 1.60.1.71037) contain only zones, continents and battlegrounds, the same as the original 2004 game. The Blizzard API has no map endpoint, and Blizzard's Forever news articles show screenshots, not maps.
- **No openly licensed (CC, public domain) top-down maps** of these dungeons were found. Maps on fan sites, wikis and atlas add-ons are copies of Blizzard map art from other game versions (Classic, retail), or have no license, so they are not used.
- Dungeon maps from other Blizzard clients (Classic progression or retail) don't fit Forever's dungeons: the nine new Forever dungeons and the Forever raids aren't in those clients, and those maps aren't published for reuse.

**Adding a map later:** Blizzard's Legal FAQ allows screenshots you take in-game on a fan site. A member can take an overhead screenshot of a boss area and save it under `public/images/guild/{game}/maps/`. To use it, set `map` on the boss (or the instance) in `src/data/guild/{game}/config.json`:

```json
"map": { "image": "/images/guild/wow/maps/onyxias-lair/onyxia.webp", "credit": "In-game screenshot by <member>", "license": "Blizzard fan-site permission (Legal FAQ)" }
```

The credit and license appear under the map. Add a row to the table above for each image.

### Dungeon and raid data
Instance names, levels, sizes and boss lists in `src/data/guild/wow/config.json` come from the sources listed on each instance (`sources`). These include Blizzard news, Wowhead's WoW: Forever dungeon overview and news, Warcraft Wiki, WoW: Forever client data (DungeonEncounter, build 1.60.1.71037, via wago.tools), and Forever Hub, which is used only where no other list exists (Barrow Deeps and Hyjal Summit boss names).

World of Warcraft and Warcraft are trademarks or registered trademarks of Blizzard Entertainment, Inc. Top-Notch Gaming is not affiliated with or endorsed by Blizzard Entertainment.
