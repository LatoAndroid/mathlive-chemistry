import { Atom } from '../core/atom-class';
import { Box } from '../core/box';
import type { Context } from '../core/context';
import type { AtomJson, ToLatexOptions } from '../core/types';

import { defineFunction } from './definitions-utils';

type BondKind = '-' | '=' | '#';

type FormulaRun = {
  text: string;
  subscript?: boolean;
};

type Branch = {
  bond: BondKind;
  label: string;
};

type LinearAtom = {
  label: string;
  branches: Branch[];
};

type LinearChemfig = {
  kind: 'linear';
  atoms: LinearAtom[];
  bonds: BondKind[];
};

type RingChemfig = {
  kind: 'ring';
  size: 6;
  bonds: BondKind[];
  branches: (Branch & { vertex: number })[];
};

type ChemfigStructure = LinearChemfig | RingChemfig;

type SvgBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const BOND_KINDS = new Set(['-', '=', '#']);
const LABEL_FONT_SIZE = 0.9;
const SUBSCRIPT_FONT_SIZE = 0.62;
const LABEL_ASCENT = 0.9;
const LABEL_DESCENT = 0.24;
const SVG_X_PADDING = 0.04;
const SVG_Y_PADDING = 0.12;
const TEXT_BOUND_PADDING = 0.05;
const LABEL_GLYPH_WIDTH = 0.64;
const SUBSCRIPT_GLYPH_WIDTH = 0.32;

export class ChemfigAtom extends Atom {
  private readonly arg: string;
  private readonly structure: ChemfigStructure | null;
  private readonly _verbatimLatex: string;

  constructor(arg: string) {
    super({ type: 'chemfig', command: '\\chemfig', mode: 'math' });

    this.arg = arg;
    this.structure = parseChemfig(arg);
    this._verbatimLatex = '\\chemfig{' + arg + '}';
    this.verbatimLatex = this._verbatimLatex;
    this.captureSelection = true;
  }

  static fromJson(json: AtomJson): ChemfigAtom {
    return new ChemfigAtom(json.arg ?? '');
  }

  toJson(): AtomJson {
    return { ...super.toJson(), arg: this.arg };
  }

  render(context: Context): Box {
    const box = this.structure
      ? renderChemfig(this.structure, this.isSelected)
      : renderUnsupportedChemfig(this.arg, this.isSelected);

    if (this.caret) box.caret = this.caret;
    return this.bind(context, box)!;
  }

  _serialize(_options: ToLatexOptions): string {
    return this._verbatimLatex;
  }
}

defineFunction('chemfig', '{chemfig:balanced-string}', {
  createAtom: (options): Atom => new ChemfigAtom(String(options.args?.[0] ?? '')),
});

function parseChemfig(input: string): ChemfigStructure | null {
  const value = input.trim();
  if (!value || /[\\$&]/.test(value)) return null;

  return parseRing(value) ?? parseLinear(value);
}

function parseLinear(input: string): LinearChemfig | null {
  let pos = 0;

  const first = readFormula(input, pos);
  if (!first) return null;

  const atoms: LinearAtom[] = [{ label: first.label, branches: [] }];
  const bonds: BondKind[] = [];
  pos = first.end;

  while (pos < input.length) {
    pos = skipSpaces(input, pos);
    if (pos >= input.length) break;

    if (input[pos] === '(') {
      const group = parseBalancedGroup(input, pos);
      const branch = group ? parseBranch(group.body) : null;
      if (!branch) return null;
      atoms[atoms.length - 1].branches.push(branch);
      pos = group!.end + 1;
      continue;
    }

    const bond = readBond(input[pos]);
    if (!bond) return null;
    bonds.push(bond);
    pos += 1;

    const formula = readFormula(input, pos);
    if (!formula) return null;
    atoms.push({ label: formula.label, branches: [] });
    pos = formula.end;
  }

  return atoms.length > 0 && bonds.length === atoms.length - 1
    ? { kind: 'linear', atoms, bonds }
    : null;
}

function parseRing(input: string): RingChemfig | null {
  const matched = input.match(/^\*6\((.*)\)$/);
  if (!matched) return null;

  const content = matched[1];
  const bonds: BondKind[] = [];
  const branches: (Branch & { vertex: number })[] = [];
  let pos = 0;

  while (pos < content.length) {
    pos = skipSpaces(content, pos);
    if (pos >= content.length) break;

    const bond = readBond(content[pos]);
    if (bond) {
      bonds.push(bond);
      pos += 1;
      continue;
    }

    if (content[pos] === '(') {
      const group = parseBalancedGroup(content, pos);
      const branch = group ? parseBranch(group.body) : null;
      if (!branch) return null;
      branches.push({ ...branch, vertex: bonds.length % 6 });
      pos = group!.end + 1;
      continue;
    }

    return null;
  }

  return bonds.length === 6 ? { kind: 'ring', size: 6, bonds, branches } : null;
}

function readFormula(
  input: string,
  start: number
): { label: string; end: number } | null {
  let pos = skipSpaces(input, start);
  const begin = pos;

  while (pos < input.length) {
    const char = input[pos];
    if (char === '(' || BOND_KINDS.has(char)) break;
    if (!/[A-Za-z0-9_{}]/.test(char)) return null;
    pos += 1;
  }

  const label = input.slice(begin, pos).trim();
  if (!label || !/[A-Za-z]/.test(label) || !isBalancedFormulaLabel(label))
    return null;

  return { label, end: pos };
}

function parseBranch(input: string): Branch | null {
  const value = input.trim();
  if (!value || value.includes('(') || value.includes(')')) return null;

  const bond = readBond(value[0]);
  const label = (bond ? value.slice(1) : value).trim();
  if (!label || !/[A-Za-z]/.test(label) || !isBalancedFormulaLabel(label))
    return null;

  return { bond: bond ?? '-', label };
}

function parseBalancedGroup(
  input: string,
  start: number
): { body: string; end: number } | null {
  if (input[start] !== '(') return null;

  let depth = 0;
  for (let i = start; i < input.length; i++) {
    if (input[i] === '(') depth += 1;
    else if (input[i] === ')') {
      depth -= 1;
      if (depth === 0) return { body: input.slice(start + 1, i), end: i };
    }
  }

  return null;
}

function skipSpaces(input: string, pos: number): number {
  while (input[pos] === ' ') pos += 1;
  return pos;
}

function readBond(input: string): BondKind | null {
  return input === '-' || input === '=' || input === '#' ? input : null;
}

function isBalancedFormulaLabel(label: string): boolean {
  let depth = 0;
  for (const char of label) {
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0 && /^[A-Za-z0-9_{}]+$/.test(label);
}

function renderChemfig(structure: ChemfigStructure, selected: boolean): Box {
  return structure.kind === 'linear'
    ? renderLinear(structure, selected)
    : renderRing(structure, selected);
}

function renderLinear(structure: LinearChemfig, selected: boolean): Box {
  const baseline = 0;
  const bondLength = 0.5;
  const atomGap = 0.1;
  const atomCenterY = baseline - LABEL_ASCENT / 2 + 0.08;

  let x = 0;
  const parts: string[] = [];
  const bounds = createSvgBounds();

  for (let i = 0; i < structure.atoms.length; i++) {
    const atom = structure.atoms[i];
    const width = estimateFormulaWidth(atom.label);
    parts.push(renderFormulaText(atom.label, x, baseline));
    includeTextBounds(bounds, atom.label, x, baseline, 'start');

    for (let j = 0; j < atom.branches.length; j++) {
      const branch = atom.branches[j];
      const centerX = x + width / 2;
      const direction = j % 2 === 0 ? -1 : 1;
      const startY =
        direction < 0 ? atomCenterY - 0.34 : atomCenterY + 0.42;
      const labelY =
        direction < 0 ? atomCenterY - 0.82 : atomCenterY + 1.82;
      const endY =
        direction < 0
          ? labelY + LABEL_DESCENT + 0.08
          : labelY - LABEL_ASCENT - 0.08;

      parts.push(drawBond(centerX, startY, centerX, endY, branch.bond));
      parts.push(renderFormulaText(branch.label, centerX, labelY, 'middle'));
      includeLineBounds(bounds, centerX, startY, centerX, endY);
      includeTextBounds(bounds, branch.label, centerX, labelY, 'middle');
    }

    if (i < structure.bonds.length) {
      const startX = x + width + atomGap;
      const endX = startX + bondLength;
      parts.push(
        drawBond(startX, atomCenterY, endX, atomCenterY, structure.bonds[i])
      );
      includeLineBounds(bounds, startX, atomCenterY, endX, atomCenterY);
      x = endX + atomGap;
    }
  }

  return makeMeasuredChemfigSvgBox(
    parts.join(''),
    bounds,
    selected,
    depthForBaseline(bounds, baseline)
  );
}

function renderRing(structure: RingChemfig, selected: boolean): Box {
  const radius = 0.9;
  const centerX = radius + 0.2;
  const centerY = radius + 0.25;
  const vertices: { x: number; y: number }[] = [];
  const parts: string[] = [];
  const bounds = createSvgBounds();
  const branchBaselines: number[] = [];

  for (let i = 0; i < structure.size; i++) {
    const angle = -Math.PI / 6 + (i * 2 * Math.PI) / structure.size;
    vertices.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }

  for (let i = 0; i < structure.size; i++) {
    const from = vertices[i];
    const to = vertices[(i + 1) % structure.size];
    parts.push(
      drawRingBond(
        from.x,
        from.y,
        to.x,
        to.y,
        structure.bonds[i],
        centerX,
        centerY
      )
    );
    includeLineBounds(bounds, from.x, from.y, to.x, to.y);
  }

  for (const branch of structure.branches) {
    const from = vertices[branch.vertex];
    const dx = from.x - centerX;
    const dy = from.y - centerY;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const to = { x: from.x + ux * 0.54, y: from.y + uy * 0.54 };
    const label = { x: to.x + ux * 0.13, y: to.y + uy * 0.13 + 0.09 };
    const anchor = ux < -0.25 ? 'end' : ux > 0.25 ? 'start' : 'middle';

    parts.push(drawBond(from.x, from.y, to.x, to.y, branch.bond));
    parts.push(renderFormulaText(branch.label, label.x, label.y, anchor));
    includeLineBounds(bounds, from.x, from.y, to.x, to.y);
    includeTextBounds(bounds, branch.label, label.x, label.y, anchor);
    if (anchor !== 'middle') branchBaselines.push(label.y);
  }

  const depth =
    branchBaselines.length > 0
      ? Math.max(
          0.25,
          Math.min(0.55, bounds.maxY - branchBaselines[0] + SVG_Y_PADDING)
        )
      : 0.4;

  return makeMeasuredChemfigSvgBox(parts.join(''), bounds, selected, depth);
}

function renderUnsupportedChemfig(arg: string, selected: boolean): Box {
  const label = `\\chemfig{${arg}}`;
  const width = Math.max(3.2, estimateFormulaWidth(label) + 0.5);
  const height = 1.25;
  const depth = 0.35;
  const svg = renderFormulaText(label, 0.25, 0.95);
  return makeChemfigSvgBox(svg, width, height, depth, selected, 'ML__error');
}

function makeChemfigSvgBox(
  svg: string,
  width: number,
  height: number,
  depth: number,
  selected: boolean,
  classes = ''
): Box {
  const totalHeight = height + depth;
  const box = new Box(
    `<svg style="display:block;overflow:visible;width:100%;height:100%;" viewBox="0 0 ${toSvgNumber(
      width
    )} ${toSvgNumber(totalHeight)}" aria-hidden="true" focusable="false">${svg}</svg>`,
    {
      classes: ['ML__chemfig', classes].filter(Boolean).join(' '),
      isSelected: selected,
      maxFontSize: 0,
      type: 'ord',
    }
  );
  box.width = width;
  box.height = height;
  box.depth = depth;
  box.setStyle('display', 'inline-block');
  box.setStyle('height', totalHeight, 'em');
  box.setStyle('line-height', '0');
  box.setStyle('position', 'relative');
  box.setStyle('vertical-align', -depth, 'em');
  return box;
}

function makeMeasuredChemfigSvgBox(
  svg: string,
  bounds: SvgBounds,
  selected: boolean,
  depth = 0.4
): Box {
  const shiftX = SVG_X_PADDING - bounds.minX;
  const shiftY = SVG_Y_PADDING - bounds.minY;
  const width = bounds.maxX - bounds.minX + SVG_X_PADDING * 2;
  const totalHeight = bounds.maxY - bounds.minY + SVG_Y_PADDING * 2;

  return makeChemfigSvgBox(
    `<g transform="translate(${toSvgNumber(shiftX)}, ${toSvgNumber(
      shiftY
    )})">${svg}</g>`,
    width,
    Math.max(0.4, totalHeight - depth),
    depth,
    selected
  );
}

function depthForBaseline(bounds: SvgBounds, baseline: number): number {
  return Math.max(0.25, bounds.maxY - baseline + SVG_Y_PADDING);
}

function createSvgBounds(): SvgBounds {
  return {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
}

function includePoint(bounds: SvgBounds, x: number, y: number): void {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}

function includeLineBounds(
  bounds: SvgBounds,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  const padding = 0.12;
  includePoint(bounds, Math.min(x1, x2) - padding, Math.min(y1, y2) - padding);
  includePoint(bounds, Math.max(x1, x2) + padding, Math.max(y1, y2) + padding);
}

function includeTextBounds(
  bounds: SvgBounds,
  label: string,
  x: number,
  y: number,
  anchor: 'start' | 'middle' | 'end'
): void {
  const width = estimateFormulaWidth(label);
  const minX =
    anchor === 'end'
      ? x - width - TEXT_BOUND_PADDING
      : anchor === 'middle'
        ? x - width / 2 - TEXT_BOUND_PADDING
        : x - TEXT_BOUND_PADDING;
  const maxX =
    anchor === 'end'
      ? x + TEXT_BOUND_PADDING
      : anchor === 'middle'
        ? x + width / 2 + TEXT_BOUND_PADDING
        : x + width + TEXT_BOUND_PADDING;

  includePoint(bounds, minX, y - LABEL_ASCENT);
  includePoint(bounds, maxX, y + LABEL_DESCENT);
}

function drawBond(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  kind: BondKind
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const ox = (-dy / length) * 0.05;
  const oy = (dx / length) * 0.05;

  if (kind === '=') {
    return (
      drawLine(x1 + ox, y1 + oy, x2 + ox, y2 + oy) +
      drawLine(x1 - ox, y1 - oy, x2 - ox, y2 - oy)
    );
  }
  if (kind === '#') {
    return (
      drawLine(x1 + ox * 1.5, y1 + oy * 1.5, x2 + ox * 1.5, y2 + oy * 1.5) +
      drawLine(x1, y1, x2, y2) +
      drawLine(x1 - ox * 1.5, y1 - oy * 1.5, x2 - ox * 1.5, y2 - oy * 1.5)
    );
  }

  return drawLine(x1, y1, x2, y2);
}

function drawRingBond(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  kind: BondKind,
  centerX: number,
  centerY: number
): string {
  if (kind !== '=') return drawBond(x1, y1, x2, y2, kind);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const shorten = Math.min(0.12, length * 0.18);
  const sx = (dx / length) * shorten;
  const sy = (dy / length) * shorten;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const nx = (-dy / length) * 0.09;
  const ny = (dx / length) * 0.09;
  const shiftedMidA = { x: midX + nx, y: midY + ny };
  const shiftedMidB = { x: midX - nx, y: midY - ny };
  const distanceA = Math.hypot(
    shiftedMidA.x - centerX,
    shiftedMidA.y - centerY
  );
  const distanceB = Math.hypot(
    shiftedMidB.x - centerX,
    shiftedMidB.y - centerY
  );
  const innerOffset =
    distanceA < distanceB ? { x: nx, y: ny } : { x: -nx, y: -ny };

  return (
    drawLine(x1, y1, x2, y2) +
    drawLine(
      x1 + sx + innerOffset.x,
      y1 + sy + innerOffset.y,
      x2 - sx + innerOffset.x,
      y2 - sy + innerOffset.y
    )
  );
}

function drawLine(x1: number, y1: number, x2: number, y2: number): string {
  return `<line x1="${toSvgNumber(x1)}" y1="${toSvgNumber(
    y1
  )}" x2="${toSvgNumber(x2)}" y2="${toSvgNumber(
    y2
  )}" stroke="currentColor" stroke-width="0.048" stroke-linecap="round"/>`;
}

function renderFormulaText(
  label: string,
  x: number,
  y: number,
  anchor: 'start' | 'middle' | 'end' = 'start'
): string {
  const runs = parseFormulaRuns(label);
  const body = runs
    .map((run) =>
      run.subscript
        ? `<tspan baseline-shift="sub" font-size="${SUBSCRIPT_FONT_SIZE}">${escapeSvgText(
            run.text
          )}</tspan>`
        : escapeSvgText(run.text)
    )
    .join('');

  return `<text x="${toSvgNumber(x)}" y="${toSvgNumber(
    y
  )}" text-anchor="${anchor}" font-family="KaTeX_Main, serif" font-size="${LABEL_FONT_SIZE}" fill="currentColor">${body}</text>`;
}

function parseFormulaRuns(label: string): FormulaRun[] {
  const runs: FormulaRun[] = [];

  for (let i = 0; i < label.length; i++) {
    if (label[i] !== '_') {
      runs.push({ text: label[i] });
      continue;
    }

    if (label[i + 1] === '{') {
      const end = label.indexOf('}', i + 2);
      if (end > i) {
        runs.push({ text: label.slice(i + 2, end), subscript: true });
        i = end;
        continue;
      }
    }

    if (i + 1 < label.length) {
      runs.push({ text: label[i + 1], subscript: true });
      i += 1;
    }
  }

  return mergeAdjacentFormulaRuns(runs);
}

function mergeAdjacentFormulaRuns(runs: FormulaRun[]): FormulaRun[] {
  const result: FormulaRun[] = [];
  for (const run of runs) {
    const previous = result[result.length - 1];
    if (previous && previous.subscript === run.subscript)
      previous.text += run.text;
    else result.push({ ...run });
  }
  return result;
}

function estimateFormulaWidth(label: string): number {
  return parseFormulaRuns(label).reduce(
    (acc, run) =>
      acc +
      run.text.length *
        (run.subscript ? SUBSCRIPT_GLYPH_WIDTH : LABEL_GLYPH_WIDTH),
    0.1
  );
}

function toSvgNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function escapeSvgText(value: string): string {
  return value.replace(/[&<>]/g, (char) => {
    if (char === '&') return '&amp;';
    if (char === '<') return '&lt;';
    return '&gt;';
  });
}
