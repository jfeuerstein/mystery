/** Outcome of verifying a puzzle in the pipeline (§14.4). */
export type VerifyResult = {
  ok: boolean;
  /** Problems that stop the puzzle shipping. */
  errors: string[];
  /** Quality concerns that don't stop it shipping. */
  warnings: string[];
  /** Numbers used for difficulty calibration (§11.3). */
  metrics: Record<string, number>;
};

export class Report {
  readonly errors: string[] = [];
  readonly warnings: string[] = [];
  readonly metrics: Record<string, number> = {};

  error(message: string): void {
    this.errors.push(message);
  }

  warn(message: string): void {
    this.warnings.push(message);
  }

  metric(name: string, value: number): void {
    this.metrics[name] = value;
  }

  done(): VerifyResult {
    return {
      ok: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      metrics: this.metrics,
    };
  }
}

/** Reports every id that appears more than once. */
export function checkUniqueIds(report: Report, what: string, ids: readonly string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) report.error(`duplicate ${what} id "${id}"`);
    seen.add(id);
  }
}
