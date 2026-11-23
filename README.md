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
- **Members:** add or edit members in `MEMBERS` in `src/data/members.ts`. Set `position` to one of the labels in `MEMBER_POSITIONS` (`Executives`, `Directors`, `Members` — edit that ordered list to change the roster sections). The `/members/` index groups visible members under those headings (empty sections are skipped) and shows a left-aligned grid of member cards: three per row on desktop, two on tablet, and one on mobile, without making cards taller. Set `hidden: true` to omit a member from the public site (no pages, listings, sitemap, or data refresh) until Seth unhides them; keep their `wowForever` name/surname/region in the file so they can be restored by flipping the flag. Optional `about` and `experience` strings fill the member profile page; leave them empty to show a clearly marked placeholder for Seth to fill. `wowForever` is an array of characters (`name`, `surname`, `region`). WoW Forever has no realms. EverQuest types remain in the file so EQ can return later, but EQ is omitted from member cards for now. Discord status is a static `Offline/unknown` placeholder until the Discord server widget is connected. The homepage hero shows a TNG Discord voice-channel placeholder (`VoicePanel`), not the member list; `/members/` and the nav item remain. Member cards and the profile “Currently playing” row show square game tiles for each supported game (full color and linked when the member has characters and a game page exists; greyscale, not clickable, “No characters yet” otherwise). EverQuest Legends tiles stay unlinked until that subpage exists.
- **Character snapshots:** `src/data/characters/<member-slug>/<first>-<surname>.json`. Each snapshot includes profile, equipment, specializations, media, professions, item icons, and character statistics (health, attributes, combat ratings, and resistances) from the Profile API `/statistics` endpoint. A missing statistics response does not fail the rest of the snapshot. Refresh locally with `npm run fetch-characters` (requires `BNET_CLIENT_ID` and `BNET_CLIENT_SECRET` in the environment; never commit those values). The script and the refresh workflow skip members with `hidden: true`. The same script also caches WoW Forever talent-tree layouts (rows, columns, ranks, prerequisites, and spell icons) from the Blizzard Game Data API `static-forever-us` namespace to `src/data/talent-trees/forever-us.json`, and official profession icons to `src/data/professions/forever-us.json` (profession media, with classic profession spell media as a fallback). Media requests retry with backoff so rate limits do not leave blank talent or profession icons. Pass `--trees-only` to refresh just the talent-tree and profession-icon caches. A GitHub Action (`.github/workflows/refresh-characters.yml`) runs the same script every 15 minutes and on `workflow_dispatch` (including the Cloudflare worker dispatch on `main`). A concurrency group (`refresh-characters`) prevents overlapping runs without cancelling one already in progress. If nothing changed, it exits without committing. If the only changes are under `src/data/characters/`, `src/data/talent-trees/`, and `src/data/professions/` and the workflow is running on the default branch, it commits those files to the unprotected `data-live` branch with a message like `data: refresh <UTC time> (<changed files>)` (a regular commit, never a force-push) and then calls `deploy.yml`. Unexpected files outside those paths fail the job instead of being published. `deploy.yml` always checks out `main` (or the calling SHA) and overlays `src/data/characters/`, `src/data/talent-trees/`, and `src/data/professions/` from `data-live`, including on push-to-`main` deploys so a code merge cannot roll site data back to whatever is committed on `main`. Pull request CI keeps building with the data committed on the PR/`main` and does not overlay `data-live`. The branch is named `data-live`, not `data`, because Git cannot create `refs/heads/data` while `refs/heads/data/wow-characters` still exists; that older branch is left in place and is no longer updated. `GITHUB_TOKEN` is enough (`contents: write` to push `data-live`; `workflow_call` of `deploy.yml` in the same run). `DATA_PR_TOKEN` is unused and may be removed from repository secrets. A weekly workflow (`.github/workflows/cleanup-workflow-runs.yml`) deletes completed Actions *runs* older than 7 days via the GitHub API; it does not delete branches. Repository Actions artifact/log retention is set to 5 days (this also applies to workflow run records for new runs). Add `BNET_CLIENT_ID` and `BNET_CLIENT_SECRET` as repository secrets before the refresh can run; do not commit those values.
- **Nav & network links:** `NAV` / `NETWORKS` in `src/lib/site.ts`.
- **Images:** resize/compress new art (WebP preferred) before committing to `public/`.
- **Custom domain:** `public/CNAME` must stay `gaming.top-notchnetwork.com`.

## Guild hubs (calendar, group plans, boss maps)

Game-agnostic template under `/guild/{game}/`. Data lives in `src/data/guild/{game}/`:

- `config.json` — roles (tank/healer/dps), classes (color + Blizzard id), event types, instances (dungeons/raids, size, bosses, optional `map.image`).
- `events.json` — calendar entries (`start`/`end` ISO with offset, `type`, optional `instance` and `plan`).
- `plans/{id}.json` — a group plan: `groups[].slots[]` (`role` + `character: "member/character-slug"`, or `name` + `class` for someone off-roster, or neither for an open slot) and `encounters[]` per boss (`bossMarker` and group `positions`, x/y as 0–100 % of the map).
- `blizzard-media.json` — generated by `node scripts/fetch-guild-media.mjs` (class icons from static-forever-us, instance tiles from the static-us journal). Not part of the 15-minute refresh.

Routes: `/guild/`, `/guild/{game}/`, `/guild/{game}/plans/{id}/`, `/guild/{game}/planner/`. The planner is client-side only: it saves a draft in the browser and exports plan JSON, which is published by adding it under `plans/` in a PR. Plans are validated at build time (unknown instance, boss, role, class, or group fails the build). Hidden members never appear in rosters; a plan that references one renders an open slot. Maps are a labeled placeholder grid until a licensed map image is set per boss.

## CI / deploy

- `.github/workflows/ci.yml`: `build` job on pull requests and pushes to `main` (`npm ci && npm run build`, plus a CNAME check).
- `.github/workflows/deploy.yml`: builds with `withastro/action` and deploys to GitHub Pages on push to `main`, on `workflow_dispatch`, and when called by `refresh-characters.yml`. Every deploy checks out the triggering commit and overlays `src/data/characters/`, `src/data/talent-trees/`, and `src/data/professions/` from `data-live` so a merge to `main` cannot roll site data back. Requires the repo's Pages source to be set to **GitHub Actions**.
- `.github/workflows/refresh-characters.yml`: every 15 minutes (and on `workflow_dispatch`), fetches character snapshots, the talent-tree cache, and profession icons. If nothing changed, it stops there. Otherwise, when running on the default branch, it commits only `src/data/characters/`, `src/data/talent-trees/`, and `src/data/professions/` to the unprotected `data-live` branch (regular commit, never a force-push) and calls `deploy.yml`. Unexpected files fail the job. Needs `BNET_CLIENT_ID` and `BNET_CLIENT_SECRET`. `DATA_PR_TOKEN` is unused. The older `data/wow-characters` branch is not deleted or updated. `data-live` is used instead of `data` because Git cannot have both `data` and `data/wow-characters` as branch names.
- `.github/workflows/cleanup-workflow-runs.yml`: weekly (and on `workflow_dispatch`), deletes completed Actions runs older than 7 days. It does not delete branches.

The previous Jekyll (Chirpy) site is preserved on the `jekyll-backup` branch.

## Game logo sources

Official logos, from each publisher's press kit. The artwork is unaltered: transparent margins were trimmed, and each logo was resized and converted to WebP (`public/images/games/*-800.webp`, `*-400.webp`).

| Game | File | Source |
|---|---|---|
| EverQuest Legends | `everquest-legends-logo-*.webp` | Daybreak Game Company press page, "EverQuest Legends Logo" (transparent PNG, 2400×1500): https://www.daybreakgames.com/press/eqlegends/logos (asset: https://assets-cdn.daybreakgames.com/uploads/dcsclient/000/000/351/282.png) |
| World of Warcraft: Forever | `wow-forever-logo-*.webp` | Blizzard Press Center, WoW Forever Launch Press Kit, `WoW_Forever_Logo.png` (transparent PNG, 4550×3850): https://blizzard.gamespress.com/Kit/Details/WoW-Forever-Launch-Press-Kit |
| World of Warcraft: Forever (tile) | `wow-forever-icon.png`, `wow-forever-icon-256.webp`, `wow-forever-icon-128.webp` | The same official `WoW_Forever_Logo.png`, placed on a dark square tile for member game tiles. The press kit did not include a separate app icon. |
| EverQuest Legends (tile) | `everquest-legends-icon.png`, `everquest-legends-icon-256.webp`, `everquest-legends-icon-128.webp` | The official Daybreak “EverQuest Legends Logo”, placed on a dark square tile for member game tiles. |

Trademark credit (shown on `/games/`, text in `GAMES_TRADEMARK_NOTICE` in `src/data/games.ts`) uses the owner names as published:
- Daybreak: "EverQuest is a registered trademark of Daybreak Game Company LLC" (https://www.daybreakgames.com/legal); "Daybreak, the Daybreak logo and EverQuest Legends are trademarks or registered trademarks of Daybreak Game Company LLC" (https://www.everquestlegends.com/)
- Blizzard: "World of Warcraft, Warcraft and Blizzard Entertainment are trademarks or registered trademarks of Blizzard Entertainment, Inc." (https://www.blizzard.com/en-us/legal/9c9cb70b-d1ed-4e17-998a-16c6df46be7b/copyright-notices)
