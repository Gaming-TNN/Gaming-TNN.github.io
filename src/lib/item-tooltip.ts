import type { EquippedItem, TooltipColor } from './characters';

export function tooltipRgb(color?: TooltipColor): string | undefined {
  if (!color || color.r == null || color.g == null || color.b == null) return undefined;
  if (color.r === 255 && color.g === 255 && color.b === 255) return undefined;
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function itemTypeLine(item: EquippedItem): string {
  const slot = item.inventory_type?.name || item.slot?.name || '';
  const sub = item.is_subclass_hidden ? '' : (item.item_subclass?.name ?? '');
  return [slot, sub].filter(Boolean).join('  ·  ');
}

export function sellPriceParts(item: EquippedItem): { gold: number; silver: number; copper: number } | undefined {
  const d = item.sell_price?.display_strings;
  if (!d) return undefined;
  const gold = Number(d.gold || 0);
  const silver = Number(d.silver || 0);
  const copper = Number(d.copper || 0);
  if (!gold && !silver && !copper && !item.sell_price?.value) return undefined;
  return { gold, silver, copper };
}
