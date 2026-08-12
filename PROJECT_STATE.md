# Project State

- last_verified: 2026-08-12 (69 tests, build, data tools, and conservative automatic browser OCR smoke)
- durable_goal: Deliver a reliable local csgofriberg Major player filter and feedback solver that matches the upstream game rules and keeps its dataset provenance explicit.
- success_criteria: Local UI starts; 646-player bootstrap loads; all non-team-history manual filters, multi-guess inference/edit/delete, conservative screenshot OCR with automatic apply, recommendations, import/export, persistence, data tooling, tests, build, and smoke verification succeed; historical-team coverage is explicitly out of scope.
- active_workstream: friberg-solver open-source release
- current_milestone: Conservative automatic screenshot OCR published to GitHub Draft PR #1.
- current_task: Review CI and merge `agent/automatic-ocr-filtering` into `main` through PR #1.
- status: verified

## Milestones

1. [verified] Inspect current upstream source, game rules, data schema/import, team history, player routes/cache, feedback tests, and licenses.
2. [verified] Establish the 646-player canonical local dataset and implement the solver application.
3. [verified] Complete rule, inference, filter, deletion, data-tool, build, and UI smoke verification.
4. [verified] Finalize README, limitations, and delivery report.
5. [verified] Re-scope historical-team coverage out of the required release; hide history-dependent controls for the bundled dataset while retaining optional import compatibility.
6. [verified] Publish the complete project to a public GitHub repository with MIT licensing, contribution guidance, and CI.
7. [verified] Add user-triggered local screenshot OCR with upload/drag/paste, official-theme row/color/arrow detection, conservative player matching, field-level trust, automatic replacement of the current Guess list, and direct candidate/recommendation refresh without human review.

## Verified Facts

- Upstream `csgofriberg` commit `33c8288af466f092117a4fa41c16552c13245b48` defines the current comparison rules in `server/src/services/gameService.ts` and is AGPL-3.0.
- The original `shnlfriberg/csgo-major-db` public URL currently returns repository not found.
- A public extension snapshot records official source commit `eb9fd74735039871a5ee00a89a0c50e36d608d0c`, date 2026-07-27, SHA-256 `c10b84d...e8e6a`, and 646 players.
- That 646-player snapshot omits `team_history`; canonical records therefore initialize the required field to an empty array instead of inventing history.
- `npm test` passes 69 tests across seven files, including persisted partial-field Guess round-trip, OCR color/geometry/arrow trust, conservative nickname matching and duplicate-name numeric disambiguation, and proof that excluded OCR fields do not constrain candidates; `npm run build`, `npm run lint`, `npm run data:validate`, and `npm run data:diff` pass.
- A headless Edge smoke run served the UI over HTTP 200 and rendered the 646-player filter page; evidence is `.smoke/solver-home.png`.
- `npm run data:update` currently receives HTTP 404 from the official raw URL, exits nonzero, and preserves the canonical dataset hash.
- Upstream added `team_history` support on 2026-08-03 (`800bc373d7750b1d06e59ba9b2ff0f506c88eae4`), after the 2026-07-27 bootstrap snapshot, so that snapshot cannot contain populated history.
- The current official implementation exposes a complete `players.json` export, including normalized `team_history`, only through the authenticated administrator route `/api/admin/players/export`.
- The only public 646-player third-party candidate found (`byJming/friberg-helper`, commit `b910fa9976e5327940a07a4a4299ff39ef164640`) has zero non-empty histories and explicitly notes that the public API omits this field; it is not an acceptable update source.
- On 2026-08-12, `npm run data:update` failed safely with HTTP 404 and `npm run data:diff` reported 646 -> 646 with no additions, removals, or changes. No candidate or canonical data file was written.
- A headless Edge smoke run after the scope change returned HTTP 200, rendered 646 candidates and both tabs, displayed the no-history notice, and did not render the historical-team filter; evidence is `.smoke/solver-home-no-history.png`.
- Import accepts either a player array or `{ players: [...] }`; omitted `team_history` is normalized to `[]`, while all other required fields remain strictly validated.
- Public repository `https://github.com/SwanChann/friberg-solver` uses `main` as its default branch; the initial remote commit matched local commit `cb5b0b1e987a1073212cec571c83eb72b8e3f805` exactly.
- The initial GitHub Actions CI run `31578526769` passed after checking type safety, 63 tests, production build, bundled-data validation, and data diff.
- The repository includes an MIT `LICENSE`, `CONTRIBUTING.md`, third-party notices, Issues, and focused repository topics; Wiki is disabled.
- Screenshot OCR uses locally bundled Tesseract.js 7.0.0, LSTM browser cores, and English/Simplified-Chinese trained data. Screenshots are processed in page memory and are not uploaded or persisted.
- A headless Edge end-to-end OCR smoke used a six-row 800×610 fixture matching the supplied table: the flow rendered no review UI and automatically applied five reliable rows / 35 visible conditions; ambiguous duplicate `NiKo` was discarded as one whole row, while the remaining constraints narrowed 646 players to `jambo` and produced eight next-guess recommendations. Evidence is `.smoke/ocr-board.png` plus the ignored `.smoke/ocr-smoke.ps1` harness.
- The game board exposes seven visible feedback columns; internal `region` feedback is now derived from the nationality color instead of being requested as an eighth manual field.
- GitHub Draft PR #1 publishes the verified OCR implementation from `agent/automatic-ocr-filtering` against `main`: `https://github.com/SwanChann/friberg-solver/pull/1`.

## Decisions

- Use the recorded 646-player official-source snapshot as a provenance-labelled bootstrap because the official repository is unavailable and current upstream contains only five baseline seeds.
- Reimplement rules independently from the verified behavior and centralize them in `comparePlayers()`; do not copy the upstream service implementation wholesale.
- Preserve missing historical-team coverage as a visible limitation and never claim full current-production parity without a new authoritative export.
- Per the user's 2026-08-12 decision, real-player `team_history` coverage is not a release requirement. Hide history-dependent UI for the bundled snapshot; automatically enable compatibility only for user-imported data with non-empty histories.
- Publish the first open-source release directly on `main` because this was a new empty repository with no existing base branch or collaborators requiring a bootstrap pull request.
- Keep OCR user-triggered and local-only: accept a user-provided screenshot, automatically replace the current Guess list with trusted constraints, and refresh candidates/recommendations. Do not add continuous upstream scraping, automatic guessing/submission, or detection evasion.
- Per the user's 2026-08-12 decision, never ask for OCR confirmation: discard a whole row when its nickname is uncertain; discard only the affected field when its color/direction is uncertain or team-yellow cannot be evaluated without `team_history`. Retain a read-only ignored-information summary for auditability.
- Per the user's current GitHub update authorization, publish this feature on an isolated `agent/automatic-ocr-filtering` branch and use a Draft PR before merging into `main`.

## Risks And Unknowns

- Current production player attributes cannot be fully verified from public read endpoints; the bundled database remains the provenance-labelled 2026-07-27 snapshot.
- Historical-team filtering and team-yellow inference are not available for the bundled dataset. The engine retains tested compatibility for future user imports, but imported provenance is user-controlled and not automatically authoritative.
- OCR geometry is verified for the upstream desktop table and official light/Blast color tokens. Heavy cropping, small images, custom themes, or image compression can cause more rows/fields to be conservatively ignored and therefore produce a broader candidate set.

## Next Step And User Decision

- The OCR feature is implemented and verified locally. The next remote step is to review and merge the Draft PR from `agent/automatic-ocr-filtering` into `main`; no further implementation decision is required.
