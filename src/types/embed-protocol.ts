export type EmbedMessageType =
  | 'CONTENT_UPDATE'
  | 'PREFERENCE_UPDATE'
  | 'METADATA_UPDATE'
  | 'MAGZDOWN_READY'
  | 'RENDER_COMPLETE'

export interface EmbedMessage<T = unknown> {
  version: 1
  type: EmbedMessageType
  payload: T
}

export interface ContentUpdatePayload {
  markdown: string
}

export interface PreferenceUpdatePayload {
  colorMode?: 'light' | 'dark'
  layoutMode?: 'scroll' | 'paginated'
  stylePreset?: 'classic' | 'modern' | 'editorial' | 'minimal'
}

export interface MetadataUpdatePayload {
  title?: string
  author?: string
  date?: string
}
