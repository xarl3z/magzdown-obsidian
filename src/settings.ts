// D-01/D-04: Settings schema for Magzdown plugin.
// The three preference fields mirror PreferenceUpdatePayload 1:1 (same string unions)
// and are persisted via Obsidian's loadData/saveData (see MagzdownPlugin.loadSettings).
// Existing data.json files from Phase 12 are auto-migrated by the Object.assign merge
// in MagzdownPlugin.loadSettings — iframeUrl is preserved, three new fields gain defaults.
import type { PreferenceUpdatePayload } from './types/embed-protocol';

export interface MagzdownSettings {
  iframeUrl: string;
  colorMode: NonNullable<PreferenceUpdatePayload['colorMode']>;
  layoutMode: NonNullable<PreferenceUpdatePayload['layoutMode']>;
  stylePreset: NonNullable<PreferenceUpdatePayload['stylePreset']>;
}

export const DEFAULT_SETTINGS: MagzdownSettings = {
  iframeUrl: 'https://magzdown.com/embed',
  colorMode: 'light',
  layoutMode: 'scroll',
  stylePreset: 'classic',
};
