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
- **Character snapshots:** `src/data/characters/<member-slug>/<first>-<surname>.json`. Refresh locally with `npm run fetch-characters` (requires `BNET_CLIENT_ID` and `BNET_CLIENT_SECRET` in the environment; never commit those values). The script and the refresh workflow skip members with `hidden: true`. The same script also caches WoW Forever talent-tree layouts (rows, columns, ranks, prerequisites, and spell icons) from the Blizzard Game Data API `static-forever-us` namespace to `src/data/talent-trees/forever-us.json`, and official profession icons to `src/data/professions/forever-us.json` (profession media, with classic profession spell media as a fallback). Media requests retry with backoff so rate limits do not leave blank talent or profession icons. Pass `--trees-only` to refresh just the talent-tree and profession-icon caches. A GitHub Action (`.github/workflows/refresh-characters.yml`) runs the same script every 15 minutes and on `workflow_dispatch`. A concurrency group (`refresh-characters`) prevents overlapping runs without cancelling one already in progress. If nothing changed, it exits without opening a PR or touching the data branch. If the only changes are under `src/data/characters/`, `src/data/talent-trees/`, and `src/data/professions/` and the workflow is running on the default branch, it reuses a single fixed `data/wow-characters` branch (brought up to date with `main` by a normal merge or fast-forward, never a force-push), commits the new data, opens or updates one PR, and squash-merges once the required `build` check passes. With `DATA_PR_TOKEN` (a narrowly scoped PAT), the data branch is pushed and the PR is opened/merged as that user so `pull_request` CI runs normally; the workflow waits for that `build` check and does not dispatch `ci.yml`. A PAT squash-merge is a push to `main` and starts `deploy.yml` itself; the workflow only dispatches deploy if that run does not appear. Without the PAT, `ci.yml` and `deploy.yml` are dispatched with `GITHUB_TOKEN` (because `GITHUB_TOKEN` pushes do not trigger those workflows). Changes outside those data paths stay as a normal PR and need Seth's go-ahead. The data branch is not deleted after merge. A weekly workflow (`.github/workflows/cleanup-workflow-runs.yml`) deletes completed Actions *runs* older than 7 days via the GitHub API; it does not delete branches. Repository Actions artifact/log retention is set to 5 days (this also applies to workflow run records for new runs). Add `BNET_CLIENT_ID` and `BNET_CLIENT_SECRET` as repository secrets before the refresh can run; do not commit those values.
- **Nav & network links:** `NAV` / `NETWORKS` in `src/lib/site.ts`.
- **Images:** resize/compress new art (WebP preferred) before committing to `public/`.
- **Custom domain:** `public/CNAME` must stay `gaming.top-notchnetwork.com`.

## CI / deploy

- `.github/workflows/ci.yml`: `build` job on pull requests and pushes to `main` (`npm ci && npm run build`, plus a CNAME check).
- `.github/workflows/deploy.yml`: builds with `withastro/action` and deploys to GitHub Pages on push to `main`. Requires the repo's Pages source to be set to **GitHub Actions**.
- `.github/workflows/refresh-characters.yml`: every 15 minutes (and on `workflow_dispatch`), fetches character snapshots, the talent-tree cache, and profession icons. If nothing changed, it stops there. Otherwise it reuses the fixed `data/wow-characters` branch (merge or fast-forward from `main`, never a force-push) and opens or updates one PR. Data-only PRs targeting the default branch are squash-merged automatically after the required `build` check passes. With `DATA_PR_TOKEN`, the workflow waits for the `pull_request` `build` check (it does not dispatch `ci.yml`) and relies on the PAT merge to trigger `deploy.yml` on push, dispatching deploy only if that run is missing. Without the PAT, `ci.yml` and `deploy.yml` are dispatched with `GITHUB_TOKEN`. Any other files leave the PR open for review. Needs `BNET_CLIENT_ID` and `BNET_CLIENT_SECRET`. The data branch is not deleted.
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
