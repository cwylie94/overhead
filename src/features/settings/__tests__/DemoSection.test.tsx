import { fireEvent, render, screen } from '@testing-library/react-native';

import { DemoSection } from '../DemoSection';

const demoStart = new Date(2026, 10, 16, 18, 20).getTime();

async function showDemoSection(startsAt: number | null, onChange: jest.Mock) {
  await render(<DemoSection startsAt={startsAt} onChange={onChange} />);
}

function demoSwitch() {
  return screen.getByRole('switch', { name: 'Demo mode' });
}

describe('DemoSection', () => {
  let onChange: jest.Mock;

  describe('given demo mode is off', () => {
    beforeEach(() => {
      onChange = jest.fn();
    });

    describe('when the section shows', () => {
      beforeEach(async () => {
        await showDemoSection(null, onChange);
      });

      test('then it explains what demo mode does', () => {
        expect(
          screen.getByText(
            'Replays a clear evening over London, so you can try catching at any time.',
          ),
        ).toBeOnTheScreen();
      });

      test('then its switch is off', () => {
        expect(demoSwitch()).not.toBeChecked();
      });
    });
  });

  describe('given the section is showing with demo mode off', () => {
    beforeEach(async () => {
      onChange = jest.fn();
      await showDemoSection(null, onChange);
    });

    describe('when the user turns the switch on', () => {
      beforeEach(async () => {
        await fireEvent(demoSwitch(), 'valueChange', true);
      });

      test('then it turns demo mode on', () => {
        expect(onChange).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('given the demo is running', () => {
    beforeEach(() => {
      onChange = jest.fn();
    });

    describe('when the section shows', () => {
      beforeEach(async () => {
        await showDemoSection(demoStart, onChange);
      });

      test('then it describes the evening being replayed', () => {
        expect(screen.getByText(/^Replaying .* in London from /)).toBeOnTheScreen();
      });

      test('then its switch is on', () => {
        expect(demoSwitch()).toBeChecked();
      });
    });
  });

  describe('given the section is showing with the demo running', () => {
    beforeEach(async () => {
      onChange = jest.fn();
      await showDemoSection(demoStart, onChange);
    });

    describe('when the user turns the switch off', () => {
      beforeEach(async () => {
        await fireEvent(demoSwitch(), 'valueChange', false);
      });

      test('then it turns demo mode off', () => {
        expect(onChange).toHaveBeenCalledWith(false);
      });
    });
  });
});
