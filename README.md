# Top-Notch Gaming

Source for [gaming.top-notchnetwork.com](https://gaming.top-notchnetwork.com), the site for Top-Notch Gaming (TNG), the gaming sister company of [Top-Notch Network](https://top-notchnetwork.com).

Built with [Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com), sharing the TNN site's theme (palette, typography, nav/footer and component patterns) with gaming accents.

## Develop

```sh
npm ci
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
npm run preview
```

Requires Node 22.12+ (CI uses Node 24).

## Pages

| Route | File |
|---|---|
| `/` | `src/pages/index.astro` |
| `/about/` | `src/pages/about.astro` |
| `/games/` | `src/pages/games.astro` (cards from `src/data/games.ts`) |
| `/community/` | `src/pages/community.astro` (Discord section) |

## Common edits

- **Discord invite:** set `DISCORD_INVITE_URL` in `src/lib/site.ts`. While it is empty, every Discord button shows a "coming soon" placeholder.
- **Games:** add or edit entries in `GAMES` in `src/data/games.ts`. Set `guild` when clan/guild info is confirmed; while it is `null` the card shows "Coming soon". Official logos are optional (`logo`); without one, the card falls back to the typographic `mark`.
- **Squad:** add or edit members in `SQUAD` in `src/data/squad.ts`. Character names stay `TBD` until confirmed. EverQuest Legends uses a `server` (Freeport for now). WoW Forever has no realms, so do not add a realm field. Discord status is a static `Offline/unknown` placeholder until the Discord server widget is connected.
- **Nav & network links:** `NAV` / `NETWORKS` in `src/lib/site.ts`.
- **Images:** resize/compress new art (WebP preferred) before committing to `public/`.
- **Custom domain:** `public/CNAME` must stay `gaming.top-notchnetwork.com`.

## CI / deploy

- `.github/workflows/ci.yml`: `build` job on pull requests and pushes to `main` (`npm ci && npm run build`, plus a CNAME check).
- `.github/workflows/deploy.yml`: builds with `withastro/action` and deploys to GitHub Pages on push to `main`. Requires the repo's Pages source to be set to **GitHub Actions**.

The previous Jekyll (Chirpy) site is preserved on the `jekyll-backup` branch.

## Game logo sources

Official logos, from each publisher's press kit. The artwork is unaltered: transparent margins were trimmed, and each logo was resized and converted to WebP (`public/images/games/*-800.webp`, `*-400.webp`).

| Game | File | Source |
|---|---|---|
| EverQuest Legends | `everquest-legends-logo-*.webp` | Daybreak Game Company press page, "EverQuest Legends Logo" (transparent PNG, 2400×1500): https://www.daybreakgames.com/press/eqlegends/logos (asset: https://assets-cdn.daybreakgames.com/uploads/dcsclient/000/000/351/282.png) |
| World of Warcraft: Forever | `wow-forever-logo-*.webp` | Blizzard Press Center, WoW Forever Launch Press Kit, `WoW_Forever_Logo.png` (transparent PNG, 4550×3850): https://blizzard.gamespress.com/Kit/Details/WoW-Forever-Launch-Press-Kit |

Trademark credit (shown on `/games/`, text in `GAMES_TRADEMARK_NOTICE` in `src/data/games.ts`) uses the owner names as published:
- Daybreak: "EverQuest is a registered trademark of Daybreak Game Company LLC" (https://www.daybreakgames.com/legal); "Daybreak, the Daybreak logo and EverQuest Legends are trademarks or registered trademarks of Daybreak Game Company LLC" (https://www.everquestlegends.com/)
- Blizzard: "World of Warcraft, Warcraft and Blizzard Entertainment are trademarks or registered trademarks of Blizzard Entertainment, Inc." (https://www.blizzard.com/en-us/legal/9c9cb70b-d1ed-4e17-998a-16c6df46be7b/copyright-notices)
