// Design tokens — TypeScript mirror of styles.css
export const STATUS = {
  todo: { label: '대기', color: 'oklch(0.7 0.01 250)' },
  doing: { label: '진행중', color: 'oklch(0.62 0.18 255)' },
  review: { label: '리뷰', color: 'oklch(0.7 0.15 70)' },
  done: { label: '완료', color: 'oklch(0.65 0.16 155)' },
  blocked: { label: '블록', color: 'oklch(0.62 0.2 25)' },
} as const;

export type StatusKey = keyof typeof STATUS;
export type Theme = 'light' | 'dark';
export type Accent = 'blue' | 'indigo' | 'violet' | 'teal' | 'amber' | 'rose';

export const ACCENTS: { id: Accent; label: string; hex: string }[] = [
  { id: 'blue', label: 'Blue', hex: '#5B6CFF' },
  { id: 'indigo', label: 'Indigo', hex: '#7B5BFF' },
  { id: 'violet', label: 'Violet', hex: '#A66CFF' },
  { id: 'teal', label: 'Teal', hex: '#2AB8C7' },
  { id: 'amber', label: 'Amber', hex: '#F2A93B' },
  { id: 'rose', label: 'Rose', hex: '#F26B7A' },
];
