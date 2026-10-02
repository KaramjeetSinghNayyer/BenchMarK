# BenchMarker

A sorting lab for editing and benchmarking JavaScript and ANSI C algorithms in your browser. Compare measured timings with theoretical growth and export reproducible experiments as CSV.

## Run locally

Requires Node.js 22 or newer. The app has no npm dependencies.

```sh
cd site
npm ci
npm run dev
```

Open http://127.0.0.1:3001. See [the app documentation](site/README.md) for features, methodology, and compiler attribution.

## Verify a release

```sh
cd site
npm test
npm run build
npm run preview
```

The build checks JavaScript syntax, required assets, and gzip archive integrity, then copies the authored files from `site/dist/` into `site/build/`. The output includes all C compiler binaries, licenses, and a `.nojekyll` marker. Preview serves that exact output. Edit `site/dist/`, not the generated `site/build/` directory.

## Publish on GitHub Pages

1. Commit and push these changes to the repository's `main` branch.
2. In GitHub, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Open **Actions → Verify and publish BenchMarker → Run workflow**, select `main`, and run it. Later pushes to `main` deploy automatically after the tests and build succeed. Pull requests run verification without deploying.
4. Open the URL reported by the deployment. With the current repository name, the expected address is https://karamjeetsinghnayyer.github.io/BenchMarK/.

The workflow uses GitHub's [custom Pages deployment actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Pages must be enabled before deployment can succeed; repository visibility and account plan must support Pages. The build artifact has `index.html` at its root. Relative module, worker, and compiler URLs support the repository subdirectory without a base URL rewrite.

GitHub Pages serves the app directly; Node.js is used only for verification and local previews. No server, database, API keys, or environment variables are needed in production. Other static hosts can serve the contents of `site/build/` too. Serve `.gz` compiler files as gzip archives without `Content-Encoding: gzip`: the browser app decompresses them itself.

## Browser support and data

Use a current Chrome, Edge, Firefox, or Safari with Web Workers, WebAssembly, and `DecompressionStream`. C mode downloads approximately 19 MB of compiler assets on first use. Inputs, edited code, and results stay in the page session; the app has no analytics or application backend. Export before refreshing. Hosting providers still receive normal website requests.

## Attribution and licensing

Created by Karamjeet Singh (Mtech, IIT Guwahati). The bundled wasm-clang assets retain their upstream licenses and notices in `site/dist/vendor/clang/`, and are included in every release. This repository does not currently grant an open-source license for the original app code; website publication does not change that. The author can add a license separately if public reuse is intended.
