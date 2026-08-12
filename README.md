# 弗一把 Player Solver

[![CI](https://github.com/SwanChann/friberg-solver/actions/workflows/ci.yml/badge.svg)](https://github.com/SwanChann/friberg-solver/actions/workflows/ci.yml)
[![Deploy](https://github.com/SwanChann/friberg-solver/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/SwanChann/friberg-solver/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

一个独立、本地运行的 **csgofriberg player filtering / solving companion**。它不是原游戏的复刻，也不会自动操作游戏网站；它把游戏候选数据、人工条件筛选、反馈约束推演和下一猜信息增益推荐放进一个桌面浏览器工具中。

在线使用：<https://swanchann.github.io/friberg-solver/>

## What

- 条件筛选：昵称、赛区、国家或地区、年龄、位置、当前队伍、Major 冠军数、Major 参赛数、现役状态。
- 截图 OCR：粘贴、拖入或选择实时截图，在浏览器本地识别昵称、7 个可见反馈列和数字箭头；只采用高可信信息，识别后直接筛选并刷新推荐，无需人工确认。
- 对局推演：为猜测选手录入 7 个可见反馈列和数字方向，多轮条件始终以 AND 从完整数据集重新计算；内部 `region` 由国家反馈自动推导。
- 下一猜推荐：统一调用 `comparePlayers()` 对候选反馈分区，展示信息增益、期望剩余候选和最坏情况。
- 本地数据：`data/players.json` 是 canonical dataset；浏览器导入、自定义状态和推演进度只使用 `localStorage`。
- 不包含登录、云数据库、AI API、常驻爬虫、自动提交或规避检测功能。

## Install

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

打开终端中显示的本地地址（默认 `http://localhost:5173`）。

## Build

```bash
npm run build
npm run preview
```

## Test

```bash
npm test
npm run data:validate
```

测试覆盖国家/赛区、年龄边界和箭头、Major 数值边界、角色、当前队伍、现役、所有数值筛选运算符、多 Guess AND、删除 Guess 后恢复、指定人工筛选案例、全表列排序、数据 schema、信息增益，以及 OCR 官方色板、表格定位、箭头方向、昵称模糊匹配和重名消歧。历史队伍规则只保留合成数据兼容测试，不作为内置数据功能验收项。

## 使用

### 条件筛选

左侧字段修改后立即执行内存中的 `players.filter(...)`，无需提交。枚举字段输入后从候选项选择并按 Enter；点击 tag 即可删除。

- 当前队伍支持包含与排除多选。
- 数字字段支持 `=`, `!=`, `>`, `>=`, `<`, `<=`, `between`。
- 点击候选行展开完整属性；仅当导入的数据确有历史队伍时才额外展示历史 tags。

### 对局推演

#### 从截图识别

1. 在原游戏中截取包含完整彩色猜测行的图片，切换到“对局推演”。
2. 直接按 `Ctrl+V` 粘贴，或把 PNG/JPEG/WebP 拖入页面，也可以点击“选择截图”。
3. 页面先按原站浅色/深色主题色定位 1–8 行和 7 个反馈列，再用随项目打包的 Tesseract 英文/简体中文模型识别昵称；重名昵称只有在至少两项高可信数值全部吻合时才会消歧。
4. 识别完成后自动覆盖当前截图 Guess 列表、以可靠条件重新计算候选，并直接跳到下一猜推荐。昵称不可靠会丢弃整行；某个颜色或数字箭头不可靠只会丢弃该字段，不会要求人工审核，也不会让不确定信息参与筛选。

截图文件和像素只存在于当前页面内存，不会上传、写入 `localStorage` 或发送给原游戏。OCR worker、WASM core 和 `eng`/`chi_sim` 模型都位于 `public/ocr/`，运行时不依赖 CDN。当前识别器面向原站桌面表格的标准浅色或 Blast 深色主题；过度裁切、二次压缩、缩放过小或自定义主题会增加自动丢弃的信息，但不会被当成可靠条件使用。

#### 手动录入

1. 搜索并选择 Guess Player。
2. 为每项设置 🟩 correct、🟨 close 或 ⬛ wrong；数字项再设置目标相对猜测值的 ↑ higher / ↓ lower。
3. 添加猜测。编辑或删除任何一轮时，候选从 `allPlayers` 和剩余条件重新计算。
4. 点击推荐选手可直接填入下一猜编辑器。

内置快照没有历史队伍，因此队伍反馈只显示绿色/灰色，不提供无法可靠推演的黄色。若 OCR 截图中出现队伍黄色，页面会自动忽略该队伍字段，而不是把黄色误当灰色或要求用户处理；其他可靠字段仍会参与筛选。若以后导入带非空 `team_history` 的数据，该兼容能力会自动启用。

快捷键：

- `Ctrl+K`：聚焦当前页的昵称/Guess 搜索。
- `Esc`：清空当前输入。
- `Enter`：选择了精确昵称时添加 Guess；tag 输入中则添加 tag。

## Game rules

规则在 2026-08-12 再次对照 [`csgofriberg/server/src/services/gameService.ts`](https://github.com/shnlfriberg/csgofriberg/blob/33c8288af466f092117a4fa41c16552c13245b48/server/src/services/gameService.ts) 核验：

- 国家或地区：同值绿色；值不同但数据库 `region` 相同黄色；否则灰色。
- 赛区、位置、现役：相同绿色，否则灰色，没有黄色；原站表格不单独显示赛区，本 Solver 从“国家或地区”的颜色推导其内部反馈。
- 队伍：当前队伍相同绿色；否则，猜测队伍存在于目标的 `team_history` 时黄色；其余灰色。
- 年龄：相同绿色；差值 1–3 黄色；差值大于 3 灰色；非相同时提供 higher/lower。
- Major 冠军数与参赛数：相同绿色；差值 1 黄色；差值大于 1 灰色；非相同时提供 higher/lower。
- 原游戏单人模式上限为 8 次。本 Solver 对手动录入和截图导入都强制执行该上限。

`src/engine/comparePlayers.ts` 是 UI、测试、约束校验和信息增益共用的唯一判定入口。

## Data provenance

当前内置数据：

| 字段 | 值 |
|---|---|
| Players | 646 |
| Snapshot | 2026-08-12 |
| Version | `production-v4` |
| 正式来源 | [`shnlfriberg.online/search`](https://shnlfriberg.online/search) 的公开名单及公开搜索响应 |
| Canonical SHA-256 | `e474efae1fa257b9dd851c700135f741c243901fa95684acf5dddd2d110c84bc` |
| 完整性 | 646 个唯一昵称、646 个唯一正式 ID，名单无增删 |

这次固定快照通过正式网站的正常浏览器会话取得，遵守公开搜索接口的限速并覆盖 646/646 人。相较 2026-07-27 bootstrap，正式 ID 全部对齐；当前队伍、年龄、位置或现役状态至少一项变化的选手有 185 人。国籍、赛区和两个 Major 数值均无差异。项目只保存核验后的固定快照，不在运行时抓取正式网站。

范围决定：生产公开接口不含 `team_history`。本版本不把真实历史队伍作为交付功能，也不会根据常识伪造数据。canonical 内存模型仍把该字段规范化为空数组以保持规则兼容；页面隐藏历史筛选与队伍黄色反馈，并明确提示当前只支持当前队伍。若用户自行导入含历史的数据，兼容能力会自动启用，但这不代表其来源已获官方核验。

更完整的机器可读记录见 [`data/metadata.json`](data/metadata.json)，2026-07-27 bootstrap 与 2026-08-12 production-public-v4 快照及数据许可证位于 `data-snapshots/`。

## Import / Export

页面右上角 Dataset 菜单支持 JSON 导入与导出。导入接受 `Player[]` 或 `{ "players": [...] }`；`team_history` 可省略，省略时规范化为空数组。其它字段严格校验并报告到具体索引和字段，例如：

```text
172.team_history: Expected array, received string
```

导入不会写磁盘，只保存在当前浏览器的 `localStorage`；“恢复内置”会回到仓库中的 646 人快照。

## Update database

```bash
npm run data:update
```

更新器默认访问原官方 raw URL，先下载到系统临时目录、校验 schema/昵称唯一性、保留上游省略的现有 `team_history`、输出 diff，并写入 `data-snapshots/candidate-YYYY-MM-DD.json`。默认不会覆盖 canonical 文件。原 raw URL 在 2026-08-12 仍返回 404，因此该默认命令目前会安全失败，不能替代本次经过浏览器会话和完整覆盖检查的生产快照流程。审阅可信候选的 diff 后才可显式应用：

```bash
npm run data:update -- --apply
```

也可以在 PowerShell 中指定经确认的替代公开来源：

```powershell
$env:FRIBERG_DATA_URL='https://example.invalid/players.json'
npm run data:update
```

若来源不可访问或校验失败，命令以非零状态退出并保持当前 `data/players.json` 不变。

## Database diff

```bash
npm run data:diff
```

默认比较 `data-snapshots/bootstrap-2026-07-27.json` 与当前 `data/players.json`。也可传入两个文件：

```bash
npm run data:diff -- old.json new.json
```

输出人数、added、removed，以及逐选手字段变化；`team_history` 以 `+ team` / `- team` 展示。

## Architecture

```text
data/                 canonical players + metadata
data-snapshots/       source/bootstrap evidence and data license
scripts/              validate, update, diff
src/domain/           strongly typed player, feedback, constraints, rules
src/engine/           compare, filter, inference, candidate recompute, ranking
src/ocr/              screenshot geometry/color/arrow analysis, OCR, player matching
src/data/             schema validation and browser repository
src/components/       filters, candidates, feedback editor, screenshot importer, dataset info
src/pages/            filter and solver modes
tests/                rule, inference, filter, data, ranking tests
```

## Licenses and references

- csgofriberg is an AGPL-3.0 compatibility reference. This project independently reimplements observed rules and does not bundle its source or visual assets.
- The recovered player data identifies the original `csgo-major-db` dataset as MIT; the required notice is preserved in `data-snapshots/LICENSE.csgo-major-db`.
- The public Solver snapshot used only as corroborating provenance is MIT; no code from it is bundled.
- Screenshot OCR uses Tesseract.js 7.0.0 and tesseract.js-core 7.0.0 under Apache-2.0. Vendored language data comes from `naptha/tessdata`; exact asset hashes and license notes are recorded in `THIRD_PARTY_NOTICES.md`.
- 本项目自行实现的代码以 [MIT License](LICENSE) 开源；第三方数据与参考项目仍分别遵循其原许可证和署名要求。

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for exact references and boundaries.

## Contributing

欢迎通过 Issue 报告可复现的问题，或通过 Pull Request 提交小而明确的改进。开始前请阅读 [`CONTRIBUTING.md`](CONTRIBUTING.md)，并确保 `npm run lint`、`npm test`、`npm run build` 与 `npm run data:validate` 全部通过。
