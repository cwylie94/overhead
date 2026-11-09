import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { OnboardingView, type OnboardingStep, type OnboardingViewProps } from '../OnboardingView';

jest.mock('../DomeIllustration', () => ({ DomeIllustration: () => null }));
jest.mock('../CameraSky', () => ({ CameraSky: () => null }));
jest.mock('../LoupeDemo', () => ({ LoupeDemo: () => null }));

type Callback = Exclude<keyof OnboardingViewProps, 'step' | 'place'>;

const BEAT_MS = 1_600;

function makeProps(
  step: OnboardingStep,
  overrides: Partial<OnboardingViewProps> = {},
): OnboardingViewProps {
  return {
    step,
    place: null,
    onNext: jest.fn(),
    onBack: jest.fn(),
    onSkip: jest.fn(),
    onDemo: jest.fn(),
    onUseLocation: jest.fn(),
    onChooseCity: jest.fn(),
    onEnableReminders: jest.fn(),
    onFinish: jest.fn(),
    ...overrides,
  };
}

async function showStep(props: OnboardingViewProps) {
  await render(<OnboardingView {...props} />);
}

async function press(name: string) {
  await fireEvent.press(screen.getByRole('button', { name }));
}

async function waitBeats(beats: number) {
  await act(() => jest.advanceTimersByTime(beats * BEAT_MS));
}

afterEach(() => {
  jest.useRealTimers();
});

describe('OnboardingView', () => {
  let props: OnboardingViewProps;

  describe('given the welcome step', () => {
    beforeEach(() => {
      props = makeProps('welcome');
    });

    describe('when the step opens', () => {
      beforeEach(async () => {
        await showStep(props);
      });

      test('then it says satellites cross the sky every night', () => {
        expect(
          screen.getByRole('header', { name: 'Satellites cross your sky every night' }),
        ).toBeTruthy();
      });

      test('then it offers no Back', () => {
        expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
      });

      test('then it says it is step 1 of 5', () => {
        expect(screen.getByLabelText('Step 1 of 5')).toBeTruthy();
      });

      test('then it doesn’t offer the demo', () => {
        expect(screen.queryByRole('button', { name: 'Try the demo' })).toBeNull();
      });
    });
  });

  describe('given the catching step', () => {
    beforeEach(() => {
      props = makeProps('catching');
    });

    describe('when the step opens', () => {
      beforeEach(async () => {
        await showStep(props);
      });

      test('then it explains the three steps of a catch', () => {
        expect(screen.getByText('Pick a pass on Tonight')).toBeTruthy();
        expect(screen.getByText('Open Catch when it’s up')).toBeTruthy();
        expect(screen.getByText('Keep the crosshair on it')).toBeTruthy();
      });

      test('then it shows a Legendary rarity', () => {
        expect(screen.getByText('Legendary')).toBeTruthy();
      });
    });
  });

  describe.each([
    { step: 'welcome' as const, next: 'Get started' },
    { step: 'catching' as const, next: 'Next' },
  ])('given the $step step is showing', ({ step, next }) => {
    beforeEach(async () => {
      props = makeProps(step);
      await showStep(props);
    });

    describe(`when the user presses ${next}`, () => {
      beforeEach(async () => {
        await press(next);
      });

      test('then it moves on', () => {
        expect(props.onNext).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the user presses Skip', () => {
      beforeEach(async () => {
        await press('Skip');
      });

      test('then it skips ahead', () => {
        expect(props.onSkip).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given the camera step', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      props = makeProps('camera');
    });

    describe('when the step opens', () => {
      beforeEach(async () => {
        await showStep(props);
      });

      test('then it is about catching with the camera', () => {
        expect(screen.getByRole('header', { name: 'Catch with the camera' })).toBeTruthy();
      });

      test('then it starts by showing the camera', () => {
        expect(screen.getByText(/Tap Show camera in Catch/)).toBeTruthy();
      });
    });
  });

  describe('given the camera step is showing', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      props = makeProps('camera');
      await showStep(props);
    });

    describe('when two beats pass', () => {
      beforeEach(async () => {
        await waitBeats(2);
      });

      test('then it explains calibrating on the Moon', () => {
        expect(screen.getByText(/Tap Calibrate on the Moon/)).toBeTruthy();
      });

      test('then the marker is 12° off the Moon', () => {
        expect(screen.getByText('Marker 12° off the Moon')).toBeTruthy();
      });

      test('then it shows Set', () => {
        expect(screen.getByText('Set')).toBeTruthy();
      });
    });

    describe('when the user presses Next', () => {
      beforeEach(async () => {
        await press('Next');
      });

      test('then it moves on', () => {
        expect(props.onNext).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the user presses Skip', () => {
      beforeEach(async () => {
        await press('Skip');
      });

      test('then it skips ahead', () => {
        expect(props.onSkip).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the user taps the Line up the Moon frame', () => {
      beforeEach(async () => {
        await press('2 Line up the Moon');
      });

      test('then it shows the Moon lined up', () => {
        expect(screen.getByText('Lined up')).toBeTruthy();
      });
    });
  });

  describe('given the camera step has reached the Moon check', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      props = makeProps('camera');
      await showStep(props);
      await waitBeats(2);
    });

    describe('when another beat passes', () => {
      beforeEach(async () => {
        await waitBeats(1);
      });

      test('then it shows the Moon lined up', () => {
        expect(screen.getByText('Lined up')).toBeTruthy();
      });
    });
  });

  describe('given the camera step has lined up on the Moon', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      props = makeProps('camera');
      await showStep(props);
      await waitBeats(2);
      await waitBeats(1);
    });

    describe('when three more beats pass', () => {
      beforeEach(async () => {
        await waitBeats(3);
      });

      test('then it shows the satellite caught', () => {
        expect(screen.getByText('Caught!')).toBeTruthy();
      });
    });
  });

  describe('given the user tapped the Line up the Moon frame', () => {
    beforeEach(async () => {
      jest.useFakeTimers();
      props = makeProps('camera');
      await showStep(props);
      await press('2 Line up the Moon');
    });

    describe('when ten beats pass', () => {
      beforeEach(async () => {
        await waitBeats(10);
      });

      test('then it still shows the Moon lined up', () => {
        expect(screen.getByText('Lined up')).toBeTruthy();
      });

      test('then the Line up the Moon frame stays selected', () => {
        expect(screen.getByRole('button', { name: '2 Line up the Moon' })).toBeSelected();
      });
    });
  });

  describe('given the reminders step', () => {
    beforeEach(() => {
      props = makeProps('reminders');
    });

    describe('when the step opens', () => {
      beforeEach(async () => {
        await showStep(props);
      });

      test('then it says it is step 4 of 5', () => {
        expect(screen.getByLabelText('Step 4 of 5')).toBeTruthy();
      });
    });
  });

  describe('given the reminders step is showing', () => {
    beforeEach(async () => {
      props = makeProps('reminders');
      await showStep(props);
    });

    describe.each<{ button: string; callback: Callback; outcome: string }>([
      { button: 'Turn on reminders', callback: 'onEnableReminders', outcome: 'turns reminders on' },
      { button: 'Not now', callback: 'onNext', outcome: 'moves on without them' },
    ])('when the user presses $button', ({ button, callback, outcome }) => {
      beforeEach(async () => {
        await press(button);
      });

      test(`then it ${outcome}`, () => {
        expect(props[callback]).toHaveBeenCalledTimes(1);
      });

      test('then it doesn’t finish onboarding', () => {
        expect(props.onFinish).not.toHaveBeenCalled();
      });
    });
  });

  describe('given the location step and no place chosen', () => {
    beforeEach(() => {
      props = makeProps('location', { place: null });
    });

    describe('when the step opens', () => {
      beforeEach(async () => {
        await showStep(props);
      });

      test('then it says it is step 5 of 5', () => {
        expect(screen.getByLabelText('Step 5 of 5')).toBeTruthy();
      });

      test('then it can’t be skipped', () => {
        expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
      });

      test('then it explains the city picker opens if location is off', () => {
        expect(screen.getByText('If location is turned off, the city picker opens')).toBeTruthy();
      });
    });
  });

  describe('given the location step is showing with no place chosen', () => {
    beforeEach(async () => {
      props = makeProps('location', { place: null });
      await showStep(props);
    });

    describe.each<{ button: string; callback: Callback; outcome: string }>([
      { button: 'Use my location', callback: 'onUseLocation', outcome: 'asks for the location' },
      { button: 'Choose a city', callback: 'onChooseCity', outcome: 'opens the city picker' },
      { button: 'Try the demo', callback: 'onDemo', outcome: 'starts the demo' },
      { button: 'Back', callback: 'onBack', outcome: 'goes back' },
    ])('when the user presses $button', ({ button, callback, outcome }) => {
      beforeEach(async () => {
        await press(button);
      });

      test(`then it ${outcome}`, () => {
        expect(props[callback]).toHaveBeenCalledTimes(1);
      });

      test('then it doesn’t move to a next step', () => {
        expect(props.onNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('given the location step and Recife chosen', () => {
    beforeEach(() => {
      props = makeProps('location', { place: 'Recife, Brazil' });
    });

    describe('when the step opens', () => {
      beforeEach(async () => {
        await showStep(props);
      });

      test('then it shows Recife', () => {
        expect(screen.getByText('Recife, Brazil')).toBeTruthy();
      });

      test('then it doesn’t offer Use my location', () => {
        expect(screen.queryByRole('button', { name: 'Use my location' })).toBeNull();
      });
    });
  });

  describe('given the location step is showing with Recife chosen', () => {
    beforeEach(async () => {
      props = makeProps('location', { place: 'Recife, Brazil' });
      await showStep(props);
    });

    describe('when the user presses Continue', () => {
      beforeEach(async () => {
        await press('Continue');
      });

      test('then it finishes onboarding', () => {
        expect(props.onFinish).toHaveBeenCalledTimes(1);
      });

      test('then it doesn’t move to a next step', () => {
        expect(props.onNext).not.toHaveBeenCalled();
      });
    });
  });
});
