import { workerProblems } from '@/testing/worklets';

import { passRows } from '../passRows';

function plainHelper() {
  return 1;
}

function callsPlainHelper() {
  'worklet';
  return plainHelper();
}

function callsLaterHelper() {
  'worklet';
  return laterHelper();
}

function laterHelper() {
  'worklet';
  return 2;
}

describe('passRows', () => {
  describe('given the pass rows the worker runs', () => {
    let problems: string[];

    beforeEach(() => {
      problems = workerProblems(passRows);
    });

    test('then everything it calls can run on the worker', () => {
      expect(problems).toEqual([]);
    });
  });
});

describe('workerProblems', () => {
  describe('given a worklet that calls a plain function', () => {
    let problems: string[];

    beforeEach(() => {
      problems = workerProblems(callsPlainHelper);
    });

    test('then it reports the plain function', () => {
      expect(problems).toEqual(['callsPlainHelper › plainHelper is not a worklet']);
    });
  });

  describe('given a worklet that calls one declared further down its file', () => {
    let problems: string[];

    beforeEach(() => {
      problems = workerProblems(callsLaterHelper);
    });

    test('then it reports the missing function', () => {
      expect(problems).toEqual(['callsLaterHelper › capture 0 is undefined']);
    });
  });
});
