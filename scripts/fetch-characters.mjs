#!/usr/bin/env node
/**
 * Fetch WoW Forever character snapshots from the official Battle.net Profile API
 * and write them under src/data/characters/<member-slug>/<first>-<surname>.json.
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
const SQUAD_PATH = join(ROOT, 'src/data/squad.ts');
const OUT_DIR = join(ROOT, 'src/data/characters');
const TOKEN_URL = 'https://oauth.battle.net/token';
const LOCALE = 'en_US';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) fail(`Missing ${name}. Set it in the environment (or as a repo secret in CI).`);
  return value;
}

/** Pull wowForever entries out of squad.ts without executing it. */
function readSquadTargets(source) {
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

async function apiGet(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
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

async function main() {
  const clientId = requireEnv('BNET_CLIENT_ID');
  const clientSecret = requireEnv('BNET_CLIENT_SECRET');
  const source = readFileSync(SQUAD_PATH, 'utf8');
  const members = readSquadTargets(source);
  const jobs = members.flatMap((m) => m.characters.map((c) => ({ member: m, character: c })));
  if (jobs.length === 0) {
    console.log('No WoW Forever characters listed in src/data/squad.ts.');
    return;
  }

  const token = await getToken(clientId, clientSecret);
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
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
