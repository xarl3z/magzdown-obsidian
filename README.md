# Magzdown for Obsidian

Beautiful markdown reading in Obsidian, powered by [magzdown.com](https://magzdown.com).

Magzdown is a magazine-style reader that turns your notes into immersive, typographically refined reading sessions. This plugin embeds the Magzdown reader in a side pane so you can write in Obsidian and read what you write — live, in a different font, with the active note mirrored in real time.

![The Magzdown pane rendering a note alongside the Obsidian editor.](./docs/screenshot-pane.png)
*The Magzdown pane rendering a note alongside the Obsidian editor.*

## Features

- **Live preview**: The active note renders in the Magzdown pane as you type, with a 500ms debounce so it stays responsive.
- **Frontmatter aware**: `title`, `author`, and `date` from YAML frontmatter flow into the reader's export metadata.
- **Four reading styles**: Choose from Classic, Modern, Editorial, or Minimal typographic presets.
- **Light and dark**: Color mode respects your preference and applies instantly.
- **Two layouts**: Continuous scroll or page-by-page paginated reading.
- **Graceful errors**: If the reader fails to load, the pane shows a recovery message with a retry action.

## Install

### Install via BRAT (early access)

Before the plugin appears in the Obsidian community plugin list, you can install it using [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Install BRAT from the Obsidian community plugin list and enable it.
2. Open the BRAT settings and choose **Add Beta plugin**.
3. Paste this repository's URL (for example, `https://github.com/xarl3z/magzdown-obsidian`) and confirm.
4. Enable **Magzdown** under **Settings → Community plugins**.
5. Click the Magzdown ribbon icon (a book) to open the reading pane, or run **Open Magzdown preview** from the command palette.

### Install from Obsidian community plugins

*Coming soon.* Once the community plugin PR is merged, you will be able to install Magzdown directly from **Settings → Community plugins → Browse** in Obsidian.

## Settings

Open **Settings → Magzdown** to configure:

- **Color mode** — Light or dark theme for the Magzdown reading pane.
- **Layout** — Scroll for continuous reading, paginated for page-by-page.
- **Style preset** — Typographic preset for the reader. Changes font, rhythm, and margins.
- **Embed URL (advanced)** — Override the Magzdown embed URL. Leave as default unless you are developing locally.

Changes apply instantly in any open Magzdown pane — no save button.

## Requirements

- Obsidian Desktop (this plugin is desktop-only; Obsidian Mobile lacks the iframe support Magzdown needs).
- An internet connection — the reader is loaded from `https://magzdown.com/embed`.

## Privacy

The plugin sends your active note's markdown content and basic frontmatter (`title`, `author`, `date`) to `https://magzdown.com/embed` via the browser's `postMessage` API, scoped to the magzdown.com origin. No content is stored on magzdown.com servers — the reader is fully client-side.

## Contributing and releases

See [RELEASING.md](./RELEASING.md) for the release workflow.

## License

MIT — see [LICENSE](LICENSE).
