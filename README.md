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
| `/streaming/` | `src/pages/streaming.astro` (DapperNanner & The Nannerati) |
| `/community/` | `src/pages/community.astro` (Discord section) |

## Common edits

- **Discord invite:** set `DISCORD_INVITE_URL` in `src/lib/site.ts`. While it is empty, every Discord button shows a "coming soon" placeholder.
- **Stream channel links / schedule:** `channels` list at the top of `src/pages/streaming.astro`.
- **Nav & network links:** `NAV` / `NETWORKS` in `src/lib/site.ts`.
- **Images:** optimized WebP files live in `public/images/`. Resize/compress new art to WebP before committing.
- **Custom domain:** `public/CNAME` must stay `gaming.top-notchnetwork.com`.

## CI / deploy

- `.github/workflows/ci.yml`: `build` job on pull requests and pushes to `main` (`npm ci && npm run build`, plus a CNAME check).
- `.github/workflows/deploy.yml`: builds with `withastro/action` and deploys to GitHub Pages on push to `main`. Requires the repo's Pages source to be set to **GitHub Actions**.

The previous Jekyll (Chirpy) site is preserved on the `jekyll-backup` branch.
