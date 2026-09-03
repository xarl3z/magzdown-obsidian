// D-05: Branded splash screen shown while iframe loads
// D-06: postMessage round-trip — send CONTENT_UPDATE after MAGZDOWN_READY
// SYNC-01/SYNC-02: Editor tracking with debounced content sync
// SYNC-03: Active leaf change tracking for note switches
// SYNC-04: Render guard (drop-and-replace) prevents message pile-up
import { ItemView, WorkspaceLeaf, MarkdownView, Editor, MarkdownFileInfo, parseYaml, setIcon } from 'obsidian';
import type { MetadataUpdatePayload } from './types/embed-protocol';
import type MagzdownPlugin from './main';
import type { MagzdownSettings } from './settings';

export const VIEW_TYPE_MAGZDOWN = 'magzdown-view';

interface IncomingEmbedMessage {
  version?: unknown;
  type?: unknown;
}

export class MagzdownView extends ItemView {
  private plugin: MagzdownPlugin;
  private iframe: HTMLIFrameElement | null = null;

  // SETT-05: Error-state DOM elements (lazily created, reused on subsequent errors)
  private splashEl: HTMLDivElement | null = null;
  private errorEl: HTMLDivElement | null = null;
  private errorHeadingEl: HTMLDivElement | null = null;
  private errorBodyEl: HTMLDivElement | null = null;
  private retryBtn: HTMLButtonElement | null = null;

  // D-05 condition 2: MAGZDOWN_READY timeout watcher handle
  private readyTimeout: number | null = null;

  // D-05 / D-08: Timeouts in ms — see 13-RESEARCH.md Assumption A3
  private static readonly READY_TIMEOUT_MS = 8000;

  // SYNC-02: Debounce timer for editor-change events
  private debounceTimer: number | null = null;

  // Track last known markdown leaf — getActiveViewOfType returns null when side pane has focus
  private lastMarkdownLeaf: WorkspaceLeaf | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: MagzdownPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  // Accessor so the view always reads the latest user-configured URL
  private get iframeUrl(): string {
    return this.plugin.settings.iframeUrl;
  }

  getViewType(): string {
    return VIEW_TYPE_MAGZDOWN;
  }

  getDisplayText(): string {
    return 'Magzdown';
  }

  getIcon(): string {
    return 'book-open';
  }

  onOpen(): Promise<void> {
    const container = this.contentEl;
    container.empty();

    // Iframe fills the entire pane — styling lives in styles.css
    container.addClass('magzdown-view-content');

    // D-05/D-08: Splash element reused by Plan 02 retry flow — store on the instance
    this.splashEl = container.createDiv({ cls: 'magzdown-splash' });
    this.splashEl.createDiv({ cls: 'magzdown-splash-title', text: 'Magzdown' });
    this.splashEl.createDiv({ cls: 'magzdown-splash-spinner' });

    // PLUG-03 / T-11-06: iframe with minimal sandbox permissions
    this.iframe = container.createEl('iframe', { cls: 'magzdown-iframe magzdown-hidden' });
    this.iframe.setAttribute('src', this.iframeUrl);
    this.iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox'
    );

    // D-05 condition 3: offline at open time — show error before we even try to load the iframe
    if (!navigator.onLine) {
      this.showError('You appear to be offline', 'Magzdown needs an internet connection to load the reader.');
    } else {
      // D-05 condition 1: iframe-level error event (network failure, CORS block, etc.)
      this.iframe.addEventListener('error', () => {
        this.showError("Couldn't load Magzdown", 'Check your internet connection and try again.');
      });

      // Swap splash for iframe once HTTP response loaded, and start MAGZDOWN_READY timeout
      this.iframe.addEventListener('load', () => {
        this.splashEl?.addClass('magzdown-hidden');
        this.iframe?.removeClass('magzdown-hidden');
        this.startReadyTimeout();
      });
    }

    // D-06: Message listener — MAGZDOWN_READY clears error and sends content + prefs
    window.addEventListener('message', this.handleMessage);

    // SYNC-01/SYNC-02: editor change tracking with debounce
    this.registerEvent(
      this.app.workspace.on('editor-change', this.handleEditorChange)
    );
    // SYNC-03: active leaf change tracking
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', this.handleActiveLeafChange)
    );
  }

  onClose(): Promise<void> {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.clearReadyTimeout();
    window.removeEventListener('message', this.handleMessage);
    this.iframe = null;
    this.splashEl = null;
    this.errorEl = null;
    this.errorHeadingEl = null;
    this.errorBodyEl = null;
    this.retryBtn = null;
    return Promise.resolve();
  }

  // T-11-03: Validate version === 1 before processing any incoming message
  // Arrow function property — bound reference required for add/removeEventListener
  // D-08/D-09: MAGZDOWN_READY triggers real content sync (replaces sendWelcomeContent)
  // Pitfall 3: MAGZDOWN_READY resets render guard on every iframe init/reload
  private handleMessage = (event: MessageEvent): void => {
    // Validate origin matches the configured iframe URL
    const expectedOrigin = new URL(this.iframeUrl).origin;
    if (event.origin !== expectedOrigin) return;

    const msg = event.data as IncomingEmbedMessage | null;
    if (!msg || msg.version !== 1) return;

    if (msg.type === 'MAGZDOWN_READY') {
      // D-07: successful ready → clear timeout watcher and hide any error UI
      this.clearReadyTimeout();
      this.hideError();
      // D-03: one code path — content first, then preferences
      this.syncActiveContent();
      this.applyPreferences(this.plugin.settings);
    }
  };

  // D-01: Only track the focused editor — arrow function for stable reference (Pitfall 4)
  private handleEditorChange = (editor: Editor, _info: MarkdownView | MarkdownFileInfo): void => {
    // D-03: Debounce at 500ms (midpoint of 400-600ms range per SYNC-02)
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      this.syncActiveContent();
    }, 500);
  };

  // D-02/D-04: Non-markdown leaves keep last content; note switch bypasses debounce
  private handleActiveLeafChange = (leaf: WorkspaceLeaf | null): void => {
    if (!leaf || leaf.view.getViewType() !== 'markdown') return;

    // Track the last known markdown leaf for syncActiveContent
    this.lastMarkdownLeaf = leaf;

    // D-04: bypass debounce — send immediately on note switch
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.syncActiveContent();
  };

  // D-06: Strip YAML frontmatter from body, parse fields into separate METADATA_UPDATE
  private syncActiveContent(): void {
    // Try getActiveViewOfType first, fall back to tracked leaf when side pane has focus
    // Use view type string check instead of instanceof (cross-realm issue in Electron)
    const view = this.app.workspace.getActiveViewOfType(MarkdownView)
      ?? (this.lastMarkdownLeaf?.view.getViewType() === 'markdown' ? this.lastMarkdownLeaf.view as MarkdownView : null);
    if (!view || !this.iframe?.contentWindow) return;

    const raw = view.editor.getValue();

    // Strip YAML frontmatter manually — getFrontMatterInfo().contentStart is unreliable
    let body = raw;
    let metadata: MetadataUpdatePayload = {};
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n\s*---\r?\n?/);
    if (fmMatch) {
      body = raw.slice(fmMatch[0].length);
      try {
        const parsed = (parseYaml(fmMatch[1]) ?? {}) as Record<string, unknown>;
        metadata = {
          title: typeof parsed.title === 'string' ? parsed.title : undefined,
          author: typeof parsed.author === 'string' ? parsed.author : undefined,
          // parseYaml converts ISO dates to Date objects — coerce to string
          date: parsed.date != null ? String(parsed.date) : undefined,
        };
      } catch {
        // Malformed YAML — send content without metadata rather than blocking sync
      }
    }

    this.sendContent(body, metadata);
  }

  // Send content directly — render guard removed (RENDER_COMPLETE not reliably received cross-origin)
  private sendContent(markdown: string, metadata: MetadataUpdatePayload): void {
    this.postContentUpdate(markdown, metadata);
  }

  // Sends CONTENT_UPDATE and METADATA_UPDATE to the iframe
  // Anti-pattern avoidance: Always send METADATA_UPDATE, even when empty {},
  // so stale metadata from a previous note does not persist in the webapp
  private postContentUpdate(markdown: string, metadata: MetadataUpdatePayload): void {
    if (!this.iframe?.contentWindow) {
      // D-05 condition 4: lost connection — iframe detached or crashed
      this.showError('Lost connection to Magzdown', 'The reader is no longer responding. Retry to reload it.');
      return;
    }
    const targetOrigin = new URL(this.iframeUrl).origin;
    this.iframe.contentWindow.postMessage(
      { version: 1, type: 'CONTENT_UPDATE', payload: { markdown } },
      targetOrigin
    );
    this.iframe.contentWindow.postMessage(
      { version: 1, type: 'METADATA_UPDATE', payload: metadata },
      targetOrigin
    );
  }

  // D-05 condition 2: Start the MAGZDOWN_READY watchdog after iframe load
  private startReadyTimeout(): void {
    this.clearReadyTimeout();
    this.readyTimeout = window.setTimeout(() => {
      this.readyTimeout = null;
      this.showError("Magzdown didn't respond", "The reader loaded but didn't finish starting up. This usually resolves on retry.");
    }, MagzdownView.READY_TIMEOUT_MS);
  }

  private clearReadyTimeout(): void {
    if (this.readyTimeout !== null) {
      window.clearTimeout(this.readyTimeout);
      this.readyTimeout = null;
    }
  }

  // SETT-05 / D-06: Error UI replaces the iframe (hidden) rather than overlaying.
  // Lazy construction: first call builds the DOM; subsequent calls update heading/body text in place.
  private showError(heading: string, body: string): void {
    // Hide the iframe + splash while error is visible
    this.iframe?.addClass('magzdown-hidden');
    this.splashEl?.addClass('magzdown-hidden');

    if (!this.errorEl) {
      // First-time construction — DOM helpers only (no HTML-injection APIs)
      this.errorEl = this.contentEl.createDiv({ cls: 'magzdown-error' });
      this.errorEl.setAttribute('role', 'alert');
      this.errorEl.setAttribute('aria-live', 'assertive');

      const iconEl = this.errorEl.createDiv({ cls: 'magzdown-error-icon' });
      iconEl.setAttribute('aria-hidden', 'true');
      setIcon(iconEl, 'alert-triangle');

      this.errorHeadingEl = this.errorEl.createDiv({ cls: 'magzdown-error-heading' });
      this.errorBodyEl = this.errorEl.createDiv({ cls: 'magzdown-error-body' });

      this.retryBtn = this.errorEl.createEl('button', {
        cls: 'magzdown-error-retry mod-cta',
        text: 'Retry',
      });
      this.retryBtn.addEventListener('click', this.handleRetry);
    }

    // Update (or set) the copy on every invocation
    if (this.errorHeadingEl) this.errorHeadingEl.setText(heading);
    if (this.errorBodyEl) this.errorBodyEl.setText(body);
    this.errorEl.removeClass('magzdown-hidden');

    // A11y: focus the retry button so keyboard + screen reader users land on the action
    if (this.retryBtn) this.retryBtn.focus();
  }

  private hideError(): void {
    this.errorEl?.addClass('magzdown-hidden');
  }

  // D-07 / Pitfall 6: Retry reloads the iframe, resets timeout, shows splash again.
  // Arrow function — stable reference for addEventListener (and for removeEventListener on close if ever needed).
  private handleRetry = (): void => {
    this.clearReadyTimeout();
    this.hideError();
    this.splashEl?.removeClass('magzdown-hidden');
    if (this.iframe) {
      this.iframe.addClass('magzdown-hidden'); // load event will reveal it again on success
      this.iframe.src = this.iframeUrl;
      this.startReadyTimeout();
    }
  };

  // SETT-02 / D-02 / D-03: Send PREFERENCE_UPDATE to the iframe.
  // Called from two places: (a) handleMessage MAGZDOWN_READY branch, (b) broadcastPreferences
  // invoked by MagzdownSettingTab onChange handlers. Safe to call when iframe is null —
  // the guard below makes it a no-op and D-05 condition 4 is handled by Plan 02's showError path.
  public applyPreferences(settings: MagzdownSettings): void {
    if (!this.iframe?.contentWindow) {
      this.showError('Lost connection to Magzdown', 'The reader is no longer responding. Retry to reload it.');
      return;
    }
    const targetOrigin = new URL(this.iframeUrl).origin;
    this.iframe.contentWindow.postMessage(
      {
        version: 1,
        type: 'PREFERENCE_UPDATE',
        payload: {
          colorMode: settings.colorMode,
          layoutMode: settings.layoutMode,
          stylePreset: settings.stylePreset,
        },
      },
      targetOrigin,
    );
  }
}
