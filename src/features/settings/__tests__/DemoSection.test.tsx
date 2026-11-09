import { fireEvent, render, screen } from '@testing-library/react-native';

import { DemoSection } from '../DemoSection';

const demoStart = new Date(2026, 10, 16, 18, 20).getTime();

describe('DemoSection', () => {
  test('offers to turn demo mode on, explaining what it does', async () => {
    const onChange = jest.fn();
    await render(<DemoSection startsAt={null} onChange={onChange} />);

    expect(
      screen.getByText('Replays a clear evening over London, so you can try catching at any time.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Demo mode' })).not.toBeChecked();

    await fireEvent(screen.getByRole('switch', { name: 'Demo mode' }), 'valueChange', true);

    expect(onChange).toHaveBeenCalledWith(true);
  });

  test('describes the running demo and can turn it off', async () => {
    const onChange = jest.fn();
    await render(<DemoSection startsAt={demoStart} onChange={onChange} />);

    expect(screen.getByText(/^Replaying .* in London from /)).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Demo mode' })).toBeChecked();

    await fireEvent(screen.getByRole('switch', { name: 'Demo mode' }), 'valueChange', false);

    expect(onChange).toHaveBeenCalledWith(false);
  });
});
