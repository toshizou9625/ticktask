# GitHub Actions Build Config for Tauri

## Workflow Split

| File | Trigger | Purpose |
|------|---------|---------|
| `.github/workflows/ci.yml` | PR, push to main | cargo test + clippy + frontend build |
| `.github/workflows/release.yml` | Tag push `v*` | Universal binary + GitHub Releases |

## ci.yml Pattern

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Cache Rust
        uses: actions/cache@v4
        with:
          path: src-tauri/target
          key: ${{ runner.os }}-rust-${{ hashFiles('src-tauri/Cargo.lock') }}

      - run: npm ci
      - run: npm run build          # frontend build
      - run: cargo test --manifest-path src-tauri/Cargo.toml
      - run: cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

## release.yml Pattern

```yaml
name: Release
on:
  push:
    tags: ["v*"]

jobs:
  release:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: aarch64-apple-darwin,x86_64-apple-darwin

      - name: Cache Rust
        uses: actions/cache@v4
        with:
          path: src-tauri/target
          key: ${{ runner.os }}-rust-release-${{ hashFiles('src-tauri/Cargo.lock') }}

      - run: npm ci

      - name: Build Tauri App
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Signing (add when ready for production):
          # APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          # APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          # APPLE_ID: ${{ secrets.APPLE_ID }}
          # APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          # APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: TickTask ${{ github.ref_name }}
          releaseBody: "See CHANGELOG for details."
          args: --target universal-apple-darwin
```

## Cache Key Design

- Rust: keyed on `Cargo.lock` hash — invalidates when dependencies change
- Node: built into `actions/setup-node` with `cache: npm` using `package-lock.json`

## Universal Binary

`--target universal-apple-darwin` builds fat binary (Intel + Apple Silicon).
Requires both targets installed: `aarch64-apple-darwin` and `x86_64-apple-darwin`.

## Signing Note

Signing/notarization is skipped at MVP stage.
Templates are included as comments in `release.yml` for future production use.
Required secrets: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`.
