# Magzdown for Obsidian

Beautiful markdown reading in Obsidian, powered by [magzdown.com](https://www.magzdown.com).

Magzdown is a magazine-style reader that turns your notes into immersive, typographically refined reading sessions. This plugin embeds the Magzdown reader in a side pane so you can write in Obsidian and read what you write — live, in a different font, with the active note mirrored in real time.

![The Magzdown pane rendering a note alongside the Obsidian editor.](./docs/screenshot-pane.png)
*The Magzdown pane rendering a note alongside the Obsidian editor.*

## Install

Magzdown is an official community plugin:

1. Open **Settings → Community plugins → Browse** and search for **Magzdown**.
2. Click **Install**, then **Enable**.
3. Click the Magzdown ribbon icon (a book) to open the reading pane, or run **Open Magzdown preview** from the command palette.

## Features

- **Live preview**: The active note renders in the Magzdown pane as you type, with a 500ms debounce so it stays responsive.
- **Frontmatter aware**: `title`, `author`, and `date` from YAML frontmatter become a byline with reading time in the reader.
- **Eight reading styles**: Presets modeled on real magazine genres — literary Classic, graphic Modern, art-directed Editorial, Swiss Minimal, fashion-glossy Couture, news-weekly Gazette, tech-magazine Pulse, and the slab-serif Headliner.
- **Print-grade typography**: Drop caps, decks from an opening italic line, small-caps openers, true italics, and footnotes as margin notes on wide panes.
- **Light and dark**: Color mode respects your preference and applies instantly.
- **Two layouts**: Continuous scroll or page-by-page paginated reading with print-style running heads and page folios.
- **Graceful errors**: If the reader fails to load, the pane shows a recovery message with a retry action.

## Settings

Open **Settings → Magzdown** to configure:

- **Color mode** — Light or dark theme for the Magzdown reading pane.
- **Layout** — Scroll for continuous reading, paginated for page-by-page.
- **Style preset** — Typographic preset for the reader. Changes font, rhythm, and margins.
- **Embed URL (advanced)** — Override the Magzdown embed URL. Leave as default unless you are developing locally.

Changes apply instantly in any open Magzdown pane — no save button. The pane's own toolbar offers further typography controls: fonts, color themes, and text alignment.

## Free and Pro

The plugin is free and open source (MIT). The embedded Magzdown reader is free to use — all eight style presets' defaults, print typography, and both layouts included. The magzdown.com webapp offers an optional one-time Pro purchase that unlocks extra color themes, fonts, theme packs, and PDF/EPUB export; nothing in the plugin's core reading flow requires it.

## Requirements

- Obsidian Desktop (this plugin is desktop-only; Obsidian Mobile lacks the iframe support Magzdown needs).
- An internet connection — the reader is loaded from `https://www.magzdown.com/embed`.

## Privacy

The plugin sends your active note's markdown content and basic frontmatter (`title`, `author`, `date`) to `https://www.magzdown.com/embed` via the browser's `postMessage` API, scoped to the magzdown.com origin. No content is stored on magzdown.com servers — the reader is fully client-side.

## Contributing and releases

See [RELEASING.md](./RELEASING.md) for the release workflow.

## License

MIT — see [LICENSE](LICENSE).
