export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

/** `h<level>` for a heading level, clamped to h1…h6. */
export function headingTag(level: number): HeadingTag {
  return `h${Math.min(6, Math.max(1, Math.round(level)))}` as HeadingTag;
}
