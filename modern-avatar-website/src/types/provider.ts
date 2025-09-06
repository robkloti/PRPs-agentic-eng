export interface AvatarProvider {
  readonly name: 'heygen' | 'd-id';
  readonly capabilities: ProviderCapabilities;
  
  connect(config: ProviderConfig): Promise<ConnectionResult>;
  speak(message: string, options?: SpeechOptions): Promise<SpeechResult>;
  disconnect(): Promise<void>;
  getState(): ProviderState;
  
  on<T extends ProviderEvent>(event: T, callback: ProviderEventCallback<T>): void;
  off<T extends ProviderEvent>(event: T, callback: ProviderEventCallback<T>): void;
}

export type ProviderState = 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'error';
export type QualityLevel = 'low' | 'medium' | 'high' | 'auto';

export interface ProviderCapabilities {
  audioInput: boolean;
  videoStreaming: boolean;
  maxResolution: '360p' | '480p' | '720p' | '1080p';
  voiceEmotions: string[];
}

export interface ConnectionResult {
  success: boolean;
  connectionId: string;
  error?: string;
}

export interface SpeechResult {
  success: boolean;
  responseTime: number;
  provider: string;
  error?: string;
}

export interface SpeechOptions {
  emotion?: string;
  speed?: number;
  quality?: QualityLevel;
}

// Event types
export type ProviderEvent = 'connected' | 'disconnected' | 'speaking' | 'speechEnded' | 'streamReady' | 'error';

export type ProviderEventCallback<T extends ProviderEvent> = T extends 'connected'
  ? (data: { provider: string; connectionId: string }) => void
  : T extends 'disconnected'
  ? (data: { provider: string; reason?: string }) => void
  : T extends 'speaking'
  ? (data: {}) => void
  : T extends 'speechEnded'
  ? (data: {}) => void
  : T extends 'streamReady'
  ? (data: { stream?: MediaStream; agent?: any }) => void
  : T extends 'error'
  ? (data: { error: Error }) => void
  : never;

// Provider-specific configurations
export interface HeyGenConfig extends ProviderConfig {
  token: string;
  avatarId: string;
  voiceId: string;
  quality: QualityLevel;
}

export interface DIDConfig extends ProviderConfig {
  clientKey: string;
  agentId: string;
  mode?: string;
  orientation?: 'horizontal' | 'vertical';
  position?: 'left' | 'right' | 'center';
}

export interface ProviderConfig {
  [key: string]: any;
}

// Avatar Manager types
export interface AvatarManagerConfig {
  defaultProvider: string;
  heygen?: {
    enabled: boolean;
    token: string;
    avatarId: string;
    voiceId: string;
    quality: QualityLevel;
  };
  did?: {
    enabled: boolean;
    clientKey: string;
    agentId: string;
    mode?: string;
    orientation?: 'horizontal' | 'vertical';
    position?: 'left' | 'right' | 'center';
  };
  errorRecovery: {
    maxRetries: number;
    retryDelay: number;
    enableFallback: boolean;
    fallbackDelay: number;
  };
}

// Performance monitoring types
export interface PerformanceMetrics {
  responseTime: number;
  provider: string;
  success: boolean;
  timestamp: number;
}

export interface SessionToken {
  token: string;
  expiresAt: Date;
}