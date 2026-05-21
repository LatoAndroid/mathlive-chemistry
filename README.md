<div align="center">
  <img alt="MathLive" src="assets/mathlive-1.png?raw=true">
</div>

<h1 align="center">MathLive K12 Chemistry Fork</h1>
<p align="center">
  <strong>A lightweight MathLive fork for K12 chemistry formulas and simple organic structures.</strong>
  <br>
  <strong>面向 K12 白板场景的 MathLive 化学公式与简单有机结构式增强版。</strong>
</p>

[![License: MIT](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE.txt)

> This is not the official `mathlive` npm package. It is a fork of
> [arnog/mathlive](https://github.com/arnog/mathlive) with focused chemistry
> editing/rendering changes for K12 teaching whiteboards.
>
> 这不是官方 `mathlive` npm 包，而是基于
> [arnog/mathlive](https://github.com/arnog/mathlive) 的 fork，主要补充 K12
> 教学白板里常见化学方程式和简单有机结构式的显示与编辑体验。

## 中文说明

### 这个项目解决什么问题

原版 MathLive 已经支持大量数学公式编辑能力，也内置了一部分
`mhchem` 显示能力，例如 `\ce{...}` 和 `\pu{...}`。但在白板、课件、
题目编辑等 K12 教学场景里，用户通常希望化学方程式和简单有机结构式
也能像数学公式一样插入、显示、再次编辑，并且尽量复用 MathLive 的
输入、选择、序列化和虚拟键盘体系。

这个 fork 的目标是补上这部分轻量化能力，而不是引入一套重型专业化学
结构编辑器。

### 当前增强能力

- 改进常见 `\ce{...}` 化学方程式的可编辑体验。
  - 对 K12 常见、结构简单的 `\ce{...}`，内容会以 MathLive 内部 atom
    形式参与编辑，而不是只能作为一个整体对象删除。
  - 对复杂 `mhchem` 内容仍保留原版的整体对象行为，降低误解析风险。
- 保留 `\ce{...}` / `\pu{...}` 的原始 LaTeX 序列化习惯。
- 增加轻量级 `\chemfig{...}` 支持，用于 K12 常见简单有机结构式显示。
- 支持的 `chemfig` 子集包括：
  - 简单链式结构：`CH_3-CH_2-OH`
  - 双键、三键：`CH_2=CH_2`、`HC#CH`
  - 简单支链：`CH_3-C(=O)-OH`
  - 六元环与常见取代基：`*6(-=-=-=)`、`-CH_3`、`-NO_2`、`-COOH`
- 针对白板使用场景调整了常见公式的显示间距、基线和下标对齐。

### 示例

```latex
\ce{2H2 + O2 -> 2H2O}
\ce{CaCO3 ->[高温] CaO + CO2 ^}
\ce{SO4^2- + Ba^2+ -> BaSO4 v}

\chemfig{CH_3-CH_2-OH}
\chemfig{CH_2=CH_2}
\chemfig{HC#CH}
\chemfig{CH_3-C(=O)-OH}
\chemfig{*6(-=-=-=)}
\chemfig{*6(-=-(-CH_3)-=-)}
\chemfig{*6(-=-(-NO_2)-=-)}
\chemfig{*6(-=-(-COOH)-=-)}
```

### 局限

这个项目不是完整的 `mhchem` 或 `chemfig` 实现，也不是专业化学结构绘图
软件。当前范围有意控制在 K12 教学常用内容。

- `\chemfig{...}` 只支持一个小子集，不支持完整 chemfig 语法。
- 不支持复杂立体化学、反应机理箭头、电子转移箭头、楔形键、虚线键等
  专业结构绘图能力。
- `\chemfig{...}` 当前主要是轻量显示与序列化保留；不是完整的可视化
  结构编辑器。
- 复杂 `\ce{...}`、`\pu{...}` 仍可能保持整体对象编辑，这是为了避免
  错误拆分导致内容损坏。
- 这个 fork 会尽量跟随 MathLive 体系，但不能保证与官方 MathLive 的
  所有内部行为完全一致。

如果你的目标是大学/科研级化学结构编辑，请优先考虑专业化学编辑器或
结构绘图库，而不是这个 fork。

### 安装

```bash
npm install mathlive-chemistry
```

用法与 MathLive 基本一致：

```js
import 'mathlive-chemistry';
```

或者按需导入：

```js
import { MathfieldElement } from 'mathlive-chemistry';
```

### 和原项目的关系

- 原项目：[arnog/mathlive](https://github.com/arnog/mathlive)
- 原作者：Arno Gourdol and MathLive contributors
- 原许可证：MIT
- 本 fork 保留 MathLive 的主要 API、构建方式和许可证，仅在化学公式
  与简单结构式相关能力上做小范围增强。

官方 MathLive 文档大部分仍然适用：

- [MathLive documentation](https://mathlive.io/)
- [Mathfield API reference](https://mathlive.io/mathfield/api/)

### 本地验证

```bash
node node_modules/typescript/bin/tsc --noEmit --project tsconfig.json
node node_modules/@playwright/test/cli.js test test/playwright-tests/physical-keyboard.spec.ts -g "editable mhchem" --project=chromium
```

### 发布到 npm

生产构建会把可发布包写入 `dist/`，不要直接发布仓库根目录。

```bash
npm login --registry=https://registry.npmjs.org/
bash ./scripts/build.sh production
npm publish dist --registry=https://registry.npmjs.org/
```

发布前建议先检查包内容：

```bash
bash ./scripts/build.sh production
(cd dist && npm pack --dry-run --registry=https://registry.npmjs.org/)
```

## English

### What This Fork Solves

The official MathLive project already provides high-quality math input,
rendering, accessibility, selection handling, serialization, and virtual
keyboard support. It also includes partial `mhchem` display support through
commands such as `\ce{...}` and `\pu{...}`.

For K12 whiteboard and teaching workflows, chemistry formulas often need to
behave more like math formulas: users want to insert, display, edit, delete,
and serialize common chemical equations and simple organic structures without
embedding a heavy professional chemistry editor.

This fork adds focused, lightweight chemistry support while staying close to
MathLive's existing architecture and editing model.

### Added Capabilities

- Improved editing behavior for common K12 `\ce{...}` chemical equations.
- Simple editable handling for supported `\ce{...}` formulas, while keeping
  complex `mhchem` content as whole-object atoms for safety.
- Original LaTeX serialization is preserved for `\ce{...}`, `\pu{...}`, and
  supported `\chemfig{...}` expressions.
- Lightweight `\chemfig{...}` rendering for common K12 organic structures.
- Supported `chemfig` subset includes:
  - Linear structures: `CH_3-CH_2-OH`
  - Double and triple bonds: `CH_2=CH_2`, `HC#CH`
  - Simple branches: `CH_3-C(=O)-OH`
  - Six-membered rings with simple substituents: `CH_3`, `NO_2`, `COOH`
- Spacing, baseline, and subscript alignment have been tuned for whiteboard
  usage.

### Limitations

This is not a full `mhchem` implementation, not a full `chemfig` implementation,
and not a professional chemical structure editor.

- Only a small K12-oriented subset of `\chemfig{...}` is supported.
- Advanced stereochemistry, mechanism arrows, electron-pushing arrows, wedge
  bonds, dashed bonds, and complex structural notation are out of scope.
- `\chemfig{...}` is currently a lightweight renderer with LaTeX preservation,
  not a full visual structure editor.
- Complex `\ce{...}` and all `\pu{...}` content may remain whole-object atoms to
  avoid unsafe parsing or destructive edits.
- This fork aims to preserve MathLive compatibility, but it is not the official
  MathLive package.

### Install

```bash
npm install mathlive-chemistry
```

Use it like MathLive:

```js
import 'mathlive-chemistry';
```

or:

```js
import { MathfieldElement } from 'mathlive-chemistry';
```

### Relationship to MathLive

- Original project: [arnog/mathlive](https://github.com/arnog/mathlive)
- Original author: Arno Gourdol and MathLive contributors
- License: MIT

Most official MathLive documentation still applies:

- [MathLive documentation](https://mathlive.io/)
- [Mathfield API reference](https://mathlive.io/mathfield/api/)

### npm Publishing

The publishable package is generated in `dist/`. Do not publish the repository
root directly.

```bash
npm login --registry=https://registry.npmjs.org/
bash ./scripts/build.sh production
npm publish dist --registry=https://registry.npmjs.org/
```

Dry-run before publishing:

```bash
bash ./scripts/build.sh production
(cd dist && npm pack --dry-run --registry=https://registry.npmjs.org/)
```

## License

This project is licensed under the [MIT License](LICENSE.txt).
