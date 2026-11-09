import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { OnboardingView, type OnboardingStep, type OnboardingViewProps } from '../OnboardingView';

jest.mock('../DomeIllustration', () => ({ DomeIllustration: () => null }));
jest.mock('../CameraSky', () => ({ CameraSky: () => null }));
jest.mock('../LoupeDemo', () => ({ LoupeDemo: () => null }));

async function renderStep(step: OnboardingStep, overrides: Partial<OnboardingViewProps> = {}) {
  const props: OnboardingViewProps = {
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
  await render(<OnboardingView {...props} />);
  return props;
}

test('welcome starts the flow, offers the demo and can be skipped', async () => {
  const props = await renderStep('welcome');

  expect(
    screen.getByRole('header', { name: 'Satellites cross your sky every night' }),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  expect(screen.getByLabelText('Step 1 of 5')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Try the demo' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));

  expect(props.onNext).toHaveBeenCalledTimes(1);
  expect(props.onDemo).toHaveBeenCalledTimes(1);
  expect(props.onSkip).toHaveBeenCalledTimes(1);
});

test('the location step asks for a location and cannot be skipped', async () => {
  const props = await renderStep('location');

  expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
  expect(screen.getByText('If location is turned off, the city picker opens')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Use my location' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Choose a city' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

  expect(props.onUseLocation).toHaveBeenCalledTimes(1);
  expect(props.onChooseCity).toHaveBeenCalledTimes(1);
  expect(props.onBack).toHaveBeenCalledTimes(1);
  expect(props.onNext).not.toHaveBeenCalled();
});

test('once a place is chosen, the location step shows it and continues', async () => {
  const props = await renderStep('location', { place: 'Recife, Brazil' });

  expect(screen.getByText('Recife, Brazil')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Use my location' })).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

  expect(props.onNext).toHaveBeenCalledTimes(1);
});

test('the catching step explains the three steps', async () => {
  const props = await renderStep('catching');

  expect(screen.getByText('Pick a pass on Tonight')).toBeTruthy();
  expect(screen.getByText('Open Catch when it’s up')).toBeTruthy();
  expect(screen.getByText('Keep the crosshair on it')).toBeTruthy();
  expect(screen.getByText('Legendary')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));

  expect(props.onNext).toHaveBeenCalledTimes(1);
  expect(props.onSkip).toHaveBeenCalledTimes(1);
});

test('the reminders step can turn reminders on or finish without them', async () => {
  const props = await renderStep('reminders');

  expect(screen.getByLabelText('Step 5 of 5')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: 'Turn on reminders' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Not now' }));

  expect(props.onEnableReminders).toHaveBeenCalledTimes(1);
  expect(props.onFinish).toHaveBeenCalledTimes(1);
});

describe('the camera step', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('walks through showing the camera, the Moon check and the hold', async () => {
    const props = await renderStep('camera');

    expect(screen.getByRole('header', { name: 'Catch with the camera' })).toBeTruthy();
    expect(screen.getByText(/Tap Show camera in Catch/)).toBeTruthy();

    await act(() => jest.advanceTimersByTime(2 * 1_600));
    expect(screen.getByText(/Tap Calibrate on the Moon/)).toBeTruthy();
    expect(screen.getByText('Marker 12° off the Moon')).toBeTruthy();
    expect(screen.getByText('Set')).toBeTruthy();

    await act(() => jest.advanceTimersByTime(1_600));
    expect(screen.getByText('Lined up')).toBeTruthy();

    await act(() => jest.advanceTimersByTime(3 * 1_600));
    expect(screen.getByText('Caught!')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    expect(props.onNext).toHaveBeenCalledTimes(1);
    expect(props.onSkip).toHaveBeenCalledTimes(1);
  });

  test('tapping a frame shows its end state and stops the loop', async () => {
    await renderStep('camera');

    await fireEvent.press(screen.getByRole('button', { name: '2 Line up the Moon' }));
    expect(screen.getByText('Lined up')).toBeTruthy();

    await act(() => jest.advanceTimersByTime(10 * 1_600));
    expect(screen.getByText('Lined up')).toBeTruthy();
    expect(screen.getByRole('button', { name: '2 Line up the Moon' })).toBeSelected();
  });
});
