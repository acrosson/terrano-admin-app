export interface SampleIcon {
  id: string
  label: string
  svgPath: string
}

// All paths are in a 24x24 viewBox
export const SAMPLE_ICONS: SampleIcon[] = [
  {
    id: 'building',
    label: 'Building',
    svgPath: 'M3 21V9.5L12 3l9 6.5V21H15v-6H9v6H3zm4-10h2v2H7zm6 0h2v2h-2zM7 15h2v2H7zm6 0h2v2h-2z'
  },
  {
    id: 'shield',
    label: 'Shield',
    svgPath: 'M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5L12 2zm0 10.99h6c-.46 3.06-2.6 5.8-6 6.93V12H6V6.44l6-2.25v8.8z'
  },
  {
    id: 'hammer',
    label: 'Hammer',
    svgPath: 'M15.5 2.1L13.88.48 7 7.37l-.71-.71-1.42 1.42 2.42 2.41-4.79 4.79.71.71 4.79-4.79 2.42 2.42 1.42-1.42-.71-.71 6.88-6.89-1.5-1.5z'
  },
  {
    id: 'leaf',
    label: 'Leaf',
    svgPath: 'M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 006 20c9-2 12-9 10-18z'
  },
  {
    id: 'star',
    label: 'Star',
    svgPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
  }
]

export function getIconById (id: string): SampleIcon | undefined {
  return SAMPLE_ICONS.find(icon => icon.id === id)
}
