import type { IRNode } from '@echozedlabs/techtree-ir';
import type { SkillData, Theme } from '@echozedlabs/techtree-schema';
import type { NodeStatus, SetStatus, SkillStateEntry } from '@echozedlabs/techtree-state';
import { difficultyPips, iconFor } from './icons.js';
import { categoryFill, contrastTextOn, fontFamily, nodeText } from './theme-utils.js';
import { statusColor, statusLabel } from './status-style.js';

export interface SidePanelProps {
  node: IRNode;
  status: NodeStatus;
  stateEntry?: SkillStateEntry;
  prereqs: IRNode[];
  dependents: IRNode[];
  theme: Theme;
  onSelectId: (id: string) => void;
  onSetStatus: (skillId: string, status: SetStatus) => void;
  onClearStatus: (skillId: string) => void;
  onClose: () => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  color: '#a3a999',
  marginTop: 12,
  marginBottom: 4,
};

const linkBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#5aa9e6',
  padding: '2px 0',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 12,
  textAlign: 'left',
  textDecoration: 'underline',
};

interface ActionButtonProps {
  label: string;
  enabled: boolean;
  onClick: () => void;
  emphasis?: 'primary' | 'secondary';
}
function ActionButton({ label, enabled, onClick, emphasis = 'secondary' }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      style={{
        background: !enabled ? '#2a2f3e' : emphasis === 'primary' ? '#3a5070' : '#3a4050',
        color: !enabled ? '#5a6378' : '#e8e4d4',
        border: `1px solid ${!enabled ? '#3a4050' : '#4a5878'}`,
        padding: '5px 10px',
        cursor: enabled ? 'pointer' : 'not-allowed',
        fontFamily: 'inherit',
        fontSize: 12,
        borderRadius: 4,
      }}
    >
      {label}
    </button>
  );
}

export function SidePanel({
  node,
  status,
  stateEntry,
  prereqs,
  dependents,
  theme,
  onSelectId,
  onSetStatus,
  onClearStatus,
  onClose,
}: SidePanelProps) {
  // node.data is profile-specific. For the skill profile it is SkillData; for
  // other profiles (e.g. delivery) these fields are simply absent, so every
  // access below is guarded. This keeps the panel renderer-generic.
  const skill = node.data as unknown as Partial<SkillData>;
  const wf = skill.workflow;
  const resources = skill.learning_resources ?? [];
  const Icon = iconFor(node.category);
  const headerBg = categoryFill(theme, node.category);
  const headerText = nodeText(theme);
  const serif = fontFamily(theme);
  const pillColor = statusColor(theme, status);

  // Available transitions: from any state, set in_progress / submitted / achieved.
  // From an explicit state, allow clearing back to derived.
  // Locked → in_progress is allowed (user can start something with unmet prereqs;
  // not great practice, but the schema doesn't forbid it).
  const canSetInProgress = status !== 'in_progress';
  const canSubmit = status === 'in_progress';
  const canSetAchieved = status !== 'achieved';
  const canClear = stateEntry !== undefined;

  return (
    <aside
      data-testid="side-panel"
      data-node-id={node.id}
      data-status={status}
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 360,
        background: '#23283a',
        borderLeft: '2px solid #3a4050',
        color: '#e8e4d4',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        overflowY: 'auto',
        zIndex: 20,
        boxShadow: '-4px 0 12px rgba(0,0,0,0.4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 18px',
          background: headerBg,
          color: headerText,
          fontFamily: serif,
        }}
      >
        <Icon size={36} strokeWidth={1.4} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ fontSize: 11, opacity: 0.85, letterSpacing: 0.5, textTransform: 'uppercase' }}
          >
            {node.band ?? ''} · {node.category ?? ''}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2, marginTop: 2 }}>
            {node.title}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="close"
          style={{
            background: 'rgba(0,0,0,0.3)',
            color: headerText,
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            width: 28,
            height: 28,
            fontSize: 16,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              background: pillColor,
              color: contrastTextOn(pillColor),
              padding: '3px 10px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            {statusLabel(status)}
          </span>
          {skill.difficulty !== undefined && (
            <span style={{ fontSize: 12, color: '#c8c4b6' }}>
              Difficulty{' '}
              <span style={{ letterSpacing: 1.5 }}>{difficultyPips(skill.difficulty)}</span>
            </span>
          )}
          {skill.estimated_hours !== undefined && (
            <span style={{ fontSize: 12, color: '#c8c4b6' }}>~{skill.estimated_hours}h</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          <ActionButton
            label="Mark in progress"
            enabled={canSetInProgress}
            onClick={() => onSetStatus(node.id, 'in_progress')}
          />
          <ActionButton
            label="Submit"
            enabled={canSubmit}
            onClick={() => onSetStatus(node.id, 'submitted')}
          />
          <ActionButton
            label="Mark achieved"
            enabled={canSetAchieved}
            emphasis="primary"
            onClick={() => onSetStatus(node.id, 'achieved')}
          />
          <ActionButton label="Clear" enabled={canClear} onClick={() => onClearStatus(node.id)} />
        </div>

        {stateEntry &&
          (stateEntry.started_at || stateEntry.submitted_at || stateEntry.completed_at) && (
            <div style={{ marginTop: 10, fontSize: 11, color: '#888' }}>
              {stateEntry.started_at && <div>Started: {stateEntry.started_at.slice(0, 10)}</div>}
              {stateEntry.submitted_at && (
                <div>Submitted: {stateEntry.submitted_at.slice(0, 10)}</div>
              )}
              {stateEntry.completed_at && (
                <div>Achieved: {stateEntry.completed_at.slice(0, 10)}</div>
              )}
            </div>
          )}

        {node.description && (
          <>
            <div style={labelStyle}>Description</div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{node.description}</div>
          </>
        )}

        {(wf?.validation_criteria?.length ?? 0) > 0 && (
          <>
            <div style={labelStyle}>Validation criteria</div>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {wf!.validation_criteria.map((c, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {c}
                </li>
              ))}
            </ul>
          </>
        )}

        {(wf?.evidence_requirements?.length ?? 0) > 0 && (
          <>
            <div style={labelStyle}>Required evidence</div>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {wf!.evidence_requirements.map((c, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  {c}
                </li>
              ))}
            </ul>
          </>
        )}

        {stateEntry?.evidence && stateEntry.evidence.length > 0 && (
          <>
            <div style={labelStyle}>Submitted evidence</div>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {stateEntry.evidence.map((e, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <a href={e.url} target="_blank" rel="noreferrer" style={{ color: '#5aa9e6' }}>
                    {e.label}
                  </a>
                  <span style={{ color: '#888', fontSize: 11, marginLeft: 6 }}>
                    · {e.attached_at.slice(0, 10)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {stateEntry?.comments && stateEntry.comments.length > 0 && (
          <>
            <div style={labelStyle}>Comments</div>
            <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none' }}>
              {stateEntry.comments.map((c, i) => (
                <li
                  key={i}
                  style={{ marginBottom: 8, borderLeft: '2px solid #3a4050', paddingLeft: 8 }}
                >
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {c.author} · {c.timestamp.slice(0, 10)}
                  </div>
                  <div style={{ marginTop: 2 }}>{c.text}</div>
                </li>
              ))}
            </ul>
          </>
        )}

        {(wf?.owner || wf?.approver_role || wf?.review_cadence) && (
          <>
            <div style={labelStyle}>Workflow</div>
            <div style={{ fontSize: 12, color: '#c8c4b6' }}>
              {wf?.owner && (
                <div>
                  <strong>Owner:</strong> {wf.owner}
                </div>
              )}
              {wf?.approver_role && (
                <div>
                  <strong>Approver:</strong> {wf.approver_role}
                </div>
              )}
              {wf?.review_cadence && (
                <div>
                  <strong>Cadence:</strong> {wf.review_cadence}
                </div>
              )}
            </div>
          </>
        )}

        {resources.length > 0 && (
          <>
            <div style={labelStyle}>Resources</div>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {resources.map((r, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <a href={r.url} target="_blank" rel="noreferrer" style={{ color: '#5aa9e6' }}>
                    {r.label}
                  </a>
                  {r.kind && (
                    <span style={{ color: '#888', fontSize: 11, marginLeft: 6 }}>· {r.kind}</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {prereqs.length > 0 && (
          <>
            <div style={labelStyle}>Prerequisites</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {prereqs.map((p) => (
                <button key={p.id} onClick={() => onSelectId(p.id)} style={linkBtnStyle}>
                  {p.title}
                </button>
              ))}
            </div>
          </>
        )}

        {dependents.length > 0 && (
          <>
            <div style={labelStyle}>Unlocks</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {dependents.map((p) => (
                <button key={p.id} onClick={() => onSelectId(p.id)} style={linkBtnStyle}>
                  {p.title}
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{ ...labelStyle, marginTop: 20 }}>ID</div>
        <code style={{ fontSize: 11, color: '#888' }}>{node.id}</code>
      </div>
    </aside>
  );
}
