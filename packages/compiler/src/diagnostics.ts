export type Severity = 'error' | 'warning';

export interface Diagnostic {
  severity: Severity;
  /** Stable machine-readable code, e.g., 'duplicate-id', 'unknown-ref', 'cycle'. */
  code: string;
  message: string;
  file?: string;
  line?: number;
  col?: number;
  hint?: string;
}

export function hasErrors(diags: readonly Diagnostic[]): boolean {
  return diags.some((d) => d.severity === 'error');
}

export function errorCount(diags: readonly Diagnostic[]): number {
  return diags.filter((d) => d.severity === 'error').length;
}

export function warningCount(diags: readonly Diagnostic[]): number {
  return diags.filter((d) => d.severity === 'warning').length;
}

/** Plain-text formatter. The CLI wraps the result with color via chalk. */
export function formatDiagnostic(d: Diagnostic): string {
  const loc =
    d.file && d.line !== undefined && d.col !== undefined
      ? `${d.file}:${d.line}:${d.col}`
      : d.file
        ? d.file
        : '<unknown>';
  const head = `${loc}: ${d.severity}[${d.code}]: ${d.message}`;
  return d.hint ? `${head}\n  hint: ${d.hint}` : head;
}
