#!/usr/bin/env node
/**
 * Fetch WoW Forever character snapshots from the official Battle.net Profile API
 * and write them under src/data/characters/<member-slug>/<first>-<surname>.json.
 * Also caches WoW Forever talent-tree layouts (positions, ranks, prerequisites,
 * icons) from the Game Data API under src/data/talent-trees/forever-us.json.
 *
 * Auth: client-credentials token from BNET_CLIENT_ID and BNET_CLIENT_SECRET.
 * Those values, and the access token, are never printed.
 *
 * Usage (from the repo root):
 *   node scripts/fetch-characters.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MEMBERS_PATH = join(ROOT, 'src/data/members.ts');
const OUT_DIR = join(ROOT, 'src/data/characters');
const TREE_PATH = join(ROOT, 'src/data/talent-trees/forever-us.json');
const TOKEN_URL = 'https://oauth.battle.net/token';
const LOCALE = 'en_US';
const STATIC_HOST = 'https://us.api.blizzard.com';
const STATIC_NS = 'static-forever-us';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) fail(`Missing ${name}. Set it in the environment (or as a repo secret in CI).`);
  return value;
}

/** Pull wowForever entries out of members.ts without executing it. */
function readMemberTargets(source) {
  const members = [];
  const memberBlocks = source.split(/handle:\s*'/).slice(1);
  for (const block of memberBlocks) {
    const handle = block.match(/^([^']+)'/)?.[1];
    if (!handle) continue;
    const slugMatch = block.match(/slug:\s*'([^']+)'/);
    const slug = (slugMatch?.[1] ?? handle).toLowerCase();
    // Stop at the next handle if present is already how we split.
    const wowSection = block.match(/wowForever:\s*\[([\s\S]*?)\]/)?.[1];
    const characters = [];
    if (wowSection) {
      const re = /\{\s*name:\s*'([^']+)'\s*,\s*surname:\s*'([^']+)'\s*,\s*region:\s*'([^']+)'\s*\}/g;
      let m;
      while ((m = re.exec(wowSection))) {
        characters.push({ name: m[1], surname: m[2], region: m[3] });
      }
    }
    members.push({ handle, slug, characters });
  }
  return members;
}

async function getToken(clientId, clientSecret) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) fail(`Token request failed (${res.status}).`);
  const body = await res.json();
  if (!body.access_token || body.token_type !== 'bearer') fail('Token response was not a bearer token.');
  return body.access_token;
}

function withLocale(url) {
  const u = new URL(url);
  if (!u.searchParams.has('locale')) u.searchParams.set('locale', LOCALE);
  return u.toString();
}

function asEn(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.en_US === 'string') return value.en_US;
  return '';
}

async function apiGet(url, token) {
  const res = await fetch(withLocale(url), { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

function characterSlug(c) {
  return `${c.name}-${c.surname}`.toLowerCase();
}

async function fetchCharacter(token, member, character) {
  const region = character.region;
  const slug = characterSlug(character);
  const ns = `profile-forever-${region}`;
  const base = `https://${region}.api.blizzard.com/profile/wow/character/${encodeURIComponent(slug)}`;
  const q = `namespace=${ns}&locale=${LOCALE}`;
  const endpoints = {
    profile: `${base}?${q}`,
    equipment: `${base}/equipment?${q}`,
    specializations: `${base}/specializations?${q}`,
    media: `${base}/character-media?${q}`,
    professions: `${base}/professions?${q}`,
  };

  const results = {};
  const statuses = {};
  for (const [key, url] of Object.entries(endpoints)) {
    const { status, json } = await apiGet(url, token);
    statuses[key] = status;
    if (status !== 200 || !json) {
      return { ok: false, slug, statuses, error: `${key} returned ${status}` };
    }
    results[key] = json;
  }

  const itemIcons = {};
  const items = results.equipment.equipped_items ?? [];
  for (const item of items) {
    const href = item.media?.key?.href;
    const id = item.item?.id ?? item.media?.id;
    if (!href || id == null || itemIcons[id]) continue;
    const { status, json } = await apiGet(href, token);
    if (status === 200 && json?.assets) {
      const icon = json.assets.find((a) => a.key === 'icon') ?? json.assets[0];
      if (icon?.value) itemIcons[String(id)] = icon.value;
    }
  }

  const snapshot = {
    fetchedAt: new Date().toISOString(),
    memberSlug: member.slug,
    region,
    namespace: ns,
    locale: LOCALE,
    characterSlug: slug,
    profile: results.profile,
    equipment: results.equipment,
    specializations: results.specializations,
    media: results.media,
    professions: results.professions,
    itemIcons,
  };

  const outPath = join(OUT_DIR, member.slug, `${slug}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  return { ok: true, slug, statuses, outPath };
}


async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function compactNode(node) {
  const ranks = (node.ranks ?? []).map((r) => ({
    rank: r.rank,
    description: asEn(r.tooltip?.spell_tooltip?.description),
    spellId: r.tooltip?.spell_tooltip?.spell?.id,
  }));
  const first = node.ranks?.[0]?.tooltip;
  return {
    id: node.id,
    talentId: first?.talent?.id,
    spellId: first?.spell_tooltip?.spell?.id,
    name: asEn(first?.talent?.name),
    maxRank: ranks.length,
    row: node.display_row,
    col: node.display_col,
    lockedBy: node.locked_by ?? [],
    unlocks: node.unlocks ?? [],
    ranks,
  };
}

async function fetchTalentTrees(token) {
  const q = `namespace=${STATIC_NS}&locale=${LOCALE}`;
  const { status, json: index } = await apiGet(`${STATIC_HOST}/data/wow/talent-tree/index?${q}`, token);
  if (status !== 200 || !index) fail(`Talent tree index failed (${status}).`);

  const classes = [];
  for (const tree of index.class_talent_trees ?? []) {
    const href = tree.key?.href;
    const className = tree.name;
    if (!href) continue;
    const { status: treeStatus, json: classTree } = await apiGet(href, token);
    if (treeStatus !== 200 || !classTree) {
      console.error(`FAIL  talent tree ${className}  ${treeStatus}`);
      continue;
    }
    let classId = null;
    const specs = [];
    for (const specRef of classTree.spec_talent_trees ?? []) {
      const specHref = specRef.key?.href;
      if (!specHref) continue;
      const { status: specStatus, json: specTree } = await apiGet(specHref, token);
      if (specStatus !== 200 || !specTree) {
        console.error(`FAIL  talent tree ${className} / ${specRef.name}  ${specStatus}`);
        continue;
      }
      classId = specTree.playable_class?.id ?? classId;
      const nodes = (specTree.spec_talent_nodes ?? []).map(compactNode);
      const cols = nodes.map((n) => n.col);
      const rows = nodes.map((n) => n.row);
      let icon;
      const mediaHref = specTree.media?.key?.href
        ?? (specTree.playable_specialization?.id
          ? `${STATIC_HOST}/data/wow/media/playable-specialization/${specTree.playable_specialization.id}?namespace=${STATIC_NS}&locale=${LOCALE}`
          : null);
      if (mediaHref) {
        const media = await apiGet(mediaHref, token);
        if (media.status === 200) {
          icon = media.json?.assets?.find((a) => a.key === 'icon')?.value;
        }
      }
      specs.push({
        id: specTree.playable_specialization?.id,
        name: asEn(specTree.playable_specialization?.name) || asEn(specTree.name),
        icon,
        minCol: cols.length ? Math.min(...cols) : 1,
        maxCol: cols.length ? Math.max(...cols) : 4,
        minRow: rows.length ? Math.min(...rows) : 1,
        maxRow: rows.length ? Math.max(...rows) : 7,
        nodes,
      });
    }
    classes.push({ id: classId, name: asEn(className) || className, treeId: classTree.id, specializations: specs });
    console.log(`OK  talent tree ${className}  ${specs.length} specs  ${specs.reduce((n, s) => n + s.nodes.length, 0)} nodes`);
  }

  const spellIds = [...new Set(classes.flatMap((c) => c.specializations.flatMap((s) => s.nodes.map((n) => n.spellId).filter(Boolean))))];
  const icons = {};
  await mapPool(spellIds, 6, async (spellId) => {
    const { status: iconStatus, json } = await apiGet(`${STATIC_HOST}/data/wow/media/spell/${spellId}?${q}`, token);
    if (iconStatus === 200) {
      const url = json?.assets?.find((a) => a.key === 'icon')?.value;
      if (url) icons[spellId] = url;
    }
  });
  for (const c of classes) {
    for (const s of c.specializations) {
      for (const n of s.nodes) {
        if (n.spellId && icons[n.spellId]) n.icon = icons[n.spellId];
      }
    }
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    namespace: STATIC_NS,
    locale: LOCALE,
    source: `${STATIC_HOST}/data/wow/talent-tree/index?namespace=${STATIC_NS}`,
    classes,
  };
  mkdirSync(dirname(TREE_PATH), { recursive: true });
  writeFileSync(TREE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`OK  talent trees  ${classes.length} classes  ${Object.keys(icons).length} icons  -> src/data/talent-trees/forever-us.json`);
}

async function main() {
  const clientId = requireEnv('BNET_CLIENT_ID');
  const clientSecret = requireEnv('BNET_CLIENT_SECRET');
  const source = readFileSync(MEMBERS_PATH, 'utf8');
  const members = readMemberTargets(source);
  const treesOnly = process.argv.includes('--trees-only');
  const jobs = members.flatMap((m) => m.characters.map((c) => ({ member: m, character: c })));
  const token = await getToken(clientId, clientSecret);

  if (treesOnly) {
    await fetchTalentTrees(token);
    return;
  }

  if (jobs.length === 0) {
    console.log('No WoW Forever characters listed in src/data/members.ts.');
    await fetchTalentTrees(token);
    return;
  }

  let failed = 0;
  for (const job of jobs) {
    const label = `${job.character.name} ${job.character.surname} (${job.character.region})`;
    const result = await fetchCharacter(token, job.member, job.character);
    const statusSummary = Object.entries(result.statuses)
      .map(([k, v]) => `${k}:${v}`)
      .join(' ');
    if (result.ok) {
      const rel = result.outPath.slice(ROOT.length + 1);
      console.log(`OK  ${label}  ${statusSummary}  -> ${rel}`);
    } else {
      failed += 1;
      console.error(`FAIL  ${label}  ${statusSummary}  ${result.error}`);
    }
  }
  if (failed) fail(`${failed} character(s) failed.`);
  await fetchTalentTrees(token);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
