# Third-Party Notices

## csgofriberg

- Source: https://github.com/shnlfriberg/csgofriberg
- Verified commit: `33c8288af466f092117a4fa41c16552c13245b48`
- License: GNU Affero General Public License v3.0
- Use here: behavioral and schema reference only. No upstream source file or visual asset is bundled.

## csgo-major-db player data

- Recorded source: https://github.com/shnlfriberg/csgo-major-db
- Recorded source commit: `eb9fd74735039871a5ee00a89a0c50e36d608d0c`
- Snapshot date: 2026-07-27
- Raw snapshot SHA-256: `c10b84d140100fd114b34d0867456e4d30b6da4ede2d7dbf4e0303b31e5e8e6a`
- License: MIT
- Recovery evidence: https://github.com/LilJay-H/csgofriberg-answer-extension at commit `24bf261121a86b29661c150557785379beb1a035`

The original source repository was unavailable during implementation. The exact recovered raw file is retained as `data-snapshots/source-2026-07-27.json`; its MIT license is retained as `data-snapshots/LICENSE.csgo-major-db`.

## Public solver corroboration

- Source: https://github.com/zabccc123/friberg-solver
- Commit inspected: `a71a4a256edb609846fa45c8605339323d7eb992`
- License: MIT
- Use here: corroborated the published v31 / 2026-07-27 / 646-player snapshot metadata. No source code is bundled.

## Tesseract.js OCR runtime

- Source: https://github.com/naptha/tesseract.js
- Version: `7.0.0`
- License: Apache License 2.0
- Bundled asset: `public/ocr/worker.min.js`
- SHA-256: `576b7df7e3393e137e51849357c9adb53fe7ac1bb69bfa06cf3d61520f182c6d`

## tesseract.js-core

- Source: https://github.com/naptha/tesseract.js-core
- Version: `7.0.0`
- License: Apache License 2.0
- Bundled assets: the LSTM-only baseline, SIMD, and relaxed-SIMD browser cores under `public/ocr/core/`
- SHA-256:
  - `tesseract-core-lstm.wasm.js`: `eef5f8b2f8e20e150680b20adaec4a60babafee3adbe8a94583c81fee46e8680`
  - `tesseract-core-simd-lstm.wasm.js`: `c58b46a4c796c0b8afccf77591d5b875b6896b45d402bbce8caa6f5362447b38`
  - `tesseract-core-relaxedsimd-lstm.wasm.js`: `861a536cf9ef8e63cb644d57bab39c388f37f7d6b6f60024b741c5f6b39a59b3`

The complete Apache-2.0 license text used by both runtime packages is retained as `public/ocr/LICENSE.Apache-2.0.txt`.

## Tesseract language data

- Source: https://github.com/naptha/tessdata
- npm packages: `@tesseract.js-data/eng@1.0.0` and `@tesseract.js-data/chi_sim@1.0.0`, `4.0.0_best_int` variants
- Package metadata license: MIT; source repository license: Apache License 2.0. The vendored files are conservatively documented and redistributed under the source repository's Apache-2.0 terms.
- Bundled assets and SHA-256:
  - `public/ocr/tessdata/eng.traineddata.gz`: `45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91`
  - `public/ocr/tessdata/chi_sim.traineddata.gz`: `b8a23f10c7de500891eb458a8adc9cc58ab7f242f08b7d149f5e9aea4ad5db7c`

These assets run entirely in the browser. Uploaded screenshots are not sent to Tesseract.js, its maintainers, a CDN, or the upstream game.
