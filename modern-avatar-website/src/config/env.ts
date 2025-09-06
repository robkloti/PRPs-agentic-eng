export interface EnvironmentConfig {
  HEYGEN_API_KEY: string;
  HEYGEN_AVATAR_ID: string;
  HEYGEN_VOICE_ID: string;
  DID_CLIENT_KEY: string;
  DID_AGENT_ID: string;
  NODE_ENV: 'development' | 'production';
}

// Validate required environment variables
function validateEnv(key: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const ENV: EnvironmentConfig = {
  HEYGEN_API_KEY: validateEnv('VITE_HEYGEN_API_KEY', import.meta.env.VITE_HEYGEN_API_KEY),
  HEYGEN_AVATAR_ID: import.meta.env.VITE_HEYGEN_AVATAR_ID || 'default',
  HEYGEN_VOICE_ID: import.meta.env.VITE_HEYGEN_VOICE_ID || 'voice-001',
  DID_CLIENT_KEY: validateEnv('VITE_DID_CLIENT_KEY', import.meta.env.VITE_DID_CLIENT_KEY),
  DID_AGENT_ID: validateEnv('VITE_DID_AGENT_ID', import.meta.env.VITE_DID_AGENT_ID),
  NODE_ENV: (import.meta.env.MODE as 'development' | 'production') || 'development'
};

// Export configuration for providers
export const PROVIDER_CONFIGS = {
  heygen: {
    baseUrl: 'https://api.heygen.com',
    endpoints: {
      createToken: '/v1/streaming.create_token',
    },
    defaultAvatarId: ENV.HEYGEN_AVATAR_ID,
    defaultVoiceId: ENV.HEYGEN_VOICE_ID,
    tokenRefreshInterval: 25 * 60 * 1000, // 25 minutes
  },
  did: {
    scriptUrl: 'https://agent.d-id.com/v2/index.js',
    defaultMode: 'fabio',
    defaultOrientation: 'horizontal' as const,
    defaultPosition: 'center' as const,
  },
} as const;

// Performance and error recovery configuration
export const APP_CONFIG = {
  performance: {
    maxResponseTime: 4000, // 4 seconds
    memoryLimitPerSession: 100 * 1024 * 1024, // 100MB
    maxConcurrentSessions: 100,
  },
  errorRecovery: {
    maxRetries: 3,
    retryDelay: 1000,
    enableFallback: true,
    fallbackDelay: 2000,
  },
  ui: {
    animationDuration: 300,
    gradientShiftDuration: 15000,
  },
} as const;