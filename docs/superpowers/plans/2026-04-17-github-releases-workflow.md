# GitHub Releases Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `.github/workflows/release.yml` that patches `config.yaml`, builds multi-arch Docker images via HA Builder, pushes to `ghcr.io`, and creates a GitHub Release — triggered by a version tag or manual dispatch.

**Architecture:** Three sequential jobs (`version` → `build` → `release`) in a single workflow file. The `version` job resolves and commits the version bump; `build` uses the `home-assistant/builder` action for multi-arch images; `release` creates the GitHub Release with auto-generated notes.

**Tech Stack:** GitHub Actions, `home-assistant/builder`, `docker/login-action`, `softprops/action-gh-release`, `mikefarah/yq`

---

## File Layout

| Action | Path |
|---|---|
| Create | `.github/workflows/release.yml` |

---

### Task 1: Scaffold workflow — triggers, permissions, empty job stubs

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create the workflow scaffold**

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - "v*.*.*"
  workflow_dispatch:
    inputs:
      version:
        description: "Version to release (e.g. 1.2.3)"
        required: true

permissions:
  contents: write
  packages: write

jobs:
  version:
    name: Bump version
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.resolve.outputs.version }}
    steps:
      - run: echo "placeholder"

  build:
    name: Build & push images
    needs: version
    runs-on: ubuntu-latest
    steps:
      - run: echo "placeholder"

  release:
    name: Create GitHub Release
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: echo "placeholder"
```

- [ ] **Step 2: Validate YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "feat: add release workflow scaffold"
```

---

### Task 2: Implement the `version` job

**Files:**
- Modify: `.github/workflows/release.yml` — replace `version` job steps

**What it does:**
1. Resolves version from tag or input
2. Installs `yq` (mikefarah flavour) to patch YAML
3. Patches `config.yaml` version field
4. Commits back to `main` with `[skip ci]`
5. Exposes `version` output

- [ ] **Step 1: Replace the `version` job steps**

Replace the `version` job's `steps:` block with:

```yaml
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Resolve version
        id: resolve
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            VERSION="${{ github.event.inputs.version }}"
          else
            VERSION="${GITHUB_REF_NAME#v}"
          fi
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"

      - name: Install yq
        uses: mikefarah/yq@v4.44.1

      - name: Patch config.yaml
        run: |
          yq e '.version = "${{ steps.resolve.outputs.version }}"' -i config.yaml

      - name: Commit version bump
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add config.yaml
          git diff --cached --quiet && echo "No change" && exit 0
          git commit -m "chore: bump version to ${{ steps.resolve.outputs.version }} [skip ci]"
          git push origin main
```

- [ ] **Step 2: Validate YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "feat: implement version job in release workflow"
```

---

### Task 3: Implement the `build` job

**Files:**
- Modify: `.github/workflows/release.yml` — replace `build` job steps

**What it does:**
1. Checks out repo (gets the version-bumped `config.yaml`)
2. Logs in to `ghcr.io` with `GITHUB_TOKEN`
3. Runs `home-assistant/builder` to build all four arches and push to `ghcr.io`

- [ ] **Step 1: Replace the `build` job steps**

Replace the `build` job's `steps:` block with:

```yaml
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: main

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.repository_owner }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: home-assistant/builder@2024.03.5
        with:
          args: >-
            --all
            --target /github/workspace
            --docker-hub ghcr.io/${{ github.repository_owner }}
            --addon
```

- [ ] **Step 2: Validate YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "feat: implement build job in release workflow"
```

---

### Task 4: Implement the `release` job

**Files:**
- Modify: `.github/workflows/release.yml` — replace `release` job steps

**What it does:**
1. Creates a GitHub Release tagged `v<version>` with auto-generated release notes

- [ ] **Step 1: Replace the `release` job steps**

Replace the `release` job's `steps:` block with:

```yaml
    steps:
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v${{ needs.version.outputs.version }}
          generate_release_notes: true
          make_latest: true
```

Also add `needs` outputs to the `release` job so it can reference `needs.version.outputs.version`. The `release` job already has `needs: build`, so extend it to also depend on `version`:

```yaml
  release:
    name: Create GitHub Release
    needs: [version, build]
    runs-on: ubuntu-latest
```

- [ ] **Step 2: Validate YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 3: Verify the complete file looks correct**

The final `.github/workflows/release.yml` should look like this in full:

```yaml
name: Release

on:
  push:
    tags:
      - "v*.*.*"
  workflow_dispatch:
    inputs:
      version:
        description: "Version to release (e.g. 1.2.3)"
        required: true

permissions:
  contents: write
  packages: write

jobs:
  version:
    name: Bump version
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.resolve.outputs.version }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Resolve version
        id: resolve
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            VERSION="${{ github.event.inputs.version }}"
          else
            VERSION="${GITHUB_REF_NAME#v}"
          fi
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"

      - name: Install yq
        uses: mikefarah/yq@v4.44.1

      - name: Patch config.yaml
        run: |
          yq e '.version = "${{ steps.resolve.outputs.version }}"' -i config.yaml

      - name: Commit version bump
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add config.yaml
          git diff --cached --quiet && echo "No change" && exit 0
          git commit -m "chore: bump version to ${{ steps.resolve.outputs.version }} [skip ci]"
          git push origin main

  build:
    name: Build & push images
    needs: version
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: main

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.repository_owner }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: home-assistant/builder@2024.03.5
        with:
          args: >-
            --all
            --target /github/workspace
            --docker-hub ghcr.io/${{ github.repository_owner }}
            --addon

  release:
    name: Create GitHub Release
    needs: [version, build]
    runs-on: ubuntu-latest
    steps:
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v${{ needs.version.outputs.version }}
          generate_release_notes: true
          make_latest: true
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "feat: implement release job — complete release workflow"
```

---

### Task 5: Lint with actionlint

**Files:** none created, validation only

`actionlint` is a static analysis tool for GitHub Actions workflows. It catches type errors, undefined expressions, and invalid action references that plain YAML validation misses.

- [ ] **Step 1: Install actionlint (if not already installed)**

```bash
brew install actionlint
```

- [ ] **Step 2: Run actionlint**

```bash
actionlint .github/workflows/release.yml
```

Expected: no output (clean exit). If errors are reported, fix them before proceeding.

Common actionlint findings to watch for:
- `expression syntax error` — mismatched `${{ }}` expressions
- `undefined output` — job output referenced before being declared
- `unknown action` — action reference not found (may be a version pin issue)

- [ ] **Step 3: Commit any fixes**

If actionlint required changes:

```bash
git add .github/workflows/release.yml
git commit -m "fix: actionlint corrections to release workflow"
```

---

## Testing the Workflow End-to-End

After the workflow is merged to `main`, verify it works by triggering it manually:

1. Go to **Actions → Release → Run workflow** in the GitHub UI
2. Enter `1.0.1` as the version
3. Observe:
   - `version` job: `config.yaml` gets committed with `version: 1.0.1`
   - `build` job: four arch images appear at `ghcr.io/korzun/hass-odps:1.0.1`
   - `release` job: GitHub Release `v1.0.1` is created with auto-generated notes

For a tag-triggered run:
```bash
git tag v1.0.2
git push origin v1.0.2
```
