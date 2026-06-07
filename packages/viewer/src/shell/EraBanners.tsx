import type { IR } from '@echozedlabs/techtree-ir';
import type { Theme } from '@echozedlabs/techtree-schema';
import type { Viewport } from '../renderer.js';
import { eraLabelColor, fontFamily } from './theme-utils.js';

export interface EraBannersProps {
  ir: IR;
  theme: Theme;
  viewport: Viewport;
}

interface EraSpan {
  id: string;
  title?: string;
  order: number;
  minX: number;
  maxX: number;
}

function computeEraSpans(ir: IR): EraSpan[] {
  const byEra = new Map<string, { minX: number; maxX: number }>();
  for (const n of ir.nodes) {
    if (!n.band) continue;
    const right = n.position.x + n.size.width;
    const cur = byEra.get(n.band);
    if (!cur) byEra.set(n.band, { minX: n.position.x, maxX: right });
    else {
      cur.minX = Math.min(cur.minX, n.position.x);
      cur.maxX = Math.max(cur.maxX, right);
    }
  }
  const declared = new Map(ir.bands.map((e) => [e.id, e]));
  const spans: EraSpan[] = [];
  for (const [id, range] of byEra) {
    const meta = declared.get(id);
    spans.push({ id, title: meta?.title, order: meta?.order ?? 0, ...range });
  }
  spans.sort((a, b) => a.order - b.order || a.minX - b.minX);
  return spans;
}

export function EraBanners({ ir, theme, viewport }: EraBannersProps) {
  if (theme.eras?.show_labels === false) return null;
  const spans = computeEraSpans(ir);
  if (spans.length === 0) return null;

  const color = eraLabelColor(theme);
  const serif = fontFamily(theme);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'hidden',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0))',
      }}
    >
      {spans.map((era) => {
        const screenLeft = era.minX * viewport.zoom + viewport.x;
        const screenWidth = (era.maxX - era.minX) * viewport.zoom;
        return (
          <div
            key={era.id}
            style={{
              position: 'absolute',
              left: screenLeft,
              top: 6,
              width: screenWidth,
              height: 32,
              textAlign: 'center',
              fontFamily: serif,
              fontVariant: 'small-caps',
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: 1.5,
              color,
              borderBottom: `1px solid ${color}33`,
              opacity: viewport.zoom > 0.15 ? 1 : 0.4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              paddingTop: 4,
            }}
          >
            {era.title ?? era.id}
          </div>
        );
      })}
    </div>
  );
}
