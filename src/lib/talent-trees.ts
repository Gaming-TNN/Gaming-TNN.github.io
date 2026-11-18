import type { CharacterSnapshot } from './characters';
import { activeSpecializations } from './characters';
import treeData from '../data/talent-trees/forever-us.json';

export interface TalentRank {
  rank: number;
  description: string;
  spellId?: number;
}

export interface TalentNode {
  id: number;
  talentId: number;
  spellId?: number;
  name: string;
  maxRank: number;
  row: number;
  col: number;
  lockedBy: number[];
  unlocks: number[];
  ranks: TalentRank[];
  icon?: string;
}

export interface TalentSpecTree {
  id: number;
  name: string;
  icon?: string;
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
  nodes: TalentNode[];
}

export interface TalentClassTrees {
  id: number;
  name: string;
  treeId: number;
  specializations: TalentSpecTree[];
}

export interface TalentNodeView extends TalentNode {
  gridCol: number;
  gridRow: number;
  rank: number;
  available: boolean;
  description: string;
}

export interface TalentEdge {
  fromCol: number;
  fromRow: number;
  toCol: number;
  toRow: number;
}

export interface TalentSpecView {
  id: number;
  name: string;
  shortName: string;
  icon?: string;
  points: number;
  cols: number;
  rows: number;
  nodes: TalentNodeView[];
  edges: TalentEdge[];
}

const catalog = treeData as { fetchedAt: string; namespace: string; source: string; classes: TalentClassTrees[] };

export const TALENT_TREE_SOURCE = {
  fetchedAt: catalog.fetchedAt,
  namespace: catalog.namespace,
  source: catalog.source,
};

/** Display name for a spec tree (Elemental Combat → Elemental). */
export function specShortName(name: string): string {
  return name.replace(/ Combat$/, '').replace(/ Magic$/, '');
}

export function classTalentTrees(classId?: number, className?: string): TalentClassTrees | undefined {
  if (classId != null) {
    const byId = catalog.classes.find((c) => c.id === classId);
    if (byId) return byId;
  }
  if (className) {
    return catalog.classes.find((c) => c.name.toLowerCase() === className.toLowerCase());
  }
  return undefined;
}

/** Map of talent ID → spent rank from the character snapshot. */
export function spentTalentRanks(snapshot: CharacterSnapshot | undefined): Map<number, number> {
  const spent = new Map<number, number>();
  const groups = snapshot?.specializations?.specialization_groups ?? [];
  const list = groups.length ? groups : [{ specializations: activeSpecializations(snapshot) }];
  for (const group of list) {
    for (const spec of group.specializations ?? []) {
      for (const talent of spec.talents ?? []) {
        const id = talent.talent?.id;
        if (id == null) continue;
        spent.set(id, talent.talent_rank ?? 0);
      }
    }
  }
  return spent;
}

export function pointsInTree(tree: TalentSpecTree, spent: Map<number, number>): number {
  return tree.nodes.reduce((sum, node) => sum + (spent.get(node.talentId) ?? 0), 0);
}

function prerequisiteMet(node: TalentNode, byId: Map<number, TalentNode>, spent: Map<number, number>): boolean {
  return (node.lockedBy ?? []).every((id) => {
    const pre = byId.get(id);
    if (!pre) return true;
    return (spent.get(pre.talentId) ?? 0) >= pre.maxRank;
  });
}

export function buildSpecView(tree: TalentSpecTree, spent: Map<number, number>): TalentSpecView {
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const points = pointsInTree(tree, spent);
  const minCol = tree.minCol;
  const minRow = tree.minRow;
  const nodes: TalentNodeView[] = tree.nodes.map((node) => {
    const rank = spent.get(node.talentId) ?? 0;
    const rowIndex = node.row - minRow; // 0-based tier
    const tierUnlocked = points >= rowIndex * 5;
    const available = rank > 0 || (tierUnlocked && prerequisiteMet(node, byId, spent));
    const descRank = rank > 0 ? rank : 1;
    const description = node.ranks.find((r) => r.rank === descRank)?.description ?? node.ranks[0]?.description ?? '';
    return {
      ...node,
      gridCol: node.col - minCol + 1,
      gridRow: node.row - minRow + 1,
      rank,
      available,
      description,
    };
  });

  const byGrid = new Map(nodes.map((n) => [n.id, n]));
  const edges: TalentEdge[] = [];
  for (const node of nodes) {
    for (const targetId of node.unlocks ?? []) {
      const target = byGrid.get(targetId);
      if (!target) continue;
      edges.push({
        fromCol: node.gridCol,
        fromRow: node.gridRow,
        toCol: target.gridCol,
        toRow: target.gridRow,
      });
    }
  }

  return {
    id: tree.id,
    name: tree.name,
    shortName: specShortName(tree.name),
    icon: tree.icon,
    points,
    cols: tree.maxCol - tree.minCol + 1,
    rows: tree.maxRow - tree.minRow + 1,
    nodes,
    edges,
  };
}

export function buildClassViews(snapshot: CharacterSnapshot | undefined): TalentSpecView[] {
  const classId = snapshot?.profile?.character_class?.id;
  const className = snapshot?.profile?.character_class?.name;
  const trees = classTalentTrees(classId, className);
  if (!trees) return [];
  const spent = spentTalentRanks(snapshot);
  return trees.specializations.map((spec) => buildSpecView(spec, spent));
}
