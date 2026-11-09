const results = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));

for (const file of results.testResults) {
  for (const test of file.assertionResults) {
    const mark = test.status === 'passed' ? '✓' : '✕';
    console.log(mark, [...test.ancestorTitles, test.title].join(' › '));
  }
}
