#!/usr/bin/env node
/**
 * Fetch WoW Forever character snapshots from the official Battle.net Profile API
 * and write them under src/data/characters/<member-slug>/<first>-<surname>.json.
 * Each snapshot includes profile, equipment, specializations, media, professions,
 * and character statistics (totals such as health, attributes, and combat ratings)
 * from the Profile API /statistics endpoint. A missing statistics response does
 * not fail the rest of the snapshot. Also caches WoW Forever talent-tree layouts
 * (positions, ranks, prerequisites, and spell icons) from the Game Data API under
 * src/data/talent-trees/forever-us.json, and official profession icons under
 * src/data/professions/forever-us.json.
 * Spell and profession media requests retry with backoff so rate limits do not
 * leave blank icons. Out-of-range display coordinates from the API are snapped
 * back onto the tree so a typo like row 63 cannot stretch the layout.
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
const PROFESSION_PATH = join(ROOT, 'src/data/professions/forever-us.json');
/** Classic profession skill spell IDs, used only if profession media has no icon. */
const CLASSIC_PROFESSION_SPELLS = {
  129: 3273,
  164: 2018,
  165: 2108,
  171: 2259,
  182: 2366,
  185: 2550,
  186: 2575,
  197: 3908,
  202: 4036,
  333: 7411,
  356: 7620,
  393: 8613,
};
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
    if (/\bhidden:\s*true\b/.test(block)) {
      console.log(`SKIP  hidden member ${handle}`);
      continue;
    }
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt, retryAfterHeader) {
  const hinted = Number(retryAfterHeader);
  if (Number.isFinite(hinted) && hinted >= 0) return Math.min(30_000, hinted * 1000);
  const base = Math.min(8_000, 400 * 2 ** attempt);
  return base + Math.floor(Math.random() * 250);
}

async function apiGet(url, token, { tries = 6 } = {}) {
  let lastStatus = 0;
  for (let attempt = 0; attempt < tries; attempt += 1) {
    try {
      const res = await fetch(withLocale(url), { headers: { Authorization: `Bearer ${token}` } });
      lastStatus = res.status;
      if (res.status === 429 || res.status >= 500) {
        if (attempt === tries - 1) {
          const text = await res.text();
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = null;
          }
          return { status: res.status, json };
        }
        await sleep(retryDelayMs(attempt, res.headers.get('retry-after')));
        continue;
      }
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      return { status: res.status, json };
    } catch {
      if (attempt === tries - 1) return { status: lastStatus || 0, json: null };
      await sleep(retryDelayMs(attempt));
    }
  }
  return { status: lastStatus || 0, json: null };
}

function mediaIcon(json) {
  return json?.assets?.find((a) => a.key === 'icon')?.value ?? json?.assets?.[0]?.value ?? '';
}

async function fetchSpellIcon(token, spellId) {
  if (!spellId) return '';
  const { status, json } = await apiGet(
    `${STATIC_HOST}/data/wow/media/spell/${spellId}?namespace=${STATIC_NS}&locale=${LOCALE}`,
    token,
  );
  return status === 200 ? mediaIcon(json) : '';
}

async function fetchTalentIcon(token, talentId) {
  if (!talentId) return '';
  const { status, json } = await apiGet(
    `${STATIC_HOST}/data/wow/media/talent/${talentId}?namespace=${STATIC_NS}&locale=${LOCALE}`,
    token,
  );
  return status === 200 ? mediaIcon(json) : '';
}

async function fetchProfessionMediaIcon(token, professionId) {
  if (!professionId) return '';
  const { status, json } = await apiGet(
    `${STATIC_HOST}/data/wow/media/profession/${professionId}?namespace=${STATIC_NS}&locale=${LOCALE}`,
    token,
  );
  return status === 200 ? mediaIcon(json) : '';
}

function characterSlug(c) {
  return `${c.name}-${c.surname}`.toLowerCase();
}

function compactStatistics(json) {
  if (!json || typeof json !== 'object') return undefined;
  const { _links, character, ...rest } = json;
  return Object.keys(rest).length ? rest : undefined;
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

  // Statistics are the character's true totals. Keep the rest of the snapshot
  // if this endpoint is missing so a 404 cannot block equipment or talents.
  const statisticsRes = await apiGet(`${base}/statistics?${q}`, token);
  statuses.statistics = statisticsRes.status;
  const statistics = compactStatistics(statisticsRes.status === 200 ? statisticsRes.json : null);

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
  if (statistics) snapshot.statistics = statistics;

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

function typoCorrect(value, clusterMin, clusterMax) {
  if (value >= clusterMin && value <= clusterMax) return value;
  const digits = String(value);
  for (let i = 1; i < digits.length; i += 1) {
    const head = Number(digits.slice(0, i));
    if (head >= clusterMin && head <= clusterMax) return head;
  }
  return value;
}

/** Tightest range that still holds the dense classic 4×7 talent block. */
function denseRange(values, maxSpan) {
  const sorted = [...values].sort((a, b) => a - b);
  let bestMin = sorted[0];
  let bestMax = sorted[0];
  let bestCount = 1;
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i; j < sorted.length; j += 1) {
      if (sorted[j] - sorted[i] > maxSpan) break;
      const count = j - i + 1;
      const span = sorted[j] - sorted[i];
      const bestSpan = bestMax - bestMin;
      if (count > bestCount || (count === bestCount && span < bestSpan)) {
        bestMin = sorted[i];
        bestMax = sorted[j];
        bestCount = count;
      }
    }
  }
  return { min: bestMin, max: bestMax };
}

/** Snap API display typo coordinates (row 63, col 170, …) back onto the dense tree. */
function normalizeSpecNodes(nodes) {
  if (nodes.length === 0) return nodes;
  const rows = nodes.map((n) => n.row);
  const cols = nodes.map((n) => n.col);
  const rowRange = denseRange(rows, 8);
  const colRange = denseRange(cols, 5);
  const rMin = rowRange.min;
  const rMax = rowRange.max;
  const cMin = colRange.min;
  const cMax = colRange.max;
  const inCluster = (row, col) => row >= rMin && row <= rMax && col >= cMin && col <= cMax;
  const occupied = new Set(
    nodes.filter((n) => inCluster(n.row, n.col)).map((n) => `${n.row},${n.col}`),
  );
  const result = [];
  for (const node of nodes) {
    if (inCluster(node.row, node.col)) {
      result.push(node);
      continue;
    }
    const row = typoCorrect(node.row, rMin, rMax);
    const col = typoCorrect(node.col, cMin, cMax);
    const duplicate = result.find((other) => other.name === node.name && other.spellId === node.spellId);
    if (duplicate && !inCluster(row, col)) {
      const aliases = new Set([...(duplicate.aliasTalentIds ?? []), node.talentId].filter(Boolean));
      duplicate.aliasTalentIds = [...aliases];
      continue;
    }
    const next = { ...node, row, col };
    if (!inCluster(next.row, next.col)) {
      outer: for (let r = rMax; r >= rMin; r -= 1) {
        for (let c = cMax; c >= cMin; c -= 1) {
          if (!occupied.has(`${r},${c}`)) {
            next.row = r;
            next.col = c;
            break outer;
          }
        }
      }
    }
    occupied.add(`${next.row},${next.col}`);
    result.push(next);
  }
  return result;
}

async function resolveNodeIcon(token, node, cache) {
  const spellIds = [
    node.spellId,
    ...(node.ranks ?? []).map((r) => r.spellId),
  ].filter((id, i, all) => id && all.indexOf(id) === i);
  for (const spellId of spellIds) {
    const key = `spell:${spellId}`;
    if (!Object.prototype.hasOwnProperty.call(cache, key)) {
      cache[key] = await fetchSpellIcon(token, spellId);
    }
    if (cache[key]) return cache[key];
  }
  if (node.talentId) {
    const key = `talent:${node.talentId}`;
    if (!Object.prototype.hasOwnProperty.call(cache, key)) {
      cache[key] = await fetchTalentIcon(token, node.talentId);
    }
    if (cache[key]) return cache[key];
  }
  return '';
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
      const nodes = normalizeSpecNodes((specTree.spec_talent_nodes ?? []).map(compactNode));
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
          icon = mediaIcon(media.json);
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

  const nodes = classes.flatMap((c) => c.specializations.flatMap((s) => s.nodes));
  const cache = {};
  await mapPool(nodes, 3, async (node) => {
    const icon = await resolveNodeIcon(token, node, cache);
    if (icon) node.icon = icon;
  });
  const withIcons = nodes.filter((n) => n.icon).length;
  const missing = nodes.length - withIcons;
  if (missing) {
    const names = nodes.filter((n) => !n.icon).map((n) => n.name || `node ${n.id}`);
    console.error(`WARN  ${missing} talent icon(s) unavailable after retries: ${names.join(', ')}`);
  }
  console.log(`OK  talent icons  ${withIcons}/${nodes.length}  (${missing} unavailable)`);

  const payload = {
    fetchedAt: new Date().toISOString(),
    namespace: STATIC_NS,
    locale: LOCALE,
    source: `${STATIC_HOST}/data/wow/talent-tree/index?namespace=${STATIC_NS}`,
    classes,
  };
  mkdirSync(dirname(TREE_PATH), { recursive: true });
  writeFileSync(TREE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`OK  talent trees  ${classes.length} classes  ${withIcons} icons  -> src/data/talent-trees/forever-us.json`);
}

async function fetchProfessionIcons(token) {
  const q = `namespace=${STATIC_NS}&locale=${LOCALE}`;
  const { status, json: index } = await apiGet(`${STATIC_HOST}/data/wow/profession/index?${q}`, token);
  if (status !== 200 || !index) fail(`Profession index failed (${status}).`);

  const professions = [];
  let missing = 0;
  for (const entry of index.professions ?? []) {
    const id = entry.id;
    const name = asEn(entry.name) || entry.name || '';
    let icon = await fetchProfessionMediaIcon(token, id);
    let source = icon ? 'profession-media' : '';
    if (!icon && CLASSIC_PROFESSION_SPELLS[id]) {
      icon = await fetchSpellIcon(token, CLASSIC_PROFESSION_SPELLS[id]);
      if (icon) source = 'spell-media';
    }
    if (!icon) {
      missing += 1;
      console.error(`WARN  profession icon unavailable after retries: ${name || id}`);
    }
    professions.push({ id, name, icon: icon || undefined, iconSource: source || undefined });
  }

  const withIcons = professions.filter((p) => p.icon).length;
  const payload = {
    fetchedAt: new Date().toISOString(),
    namespace: STATIC_NS,
    locale: LOCALE,
    source: `${STATIC_HOST}/data/wow/profession/index?namespace=${STATIC_NS}`,
    professions,
  };
  mkdirSync(dirname(PROFESSION_PATH), { recursive: true });
  writeFileSync(PROFESSION_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`OK  profession icons  ${withIcons}/${professions.length}  (${missing} unavailable)  -> src/data/professions/forever-us.json`);
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
    await fetchProfessionIcons(token);
    return;
  }

  if (jobs.length === 0) {
    console.log('No WoW Forever characters listed in src/data/members.ts.');
    await fetchTalentTrees(token);
    await fetchProfessionIcons(token);
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
  await fetchProfessionIcons(token);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
