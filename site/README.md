# BenchMarker

An educational sorting benchmark app made by Karamjeet Singh (Mtech, IIT Guwahati), ksn2939@gmail.com.

## Problem

Students need a reproducible way to compare sorting implementations on identical inputs, edit their source code, and distinguish measured elapsed time from theoretical asymptotic growth and observed empirical growth. BenchMarker connects these activities in one browser workspace and exports the evidence as CSV.

## Run

Use Node.js 22 or newer: `npm run dev`, then open http://127.0.0.1:3001. No dependency installation is necessary. Static files in `dist/` can also be served by any HTTP server. Modules and workers require HTTP rather than opening HTML as a file.

## Features

- Six editable implementations in JavaScript and ANSI C89: quick, merge, bubble, insertion, selection, and heap sort.
- Seeded random, sorted, reversed, nearly sorted, and duplicate-heavy inputs at five sizes up to 20,000 elements.
- JSON/CSV upload or pasted arrays, including empty arrays, negatives, decimals, and duplicates.
- Syntax-highlighted editor. Results retain their own source and input snapshots.
- Disposable Web Workers, one warm-up and 3–20 timed repetitions per algorithm/case, a 12-second timeout, cancellation, and error reporting.
- Correctness validation against a sorted reference, checking length and every value outside the timed section.
- Median charts, scaled theoretical curves, normalized growth, empirical fitting, and log scale.
- CSV export of raw timings, errors, configuration, source, input fingerprints, custom inputs, and browser context.
- Responsive layout, keyboard controls, and optional WebMCP tools.

## Interpretation and limits

The timer measures only the synchronous `sort` call, including allocations inside it. Copying, compilation, one warm-up, and correctness checking are excluded. Every algorithm receives identical inputs; algorithm order rotates across cases. Each algorithm/case starts in a fresh worker. This is a teaching benchmark, not a comprehensive microbenchmark framework. Timer resolution, JIT, garbage collection, scheduling, and background activity influence results; repeat experiments at meaningful sizes.

Empirical fits are descriptive, not proof of Big O. Fitting needs at least four distinct positive sizes and a maximum median of 0.05 ms or more. Theoretical references describe the built-in average case. Edited code and particular input patterns may differ. Curves fit `c × f(n)` through the origin. Medians combine repetitions for custom cases of the same size.

Worker isolation protects UI responsiveness; it is not a security boundary for hostile JavaScript. Use code you trust. The app has no backend. Results, drafts, and custom inputs last for the page session. Export before reloading or replacing a run. CSV includes full source and custom inputs; large exports are expected.

## Verification

`npm test` covers sorting edge cases, deterministic generation, input validation, fitting, CSV quoting, real worker execution, error handling, and termination. `dist/` contains authored source; no build step is required.

## ANSI C in the browser

Choose **ANSI C (C89)** in Algorithm studio or the benchmark language control. Write `void sort(double input[], int n)` and sort in place, then choose **Compile & apply**. The function signature uses `double` to preserve the lab’s decimal inputs. `main()` is not needed. JavaScript and C drafts remain separate when switching languages.

Clang enforces `-std=c89 -pedantic-errors` and compiles with `-O2`. First use loads about 19 MB of bundled, compressed compiler assets. Compilation occurs in a disposable worker with a 120-second limit and cancellation. Compiled modules are reused within the page session; source changes invalidate the cache. C execution uses the existing 12-second per-case timeout. CSV includes language, compiler identity, flags, and exact source.

These timings are optimized browser WebAssembly timings, not native desktop C timings. They exclude compiler loading, compilation, module instantiation, warm-up, and copying into/out of WebAssembly memory. Standard headers and libc are provided; file, terminal input, and OS APIs are not available. Benchmark stdout/stderr is discarded. WebAssembly memory is capped at 64 MB per algorithm instance.

### Compiler attribution

The bundled compiler, linker, in-memory filesystem, and sysroot come from [binji/wasm-clang](https://github.com/binji/wasm-clang), pinned to commit `648c4a89997a351eef75cdaec3ef5b89d4937dec`. Downloaded binaries were verified against that commit’s Git blob hashes. `dist/vendor/clang/LICENSE` and `LICENSE.llvm` retain the upstream licenses. The upstream `shared.js` has one adaptation: an ES module export. Header notices remain in the bundled sysroot.

The C test suite executes the same bundled WebAssembly compiler and runtime used by the browser, including all six algorithms, numeric edge cases, C89 diagnostics, error recovery, worker timing, incorrect outputs, termination, and CSV metadata.
