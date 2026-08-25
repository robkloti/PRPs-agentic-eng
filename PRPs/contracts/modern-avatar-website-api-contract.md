# Modern Avatar Website - API Contracts

## Overview

This document defines the comprehensive API contracts for integrating HeyGen Streaming Avatar SDK and D-ID v2 Agent Embed in a unified avatar website architecture. These contracts provide the technical specifications needed for seamless provider switching, error handling, and consistent user experience across both platforms.

## Table of Contents

1. [Provider Abstraction Interface](#provider-abstraction-interface)
2. [HeyGen Integration Contracts](#heygen-integration-contracts)
3. [D-ID Integration Contracts](#d-id-integration-contracts)
4. [Unified Avatar Manager](#unified-avatar-manager)
5. [Frontend API Contracts](#frontend-api-contracts)
6. [Error Handling Contracts](#error-handling-contracts)
7. [Configuration Management](#configuration-management)
8. [WebRTC & Streaming Contracts](#webrtc--streaming-contracts)
9. [Implementation Examples](#implementation-examples)

---

## Provider Abstraction Interface

### Core Provider Interface

```typescript
/**
 * Base interface that all avatar providers must implement
 * Ensures consistent API across HeyGen and D-ID integrations
 */
interface AvatarProvider {
  /** Provider identification */
  readonly name: 'heygen' | 'd-id';
  readonly version: string;
  readonly capabilities: ProviderCapabilities;
  
  /** Connection lifecycle */
  connect(config: ProviderConfig): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  reconnect(): Promise<ConnectionResult>;
  
  /** Avatar interactions */
  speak(message: string, options?: SpeechOptions): Promise<SpeechResult>;
  chat(message: string, options?: ChatOptions): Promise<ChatResult>;
  
  /** State management */
  getState(): ProviderState;
  getMetrics(): ProviderMetrics;
  
  /** Event handling */
  on<T extends ProviderEvent>(event: T, callback: ProviderEventCallback<T>): void;
  off<T extends ProviderEvent>(event: T, callback: ProviderEventCallback<T>): void;
  emit<T extends ProviderEvent>(event: T, data: ProviderEventData<T>): void;
  
  /** Health & diagnostics */
  healthCheck(): Promise<HealthStatus>;
  getLastError(): ProviderError | null;
}

/**
 * Provider capabilities definition
 */
interface ProviderCapabilities {
  /** Audio capabilities */
  audioInput: boolean;
  audioOutput: boolean;
  voiceEmotions: string[];
  
  /** Video capabilities */
  videoStreaming: boolean;
  maxResolution: '360p' | '480p' | '720p' | '1080p';
  adaptiveQuality: boolean;
  
  /** Interaction features */
  realTimeChat: boolean;
  textToSpeech: boolean;
  speechToText: boolean;
  
  /** Technical features */
  webrtcSupported: boolean;
  reconnectionSupported: boolean;
  sessionPersistence: boolean;
}

/**
 * Provider configuration interface
 */
interface ProviderConfig {
  /** Authentication */
  apiKey?: string;
  token?: string;
  clientKey?: string;
  
  /** Avatar settings */
  avatarId: string;
  agentId?: string;
  quality: QualityLevel;
  
  /** Stream configuration */
  streamOptions: StreamOptions;
  
  /** Callbacks */
  onStreamReady?: (stream: MediaStream) => void;
  onError?: (error: ProviderError) => void;
  onStateChange?: (state: ProviderState) => void;
}

/**
 * Provider state enumeration
 */
type ProviderState = 
  | 'disconnected'
  | 'connecting' 
  | 'connected'
  | 'speaking'
  | 'listening'
  | 'error'
  | 'reconnecting';

/**
 * Provider events
 */
type ProviderEvent = 
  | 'connected'
  | 'disconnected'
  | 'speaking'
  | 'speechEnded'
  | 'listening'
  | 'error'
  | 'reconnecting'
  | 'streamReady'
  | 'qualityChanged';
```

---

## HeyGen Integration Contracts

### HeyGen Provider Implementation

```typescript
/**
 * HeyGen Streaming Avatar SDK integration
 * Implements the AvatarProvider interface for HeyGen services
 */
class HeyGenProvider implements AvatarProvider {
  readonly name = 'heygen' as const;
  readonly version = '1.0.0';
  readonly capabilities: ProviderCapabilities = {
    audioInput: true,
    audioOutput: true,
    voiceEmotions: ['excited', 'serious', 'friendly', 'soothing', 'broadcaster'],
    videoStreaming: true,
    maxResolution: '720p',
    adaptiveQuality: true,
    realTimeChat: true,
    textToSpeech: true,
    speechToText: true,
    webrtcSupported: true,
    reconnectionSupported: true,
    sessionPersistence: true
  };

  private streamingAvatar: StreamingAvatar | null = null;
  private currentState: ProviderState = 'disconnected';
  private eventEmitter: EventEmitter;
  private config: HeyGenConfig | null = null;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.setupEventHandlers();
  }

  /**
   * Initialize HeyGen streaming avatar connection
   */
  async connect(config: HeyGenConfig): Promise<ConnectionResult> {
    try {
      this.config = config;
      this.updateState('connecting');

      // Initialize StreamingAvatar with session token
      this.streamingAvatar = new StreamingAvatar({ 
        token: config.token 
      });

      // Configure avatar session
      await this.streamingAvatar.newSession({
        avatarName: config.avatarId,
        quality: this.mapQualityLevel(config.quality),
        voice: {
          voiceId: config.voiceId,
          emotion: config.emotion || 'friendly'
        },
        knowledgeId: config.knowledgeId,
        disableIdleTimeout: false,
        sessionTimeout: 600 // 10 minutes
      });

      // Setup video stream
      if (config.onStreamReady) {
        this.streamingAvatar.on('stream_ready', (stream: MediaStream) => {
          config.onStreamReady!(stream);
        });
      }

      this.updateState('connected');
      this.emit('connected', { provider: 'heygen' });

      return {
        success: true,
        connectionId: this.generateConnectionId(),
        capabilities: this.capabilities
      };

    } catch (error) {
      this.handleError(error as Error);
      throw new ProviderError('HeyGen connection failed', error);
    }
  }

  /**
   * Send text message to avatar for speech synthesis
   */
  async speak(message: string, options?: HeyGenSpeechOptions): Promise<SpeechResult> {
    if (!this.streamingAvatar) {
      throw new ProviderError('HeyGen not connected');
    }

    try {
      this.updateState('speaking');
      
      const startTime = Date.now();
      
      await this.streamingAvatar.speak({
        text: message,
        task_type: options?.taskType || 'talk',
        task_mode: options?.taskMode || 'sync'
      });

      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        messageId: this.generateMessageId(),
        responseTime,
        provider: 'heygen'
      };

    } catch (error) {
      this.handleError(error as Error);
      throw new ProviderError('HeyGen speech failed', error);
    }
  }

  /**
   * Interactive chat with knowledge base
   */
  async chat(message: string, options?: HeyGenChatOptions): Promise<ChatResult> {
    if (!this.streamingAvatar) {
      throw new ProviderError('HeyGen not connected');
    }

    try {
      const startTime = Date.now();
      
      const response = await this.streamingAvatar.speak({
        text: message,
        task_type: 'chat',
        task_mode: 'sync'
      });

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        response: response.text || '',
        messageId: this.generateMessageId(),
        responseTime,
        provider: 'heygen'
      };

    } catch (error) {
      this.handleError(error as Error);
      throw new ProviderError('HeyGen chat failed', error);
    }
  }

  private setupEventHandlers(): void {
    // Handle HeyGen-specific events and map to standard provider events
    this.on('heygen:stream_ready', () => this.emit('streamReady', {}));
    this.on('heygen:avatar_start_talking', () => {
      this.updateState('speaking');
      this.emit('speaking', {});
    });
    this.on('heygen:avatar_stop_talking', () => {
      this.updateState('connected');
      this.emit('speechEnded', {});
    });
  }
}

/**
 * HeyGen-specific configuration interface
 */
interface HeyGenConfig extends ProviderConfig {
  token: string;
  avatarId: string;
  voiceId: string;
  emotion?: 'excited' | 'serious' | 'friendly' | 'soothing' | 'broadcaster';
  knowledgeId?: string;
  quality: QualityLevel;
}

/**
 * HeyGen-specific speech options
 */
interface HeyGenSpeechOptions extends SpeechOptions {
  taskType?: 'talk' | 'chat';
  taskMode?: 'sync' | 'async';
}
```

### HeyGen Authentication & Session Management

```typescript
/**
 * HeyGen token management and session handling
 */
class HeyGenSessionManager {
  private apiKey: string;
  private baseUrl: string = 'https://api.heygen.com';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Create session token for StreamingAvatar
   */
  async createSessionToken(): Promise<SessionToken> {
    const response = await fetch(`${this.baseUrl}/v1/streaming.create_token`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error(`Token creation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      token: data.data.token,
      expiresAt: new Date(Date.now() + (30 * 60 * 1000)), // 30 minutes
      sessionId: data.data.session_id
    };
  }

  /**
   * Refresh session token before expiry
   */
  async refreshToken(currentToken: string): Promise<SessionToken> {
    // HeyGen tokens are recreated, not refreshed
    return this.createSessionToken();
  }
}

interface SessionToken {
  token: string;
  expiresAt: Date;
  sessionId: string;
}
```

---

## D-ID Integration Contracts

### D-ID v2 Agent Embed Integration

```typescript
/**
 * D-ID Agent Provider using v2 embed script integration
 * Implements the AvatarProvider interface for D-ID services
 */
class DIDProvider implements AvatarProvider {
  readonly name = 'd-id' as const;
  readonly version = '2.0.0';
  readonly capabilities: ProviderCapabilities = {
    audioInput: true,
    audioOutput: true,
    voiceEmotions: [], // D-ID uses voice technology integration
    videoStreaming: true,
    maxResolution: '1080p',
    adaptiveQuality: true,
    realTimeChat: true,
    textToSpeech: true,
    speechToText: true,
    webrtcSupported: true,
    reconnectionSupported: true,
    sessionPersistence: false
  };

  private agentElement: HTMLElement | null = null;
  private agentInstance: any = null;
  private currentState: ProviderState = 'disconnected';
  private eventEmitter: EventEmitter;
  private config: DIDConfig | null = null;
  private embedScript: HTMLScriptElement | null = null;

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Initialize D-ID agent using embed script approach
   */
  async connect(config: DIDConfig): Promise<ConnectionResult> {
    try {
      this.config = config;
      this.updateState('connecting');

      // Create container for D-ID agent
      this.agentElement = this.createAgentContainer();
      
      // Load D-ID v2 embed script with configuration
      await this.loadEmbedScript(config);
      
      // Wait for agent to be ready
      await this.waitForAgentReady();
      
      this.updateState('connected');
      this.emit('connected', { provider: 'd-id' });

      return {
        success: true,
        connectionId: this.generateConnectionId(),
        capabilities: this.capabilities
      };

    } catch (error) {
      this.handleError(error as Error);
      throw new ProviderError('D-ID connection failed', error);
    }
  }

  /**
   * Send message to D-ID agent
   */
  async speak(message: string, options?: DIDSpeechOptions): Promise<SpeechResult> {
    if (!this.agentInstance) {
      throw new ProviderError('D-ID agent not connected');
    }

    try {
      this.updateState('speaking');
      const startTime = Date.now();

      // Send message to agent via postMessage API
      const messageEvent = {
        type: 'speak',
        data: {
          text: message,
          ...options
        }
      };

      this.agentElement?.contentWindow?.postMessage(messageEvent, '*');
      
      // Wait for response (implement promise-based response handling)
      const response = await this.waitForSpeechResponse();
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        messageId: this.generateMessageId(),
        responseTime,
        provider: 'd-id'
      };

    } catch (error) {
      this.handleError(error as Error);
      throw new ProviderError('D-ID speech failed', error);
    }
  }

  /**
   * Interactive chat with D-ID agent
   */
  async chat(message: string, options?: DIDChatOptions): Promise<ChatResult> {
    if (!this.agentInstance) {
      throw new ProviderError('D-ID agent not connected');
    }

    try {
      const startTime = Date.now();

      const messageEvent = {
        type: 'chat',
        data: {
          message,
          ...options
        }
      };

      this.agentElement?.contentWindow?.postMessage(messageEvent, '*');
      
      const response = await this.waitForChatResponse();
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        response: response.text,
        messageId: this.generateMessageId(),
        responseTime,
        provider: 'd-id'
      };

    } catch (error) {
      this.handleError(error as Error);
      throw new ProviderError('D-ID chat failed', error);
    }
  }

  /**
   * Load D-ID v2 embed script with provided configuration
   */
  private async loadEmbedScript(config: DIDConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      // Remove existing script if present
      if (this.embedScript) {
        this.embedScript.remove();
      }

      // Create and configure embed script based on provided template
      this.embedScript = document.createElement('script');
      this.embedScript.type = 'module';
      this.embedScript.src = 'https://agent.d-id.com/v2/index.js';
      
      // Set data attributes from config (using provided values as defaults)
      this.embedScript.setAttribute('data-mode', config.mode || 'fabio');
      this.embedScript.setAttribute('data-client-key', config.clientKey);
      this.embedScript.setAttribute('data-agent-id', config.agentId);
      this.embedScript.setAttribute('data-name', config.elementName || 'did-agent');
      this.embedScript.setAttribute('data-monitor', config.monitor ? 'true' : 'false');
      this.embedScript.setAttribute('data-orientation', config.orientation || 'horizontal');
      this.embedScript.setAttribute('data-position', config.position || 'right');

      // Additional configuration options
      if (config.theme) {
        this.embedScript.setAttribute('data-theme', config.theme);
      }
      if (config.language) {
        this.embedScript.setAttribute('data-language', config.language);
      }

      // Handle script loading
      this.embedScript.onload = () => {
        this.setupAgentEventHandlers();
        resolve();
      };
      
      this.embedScript.onerror = (error) => {
        reject(new Error('Failed to load D-ID embed script'));
      };

      // Append to agent container or document head
      if (this.agentElement) {
        this.agentElement.appendChild(this.embedScript);
      } else {
        document.head.appendChild(this.embedScript);
      }
    });
  }

  /**
   * Create container element for D-ID agent
   */
  private createAgentContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'did-agent-container';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';
    
    return container;
  }

  /**
   * Setup event handlers for D-ID agent communication
   */
  private setupAgentEventHandlers(): void {
    window.addEventListener('message', (event) => {
      if (event.origin !== 'https://agent.d-id.com') return;

      const { type, data } = event.data;

      switch (type) {
        case 'agent:ready':
          this.agentInstance = data.agent;
          this.emit('streamReady', {});
          break;

        case 'agent:speaking':
          this.updateState('speaking');
          this.emit('speaking', {});
          break;

        case 'agent:speechEnded':
          this.updateState('connected');
          this.emit('speechEnded', {});
          break;

        case 'agent:error':
          this.handleError(new Error(data.message));
          break;

        case 'agent:disconnected':
          this.updateState('disconnected');
          this.emit('disconnected', {});
          break;
      }
    });
  }

  /**
   * Wait for agent to be fully initialized
   */
  private async waitForAgentReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('D-ID agent initialization timeout'));
      }, 30000);

      const readyHandler = () => {
        clearTimeout(timeout);
        this.off('streamReady', readyHandler);
        resolve();
      };

      this.on('streamReady', readyHandler);
    });
  }
}

/**
 * D-ID-specific configuration interface
 * Maps to the provided embed script data attributes
 */
interface DIDConfig extends ProviderConfig {
  /** Required D-ID configuration */
  clientKey: string; // data-client-key from embed script
  agentId: string;   // data-agent-id from embed script
  
  /** Display configuration */
  mode?: 'fabio' | 'standard' | 'compact';
  orientation?: 'horizontal' | 'vertical';
  position?: 'left' | 'right' | 'center';
  
  /** Element configuration */
  elementName?: string; // data-name attribute
  monitor?: boolean;    // data-monitor attribute
  
  /** Optional styling */
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  customStyles?: Record<string, string>;
}

/**
 * D-ID-specific speech options
 */
interface DIDSpeechOptions extends SpeechOptions {
  emotion?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

/**
 * D-ID-specific chat options
 */
interface DIDChatOptions extends ChatOptions {
  context?: string;
  personality?: string;
  responseStyle?: 'conversational' | 'informative' | 'creative';
}
```

---

## Unified Avatar Manager

### Main Avatar Manager Implementation

```typescript
/**
 * Central manager for avatar providers with switching capabilities
 * Provides unified interface for frontend components
 */
class AvatarManager {
  private providers: Map<string, AvatarProvider> = new Map();
  private currentProvider: AvatarProvider | null = null;
  private fallbackProvider: string | null = null;
  private config: AvatarManagerConfig;
  private eventEmitter: EventEmitter;
  private performanceMonitor: PerformanceMonitor;
  private errorRecovery: ErrorRecoveryManager;

  constructor(config: AvatarManagerConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter();
    this.performanceMonitor = new PerformanceMonitor();
    this.errorRecovery = new ErrorRecoveryManager(config.errorRecovery);
    
    this.initializeProviders();
    this.setupProviderEventHandlers();
  }

  /**
   * Initialize and register avatar providers
   */
  private initializeProviders(): void {
    // Register HeyGen provider
    if (this.config.heygen?.enabled) {
      const heygenProvider = new HeyGenProvider();
      this.providers.set('heygen', heygenProvider);
    }

    // Register D-ID provider
    if (this.config.did?.enabled) {
      const didProvider = new DIDProvider();
      this.providers.set('d-id', didProvider);
    }

    // Set default provider
    this.setDefaultProvider();
  }

  /**
   * Connect to specified provider or default
   */
  async connect(providerName?: string): Promise<ConnectionResult> {
    const provider = providerName 
      ? this.providers.get(providerName)
      : this.currentProvider;

    if (!provider) {
      throw new Error(`Provider ${providerName} not found or no default provider set`);
    }

    try {
      const config = this.getProviderConfig(provider.name);
      const result = await provider.connect(config);
      
      this.currentProvider = provider;
      this.performanceMonitor.trackConnection(provider.name, true);
      
      this.emit('connected', { 
        provider: provider.name,
        connectionId: result.connectionId 
      });

      return result;

    } catch (error) {
      this.performanceMonitor.trackConnection(provider.name, false);
      await this.errorRecovery.handleConnectionError(error as Error, provider.name);
      throw error;
    }
  }

  /**
   * Switch between providers seamlessly
   */
  async switchProvider(targetProvider: string): Promise<void> {
    if (!this.providers.has(targetProvider)) {
      throw new Error(`Provider ${targetProvider} not available`);
    }

    const previousProvider = this.currentProvider;
    const newProvider = this.providers.get(targetProvider)!;

    try {
      // Notify UI of switching state
      this.emit('switching', { 
        from: previousProvider?.name,
        to: targetProvider 
      });

      // Disconnect current provider gracefully
      if (previousProvider) {
        await previousProvider.disconnect();
      }

      // Connect to new provider
      await this.connect(targetProvider);

      this.emit('switched', { 
        from: previousProvider?.name,
        to: targetProvider 
      });

    } catch (error) {
      // Rollback on failure
      if (previousProvider) {
        try {
          await this.connect(previousProvider.name);
        } catch (rollbackError) {
          this.emit('switchFailed', { 
            targetProvider,
            error: error as Error,
            rollbackError: rollbackError as Error
          });
        }
      }
      throw error;
    }
  }

  /**
   * Send message to current provider
   */
  async speak(message: string, options?: SpeechOptions): Promise<SpeechResult> {
    if (!this.currentProvider) {
      throw new Error('No provider connected');
    }

    try {
      const startTime = Date.now();
      const result = await this.currentProvider.speak(message, options);
      
      this.performanceMonitor.trackResponse(
        this.currentProvider.name,
        Date.now() - startTime,
        true
      );

      return result;

    } catch (error) {
      this.performanceMonitor.trackResponse(
        this.currentProvider.name,
        Date.now() - startTime,
        false
      );

      // Attempt error recovery
      const recovered = await this.errorRecovery.handleSpeechError(
        error as Error, 
        this.currentProvider.name
      );

      if (recovered) {
        // Retry with recovered provider
        return this.speak(message, options);
      }

      throw error;
    }
  }

  /**
   * Interactive chat with current provider
   */
  async chat(message: string, options?: ChatOptions): Promise<ChatResult> {
    if (!this.currentProvider) {
      throw new Error('No provider connected');
    }

    try {
      const startTime = Date.now();
      const result = await this.currentProvider.chat(message, options);
      
      this.performanceMonitor.trackResponse(
        this.currentProvider.name,
        Date.now() - startTime,
        true
      );

      return result;

    } catch (error) {
      this.performanceMonitor.trackResponse(
        this.currentProvider.name,
        Date.now() - startTime,
        false
      );

      throw error;
    }
  }

  /**
   * Get current provider status and metrics
   */
  getStatus(): AvatarManagerStatus {
    return {
      currentProvider: this.currentProvider?.name || null,
      availableProviders: Array.from(this.providers.keys()),
      connectionState: this.currentProvider?.getState() || 'disconnected',
      metrics: this.performanceMonitor.getMetrics(),
      lastError: this.currentProvider?.getLastError() || null
    };
  }

  /**
   * Health check for all providers
   */
  async healthCheck(): Promise<HealthReport> {
    const results: Record<string, HealthStatus> = {};

    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.healthCheck();
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: (error as Error).message,
          timestamp: new Date()
        };
      }
    }

    return {
      overall: this.calculateOverallHealth(results),
      providers: results,
      timestamp: new Date()
    };
  }

  /**
   * Event handling
   */
  on<T extends AvatarManagerEvent>(event: T, callback: AvatarManagerEventCallback<T>): void {
    this.eventEmitter.on(event, callback);
  }

  off<T extends AvatarManagerEvent>(event: T, callback: AvatarManagerEventCallback<T>): void {
    this.eventEmitter.off(event, callback);
  }

  private emit<T extends AvatarManagerEvent>(event: T, data: AvatarManagerEventData<T>): void {
    this.eventEmitter.emit(event, data);
  }
}

/**
 * Avatar manager configuration
 */
interface AvatarManagerConfig {
  /** Default provider to use on initialization */
  defaultProvider: 'heygen' | 'd-id';
  
  /** Fallback provider for error recovery */
  fallbackProvider?: 'heygen' | 'd-id';
  
  /** Provider-specific configurations */
  heygen?: {
    enabled: boolean;
    apiKey: string;
    avatarId: string;
    voiceId: string;
    quality: QualityLevel;
  };
  
  did?: {
    enabled: boolean;
    clientKey: string;
    agentId: string;
    mode?: string;
    orientation?: string;
  };
  
  /** Error recovery configuration */
  errorRecovery: {
    maxRetries: number;
    retryDelay: number;
    enableFallback: boolean;
    fallbackDelay: number;
  };
  
  /** Performance monitoring */
  monitoring: {
    enabled: boolean;
    responseTimeThreshold: number;
    errorRateThreshold: number;
  };
}

/**
 * Avatar manager status interface
 */
interface AvatarManagerStatus {
  currentProvider: string | null;
  availableProviders: string[];
  connectionState: ProviderState;
  metrics: PerformanceMetrics;
  lastError: ProviderError | null;
}

/**
 * Avatar manager events
 */
type AvatarManagerEvent = 
  | 'connected'
  | 'disconnected'
  | 'switching'
  | 'switched'
  | 'switchFailed'
  | 'error'
  | 'performanceWarning';
```

---

## Frontend API Contracts

### React Component Integration

```typescript
/**
 * React Hook for Avatar Management
 */
interface UseAvatarReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: Error | null;
  
  // Current provider
  currentProvider: string | null;
  availableProviders: string[];
  
  // Avatar state
  avatarState: ProviderState;
  isAvatarSpeaking: boolean;
  
  // Actions
  connect: (provider?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  switchProvider: (provider: string) => Promise<void>;
  speak: (message: string, options?: SpeechOptions) => Promise<void>;
  chat: (message: string, options?: ChatOptions) => Promise<void>;
  
  // Metrics
  performanceMetrics: PerformanceMetrics;
  healthStatus: HealthReport;
}

/**
 * React hook implementation
 */
export function useAvatar(config: AvatarManagerConfig): UseAvatarReturn {
  const [avatarManager] = useState(() => new AvatarManager(config));
  const [state, setState] = useState<AvatarState>({
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    currentProvider: null,
    availableProviders: [],
    avatarState: 'disconnected',
    isAvatarSpeaking: false,
    performanceMetrics: {},
    healthStatus: { overall: 'unknown', providers: {}, timestamp: new Date() }
  });

  useEffect(() => {
    // Setup avatar manager event listeners
    const handleConnected = (data: any) => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        connectionError: null,
        currentProvider: data.provider
      }));
    };

    const handleDisconnected = () => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        currentProvider: null,
        avatarState: 'disconnected'
      }));
    };

    const handleSpeaking = () => {
      setState(prev => ({
        ...prev,
        isAvatarSpeaking: true,
        avatarState: 'speaking'
      }));
    };

    const handleSpeechEnded = () => {
      setState(prev => ({
        ...prev,
        isAvatarSpeaking: false,
        avatarState: 'connected'
      }));
    };

    avatarManager.on('connected', handleConnected);
    avatarManager.on('disconnected', handleDisconnected);
    avatarManager.on('speaking', handleSpeaking);
    avatarManager.on('speechEnded', handleSpeechEnded);

    return () => {
      avatarManager.off('connected', handleConnected);
      avatarManager.off('disconnected', handleDisconnected);
      avatarManager.off('speaking', handleSpeaking);
      avatarManager.off('speechEnded', handleSpeechEnded);
    };
  }, [avatarManager]);

  const actions = useMemo(() => ({
    connect: async (provider?: string) => {
      setState(prev => ({ ...prev, isConnecting: true, connectionError: null }));
      try {
        await avatarManager.connect(provider);
      } catch (error) {
        setState(prev => ({
          ...prev,
          isConnecting: false,
          connectionError: error as Error
        }));
        throw error;
      }
    },

    disconnect: async () => {
      await avatarManager.disconnect();
    },

    switchProvider: async (provider: string) => {
      await avatarManager.switchProvider(provider);
    },

    speak: async (message: string, options?: SpeechOptions) => {
      await avatarManager.speak(message, options);
    },

    chat: async (message: string, options?: ChatOptions) => {
      await avatarManager.chat(message, options);
    }
  }), [avatarManager]);

  return {
    ...state,
    ...actions
  };
}

/**
 * Avatar Video Component
 */
interface AvatarVideoProps {
  className?: string;
  style?: React.CSSProperties;
  onStreamReady?: (stream: MediaStream) => void;
  quality?: QualityLevel;
  muted?: boolean;
  autoPlay?: boolean;
}

export const AvatarVideo: React.FC<AvatarVideoProps> = ({
  className,
  style,
  onStreamReady,
  quality = 'medium',
  muted = false,
  autoPlay = true
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { currentProvider, isConnected } = useAvatar();

  useEffect(() => {
    if (!videoRef.current || !isConnected) return;

    const handleStreamReady = (stream: MediaStream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        onStreamReady?.(stream);
      }
    };

    // Provider-specific stream handling
    if (currentProvider) {
      const provider = avatarManager.getProvider(currentProvider);
      provider.on('streamReady', handleStreamReady);

      return () => {
        provider.off('streamReady', handleStreamReady);
      };
    }
  }, [currentProvider, isConnected, onStreamReady]);

  return (
    <video
      ref={videoRef}
      className={`avatar-video ${className || ''}`}
      style={style}
      autoPlay={autoPlay}
      muted={muted}
      playsInline
      controls={false}
    />
  );
};
```

### Vanilla JavaScript Integration

```typescript
/**
 * Vanilla JavaScript Avatar Controller
 * Provides DOM-based avatar management without framework dependencies
 */
class AvatarController {
  private avatarManager: AvatarManager;
  private elements: {
    videoElement?: HTMLVideoElement;
    controlsContainer?: HTMLElement;
    statusDisplay?: HTMLElement;
    providerSelector?: HTMLSelectElement;
  } = {};

  constructor(config: AvatarManagerConfig, elements: AvatarControllerElements) {
    this.avatarManager = new AvatarManager(config);
    this.elements = elements;
    this.setupEventHandlers();
    this.setupUI();
  }

  /**
   * Initialize UI components and event listeners
   */
  private setupUI(): void {
    this.createProviderSelector();
    this.createControlButtons();
    this.createStatusDisplay();
    this.setupVideoElement();
  }

  /**
   * Create provider selection dropdown
   */
  private createProviderSelector(): void {
    if (!this.elements.providerSelector) return;

    const selector = this.elements.providerSelector;
    const availableProviders = ['heygen', 'd-id'];

    // Clear existing options
    selector.innerHTML = '';

    // Add provider options
    availableProviders.forEach(provider => {
      const option = document.createElement('option');
      option.value = provider;
      option.textContent = provider.toUpperCase();
      selector.appendChild(option);
    });

    // Handle provider switching
    selector.addEventListener('change', async (event) => {
      const target = event.target as HTMLSelectElement;
      try {
        await this.avatarManager.switchProvider(target.value);
        this.updateStatus(`Switched to ${target.value}`);
      } catch (error) {
        this.updateStatus(`Failed to switch: ${(error as Error).message}`, 'error');
        // Revert selection
        selector.value = this.avatarManager.getStatus().currentProvider || '';
      }
    });
  }

  /**
   * Create control buttons for avatar interactions
   */
  private createControlButtons(): void {
    if (!this.elements.controlsContainer) return;

    const container = this.elements.controlsContainer;
    
    // Connect button
    const connectBtn = this.createButton('Connect', async () => {
      try {
        await this.avatarManager.connect();
        this.updateStatus('Connected successfully');
      } catch (error) {
        this.updateStatus(`Connection failed: ${(error as Error).message}`, 'error');
      }
    });

    // Disconnect button
    const disconnectBtn = this.createButton('Disconnect', async () => {
      await this.avatarManager.disconnect();
      this.updateStatus('Disconnected');
    });

    // Speak button (with input)
    const speakContainer = document.createElement('div');
    const speakInput = document.createElement('input');
    speakInput.type = 'text';
    speakInput.placeholder = 'Enter message to speak...';
    speakInput.className = 'speak-input';

    const speakBtn = this.createButton('Speak', async () => {
      const message = speakInput.value.trim();
      if (!message) return;

      try {
        await this.avatarManager.speak(message);
        speakInput.value = '';
      } catch (error) {
        this.updateStatus(`Speech failed: ${(error as Error).message}`, 'error');
      }
    });

    speakContainer.appendChild(speakInput);
    speakContainer.appendChild(speakBtn);

    // Add all controls to container
    container.appendChild(connectBtn);
    container.appendChild(disconnectBtn);
    container.appendChild(speakContainer);
  }

  /**
   * Setup video element for avatar display
   */
  private setupVideoElement(): void {
    if (!this.elements.videoElement) return;

    const video = this.elements.videoElement;
    
    // Configure video element
    video.autoplay = true;
    video.muted = false;
    video.playsInline = true;
    video.controls = false;

    // Handle stream ready event
    this.avatarManager.on('streamReady', (data: any) => {
      if (data.stream && video) {
        video.srcObject = data.stream;
      }
    });
  }

  /**
   * Update status display
   */
  private updateStatus(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
    if (!this.elements.statusDisplay) return;

    const statusElement = this.elements.statusDisplay;
    statusElement.textContent = message;
    statusElement.className = `status-display status-${type}`;

    // Auto-clear after 5 seconds
    setTimeout(() => {
      if (statusElement.textContent === message) {
        statusElement.textContent = '';
        statusElement.className = 'status-display';
      }
    }, 5000);
  }

  /**
   * Create styled button element
   */
  private createButton(text: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = 'avatar-control-button';
    button.addEventListener('click', onClick);
    return button;
  }

  /**
   * Setup avatar manager event handlers
   */
  private setupEventHandlers(): void {
    this.avatarManager.on('connected', (data) => {
      this.updateStatus(`Connected to ${data.provider}`, 'success');
    });

    this.avatarManager.on('disconnected', () => {
      this.updateStatus('Disconnected', 'info');
    });

    this.avatarManager.on('speaking', () => {
      this.updateStatus('Avatar is speaking...', 'info');
    });

    this.avatarManager.on('speechEnded', () => {
      this.updateStatus('Speech completed', 'success');
    });

    this.avatarManager.on('error', (error) => {
      this.updateStatus(`Error: ${error.message}`, 'error');
    });
  }
}

/**
 * Elements interface for vanilla JS integration
 */
interface AvatarControllerElements {
  videoElement?: HTMLVideoElement;
  controlsContainer?: HTMLElement;
  statusDisplay?: HTMLElement;
  providerSelector?: HTMLSelectElement;
}
```

---

## Error Handling Contracts

### Comprehensive Error Management

```typescript
/**
 * Provider-specific error types
 */
class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider?: string,
    public readonly originalError?: Error,
    public readonly errorCode?: string,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

class ConnectionError extends ProviderError {
  constructor(message: string, provider?: string, originalError?: Error) {
    super(message, provider, originalError, 'CONNECTION_FAILED', true);
    this.name = 'ConnectionError';
  }
}

class AuthenticationError extends ProviderError {
  constructor(message: string, provider?: string) {
    super(message, provider, undefined, 'AUTH_FAILED', true);
    this.name = 'AuthenticationError';
  }
}

class SpeechError extends ProviderError {
  constructor(message: string, provider?: string, originalError?: Error) {
    super(message, provider, originalError, 'SPEECH_FAILED', true);
    this.name = 'SpeechError';
  }
}

class StreamError extends ProviderError {
  constructor(message: string, provider?: string, originalError?: Error) {
    super(message, provider, originalError, 'STREAM_FAILED', true);
    this.name = 'StreamError';
  }
}

/**
 * Error Recovery Manager
 */
class ErrorRecoveryManager {
  private config: ErrorRecoveryConfig;
  private retryAttempts: Map<string, number> = new Map();

  constructor(config: ErrorRecoveryConfig) {
    this.config = config;
  }

  /**
   * Handle connection errors with retry logic
   */
  async handleConnectionError(error: Error, provider: string): Promise<boolean> {
    const attempts = this.retryAttempts.get(`${provider}:connection`) || 0;

    if (attempts >= this.config.maxRetries) {
      this.retryAttempts.delete(`${provider}:connection`);
      
      if (this.config.enableFallback) {
        return this.attemptFallbackProvider(provider);
      }
      
      throw new ConnectionError(
        `Connection failed after ${attempts} attempts`,
        provider,
        error
      );
    }

    // Exponential backoff
    const delay = this.config.retryDelay * Math.pow(2, attempts);
    await this.sleep(delay);

    this.retryAttempts.set(`${provider}:connection`, attempts + 1);
    return false; // Indicate retry needed
  }

  /**
   * Handle speech/interaction errors
   */
  async handleSpeechError(error: Error, provider: string): Promise<boolean> {
    const attempts = this.retryAttempts.get(`${provider}:speech`) || 0;

    if (attempts >= this.config.maxSpeechRetries) {
      this.retryAttempts.delete(`${provider}:speech`);
      
      if (this.config.enableFallback) {
        return this.attemptFallbackProvider(provider);
      }
      
      throw new SpeechError(
        `Speech failed after ${attempts} attempts`,
        provider,
        error
      );
    }

    const delay = this.config.speechRetryDelay * (attempts + 1);
    await this.sleep(delay);

    this.retryAttempts.set(`${provider}:speech`, attempts + 1);
    return false;
  }

  /**
   * Attempt to switch to fallback provider
   */
  private async attemptFallbackProvider(failedProvider: string): Promise<boolean> {
    const fallbackProvider = this.getFallbackProvider(failedProvider);
    
    if (!fallbackProvider) {
      return false;
    }

    try {
      // Notify about fallback attempt
      this.emitFallbackAttempt(failedProvider, fallbackProvider);
      
      // Wait before attempting fallback
      await this.sleep(this.config.fallbackDelay);
      
      // This would be handled by the avatar manager
      return true;
      
    } catch (fallbackError) {
      this.emitFallbackFailed(failedProvider, fallbackProvider, fallbackError as Error);
      return false;
    }
  }

  /**
   * Get appropriate fallback provider
   */
  private getFallbackProvider(failedProvider: string): string | null {
    const fallbackMap: Record<string, string> = {
      'heygen': 'd-id',
      'd-id': 'heygen'
    };
    
    return fallbackMap[failedProvider] || null;
  }

  /**
   * Utility function for async delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private emitFallbackAttempt(failed: string, fallback: string): void {
    // Event emission would be handled by the error recovery system
  }

  private emitFallbackFailed(failed: string, fallback: string, error: Error): void {
    // Event emission for fallback failure
  }
}

/**
 * Error recovery configuration
 */
interface ErrorRecoveryConfig {
  maxRetries: number;
  retryDelay: number; // Base delay in ms
  maxSpeechRetries: number;
  speechRetryDelay: number;
  enableFallback: boolean;
  fallbackDelay: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

/**
 * Error event interfaces
 */
interface ErrorEvent {
  type: 'connection' | 'speech' | 'stream' | 'authentication';
  provider: string;
  error: Error;
  timestamp: Date;
  recoverable: boolean;
}

interface RecoveryEvent {
  type: 'retry' | 'fallback' | 'circuitBreaker';
  provider: string;
  attempt: number;
  successful: boolean;
  timestamp: Date;
}
```

---

## Configuration Management

### Centralized Configuration System

```typescript
/**
 * Application configuration manager
 */
class ConfigurationManager {
  private config: AppConfig;
  private watchers: Map<string, ConfigWatcher[]> = new Map();

  constructor(initialConfig: AppConfig) {
    this.config = this.validateConfig(initialConfig);
  }

  /**
   * Get configuration value by path
   */
  get<T = any>(path: string): T {
    return this.getNestedValue(this.config, path);
  }

  /**
   * Set configuration value
   */
  set<T = any>(path: string, value: T): void {
    this.setNestedValue(this.config, path, value);
    this.notifyWatchers(path, value);
  }

  /**
   * Watch for configuration changes
   */
  watch(path: string, callback: ConfigWatcher): () => void {
    if (!this.watchers.has(path)) {
      this.watchers.set(path, []);
    }
    
    this.watchers.get(path)!.push(callback);

    // Return unwatch function
    return () => {
      const watchers = this.watchers.get(path);
      if (watchers) {
        const index = watchers.indexOf(callback);
        if (index > -1) {
          watchers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Get provider-specific configuration
   */
  getProviderConfig(provider: 'heygen' | 'd-id'): ProviderConfig {
    const baseConfig = this.get(`providers.${provider}`);
    
    if (!baseConfig || !baseConfig.enabled) {
      throw new Error(`Provider ${provider} is not enabled or configured`);
    }

    return {
      ...baseConfig,
      streamOptions: this.getStreamOptions(provider),
      errorRecovery: this.get('errorRecovery')
    };
  }

  /**
   * Get stream options for provider
   */
  private getStreamOptions(provider: string): StreamOptions {
    const globalOptions = this.get('streaming');
    const providerOptions = this.get(`providers.${provider}.streaming`);

    return {
      ...globalOptions,
      ...providerOptions
    };
  }

  /**
   * Validate configuration structure
   */
  private validateConfig(config: AppConfig): AppConfig {
    const requiredPaths = [
      'providers',
      'streaming',
      'errorRecovery',
      'performance'
    ];

    for (const path of requiredPaths) {
      if (!this.getNestedValue(config, path)) {
        throw new Error(`Required configuration path missing: ${path}`);
      }
    }

    // Validate at least one provider is enabled
    const heygenEnabled = this.getNestedValue(config, 'providers.heygen.enabled');
    const didEnabled = this.getNestedValue(config, 'providers.d-id.enabled');

    if (!heygenEnabled && !didEnabled) {
      throw new Error('At least one avatar provider must be enabled');
    }

    return config;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  private notifyWatchers(path: string, value: any): void {
    const watchers = this.watchers.get(path);
    if (watchers) {
      watchers.forEach(callback => callback(value, path));
    }
  }
}

/**
 * Application configuration schema
 */
interface AppConfig {
  /** Provider configurations */
  providers: {
    heygen: {
      enabled: boolean;
      apiKey: string;
      avatarId: string;
      voiceId: string;
      emotion?: string;
      knowledgeId?: string;
      streaming?: Partial<StreamOptions>;
    };
    
    'd-id': {
      enabled: boolean;
      clientKey: string;
      agentId: string;
      mode?: string;
      orientation?: string;
      position?: string;
      theme?: string;
      streaming?: Partial<StreamOptions>;
    };
  };

  /** Global streaming configuration */
  streaming: {
    quality: QualityLevel;
    adaptiveQuality: boolean;
    maxBitrate: number;
    audioConstraints: MediaTrackConstraints;
    videoConstraints: MediaTrackConstraints;
  };

  /** Error recovery settings */
  errorRecovery: ErrorRecoveryConfig;

  /** Performance monitoring */
  performance: {
    responseTimeThreshold: number;
    errorRateThreshold: number;
    metricsRetention: number;
    enableLogging: boolean;
  };

  /** UI/UX settings */
  ui: {
    theme: 'light' | 'dark' | 'auto';
    animations: boolean;
    accessibility: {
      screenReader: boolean;
      highContrast: boolean;
      keyboardNavigation: boolean;
    };
  };

  /** Security settings */
  security: {
    tokenRefreshThreshold: number;
    corsPolicy: string[];
    rateLimiting: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
    };
  };
}

type ConfigWatcher = (value: any, path: string) => void;

/**
 * Environment-specific configuration loader
 */
class EnvironmentConfigLoader {
  /**
   * Load configuration for current environment
   */
  static async loadConfig(environment: string = 'production'): Promise<AppConfig> {
    const configPaths = [
      `./config/default.json`,
      `./config/${environment}.json`,
      `./config/local.json` // Local overrides
    ];

    let config: Partial<AppConfig> = {};

    for (const path of configPaths) {
      try {
        const envConfig = await this.loadConfigFile(path);
        config = this.mergeConfigs(config, envConfig);
      } catch (error) {
        if (path.includes('default.json')) {
          throw new Error(`Default configuration not found: ${path}`);
        }
        // Optional configs can fail silently
        console.warn(`Configuration file not found: ${path}`);
      }
    }

    // Override with environment variables
    config = this.applyEnvironmentOverrides(config);

    return config as AppConfig;
  }

  /**
   * Load individual configuration file
   */
  private static async loadConfigFile(path: string): Promise<Partial<AppConfig>> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load config: ${path}`);
    }
    return response.json();
  }

  /**
   * Merge configuration objects deeply
   */
  private static mergeConfigs(base: any, override: any): any {
    const result = { ...base };

    for (const key in override) {
      if (override.hasOwnProperty(key)) {
        if (typeof override[key] === 'object' && !Array.isArray(override[key])) {
          result[key] = this.mergeConfigs(result[key] || {}, override[key]);
        } else {
          result[key] = override[key];
        }
      }
    }

    return result;
  }

  /**
   * Apply environment variable overrides
   */
  private static applyEnvironmentOverrides(config: any): any {
    const envMappings = {
      'HEYGEN_API_KEY': 'providers.heygen.apiKey',
      'HEYGEN_AVATAR_ID': 'providers.heygen.avatarId',
      'HEYGEN_VOICE_ID': 'providers.heygen.voiceId',
      'DID_CLIENT_KEY': 'providers.d-id.clientKey',
      'DID_AGENT_ID': 'providers.d-id.agentId',
      'STREAM_QUALITY': 'streaming.quality',
      'ERROR_MAX_RETRIES': 'errorRecovery.maxRetries',
      'PERFORMANCE_THRESHOLD': 'performance.responseTimeThreshold'
    };

    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const envValue = process.env[envVar];
      if (envValue) {
        this.setNestedValue(config, configPath, envValue);
      }
    }

    return config;
  }

  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }
}
```

---

## WebRTC & Streaming Contracts

### Stream Management and WebRTC Handling

```typescript
/**
 * WebRTC stream manager for avatar video/audio
 */
class StreamManager {
  private streams: Map<string, MediaStream> = new Map();
  private connections: Map<string, RTCPeerConnection> = new Map();
  private config: StreamConfig;

  constructor(config: StreamConfig) {
    this.config = config;
  }

  /**
   * Initialize stream for provider
   */
  async initializeStream(provider: string, constraints: MediaStreamConstraints): Promise<MediaStream> {
    try {
      // Create peer connection for provider
      const connection = this.createPeerConnection(provider);
      this.connections.set(provider, connection);

      // Get user media if needed
      let localStream: MediaStream | null = null;
      if (constraints.audio || constraints.video) {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      // Setup connection event handlers
      this.setupConnectionHandlers(provider, connection);

      return localStream || new MediaStream();

    } catch (error) {
      throw new StreamError(`Failed to initialize stream for ${provider}`, provider, error as Error);
    }
  }

  /**
   * Set remote stream from provider
   */
  setRemoteStream(provider: string, stream: MediaStream): void {
    this.streams.set(`${provider}:remote`, stream);
    
    // Emit stream ready event
    this.emitStreamEvent('streamReady', {
      provider,
      stream,
      type: 'remote'
    });
  }

  /**
   * Get stream for provider
   */
  getStream(provider: string, type: 'local' | 'remote' = 'remote'): MediaStream | null {
    return this.streams.get(`${provider}:${type}`) || null;
  }

  /**
   * Create optimized peer connection
   */
  private createPeerConnection(provider: string): RTCPeerConnection {
    const configuration: RTCConfiguration = {
      iceServers: this.config.iceServers,
      iceTransportPolicy: 'all',
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require'
    };

    const connection = new RTCPeerConnection(configuration);

    // Optimize for low latency
    connection.getConfiguration().sdpSemantics = 'unified-plan';

    return connection;
  }

  /**
   * Setup WebRTC connection event handlers
   */
  private setupConnectionHandlers(provider: string, connection: RTCPeerConnection): void {
    connection.oniceconnectionstatechange = () => {
      this.emitStreamEvent('connectionStateChange', {
        provider,
        state: connection.iceConnectionState
      });
    };

    connection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.setRemoteStream(provider, remoteStream);
    };

    connection.onicecandidateerror = (event) => {
      this.emitStreamEvent('iceError', {
        provider,
        error: event.errorText || 'ICE candidate error'
      });
    };

    connection.ondatachannel = (event) => {
      const channel = event.channel;
      this.setupDataChannelHandlers(provider, channel);
    };
  }

  /**
   * Setup data channel for provider communication
   */
  private setupDataChannelHandlers(provider: string, channel: RTCDataChannel): void {
    channel.onopen = () => {
      this.emitStreamEvent('dataChannelOpen', { provider });
    };

    channel.onmessage = (event) => {
      this.emitStreamEvent('dataChannelMessage', {
        provider,
        data: event.data
      });
    };

    channel.onerror = (error) => {
      this.emitStreamEvent('dataChannelError', {
        provider,
        error: error.toString()
      });
    };
  }

  /**
   * Optimize stream quality based on network conditions
   */
  async optimizeQuality(provider: string, metrics: NetworkMetrics): Promise<void> {
    const connection = this.connections.get(provider);
    if (!connection) return;

    const senders = connection.getSenders();
    
    for (const sender of senders) {
      const params = sender.getParameters();
      if (params.encodings && params.encodings.length > 0) {
        const encoding = params.encodings[0];
        
        // Adjust bitrate based on network conditions
        if (metrics.bandwidth < 500000) { // < 500kbps
          encoding.maxBitrate = 200000; // 200kbps
        } else if (metrics.bandwidth < 1000000) { // < 1Mbps
          encoding.maxBitrate = 500000; // 500kbps
        } else {
          encoding.maxBitrate = 1000000; // 1Mbps
        }

        await sender.setParameters(params);
      }
    }
  }

  /**
   * Handle stream disconnection and cleanup
   */
  async disconnect(provider: string): Promise<void> {
    const connection = this.connections.get(provider);
    if (connection) {
      connection.close();
      this.connections.delete(provider);
    }

    // Clean up streams
    const localStream = this.streams.get(`${provider}:local`);
    const remoteStream = this.streams.get(`${provider}:remote`);

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      this.streams.delete(`${provider}:local`);
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      this.streams.delete(`${provider}:remote`);
    }
  }

  private emitStreamEvent(event: string, data: any): void {
    // Event emission would be handled by the stream manager
  }
}

/**
 * Stream configuration interface
 */
interface StreamConfig {
  iceServers: RTCIceServer[];
  maxBitrate: number;
  adaptiveQuality: boolean;
  audioConstraints: MediaTrackConstraints;
  videoConstraints: MediaTrackConstraints;
}

/**
 * Network metrics for quality optimization
 */
interface NetworkMetrics {
  bandwidth: number; // bits per second
  latency: number;   // milliseconds
  packetLoss: number; // percentage
  jitter: number;    // milliseconds
}

/**
 * Quality level definitions
 */
type QualityLevel = 'low' | 'medium' | 'high' | 'auto';

interface QualitySettings {
  video: {
    width: number;
    height: number;
    frameRate: number;
    bitrate: number;
  };
  audio: {
    sampleRate: number;
    bitrate: number;
    channels: number;
  };
}

const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
  low: {
    video: { width: 640, height: 360, frameRate: 15, bitrate: 200000 },
    audio: { sampleRate: 22050, bitrate: 32000, channels: 1 }
  },
  medium: {
    video: { width: 854, height: 480, frameRate: 24, bitrate: 500000 },
    audio: { sampleRate: 44100, bitrate: 64000, channels: 2 }
  },
  high: {
    video: { width: 1280, height: 720, frameRate: 30, bitrate: 1000000 },
    audio: { sampleRate: 44100, bitrate: 128000, channels: 2 }
  },
  auto: {
    video: { width: 854, height: 480, frameRate: 24, bitrate: 500000 },
    audio: { sampleRate: 44100, bitrate: 64000, channels: 2 }
  }
};
```

---

## Implementation Examples

### Complete Integration Example

```typescript
/**
 * Complete implementation example showing all components working together
 */

// 1. Initialize configuration
const config: AvatarManagerConfig = {
  defaultProvider: 'heygen',
  fallbackProvider: 'd-id',
  
  heygen: {
    enabled: true,
    apiKey: process.env.HEYGEN_API_KEY!,
    avatarId: 'default',
    voiceId: 'voice-001',
    quality: 'high'
  },
  
  did: {
    enabled: true,
    clientKey: 'YXV0aDB8NjhiOTU5NmFkNGVkYWRmZDkzMDQ0YzhkOi1ObXhlQnpEWHNaaU56OTdnMUFHZQ==',
    agentId: 'v2_agt_G7epb5HP',
    mode: 'fabio',
    orientation: 'horizontal'
  },
  
  errorRecovery: {
    maxRetries: 3,
    retryDelay: 1000,
    enableFallback: true,
    fallbackDelay: 2000
  },
  
  monitoring: {
    enabled: true,
    responseTimeThreshold: 4000,
    errorRateThreshold: 0.1
  }
};

// 2. Create avatar manager
const avatarManager = new AvatarManager(config);

// 3. Setup event handlers
avatarManager.on('connected', (data) => {
  console.log(`Connected to ${data.provider}`);
  updateUI({ connected: true, provider: data.provider });
});

avatarManager.on('switching', (data) => {
  console.log(`Switching from ${data.from} to ${data.to}`);
  showLoadingState();
});

avatarManager.on('error', (error) => {
  console.error('Avatar error:', error);
  showErrorMessage(error.message);
});

// 4. Initialize and connect
async function initializeAvatar() {
  try {
    await avatarManager.connect();
    console.log('Avatar initialized successfully');
  } catch (error) {
    console.error('Failed to initialize avatar:', error);
    showErrorMessage('Failed to connect to avatar service');
  }
}

// 5. Provider switching example
async function switchToProvider(providerName: string) {
  try {
    showLoadingState();
    await avatarManager.switchProvider(providerName);
    hideLoadingState();
    console.log(`Switched to ${providerName}`);
  } catch (error) {
    hideLoadingState();
    console.error(`Failed to switch to ${providerName}:`, error);
    showErrorMessage(`Could not switch to ${providerName}`);
  }
}

// 6. Avatar interaction example
async function sendMessage(message: string) {
  try {
    const result = await avatarManager.speak(message, {
      emotion: 'friendly',
      speed: 1.0
    });
    
    console.log(`Message sent successfully in ${result.responseTime}ms`);
    updateResponseMetrics(result.responseTime);
    
  } catch (error) {
    console.error('Failed to send message:', error);
    showErrorMessage('Could not send message to avatar');
  }
}

// 7. Chat interaction example
async function sendChatMessage(message: string) {
  try {
    const result = await avatarManager.chat(message);
    
    console.log(`Chat response: ${result.response}`);
    displayChatMessage(result.response, 'assistant');
    
  } catch (error) {
    console.error('Chat failed:', error);
    showErrorMessage('Chat interaction failed');
  }
}

// 8. React component usage example
function AvatarInterface() {
  const {
    isConnected,
    currentProvider,
    availableProviders,
    connect,
    switchProvider,
    speak,
    chat
  } = useAvatar(config);

  const [message, setMessage] = useState('');

  return (
    <div className="avatar-interface">
      <div className="provider-controls">
        <select 
          value={currentProvider || ''} 
          onChange={(e) => switchProvider(e.target.value)}
          disabled={!isConnected}
        >
          {availableProviders.map(provider => (
            <option key={provider} value={provider}>
              {provider.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <AvatarVideo className="avatar-display" />

      <div className="message-controls">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter message..."
          disabled={!isConnected}
        />
        <button 
          onClick={() => speak(message)}
          disabled={!isConnected || !message}
        >
          Speak
        </button>
        <button 
          onClick={() => chat(message)}
          disabled={!isConnected || !message}
        >
          Chat
        </button>
      </div>
    </div>
  );
}

// 9. Health monitoring example
async function monitorAvatarHealth() {
  const healthReport = await avatarManager.healthCheck();
  
  console.log('Avatar Health Report:', healthReport);
  
  if (healthReport.overall === 'unhealthy') {
    console.warn('Avatar system is unhealthy, attempting recovery...');
    await avatarManager.connect(); // Attempt reconnection
  }
}

// 10. Performance optimization example
function optimizePerformance() {
  const status = avatarManager.getStatus();
  const metrics = status.metrics;
  
  if (metrics.averageResponseTime > 4000) {
    console.log('Performance degraded, switching to fallback provider');
    switchToProvider(config.fallbackProvider!);
  }
  
  if (metrics.errorRate > 0.1) {
    console.log('High error rate detected, investigating...');
    monitorAvatarHealth();
  }
}

// Helper functions for UI updates
function updateUI(state: any) {
  // Update UI elements based on state
}

function showLoadingState() {
  // Show loading indicators
}

function hideLoadingState() {
  // Hide loading indicators
}

function showErrorMessage(message: string) {
  // Display error to user
}

function updateResponseMetrics(responseTime: number) {
  // Update performance metrics display
}

function displayChatMessage(message: string, sender: 'user' | 'assistant') {
  // Add message to chat display
}

// Initialize the avatar system
initializeAvatar();
```

---

## Validation and Testing Contracts

### API Contract Testing

```typescript
/**
 * Test suite for API contracts validation
 */
describe('Avatar API Contracts', () => {
  let avatarManager: AvatarManager;
  let config: AvatarManagerConfig;

  beforeEach(() => {
    config = {
      defaultProvider: 'heygen',
      heygen: { enabled: true, apiKey: 'test-key', avatarId: 'test', voiceId: 'test', quality: 'medium' },
      did: { enabled: true, clientKey: 'test-key', agentId: 'test' },
      errorRecovery: { maxRetries: 3, retryDelay: 1000, enableFallback: true, fallbackDelay: 1000 },
      monitoring: { enabled: true, responseTimeThreshold: 4000, errorRateThreshold: 0.1 }
    };
    
    avatarManager = new AvatarManager(config);
  });

  describe('Provider Interface Compliance', () => {
    test('HeyGen provider implements all required methods', () => {
      const provider = new HeyGenProvider();
      
      expect(provider.name).toBe('heygen');
      expect(typeof provider.connect).toBe('function');
      expect(typeof provider.speak).toBe('function');
      expect(typeof provider.disconnect).toBe('function');
      expect(typeof provider.getState).toBe('function');
    });

    test('D-ID provider implements all required methods', () => {
      const provider = new DIDProvider();
      
      expect(provider.name).toBe('d-id');
      expect(typeof provider.connect).toBe('function');
      expect(typeof provider.speak).toBe('function');
      expect(typeof provider.disconnect).toBe('function');
      expect(typeof provider.getState).toBe('function');
    });
  });

  describe('Provider Switching', () => {
    test('seamless provider switching', async () => {
      await avatarManager.connect('heygen');
      expect(avatarManager.getStatus().currentProvider).toBe('heygen');
      
      await avatarManager.switchProvider('d-id');
      expect(avatarManager.getStatus().currentProvider).toBe('d-id');
    });

    test('fallback on provider failure', async () => {
      // Mock HeyGen failure
      const mockError = new Error('Connection failed');
      jest.spyOn(HeyGenProvider.prototype, 'connect').mockRejectedValue(mockError);
      
      await avatarManager.connect('heygen');
      // Should automatically fallback to d-id
      expect(avatarManager.getStatus().currentProvider).toBe('d-id');
    });
  });

  describe('Response Time Requirements', () => {
    test('speak method completes within 4 seconds', async () => {
      await avatarManager.connect();
      
      const startTime = Date.now();
      await avatarManager.speak('Hello world');
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(4000);
    });
  });

  describe('Error Handling', () => {
    test('provider errors are properly wrapped', async () => {
      const mockError = new Error('Network error');
      jest.spyOn(HeyGenProvider.prototype, 'speak').mockRejectedValue(mockError);
      
      await avatarManager.connect('heygen');
      
      await expect(avatarManager.speak('test')).rejects.toThrow(ProviderError);
    });
  });
});
```

This comprehensive API contract document provides the exact technical specifications needed to implement both HeyGen streaming and D-ID v2 agent integration in a unified avatar website architecture. The contracts include TypeScript interfaces, implementation examples, error handling strategies, and validation approaches necessary for successful implementation.