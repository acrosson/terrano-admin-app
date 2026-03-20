export interface PreviewVariables {
  text: {
    wordmark: string
    tagline?: string
    initials?: string
    est_year?: string
    wordmark_part1?: string
    wordmark_part2?: string
  }
  icon: {
    primaryId?: string          // API icon ID
    primaryUrl?: string         // icon image URL (for rendering)
    primaryName?: string        // icon display name
    custom_brandmarkId?: string
    custom_brandmarkUrl?: string
    custom_brandmarkName?: string
    custom_wordmarkId?: string
    custom_wordmarkUrl?: string
    custom_wordmarkName?: string
    custom_comboId?: string
    custom_comboUrl?: string
    custom_comboName?: string
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
  text: { wordmark: 'Bluefin Construction', tagline: 'Commercial Builders', initials: 'BC', est_year: '1987', wordmark_part1: 'Hydro', wordmark_part2: 'Flask' },
  icon: {},
  color: { primary: '#1E3A5F', secondary: '#F4B400', background: '#ffffff' },
  font: { primary: 'Montserrat' }
}
