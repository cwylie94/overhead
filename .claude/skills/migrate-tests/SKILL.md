---
name: migrate-tests
description: Rewrites Overhead's Jest unit tests into the Given/When/Then scenario shape in docs/unit-tests.md, one file at a time, without changing what they check. Use when asked to migrate, convert or rewrite tests as Gherkin or scenarios, or to find which test files haven't been migrated yet.
---

# Migrate tests to scenarios

`docs/unit-tests.md` is the standard. Read it before starting, and follow it over anything here that disagrees.

## Pick the files

- If paths were given, use them.
- Otherwise, list the files that haven't been migrated. A migrated file has at least one `given` block.

  ```bash
  grep -rLE "\(['\`]given " src --include='*.test.ts' --include='*.test.tsx'
  ```

- Work one file at a time and one folder at a time. A folder is a top-level area under `src/` (such as `src/data/`, including its subfolders) or a single feature under `src/features/`.

## For each file

1. **Take an inventory.** Read the test file and the unit it tests. Write down each test's name, its `expect` calls and what it sets up and does. Record the counts:

   ```bash
   export PATH=~/.nvm/versions/node/v24.19.0/bin:$PATH
   grep -c "expect(" <file>
   npx jest <file> --json 2>/dev/null | node .claude/skills/migrate-tests/scenarios.js
   ```

2. **Group the scenarios.**
   - Collect the setups that are shared into Givens. Remember that history belongs in the Given.
   - Collect the single actions into Whens.
   - Split each test's assertions into Thens, one outcome each.
   - For a pure function, leave out the When. Turn repeated inputs into `test.each` outlines with object rows.

3. **Rewrite the file.**
   - Keep the mocks, builders and imports at the top, and keep the file-level reset `beforeEach`.
   - Turn a mock whose value changed between tests into a `mock…` variable, and assign it in each Given.
   - Use no comments.
   - Don't touch production code.

4. **Check that nothing was lost.**
   - Run the file. Every test must pass.
   - Compare the new `expect(` count with the inventory. It can only go down where identical assertions have folded into a `test.each` outline, or where one Then now covers two old tests' identical assertions. Account for every difference.
   - Make sure no assertion has been loosened, for example from `toEqual` to `toMatchObject` or from an exact value to `toBeCloseTo`.
   - Print the scenarios again with `scenarios.js`. Each line should read as a sentence.

5. **Run lint and typecheck.**

   ```bash
   npx eslint <file>
   npm run typecheck
   ```

   Run Prettier and ESLint on your own files only, never on the whole repo.

## For each folder

1. **Check coverage hasn't dropped.** Run this before migrating the folder and again afterwards, and compare the totals. They mustn't go down.

   ```bash
   npx jest <folder> --coverage --collectCoverageFrom='<folder>/**/*.{ts,tsx}' --collectCoverageFrom='!**/__tests__/**' --coverageReporters=text-summary
   ```

   The "Coverage data for ./src/… was not found" lines for other folders are expected.

2. **Commit** the folder's test files as one commit, following the Git rules in `CLAUDE.md`. For example, "Rewrite domain tests as scenarios". If the instructions say someone else commits, leave the changes uncommitted and say which files belong to which folder.

## If something doesn't fit

- If a test is wrong or vague, keep its behaviour, migrate it as it is, and list it in the report.
- If a scenario can't be expressed without breaking a rule in the standard, stop and ask, rather than inventing an exception.
- If a test depends on the order tests run in (state leaking from an earlier test), make its Given set that state explicitly, and mention it in the report.

## Report

End with one line per file, grouped by folder:

- the file
- the tests before and after
- the `expect` count before and after
- anything that was odd, wrong or left for a separate fix
