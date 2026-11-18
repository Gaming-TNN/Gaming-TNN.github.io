# Top-Notch Gaming

Source for [gaming.top-notchnetwork.com](https://gaming.top-notchnetwork.com), the site for Top-Notch Gaming (TNG), the gaming sister company of [Top-Notch Network](https://top-notchnetwork.com).

Built with [Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com), sharing the TNN site's theme (palette, typography, nav/footer and component patterns) with gaming accents.

## Develop

```sh
npm ci
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
npm run preview
npm run fetch-characters   # Battle.net snapshots; needs BNET_CLIENT_ID and BNET_CLIENT_SECRET
```

Requires Node 22.12+ (CI uses Node 24).

## Pages

| Route | File |
|---|---|
| `/` | `src/pages/index.astro` |
| `/about/` | `src/pages/about.astro` |
| `/games/` | `src/pages/games.astro` (cards from `src/data/games.ts`) |
| `/community/` | `src/pages/community.astro` (Discord section) |
| `/members/` | `src/pages/members/index.astro` (member list) |
| `/members/<member>/` | `src/pages/members/[member]/index.astro` (member profile) |
| `/members/<member>/wow/` | `src/pages/members/[member]/wow/index.astro` (WoW Forever characters by faction) |
| `/members/<member>/wow/<name>-<surname>/` | `src/pages/members/[member]/wow/[character]/index.astro` (gear / talent trees) |

## Common edits

- **Discord invite:** set `DISCORD_INVITE_URL` in `src/lib/site.ts`. While it is empty, every Discord button shows a "coming soon" placeholder.
- **Games:** add or edit entries in `GAMES` in `src/data/games.ts`. Set `guild` when clan/guild info is confirmed; while it is `null` the card shows "Coming soon". Official logos are optional (`logo`); without one, the card falls back to the typographic `mark`.
- **Members:** add or edit members in `MEMBERS` in `src/data/members.ts`. Optional `about` and `experience` strings fill the member profile page; leave them empty to show a clearly marked placeholder for Seth to fill. `wowForever` is an array of characters (`name`, `surname`, `region`). WoW Forever has no realms. EverQuest types remain in the file so EQ can return later, but EQ is omitted from member cards for now. Discord status is a static `Offline/unknown` placeholder until the Discord server widget is connected.
- **Character snapshots:** `src/data/characters/<member-slug>/<first>-<surname>.json`. Refresh locally with `npm run fetch-characters` (requires `BNET_CLIENT_ID` and `BNET_CLIENT_SECRET` in the environment; never commit those values). The same script also caches WoW Forever talent-tree layouts (rows, columns, ranks, prerequisites, and spell icons) from the Blizzard Game Data API `static-forever-us` namespace to `src/data/talent-trees/forever-us.json`. Pass `--trees-only` to refresh just the talent-tree cache. A GitHub Action (`.github/workflows/refresh-characters.yml`) runs the same script every 6 hours and on `workflow_dispatch`. If nothing changed, it does not open a PR. If the only changes are under `src/data/characters/` and `src/data/talent-trees/` and the workflow is running on the default branch, it opens a PR, runs the required `build` check via `workflow_dispatch` (because `GITHUB_TOKEN` pushes do not trigger `pull_request`/`push` workflows), squash-merges once that check passes, and then dispatches `deploy.yml` the same way so GitHub Pages still updates. Changes outside those data paths stay as a normal PR and need Seth's go-ahead. Each run uses a unique `data/wow-characters-<run id>` branch and does not delete it. Add `BNET_CLIENT_ID` and `BNET_CLIENT_SECRET` as repository secrets before this can run; do not commit those values.
- **Nav & network links:** `NAV` / `NETWORKS` in `src/lib/site.ts`.
- **Images:** resize/compress new art (WebP preferred) before committing to `public/`.
- **Custom domain:** `public/CNAME` must stay `gaming.top-notchnetwork.com`.

## CI / deploy

- `.github/workflows/ci.yml`: `build` job on pull requests and pushes to `main` (`npm ci && npm run build`, plus a CNAME check).
- `.github/workflows/deploy.yml`: builds with `withastro/action` and deploys to GitHub Pages on push to `main`. Requires the repo's Pages source to be set to **GitHub Actions**.
- `.github/workflows/refresh-characters.yml`: fetches character snapshots and the talent-tree cache, then opens a PR if anything changed. Data-only PRs targeting the default branch are squash-merged automatically after the required `build` check passes; the workflow then dispatches `deploy.yml`. Any other files leave the PR open for review. Needs `BNET_CLIENT_ID` and `BNET_CLIENT_SECRET` repository secrets (not added yet). Does not force-push or delete its data branch.

The previous Jekyll (Chirpy) site is preserved on the `jekyll-backup` branch.

## Game logo sources

Official logos, from each publisher's press kit. The artwork is unaltered: transparent margins were trimmed, and each logo was resized and converted to WebP (`public/images/games/*-800.webp`, `*-400.webp`).

| Game | File | Source |
|---|---|---|
| EverQuest Legends | `everquest-legends-logo-*.webp` | Daybreak Game Company press page, "EverQuest Legends Logo" (transparent PNG, 2400×1500): https://www.daybreakgames.com/press/eqlegends/logos (asset: https://assets-cdn.daybreakgames.com/uploads/dcsclient/000/000/351/282.png) |
| World of Warcraft: Forever | `wow-forever-logo-*.webp` | Blizzard Press Center, WoW Forever Launch Press Kit, `WoW_Forever_Logo.png` (transparent PNG, 4550×3850): https://blizzard.gamespress.com/Kit/Details/WoW-Forever-Launch-Press-Kit |
| World of Warcraft: Forever (tile) | `wow-forever-icon.png`, `wow-forever-icon-256.webp`, `wow-forever-icon-128.webp` | The same official `WoW_Forever_Logo.png`, placed on a dark square tile for member cards. The press kit did not include a separate app icon. |

Trademark credit (shown on `/games/`, text in `GAMES_TRADEMARK_NOTICE` in `src/data/games.ts`) uses the owner names as published:
- Daybreak: "EverQuest is a registered trademark of Daybreak Game Company LLC" (https://www.daybreakgames.com/legal); "Daybreak, the Daybreak logo and EverQuest Legends are trademarks or registered trademarks of Daybreak Game Company LLC" (https://www.everquestlegends.com/)
- Blizzard: "World of Warcraft, Warcraft and Blizzard Entertainment are trademarks or registered trademarks of Blizzard Entertainment, Inc." (https://www.blizzard.com/en-us/legal/9c9cb70b-d1ed-4e17-998a-16c6df46be7b/copyright-notices)
