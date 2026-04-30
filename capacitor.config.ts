import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a9a47dbc22ff4f61b164a9c2474b6f14',
  appName: 'rainz',
  webDir: 'dist',
  server: {
    url: 'https://a9a47dbc-22ff-4f61-b164-a9c2474b6f14.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
