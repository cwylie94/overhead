# Unit test standard

Unit tests are written as Gherkin scenarios in plain Jest. Given and When are nested `describe` blocks that do their work in `beforeEach`, and each Then is a `test` that only makes assertions. Jest prints the path as a sentence:

```
CatchScreen › given the location is only an estimate › when the screen opens › then it says it is finding your location
```

## The shape

```
describe('<unit>')              the component, hook, store or function under test
  describe('given <state>')     beforeEach sets up the state
    describe('when <event>')    beforeEach does the one thing being tested
      test('then <outcome>')    expects only
```

```tsx
describe('CatchScreen', () => {
  describe('given the location is only an estimate', () => {
    beforeEach(() => {
      mockLocation = ESTIMATE;
    });

    describe('when the screen opens', () => {
      beforeEach(async () => {
        await render(<CatchScreen />);
      });

      test('then it says it is finding your location', () => {
        expect(screen.getByText(FINDING)).toBeOnTheScreen();
      });

      test('then it offers Done to leave', () => {
        expect(screen.getByRole('button', { name: 'Done' })).toBeOnTheScreen();
      });
    });
  });
});
```

## Names

- The outer `describe` is the unit's exported name, exactly as it's written in the code: `CatchScreen`, `useTonight`, `useSettingsStore` or `observerForTimeZone`.
- Each level below it starts with its keyword in lower case: `given`, `when` or `then`.
- A Given describes a state, in the present tense. For example, "given a saved city" or "given the pass has ended".
- A When describes one event. For example, "when the screen opens", "when the user presses Done" or "when the units are set to imperial".
- The person using the app is "the user": "when the user picks Madrid", "then it sends the user back to Tonight". Don't write "you" or leave out who acts.
- A Then describes one outcome someone could observe. For example, "then it lists the pass" or "then the reminder is cancelled".
- Use the app's words (passes, catches, your location, the city picker), not implementation words (state, props, mock), except for hooks and stores, where the API is what's being tested.
- If a scenario needs more than one condition, join them with "and" inside the Given's name. Don't nest `and` blocks.
- If a Then's name needs "and", split it into two tests. The exception is when several assertions together show one outcome, such as a row showing its name, time and brightness.
- Names are unique within their block, so a failure points at one test.

## Given

- A Given only sets things up: mock values, store state, props, fake timers or a test database. It never asserts.
- It sets everything its scenario depends on, even values that match the defaults. A scenario must not rely on what an earlier one left behind.
- History belongs to the Given. If the scenario starts after something has already happened, that happening is part of the Given and runs in its `beforeEach`. For example, "given the screen opened on an estimate" contains "when a real location arrives".
- A `beforeEach` at the top of the file that resets shared state (stores, storage, mocks) is housekeeping, not a Given, and stays there.
- When several Givens share a When, repeat the When block under each Given. Don't flip the nesting round. A small helper such as `openTheScreen()` keeps the repeats short.

## When

- A When does exactly one thing: render, press, change text, advance timers, call a store action or fire an event.
- Rendering is the When for scenarios about what a screen shows when it opens ("when the screen opens").
- Anything a Then needs to read is a `let` in the narrowest block that uses it, assigned in `beforeEach` (or `beforeAll`, under Slow setup). That might be a hook's `result`, a `jest.fn()` callback or the value a reducer returned. RNTL's `screen` needs none of this.

## Then

- A Then only reads and asserts. It has no setup and no actions.
- It tests one outcome. Several `expect`s are fine when together they show that outcome.
- Assertions follow the existing preferences: query by role first, then by text, and use `toBeOnTheScreen()` and `toBeNull()` for presence.

## Slow setup

- A Given or When that is slow, such as computing a night of passes or importing the snapshot into a new database, may use `beforeAll` instead of `beforeEach`. It then runs once for all its Thens instead of once per Then. This is only allowed when its Thens only read what it made.
- Once a block uses `beforeAll`, every block inside it uses `beforeAll` too. A `beforeEach` inside would act again on state that earlier tests have already seen.
- Jest runs a block's own Thens before the blocks nested inside it. So Thens directly under a Given see the state before any nested When has run.
- Sibling Whens under a `beforeAll` Given share its state, so none of them may change what the others read. If one would, the Given goes back to `beforeEach`.

## Pure functions and Scenario Outlines

- For a pure function, the When is always "call the function", so drop that level: unit › given › then. Each Then calls the function itself, which is safe because a pure function has no side effects.
- Reducers and state machines (such as `catchMachine`) keep the When level, because the event is the point of the test. The When's `beforeEach` stores the result in a `let`.
- If several inputs share a Given and a Then, write them as a Scenario Outline: a `test.each` with object rows, named with `$field` placeholders.

```ts
describe('observerForTimeZone', () => {
  describe('given the bundled city list', () => {
    test.each([
      { timeZone: 'Europe/Paris', latitude: 48.9 },
      { timeZone: 'Asia/Tokyo', latitude: 35.7 },
    ])('then $timeZone is found near latitude $latitude', ({ timeZone, latitude }) => {
      expect(observerForTimeZone(timeZone, CITIES).latitude).toBeCloseTo(latitude, 0);
    });
  });
});
```

- Use `%p` instead of `$field` for rows whose values don't read well in a name, such as `null` or `''`.
- An outline can also sit at the Given level, so that each row is its own Given: `describe.each(rows)('given $name', …)`.

## Mocks and fixtures

- `jest.mock` calls stay at the top of the file, because Jest hoists them. Mocks whose behaviour changes between scenarios read a `mock…` variable, and each Given assigns it.
- Builders such as `makePass` and constants stay at the top of the file. Name fixtures for what they mean in the scenario (`ESTIMATE`, `MADRID_FIX`), not for their order (`pass1`).
- If the same Given setup is needed in several files, put a helper in a `testing/` folder.
- Comments aren't used to mark the sections. The names and blank lines are the structure.

## Unchanged by this standard

- The Skyfield fixture tolerances (±2 s), the coverage thresholds in `jest.config.js`, the Reanimated stand-in, the store reset pattern and `createTestDatabase()`.
- Everything under Testing in `CLAUDE.md`.

## Migrating an existing file

- A migration doesn't change behaviour. Every existing assertion ends up in some Then, and none is dropped or loosened. Don't change production code as part of it.
- Splitting tests means there will usually be more of them, which is expected.
- If a migration turns up a wrong or missing test, note it and fix it in a separate commit.
- Each folder gets its own commit, such as "Rewrite domain tests as scenarios". A folder is a top-level area under `src/` (such as `src/data/`, including its subfolders) or a single feature under `src/features/`.
- The `migrate-tests` skill (`.claude/skills/migrate-tests/`) walks through the steps.
