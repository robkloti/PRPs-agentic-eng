import { defineConfig } from '@trigger.dev/sdk/v3';

export default defineConfig({
  project: 'proj_obigingetoesegufvutr',
  runtime: 'node',
  logLevel: 'log',
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
      outOfMemory: {
        machine: "medium-1x",
      },
    },
  },
  // Set a max duration of 60 minutes
  maxDuration: 3600,
  dirs: ['app/api/_trigger.dev'],
});
