// Re-export all types for easier imports
export * from './provider';

// Additional common types
export interface AppState {
  currentProvider: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  error: string | null;
  performanceMetrics: PerformanceMetrics[];
}

export interface PerformanceMetrics {
  responseTime: number;
  provider: string;
  success: boolean;
  timestamp: number;
}

// Error types
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ConnectionError extends ProviderError {
  constructor(message: string, provider: string) {
    super(message, provider, 'CONNECTION_FAILED');
    this.name = 'ConnectionError';
  }
}

export class SpeechError extends ProviderError {
  constructor(message: string, provider: string) {
    super(message, provider, 'SPEECH_FAILED');
    this.name = 'SpeechError';
  }
}