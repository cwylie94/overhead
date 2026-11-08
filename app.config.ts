import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Overhead',
  slug: config.slug ?? 'overhead',
  ios: {
    ...config.ios,
    appleTeamId: process.env.APPLE_TEAM_ID || config.ios?.appleTeamId,
  },
});
