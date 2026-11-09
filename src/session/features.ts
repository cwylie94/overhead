export type SessionFeatures = {
  orbitUpdates: boolean;
  reminders: boolean;
  camera: boolean;
  onboarding: boolean;
  chosenLocation: boolean;
};

export const DEVICE_FEATURES: SessionFeatures = {
  orbitUpdates: true,
  reminders: true,
  camera: true,
  onboarding: true,
  chosenLocation: true,
};

export const DEMO_FEATURES: SessionFeatures = {
  orbitUpdates: false,
  reminders: false,
  camera: false,
  onboarding: false,
  chosenLocation: false,
};
