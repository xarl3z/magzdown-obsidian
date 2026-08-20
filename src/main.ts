// PLUG-01: Ribbon icon in Obsidian sidebar
// PLUG-02: Command palette entry
// D-08: Opens Magzdown view in right leaf split
// D-09: Singleton — reveals existing pane rather than creating a second one
import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { MagzdownView, VIEW_TYPE_MAGZDOWN } from './MagzdownView';
import { MagzdownSettings, DEFAULT_SETTINGS } from './settings';

export default class MagzdownPlugin extends Plugin {
  settings!: MagzdownSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Register the Magzdown view type with the workspace
    this.registerView(
      VIEW_TYPE_MAGZDOWN,
      (leaf) => new MagzdownView(leaf, this),
    );

    // PLUG-01: Ribbon icon — visible in Obsidian left sidebar
    this.addRibbonIcon('book-open', 'Open Magzdown', () => {
      void this.activateMagzdownView();
    });

    // PLUG-02: Command palette command — searchable via Ctrl/Cmd+P
    // Obsidian prefixes the plugin name in the UI, so neither id nor name repeats it
    this.addCommand({
      id: 'open-preview',
      name: 'Open preview',
      callback: () => {
        void this.activateMagzdownView();
      },
    });

    this.addSettingTab(new MagzdownSettingTab(this.app, this));
  }

  // No onunload cleanup: leaves must NOT be detached on unload — that would
  // reset the pane's position the next time the plugin loads. Obsidian
  // detaches the view's DOM and listeners itself via onClose.

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<MagzdownSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  // SETT-02 / D-02 / Pitfall 4: Push current preferences to every open Magzdown view.
  // Resolved via getLeavesOfType at call time — never cache view references, they can detach.
  // Silent no-op when no Magzdown pane is open: next MAGZDOWN_READY will pick up persisted settings.
  broadcastPreferences(): void {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_MAGZDOWN);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view instanceof MagzdownView) {
        view.applyPreferences(this.settings);
      }
    }
  }

  // D-08: Opens in right leaf split
  // D-09: Single instance — reveals existing pane if already open
  async activateMagzdownView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_MAGZDOWN);

    if (existing.length > 0) {
      // D-09: Pane already exists — reveal it instead of creating a new one
      await this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    // D-08: Open in right leaf split (false = don't force a new split if one exists)
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;

    await leaf.setViewState({
      type: VIEW_TYPE_MAGZDOWN,
      active: true,
    });

    // Reveal the newly created leaf
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_MAGZDOWN);
    if (leaves.length > 0) {
      await this.app.workspace.revealLeaf(leaves[0]);
    }
  }

}

class MagzdownSettingTab extends PluginSettingTab {
  plugin: MagzdownPlugin;

  constructor(app: App, plugin: MagzdownPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Row 1: Color mode (D-01) — live-applied via broadcastPreferences
    new Setting(containerEl)
      .setName('Color mode')
      .setDesc('Light or dark theme for the Magzdown reading pane.')
      .addDropdown((dd) =>
        dd
          .addOption('light', 'Light')
          .addOption('dark', 'Dark')
          .setValue(this.plugin.settings.colorMode)
          .onChange(async (value) => {
            this.plugin.settings.colorMode = value as 'light' | 'dark';
            await this.plugin.saveSettings();
            this.plugin.broadcastPreferences();
          }),
      );

    // Row 2: Layout (D-01)
    new Setting(containerEl)
      .setName('Layout')
      .setDesc('Scroll for continuous reading, paginated for page-by-page.')
      .addDropdown((dd) =>
        dd
          .addOption('scroll', 'Scroll')
          .addOption('paginated', 'Paginated')
          .setValue(this.plugin.settings.layoutMode)
          .onChange(async (value) => {
            this.plugin.settings.layoutMode = value as 'scroll' | 'paginated';
            await this.plugin.saveSettings();
            this.plugin.broadcastPreferences();
          }),
      );

    // Row 3: Style preset (D-01)
    new Setting(containerEl)
      .setName('Style preset')
      .setDesc('Typographic preset for the reader. Changes font, rhythm, and margins.')
      .addDropdown((dd) =>
        dd
          .addOption('classic', 'Classic')
          .addOption('modern', 'Modern')
          .addOption('editorial', 'Editorial')
          .addOption('minimal', 'Minimal')
          .setValue(this.plugin.settings.stylePreset)
          .onChange(async (value) => {
            this.plugin.settings.stylePreset = value as 'classic' | 'modern' | 'editorial' | 'minimal';
            await this.plugin.saveSettings();
            this.plugin.broadcastPreferences();
          }),
      );

    // Row 4: Embed URL (advanced) — no live broadcast, iframe reload required
    new Setting(containerEl)
      .setName('Embed URL (advanced)')
      .setDesc('Override the Magzdown embed URL. Leave as default unless you are developing locally. Reload the Magzdown pane for URL changes to take effect.')
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.iframeUrl)
          .setValue(this.plugin.settings.iframeUrl)
          .onChange(async (value) => {
            this.plugin.settings.iframeUrl = value.trim() || DEFAULT_SETTINGS.iframeUrl;
            await this.plugin.saveSettings();
          }),
      );
  }
}
