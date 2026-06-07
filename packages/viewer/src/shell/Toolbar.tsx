import type { Theme } from '@echozedlabs/techtree-schema';
import type { RendererInfo } from '../renderer.js';

export interface ToolbarProps {
  irOptions: { label: string; url: string }[];
  irUrl: string;
  onIrUrlChange: (url: string) => void;
  themes: Theme[];
  themeId: string;
  onThemeChange: (id: string) => void;
  renderers: RendererInfo[];
  rendererId: string;
  onRendererChange: (id: string) => void;
  nodeCount?: number;
  edgeCount?: number;
  loadMs?: number;
  relatedCount?: number;
  hasSelection: boolean;
  onClearSelection: () => void;
  onDownloadState: () => void;
  onLoadStateFile: (file: File) => void;
  watchPort?: number;
  hotReloadConnected?: boolean;
}

const select: React.CSSProperties = {
  background: '#2a3040',
  color: '#e8e4d4',
  border: '1px solid #4a5878',
  padding: '4px 8px',
};

const button: React.CSSProperties = {
  background: '#3a4050',
  color: '#e8e4d4',
  border: '1px solid #4a5878',
  padding: '2px 10px',
  cursor: 'pointer',
};

export function Toolbar(props: ToolbarProps) {
  const {
    irOptions,
    irUrl,
    onIrUrlChange,
    themes,
    themeId,
    onThemeChange,
    renderers,
    rendererId,
    onRendererChange,
    nodeCount,
    edgeCount,
    loadMs,
    relatedCount,
    hasSelection,
    onClearSelection,
    onDownloadState,
    onLoadStateFile,
    watchPort,
    hotReloadConnected,
  } = props;

  const handleFileInput: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (file) onLoadStateFile(file);
    // Reset so picking the same file again still fires.
    e.target.value = '';
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        zIndex: 30,
        background: 'rgba(40,45,60,0.92)',
        color: '#e8e4d4',
        padding: '8px 12px',
        borderRadius: 6,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
        maxWidth: 'calc(100vw - 16px)',
      }}
    >
      <strong style={{ letterSpacing: 0.5 }}>Skill Tree</strong>
      {watchPort !== undefined && (
        <span
          title={
            hotReloadConnected
              ? `Connected to skilltree serve on port ${watchPort}`
              : `Trying to reach skilltree serve on port ${watchPort}…`
          }
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 8,
            background: hotReloadConnected ? '#2a4a2a' : '#4a2a2a',
            color: hotReloadConnected ? '#8fae5d' : '#c48f6d',
            border: `1px solid ${hotReloadConnected ? '#8fae5d' : '#c48f6d'}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ● watch:{watchPort}
        </span>
      )}
      <label>
        IR{' '}
        <select value={irUrl} onChange={(e) => onIrUrlChange(e.target.value)} style={select}>
          {irOptions.map((o) => (
            <option key={o.url} value={o.url}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Theme{' '}
        <select value={themeId} onChange={(e) => onThemeChange(e.target.value)} style={select}>
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title ?? t.id}
            </option>
          ))}
        </select>
      </label>
      {renderers.length > 1 && (
        <label>
          Renderer{' '}
          <select
            value={rendererId}
            onChange={(e) => onRendererChange(e.target.value)}
            style={select}
          >
            {renderers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {nodeCount !== undefined && (
        <span style={{ opacity: 0.7 }}>
          {nodeCount} nodes, {edgeCount ?? 0} edges
          {loadMs !== undefined ? ` · ${loadMs.toFixed(0)}ms` : ''}
        </span>
      )}
      {hasSelection && relatedCount !== undefined && (
        <span style={{ opacity: 0.7 }}>· {relatedCount} related</span>
      )}
      {hasSelection && (
        <button onClick={onClearSelection} style={button}>
          clear
        </button>
      )}
      <button
        onClick={onDownloadState}
        style={button}
        title="Download the current user state as JSON"
      >
        save state
      </button>
      <label style={{ ...button, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        load state
        <input
          type="file"
          accept="application/json,.json"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  );
}
