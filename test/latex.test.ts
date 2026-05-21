import {
  convertLatexToMarkup,
  validateLatex,
} from '../src/public/mathlive-ssr';
import { parseLatex } from '../src/core/parser';
import { Atom } from '../src/core/atom-class';

function markupAndError(formula: string): [string, string] {
  const markup = convertLatexToMarkup(formula, { defaultMode: 'math' });
  const errors = validateLatex(formula);
  if (errors.length === 0) return [markup, 'no-error'];
  return [markup, errors[0].code];
}

function error(expression: string) {
  const errors = validateLatex(expression);
  if (errors.length === 0) return 'no-error';
  return errors[0].code;
}

describe('BASIC PARSING', () => {
  test.each([
    'x',
    ' x ', // Spaces do not matter
    '%', // '%' is start of comment
    '% comment',
    'x % comment',
    'x',
    '-12',
    '1234|/@.`abcdefgzABCDEFGZ', // Basic literals
    'a b', // Spaces are ignored
    'ab', // Same as previous
    'a~b', // ~ is space, same as previous
    'a\\space b',
    '{a}b', // Group
    '{-}', // Operator in group
    '-a', // Spacing as unary operator
    'a-', // Spacing as postfix operator
    'a-b', // Spacing as infix operator
    'a\nb',
    'a=1}',
    'a=1{', // Syntax error
    'a=1{}', // Valid
  ])('%#/ %p renders correctly', (x) => {
    expect(markupAndError(x)).toMatchSnapshot();
  });
  // expect(error('a=1}}}}{{{{')).toMatch('unbalanced-braces');
});

describe('CHARACTERS', () => {
  const ref = convertLatexToMarkup('J0');
  test.each([
    '^^4a0',
    '^^^^004a0',
    '\\char"4A 0',
    "\\char'0112 0",
    '\\char74 0',
    '\\char "004A 0',
    '\\char`J 0',
    '\\char`\\J 0',
    '\\char `\\J 0',
    '\\char   `\\J 0',
    '\\char +- +-  `\\J 0',
    '\\char +- -  `\\J 0',
    '\\char +- -- -++ `\\J 0',
    '\\unicode{"4A} 0',
    '\\unicode{"004A} 0',
    '\\unicode{x004A} 0',
  ])('%#/ %p renders as "J0"', (x) => {
    expect(convertLatexToMarkup(x)).toEqual(ref);
  });
});
describe('EXPANSION PRIMITIVES', () => {
  test.each([
    // ['\\obeyspaces =   =', '=\\space\\space\\space='],
    ['\\csname alpha\\endcsname', '\\alpha'],
    ['\\csname alph\\char"41\\endcsname', '\\alph A'],
    ['=\\sqrt\\bgroup x \\egroup=', '=\\sqrt{x}='],
    ['\\string\\alpha', '\\backslash alpha'],
    ['#?', '\\placeholder{}'],
  ])('%#/ %p matches %p', (a, b) => {
    expect(convertLatexToMarkup(a)).toMatch(convertLatexToMarkup(b));
  });
});

describe('ARGUMENTS', () => {
  test.each([
    ['a^\\frac12', 'a^{\\frac{1}{2}}'],
    ['\\sqrt3^2', '\\sqrt{3}^{2}'],
    ['\\frac12', '\\frac{1}{2}'],
    ['\\frac  1  2', '\\frac{1}{2}'],
    ['\\frac357', '\\frac{3}{5}7'],
    ['\\frac3a', '\\frac{3}{a}'],
    ['\\frac\\alpha\\beta', '\\frac{\\alpha}{\\beta}'],
    // ['\\frac{{1}}{2}', '\\frac{1}{2}'],
    ['\\frac  {  { 1  } } { 2 }', '\\frac{{1}}{2}'],
  ])('%#/ %p matches %p', (a, b) => {
    expect(convertLatexToMarkup(a)).toMatch(convertLatexToMarkup(b));
  });
  test.each(['\\frac', '\\frac{}', '\\frac{}{}'])(
    '%#/ %p renders correctly',
    (x) => {
      expect(markupAndError(x)).toMatchSnapshot();
    }
  );
});

describe('INFIX COMMANDS', () => {
  test.each([
    ['a\\over b', '\\frac{a}{b}'],
    ['a\\over b c', '\\frac{a}{bc}'],
    ['x{a+1\\over1-b}y', 'x{\\frac{a+1}{1-b}}y'],
    ['x{a+1\\over1-b\\over2}y', 'x{a+1\\over1-b2}y'],
  ])('%#/ %p matches %p', (a, b) => {
    expect(convertLatexToMarkup(a)).toMatch(convertLatexToMarkup(b));
  });

  expect(error('a\\over b \\over c')).toMatch('too-many-infix-commands');
});

describe('VARIANT SERIALIZATION (issue #2867)', () => {
  function serialize(latex: string): string {
    const atoms = parseLatex(latex, { parseMode: 'math' });
    return Atom.serialize(atoms, { defaultMode: 'math' });
  }

  test.each([
    // Single digit superscripts/subscripts don't have braces
    ['\\mathbb{R}^{0}', '\\mathbb{R}^0'],
    ['\\mathbb{R}^0', '\\mathbb{R}^0'],
    ['\\mathbb{N}_{1}', '\\mathbb{N}_1'],
    ['\\mathcal{F}^{2}', '\\mathcal{F}^2'],
    // Single letter subscripts/superscripts keep braces
    ['\\mathfrak{g}_{n}', '\\mathfrak{g}_{n}'],
    // Multi-character subscripts/superscripts should have braces
    ['\\mathbb{R}^{10}', '\\mathbb{R}^{10}'],
    ['\\mathbb{N}_{abc}', '\\mathbb{N}_{abc}'],
  ])('%#/ %p serializes as %p', (input, expected) => {
    expect(serialize(input)).toBe(expected);
  });
});

describe('MATHRM SERIALIZATION (issue #2818)', () => {
  function serialize(latex: string): string {
    const atoms = parseLatex(latex, { parseMode: 'math' });
    return Atom.serialize(atoms, { defaultMode: 'math' });
  }

  test.each([
    // \mathrm should be preserved in latex-expanded format
    ['\\mathrm{d}', '\\mathrm{d}'],
    ['\\mathrm{dx}', '\\mathrm{dx}'],
    ['\\frac{\\mathrm{d}y}{\\mathrm{d}x}', '\\frac{\\mathrm{d}y}{\\mathrm{d}x}'],
    ['x\\mathrm{d}x', 'x\\mathrm{d}x'],
    ['a+\\mathrm{b}+c', 'a+\\mathrm{b}+c'],
    // Other upright variants should also work
    ['\\mathsf{A}', '\\mathsf{A}'],
    ['\\mathtt{code}', '\\mathtt{code}'],
  ])('%#/ %p serializes as %p', (input, expected) => {
    expect(serialize(input)).toBe(expected);
  });
});

describe('CHEM SERIALIZATION', () => {
  function serialize(latex: string): string {
    const atoms = parseLatex(latex, { parseMode: 'math' });
    return Atom.serialize(atoms, { defaultMode: 'math' });
  }

  test.each([
    '\\ce{2H2 + O2 -> 2H2O}',
    '\\ce{CaCO3 ->[高温] CaO + CO2 ^}',
    '\\ce{SO4^2- + Ba^2+ -> BaSO4 v}',
  ])('%#/ %p preserves editable K12 mhchem source', (input) => {
    const atom = parseLatex(input, { parseMode: 'math' })[0];
    expect(atom.captureSelection).toBe(false);
    expect(serialize(input)).toBe(input);
  });

  test('editable mhchem body serializes from current content', () => {
    const atom = parseLatex('\\ce{2H2 + O2 -> 2H2O}', {
      parseMode: 'math',
    })[0];

    atom.body = parseLatex(
      '3\\mathrm{H}_{2}+\\mathrm{O}_{2}\\longrightarrow2\\mathrm{H}_{2}\\mathrm{O}',
      { parseMode: 'math' }
    );

    expect(Atom.serialize([atom], { defaultMode: 'math' })).toBe(
      '\\ce{3H2+O2 -> 2H2O}'
    );
  });

  test('complex mhchem and physical units keep whole-object editing', () => {
    expect(
      parseLatex('\\ce{\\frac{1}{2}H2 + O2}', { parseMode: 'math' })[0]
        .captureSelection
    ).toBe(true);
    expect(
      parseLatex('\\pu{10 m/s}', { parseMode: 'math' })[0].captureSelection
    ).toBe(true);
  });
});

describe('REST* ARGUMENT COMMANDS (issue #2570)', () => {
  // Commands with {:rest*} deferred arguments should handle braced arguments
  test.each([
    '\\bf{425}',
    '\\it{text}',
    '\\bfseries{bold}',
    '\\mdseries{medium}',
    '\\upshape{upright}',
    '\\slshape{slanted}',
    '\\scshape{small caps}',
    '\\rmfamily{roman}',
    '\\sffamily{sans-serif}',
    '\\ttfamily{monospace}',
  ])('%#/ %p renders correctly', (x) => {
    expect(markupAndError(x)).toMatchSnapshot();
  });
});
