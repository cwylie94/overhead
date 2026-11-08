import { fireEvent, render, screen } from '@testing-library/react-native';

import { MIN_ELEVATION_LIMITS } from '@/stores/settingsStore';

import {
  MIN_ELEVATION_STEP,
  PreferencesSections,
  type PreferenceActions,
  type Preferences,
} from '../PreferencesSections';

const defaults: Preferences = {
  language: null,
  units: 'metric',
  minElevation: 10,
  notificationsEnabled: true,
  hapticsEnabled: true,
  motionPreference: 'system',
};

function actions(): jest.Mocked<PreferenceActions> {
  return {
    setLanguage: jest.fn(),
    setUnits: jest.fn(),
    setMinElevation: jest.fn(),
    setNotificationsEnabled: jest.fn(),
    setHapticsEnabled: jest.fn(),
    setMotionPreference: jest.fn(),
  };
}

async function renderSections(preferences: Partial<Preferences> = {}) {
  const spies = actions();
  await render(
    <PreferencesSections preferences={{ ...defaults, ...preferences }} actions={spies} />,
  );
  return spies;
}

describe('PreferencesSections', () => {
  test('steps the minimum elevation by five degrees', async () => {
    const spies = await renderSections();

    expect(screen.getByText('10°')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Higher' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Lower' }));

    expect(spies.setMinElevation.mock.calls).toEqual([
      [10 + MIN_ELEVATION_STEP],
      [10 - MIN_ELEVATION_STEP],
    ]);
  });

  test('stops stepping at the limits', async () => {
    const spies = await renderSections({ minElevation: MIN_ELEVATION_LIMITS.min });

    await fireEvent.press(screen.getByRole('button', { name: 'Lower' }));

    expect(spies.setMinElevation).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Lower' })).toBeDisabled();
  });

  test('marks the chosen options and reports new choices', async () => {
    const spies = await renderSections({ units: 'imperial', motionPreference: 'reduce' });

    expect(screen.getByRole('radio', { name: 'Miles' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Reduce' })).toBeChecked();

    await fireEvent.press(screen.getByRole('radio', { name: 'Kilometres' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Full' }));

    expect(spies.setUnits).toHaveBeenCalledWith('metric');
    expect(spies.setMotionPreference).toHaveBeenCalledWith('full');
  });

  test('maps the phone language choice to no preference', async () => {
    const spies = await renderSections({ language: 'es' });

    expect(screen.getByRole('radio', { name: 'Español' })).toBeChecked();
    await fireEvent.press(screen.getAllByRole('radio', { name: 'Phone setting' })[0]!);
    await fireEvent.press(screen.getByRole('radio', { name: 'English' }));

    expect(spies.setLanguage.mock.calls).toEqual([[null], ['en']]);
  });

  test('switches reminders and haptics', async () => {
    const spies = await renderSections();

    await fireEvent(screen.getByRole('switch', { name: 'Pass reminders' }), 'valueChange', false);
    await fireEvent(screen.getByRole('switch', { name: 'Haptics' }), 'valueChange', false);

    expect(spies.setNotificationsEnabled).toHaveBeenCalledWith(false);
    expect(spies.setHapticsEnabled).toHaveBeenCalledWith(false);
  });
});
