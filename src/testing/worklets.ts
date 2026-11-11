type Worklet = { name: string; __workletHash?: number; __closure?: unknown };

const COVERAGE_COUNTER = /^cov_/;

export function workerProblems(root: unknown): string[] {
  const problems: string[] = [];
  const seen = new Set<unknown>();

  const visit = (value: unknown, path: string) => {
    if (value === undefined) {
      problems.push(`${path} is undefined`);
      return;
    }
    if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
      return;
    }
    if (seen.has(value)) {
      return;
    }
    seen.add(value);

    if (typeof value === 'function') {
      const worklet = value as Worklet;
      if (COVERAGE_COUNTER.test(worklet.name)) {
        return;
      }
      if (!worklet.__workletHash) {
        problems.push(`${path} is not a worklet`);
        return;
      }
      Object.entries(worklet.__closure ?? {}).forEach(([key, captured]) =>
        visit(captured, `${path} › ${capturedName(captured, key)}`),
      );
      return;
    }
    Object.entries(value).forEach(([key, nested]) => visit(nested, `${path}.${key}`));
  };

  visit(root, (root as Worklet | undefined)?.name ?? 'root');
  return problems;
}

function capturedName(captured: unknown, index: string): string {
  return typeof captured === 'function' && captured.name ? captured.name : `capture ${index}`;
}
