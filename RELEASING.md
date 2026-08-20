# Releasing Magzdown Plugin

This checklist produces a release that BRAT can install and that passes the obsidian-releases automated review.

## Prerequisites

- You are on the `main` branch with a clean working tree.
- `npm run build` runs cleanly from ``.
- You have push access to the repository.

## Checklist

1. **Decide the new version** (semver). Example: `1.0.0`.
2. **Bump the version in all three files to the same value**:
   - `manifest.json` → `version`
   - `package.json` → `version`
   - `versions.json` → add a new entry `"<version>": "<minAppVersion>"` (keep previous entries)
3. **Verify `minAppVersion`** in `manifest.json` matches the floor of every Obsidian API the plugin uses. Bump if you added new APIs since the last release.
4. **Build**:
   ```
   # (repo root)
   npm run build
   ```
   This runs `tsc -noEmit -skipLibCheck` and produces `main.js`. Do not minify.
5. **Run the pre-submission audit**:
   ```
   grep -rnE "innerHTML|outerHTML|insertAdjacentHTML|\beval\b|\bFunction\s*\(" src/
   ```
   Must return no matches. The obsidian-releases automated bot rejects plugins that use any of these APIs.
6. **Commit the version bump**:
   ```
   git add manifest.json versions.json package.json main.js
   git commit -m "chore(release): <version>"
   git push origin main
   ```
   Commit BEFORE tagging. If you tag first, the obsidian-releases bot reads repo-root `manifest.json` at the old version and the PR check fails.
7. **Tag the release WITHOUT a `v` prefix**:
   ```
   git tag <version>
   git push origin <version>
   ```
   Example: `git tag 1.0.0` — not `v1.0.0`. BRAT and the community-plugins bot both compare `manifest.json` version to the tag literally.
8. **Create a GitHub release from the tag**:
   - Go to the repository's Releases page and click **Draft a new release**.
   - Choose the tag you pushed.
   - Release title: the version number (for example, `1.0.0`).
   - Release notes: short summary of changes.
   - Attach these files from ``:
     - `manifest.json`
     - `main.js`
     - `styles.css` (only if it exists — this plugin currently has no stylesheet)
   - Publish the release.
9. **Verify BRAT installation works** in a clean vault:
   - Install BRAT in a fresh vault.
   - Add the beta plugin with the repository URL.
   - Enable Magzdown.
   - Open the Magzdown pane and load any note.
   - Confirm the pane renders.
10. **(First release only) Open the obsidian-releases PR**:
    - Fork `https://github.com/obsidianmd/obsidian-releases`.
    - Add an entry to `community-plugins.json` matching the `manifest.json` fields (`id`, `name`, `author`, `description`, `repo`).
    - Open a pull request. The automated bot scans the repository and posts results as PR comments within a few hours.
    - Address any bot feedback. Most failures come from: forbidden DOM APIs, mismatched manifest fields, missing `isDesktopOnly`, or `fundingUrl` pointing at `obsidian.md`.

## Release gotchas

- **Do not prefix the tag with `v`.** `1.0.0` is correct; `v1.0.0` is not.
- **Do not minify `main.js`.** Submission reviewers need to be able to read the source.
- **Do not commit after tagging.** Commit → tag → push tag → release, in that order.
- **Do not point `fundingUrl` at `obsidian.md`.** The bot flags it.
- **Do not forget `styles.css`** if you add one in a future release — it must be attached to the release assets, not only present in the repo.
- **`versions.json` must include every released version.** Obsidian's updater uses it to decide which plugin version a user on an older Obsidian can install.
