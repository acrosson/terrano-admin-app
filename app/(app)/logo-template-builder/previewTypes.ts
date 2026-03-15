export interface PreviewVariables {
  text: {
    wordmark: string
    tagline?: string
  }
  icon: {
    primaryId?: string          // API icon ID
    primaryUrl?: string         // icon image URL (for rendering)
    primaryName?: string        // icon display name
  }
  color: {
    primary: string
    secondary?: string
    background?: string
  }
  font: {
    primary: string
  }
}

export const DEFAULT_PREVIEW_VARIABLES: PreviewVariables = {
  text: { wordmark: 'Bluefin Construction', tagline: 'Commercial Builders' },
  icon: {},
  color: { primary: '#1E3A5F', secondary: '#F4B400', background: '#ffffff' },
  font: { primary: 'Montserrat' }
}
