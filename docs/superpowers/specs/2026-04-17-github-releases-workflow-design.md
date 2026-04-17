# GitHub Releases Workflow Design Spec

**Date:** 2026-04-17
**Status:** Approved

## Overview

A single GitHub Actions workflow (`.github/workflows/release.yml`) that automates building and publishing the HASS-ODPS Home Assistant add-on. On trigger, it resolves the release version, patches `config.yaml`, builds multi-arch Docker images via the HA Builder action, pushes them to `ghcr.io`, and creates a GitHub Release.

---

## Triggers

| Trigger | Details |
|---|---|
| `push` on tag `v*.*.*` | Extracts version from tag (e.g. `v1.2.3` → `1.2.3`) |
| `workflow_dispatch` | Requires a `version` input (e.g. `1.2.3`, no leading `v`) |

---

## Jobs

### 1. `version`

Resolves and persists the release version.

**Steps:**
1. Checkout `main`
2. Derive version string:
   - Tag push: strip leading `v` from `github.ref_name`
   - Manual dispatch: use `inputs.version` directly
3. Patch `config.yaml` using `yq`: set `version` field to resolved value
4. Commit the change back to `main` with message `chore: bump version to <version> [skip ci]`
   - `[skip ci]` prevents the commit from re-triggering the workflow
5. Output `version` for downstream jobs

**Output:** `version` (string, e.g. `1.2.3`)

---

### 2. `build`

**Depends on:** `version`

Builds and pushes multi-arch Docker images.

**Steps:**
1. Checkout repo (picks up the version-bumped `config.yaml`)
2. Log in to `ghcr.io` with `GITHUB_TOKEN`
3. Run `home-assistant/builder` action:
   - `--all` — builds all arches declared in `config.yaml` (`aarch64`, `amd64`, `armhf`, `armv7`)
   - `--target .` — add-on root is the repo root
   - Images pushed as `ghcr.io/korzun/hass-odps:<version>` and `ghcr.io/korzun/hass-odps:latest`

The builder action handles multi-arch Docker buildx internally.

---

### 3. `release`

**Depends on:** `build`

Creates the GitHub Release.

**Steps:**
1. Run `softprops/action-gh-release` with:
   - Tag: `v<version>`
   - `generate_release_notes: true` — auto-populates body from merged PRs/commits since last release
   - Marked as latest release
2. No binary assets — distribution is via the Docker image on `ghcr.io`

Users install the add-on by adding this repository URL to HA. HA reads `repository.yaml` and `config.yaml` to discover the add-on and its version.

---

## Permissions

The workflow needs:
- `contents: write` — to commit the version bump and create the GitHub Release
- `packages: write` — to push images to `ghcr.io`

These are granted via `permissions:` at the workflow level using the built-in `GITHUB_TOKEN`. No external secrets required.

---

## File Layout

```
.github/
└── workflows/
    └── release.yml    # single workflow file
```

---

## Error Handling

- If the version job fails (e.g. `yq` parse error), build and release jobs are skipped
- If the build job fails, the release job is skipped — no partial release is ever created
- `[skip ci]` on the version bump commit prevents infinite trigger loops
