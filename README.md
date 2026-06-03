# Squoosh Desktop

An Electron wrapper that packages [Squoosh](https://squoosh.app) — Google's open-source, fully client-side image compressor — as a standalone macOS `.app`.

The hard part of doing this is that several of Squoosh's WebAssembly codecs are multithreaded and need `SharedArrayBuffer`, which browsers only enable when the page is *cross-origin isolated*. A native Swift/`WKWebView` wrapper makes those isolation headers awkward to set, so the multithreaded codecs break. Electron bundles Chromium — the engine Squoosh is built and tested against — and this wrapper injects the required `COOP`/`COEP` headers so the threaded codecs work.

> **Unofficial project.** This is not affiliated with, endorsed by, or sponsored by Google. "Squoosh" and the Squoosh logo are trademarks of Google. **This repository contains only the Electron wrapper.** It does *not* redistribute Squoosh or its build output — you build Squoosh from its own source and drop it in (see below). The app icon is generated locally from your own Squoosh build and is likewise not included here.

A full write-up of how and why this was built is on the blog: <!-- TODO: add post URL -->

---

## What the wrapper does

- **Injects `COOP`/`COEP` headers** via a custom secure scheme, enabling `SharedArrayBuffer` so the multithreaded codecs (AVIF, MozJPEG, etc.) run.
- **Forces `charset=utf-8`** on text responses, fixing mojibake in the UI (e.g. the compression ratio showing `â†"90%` instead of `↓90%`).
- **Blocks Google Analytics** at the network layer, so the app runs fully offline. (Squoosh calls GA by default.)
- **Hides the landing-page demo and marketing sections** for a cleaner, tool-focused window.

---

## Repository layout

```
squoosh-desktop/
├── main.js            # Electron main process (scheme + header injection, GA block, UI hiding, charset fix)
├── make-icns.sh       # Generates icon.icns from a PNG in the Squoosh build
├── package.json
├── package-lock.json
└── squoosh/           # NOT included — you build and copy Squoosh's static output here
    ├── index.html
    └── ...
```

`squoosh/` and the generated `icon.icns` are intentionally **not** committed (see `.gitignore`). You produce both locally, as described below.

---

## Prerequisites

- macOS (the packaging and icon steps use built-in macOS tools)
- [Node.js](https://nodejs.org/) with [nvm](https://github.com/nvm-sh/nvm) recommended, since the Squoosh build is Node-version sensitive

---

## 1. Build Squoosh

Google has put Squoosh into maintenance mode, which makes the source build sensitive to your Node version. Matching the version pinned in the repo's `.nvmrc` is the single most important step.

```bash
git clone https://github.com/GoogleChromeLabs/squoosh.git
cd squoosh

# Match the Node version pinned in .nvmrc
nvm install
nvm use

npm install            # if it fails, try: npm install --legacy-peer-deps
npm run build
```

The static output lands in `build/`. The install will report many vulnerability warnings and an npm update notice — **ignore both**, and do **not** run `npm audit fix` (especially not `--force`), as changing dependency versions reliably breaks this old project.

Copy the entire build into this wrapper's `squoosh/` folder:

```bash
mkdir -p /path/to/squoosh-desktop/squoosh
cp -R build/* /path/to/squoosh-desktop/squoosh/
```

> If the build keeps failing, delete the `.tmp` and `build` folders and try again. Some users also rely on community forks that target newer Node versions — check the project's forks and issues if the pinned version is hard to install.

---

## 2. Run it

```bash
cd squoosh-desktop
npm install
npm start
```

A window should open. Drop in an image and confirm that AVIF/WebP encoding works — if it does, the header injection succeeded.

### Verify multithreading is on

Open the dev tools (**View → Toggle Developer Tools**) and run in the console:

```js
crossOriginIsolated   // should print: true
```

`true` means `SharedArrayBuffer` is available and the multithreaded codecs are active. If it prints `false`, the app still works but falls back to single-threaded codecs — slower, with a few options unavailable — which means the `COOP`/`COEP` headers are not being applied.

---

## 3. App icon (optional)

The app ships with the default Electron icon unless you generate one. `make-icns.sh` builds a macOS `.icns` from a PNG in your Squoosh build, using only the built-in `sips` and `iconutil` (nothing to install).

Find a suitable PNG (the largest one in the build is a good choice):

```bash
ls -lS squoosh/c/*.png | head
```

Then generate the icon:

```bash
chmod +x make-icns.sh
./make-icns.sh squoosh/c/<chosen-icon>.png
```

This creates `icon.icns`, which `package.json` already references for packaging. The largest bundled icon is 512×512, so scaling it up to 1024 leaves it slightly soft; rendering the source SVG logo at 1024 is sharper if you'd rather.

---

## 4. Package the app

```bash
npm run dist
```

`dist/` will contain a `.dmg` and a `.app`, built for both Apple Silicon and Intel.

### Code signing & notarization (optional)

To let the app open on other Macs without the "unidentified developer" warning, you need an Apple Developer account for code signing and notarization. Configure `electron-builder`'s `mac.notarize` option along with the `APPLE_ID` and `APPLE_APP_SPECIFIC_PASSWORD` environment variables. For personal use, this step can be skipped.

---

## Configuration notes

- Set `appId` in `package.json` to your own identifier.

---

## License

- **This wrapper** (`main.js`, `make-icns.sh`, `package.json`, configuration) is released under the MIT License — see `LICENSE`.
- **Squoosh** is a separate project licensed under Apache-2.0 by Google. This repository does not include or redistribute it; you build it from [its own source](https://github.com/GoogleChromeLabs/squoosh) under its own license terms. Note that Squoosh bundles codecs with their own licenses (some, such as imagequant, are copyleft), which is another reason this repo leaves the build to you rather than shipping it.
