// Format Battle.net character statistics for the character page panel.
// Only values present on the snapshot are shown; nothing is invented.

import type { CharacterSnapshot } from './characters';

export interface CharacterStatistics {
  health?: number;
  power?: number;
  power_type?: { name?: string; id?: number; type?: string };
  speed?: RatingStat;
  strength?: BaseEffective;
  agility?: BaseEffective;
  intellect?: BaseEffective;
  stamina?: BaseEffective;
  spirit?: BaseEffective;
  melee_crit?: RatingStat;
  melee_haste?: RatingStat;
  mastery?: RatingStat;
  bonus_armor?: number;
  lifesteal?: RatingStat;
  versatility?: number;
  versatility_damage_done_bonus?: number;
  versatility_healing_done_bonus?: number;
  versatility_damage_taken_bonus?: number;
  avoidance?: RatingStat;
  attack_power?: number;
  main_hand_damage_min?: number;
  main_hand_damage_max?: number;
  main_hand_speed?: number;
  main_hand_dps?: number;
  off_hand_damage_min?: number;
  off_hand_damage_max?: number;
  off_hand_speed?: number;
  off_hand_dps?: number;
  spell_power?: number;
  spell_penetration?: number;
  spell_crit?: RatingStat;
  mana_regen?: number;
  mana_regen_combat?: number;
  armor?: BaseEffective;
  dodge?: RatingStat;
  parry?: RatingStat;
  block?: RatingStat;
  ranged_crit?: RatingStat;
  ranged_haste?: RatingStat;
  spell_haste?: RatingStat;
  defense?: BaseEffective;
  fire_resistance?: BaseEffective;
  shadow_resistance?: BaseEffective;
  nature_resistance?: BaseEffective;
  arcane_resistance?: BaseEffective;
  frost_resistance?: BaseEffective;
  movement_speed?: number;
  ranged_attack_power?: number;
  ranged_damage_min?: number;
  ranged_damage_max?: number;
  expertise?: number;
  off_hand_expertise?: number;
  armor_penetration?: number;
  spell_healing?: number;
  melee_hit?: RatingStat;
  off_hand_hit?: RatingStat;
  ranged_hit?: RatingStat;
  spell_hit?: RatingStat;
}

export interface BaseEffective {
  base?: number;
  effective?: number;
}

export interface RatingStat {
  rating_bonus?: number;
  value?: number;
  rating_normalized?: number;
}

export interface StatRow {
  label: string;
  value: string;
}

export interface StatGroup {
  id: string;
  title: string;
  rows: StatRow[];
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasKey<T extends object>(obj: T, key: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key) && obj[key] != null;
}

function totalOf(stat: BaseEffective | undefined): number | undefined {
  if (!stat) return undefined;
  if (isNumber(stat.effective)) return stat.effective;
  if (isNumber(stat.base)) return stat.base;
  return undefined;
}

function ratingValue(stat: RatingStat | undefined): number | undefined {
  if (!stat || !isNumber(stat.value)) return undefined;
  return stat.value;
}

function formatInt(value: number): string {
  const rounded = Math.round(value);
  return rounded.toLocaleString('en-US');
}

function formatDecimal(value: number, digits: number): string {
  const fixed = value.toFixed(digits);
  return digits > 0 ? fixed.replace(/\.?0+$/, '') || '0' : fixed;
}

function formatPct(value: number): string {
  return `${formatDecimal(value, 2)}%`;
}

function formatRange(min: number, max: number): string {
  return `${formatInt(min)}–${formatInt(max)}`;
}

function intRow(label: string, value: number | undefined): StatRow | undefined {
  if (!isNumber(value)) return undefined;
  return { label, value: formatInt(value) };
}

function attrRow(label: string, stat: BaseEffective | undefined): StatRow | undefined {
  const total = totalOf(stat);
  if (!isNumber(total)) return undefined;
  return { label, value: formatInt(total) };
}

function pctRow(label: string, value: number | undefined): StatRow | undefined {
  if (!isNumber(value)) return undefined;
  return { label, value: formatPct(value) };
}

function decimalRow(label: string, value: number | undefined, digits: number): StatRow | undefined {
  if (!isNumber(value)) return undefined;
  return { label, value: formatDecimal(value, digits) };
}

function fixedRow(label: string, value: number | undefined, digits: number): StatRow | undefined {
  if (!isNumber(value)) return undefined;
  return { label, value: value.toFixed(digits) };
}

function isNonZero(value: number | undefined): boolean {
  return isNumber(value) && value !== 0;
}

function push(rows: StatRow[], row: StatRow | undefined) {
  if (row) rows.push(row);
}

/** Retail-only leftovers: show only when the API returns a non-zero total. */
function maybeRetailPct(label: string, value: number | undefined): StatRow | undefined {
  if (!isNonZero(value)) return undefined;
  return pctRow(label, value);
}

export function characterStatGroups(snapshot: CharacterSnapshot | undefined): StatGroup[] {
  const stats = snapshot?.statistics;
  if (!stats) return [];

  const groups: StatGroup[] = [];

  const base: StatRow[] = [];
  push(base, intRow('Health', stats.health));
  if (hasKey(stats, 'power')) {
    const powerName = stats.power_type?.name?.trim() || 'Power';
    push(base, intRow(powerName, stats.power));
  }
  push(base, attrRow('Strength', stats.strength));
  push(base, attrRow('Agility', stats.agility));
  push(base, attrRow('Stamina', stats.stamina));
  push(base, attrRow('Intellect', stats.intellect));
  push(base, attrRow('Spirit', stats.spirit));
  if (base.length) groups.push({ id: 'base', title: 'Base Attributes', rows: base });

  const melee: StatRow[] = [];
  push(melee, intRow('Attack Power', stats.attack_power));
  if (isNumber(stats.main_hand_damage_min) && isNumber(stats.main_hand_damage_max)) {
    melee.push({ label: 'Main Hand Damage', value: formatRange(stats.main_hand_damage_min, stats.main_hand_damage_max) });
  }
  push(melee, fixedRow('Main Hand Speed', stats.main_hand_speed, 2));
  push(melee, decimalRow('Main Hand DPS', stats.main_hand_dps, 1));
  const hasOffHand =
    isNonZero(stats.off_hand_dps) || isNonZero(stats.off_hand_damage_min) || isNonZero(stats.off_hand_damage_max);
  if (hasOffHand) {
    if (isNumber(stats.off_hand_damage_min) && isNumber(stats.off_hand_damage_max)) {
      melee.push({ label: 'Off Hand Damage', value: formatRange(stats.off_hand_damage_min, stats.off_hand_damage_max) });
    }
    push(melee, fixedRow('Off Hand Speed', stats.off_hand_speed, 2));
    push(melee, decimalRow('Off Hand DPS', stats.off_hand_dps, 1));
  }
  push(melee, pctRow('Melee Crit', ratingValue(stats.melee_crit)));
  push(melee, pctRow('Melee Hit', ratingValue(stats.melee_hit)));
  push(melee, maybeRetailPct('Melee Haste', ratingValue(stats.melee_haste)));
  if (isNonZero(stats.expertise)) push(melee, pctRow('Expertise', stats.expertise));
  if (hasOffHand && isNonZero(stats.off_hand_expertise)) {
    push(melee, pctRow('Off Hand Expertise', stats.off_hand_expertise));
  }
  if (isNonZero(stats.armor_penetration)) push(melee, pctRow('Armor Penetration', stats.armor_penetration));

  const hasRanged =
    isNonZero(stats.ranged_attack_power) ||
    isNonZero(stats.ranged_damage_min) ||
    isNonZero(stats.ranged_damage_max) ||
    isNonZero(ratingValue(stats.ranged_crit)) ||
    isNonZero(ratingValue(stats.ranged_hit));
  if (hasRanged) {
    push(melee, intRow('Ranged Attack Power', stats.ranged_attack_power));
    if (isNumber(stats.ranged_damage_min) && isNumber(stats.ranged_damage_max)) {
      melee.push({
        label: 'Ranged Damage',
        value: formatRange(stats.ranged_damage_min, stats.ranged_damage_max),
      });
    }
    push(melee, pctRow('Ranged Crit', ratingValue(stats.ranged_crit)));
    push(melee, pctRow('Ranged Hit', ratingValue(stats.ranged_hit)));
    push(melee, maybeRetailPct('Ranged Haste', ratingValue(stats.ranged_haste)));
  }
  if (melee.length) groups.push({ id: 'melee', title: 'Melee / Ranged', rows: melee });

  const usesMana = (stats.power_type?.name ?? '').toLowerCase() === 'mana';
  const spell: StatRow[] = [];
  const spellPower = hasKey(stats, 'spell_power') ? stats.spell_power : undefined;
  const spellHealing = hasKey(stats, 'spell_healing') ? stats.spell_healing : undefined;
  const spellCrit = ratingValue(stats.spell_crit);
  const spellHit = ratingValue(stats.spell_hit);
  const spellHaste = ratingValue(stats.spell_haste);
  const spellPen = hasKey(stats, 'spell_penetration') ? stats.spell_penetration : undefined;
  const manaRegen = hasKey(stats, 'mana_regen') ? stats.mana_regen : undefined;
  const manaRegenCombat = hasKey(stats, 'mana_regen_combat') ? stats.mana_regen_combat : undefined;
  const showSpell =
    usesMana ||
    isNonZero(spellPower) ||
    isNonZero(spellHealing) ||
    isNonZero(spellCrit) ||
    isNonZero(spellHit) ||
    isNonZero(spellHaste) ||
    isNonZero(spellPen) ||
    isNonZero(manaRegen) ||
    isNonZero(manaRegenCombat);
  if (showSpell) {
    push(spell, intRow('Spell Power', spellPower));
    push(spell, intRow('Healing', spellHealing));
    push(spell, pctRow('Spell Crit', spellCrit));
    push(spell, pctRow('Spell Hit', spellHit));
    push(spell, maybeRetailPct('Spell Haste', spellHaste));
    if (isNonZero(spellPen)) push(spell, intRow('Spell Penetration', spellPen));
    if (usesMana || isNonZero(manaRegen)) push(spell, decimalRow('Mana Regen', manaRegen, 1));
    if (usesMana || isNonZero(manaRegenCombat)) push(spell, decimalRow('Combat Mana Regen', manaRegenCombat, 1));
  }
  if (spell.length) groups.push({ id: 'spell', title: 'Spell', rows: spell });

  const defense: StatRow[] = [];
  push(defense, attrRow('Armor', stats.armor));
  push(defense, attrRow('Defense', stats.defense));
  push(defense, pctRow('Dodge', ratingValue(stats.dodge)));
  push(defense, pctRow('Parry', ratingValue(stats.parry)));
  push(defense, pctRow('Block', ratingValue(stats.block)));
  push(defense, maybeRetailPct('Mastery', ratingValue(stats.mastery)));
  if (isNonZero(stats.versatility)) push(defense, pctRow('Versatility', stats.versatility));
  push(defense, maybeRetailPct('Leech', ratingValue(stats.lifesteal)));
  push(defense, maybeRetailPct('Avoidance', ratingValue(stats.avoidance)));
  if (isNumber(stats.movement_speed)) {
    defense.push({ label: 'Movement Speed', value: formatPct(stats.movement_speed) });
  }
  if (defense.length) groups.push({ id: 'defense', title: 'Defense', rows: defense });

  const resists: StatRow[] = [];
  push(resists, attrRow('Arcane', stats.arcane_resistance));
  push(resists, attrRow('Fire', stats.fire_resistance));
  push(resists, attrRow('Nature', stats.nature_resistance));
  push(resists, attrRow('Frost', stats.frost_resistance));
  push(resists, attrRow('Shadow', stats.shadow_resistance));
  if (resists.length) groups.push({ id: 'resistances', title: 'Resistances', rows: resists });

  return groups;
}
