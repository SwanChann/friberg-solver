# Project State

- last_verified: 2026-08-12 (tests, build, data tools, and browser smoke)
- durable_goal: Deliver a reliable local csgofriberg Major player filter and feedback solver that matches the upstream game rules and keeps its dataset provenance explicit.
- success_criteria: Local UI starts; 646-player bootstrap loads; all non-team-history manual filters, multi-guess inference/edit/delete, recommendations, import/export, persistence, data tooling, tests, build, and smoke verification succeed; historical-team coverage is explicitly out of scope.
- active_workstream: friberg-solver open-source release
- current_milestone: Public GitHub release verified.
- current_task: Maintain the published `SwanChann/friberg-solver` repository from the verified local `main` branch.
- status: verified

## Milestones

1. [verified] Inspect current upstream source, game rules, data schema/import, team history, player routes/cache, feedback tests, and licenses.
2. [verified] Establish the 646-player canonical local dataset and implement the solver application.
3. [verified] Complete rule, inference, filter, deletion, data-tool, build, and UI smoke verification.
4. [verified] Finalize README, limitations, and delivery report.
5. [verified] Re-scope historical-team coverage out of the required release; hide history-dependent controls for the bundled dataset while retaining optional import compatibility.
6. [verified] Publish the complete project to a public GitHub repository with MIT licensing, contribution guidance, and CI.

## Verified Facts

- Upstream `csgofriberg` commit `33c8288af466f092117a4fa41c16552c13245b48` defines the current comparison rules in `server/src/services/gameService.ts` and is AGPL-3.0.
- The original `shnlfriberg/csgo-major-db` public URL currently returns repository not found.
- A public extension snapshot records official source commit `eb9fd74735039871a5ee00a89a0c50e36d608d0c`, date 2026-07-27, SHA-256 `c10b84d...e8e6a`, and 646 players.
- That 646-player snapshot omits `team_history`; canonical records therefore initialize the required field to an empty array instead of inventing history.
- `npm test` passes 63 tests across six files, including persisted tab/filter/Guess/sort round-trip and corrupt-state fallback; `npm run build`, `npm run lint`, `npm run data:validate`, and `npm run data:diff` pass.
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

## Decisions

- Use the recorded 646-player official-source snapshot as a provenance-labelled bootstrap because the official repository is unavailable and current upstream contains only five baseline seeds.
- Reimplement rules independently from the verified behavior and centralize them in `comparePlayers()`; do not copy the upstream service implementation wholesale.
- Preserve missing historical-team coverage as a visible limitation and never claim full current-production parity without a new authoritative export.
- Per the user's 2026-08-12 decision, real-player `team_history` coverage is not a release requirement. Hide history-dependent UI for the bundled snapshot; automatically enable compatibility only for user-imported data with non-empty histories.
- Publish the first open-source release directly on `main` because this was a new empty repository with no existing base branch or collaborators requiring a bootstrap pull request.

## Risks And Unknowns

- Current production player attributes cannot be fully verified from public read endpoints; the bundled database remains the provenance-labelled 2026-07-27 snapshot.
- Historical-team filtering and team-yellow inference are not available for the bundled dataset. The engine retains tested compatibility for future user imports, but imported provenance is user-controlled and not automatically authoritative.

## Next Step And User Decision

- No user decision is required. Future work can proceed through GitHub Issues and focused pull requests; authoritative data refresh remains optional if a trustworthy public source appears.
