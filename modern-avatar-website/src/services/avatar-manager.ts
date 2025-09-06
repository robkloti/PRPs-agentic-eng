import type { 
  AvatarProvider, 
  AvatarManagerConfig, 
  ProviderConfig, 
  SpeechOptions, 
  SpeechResult,
  PerformanceMetrics
} from '../types';
import { HeyGenProvider } from '../providers/heygen.provider';
import { DIDProvider } from '../providers/did.provider';
import { getHeyGenSessionManager } from './heygen-session.service';
import { PerformanceMonitor } from './performance-monitor';
import { ErrorRecoveryManager } from './error-recovery';

export class AvatarManager extends EventTarget {
  private providers = new Map<string, AvatarProvider>();
  private currentProvider: AvatarProvider | null = null;
  private config: AvatarManagerConfig;
  private performanceMonitor: PerformanceMonitor;
  private errorRecovery: ErrorRecoveryManager;
  private isInitialized = false;

  constructor(config: AvatarManagerConfig) {
    super();
    this.config = config;
    this.performanceMonitor = new PerformanceMonitor();
    this.errorRecovery = new ErrorRecoveryManager(config.errorRecovery, this);
    
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize HeyGen provider if enabled
    if (this.config.heygen?.enabled) {
      const heygenProvider = new HeyGenProvider();
      this.providers.set('heygen', heygenProvider);
      this.setupProviderEvents(heygenProvider);
      console.log('HeyGen provider initialized');
    }

    // Initialize D-ID provider if enabled
    if (this.config.did?.enabled) {
      const didProvider = new DIDProvider();
      this.providers.set('d-id', didProvider);
      this.setupProviderEvents(didProvider);
      console.log('D-ID provider initialized');
    }

    this.isInitialized = true;
  }

  async connect(providerName: string = this.config.defaultProvider): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Avatar manager not initialized');
    }

    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found or not enabled`);
    }

    try {
      this.dispatchEvent(new CustomEvent('connecting', { 
        detail: { provider: providerName } 
      }));

      const config = await this.getProviderConfig(providerName);
      await provider.connect(config);
      this.currentProvider = provider;
      
      this.dispatchEvent(new CustomEvent('connected', { 
        detail: { provider: providerName } 
      }));

      console.log(`Successfully connected to ${providerName} provider`);
    } catch (error) {
      console.error(`Connection to ${providerName} failed:`, error);
      await this.handleConnectionError(error as Error, providerName);
    }
  }

  async switchProvider(targetProvider: string): Promise<void> {
    if (!this.providers.has(targetProvider)) {
      throw new Error(`Provider ${targetProvider} not available`);
    }

    const newProvider = this.providers.get(targetProvider)!;
    const previousProvider = this.currentProvider;
    const previousProviderName = previousProvider?.name;

    try {
      this.dispatchEvent(new CustomEvent('switching', {
        detail: { from: previousProviderName, to: targetProvider }
      }));

      // Graceful disconnect from current provider
      if (previousProvider) {
        await previousProvider.disconnect();
        console.log(`Disconnected from ${previousProviderName}`);
      }

      // Connect to new provider
      await this.connect(targetProvider);

      this.dispatchEvent(new CustomEvent('switched', {
        detail: { from: previousProviderName, to: targetProvider }
      }));

      console.log(`Successfully switched from ${previousProviderName} to ${targetProvider}`);

    } catch (error) {
      console.error(`Provider switch from ${previousProviderName} to ${targetProvider} failed:`, error);
      
      // Attempt rollback on failure
      if (previousProvider && previousProviderName) {
        try {
          console.log(`Attempting rollback to ${previousProviderName}`);
          await this.connect(previousProviderName);
          console.log(`Rollback to ${previousProviderName} successful`);
        } catch (rollbackError) {
          console.error(`Rollback to ${previousProviderName} failed:`, rollbackError);
          this.dispatchEvent(new CustomEvent('switchFailed', {
            detail: { 
              targetProvider, 
              error: error as Error,
              rollbackError: rollbackError as Error,
              previousProvider: previousProviderName
            }
          }));
        }
      }
      throw error;
    }
  }

  async speak(message: string, options?: SpeechOptions): Promise<SpeechResult> {
    if (!this.currentProvider) {
      throw new Error('No provider connected');
    }

    try {
      const startTime = performance.now();
      const result = await this.currentProvider.speak(message, options);
      
      // Track performance metrics
      this.performanceMonitor.trackResponse(
        this.currentProvider.name,
        performance.now() - startTime,
        true
      );

      this.dispatchEvent(new CustomEvent('speechCompleted', {
        detail: { result, provider: this.currentProvider.name, message }
      }));

      return result;
    } catch (error) {
      console.error(`Speech failed on ${this.currentProvider.name}:`, error);
      
      // Track failed attempt
      this.performanceMonitor.trackResponse(
        this.currentProvider.name,
        performance.now(),
        false
      );

      // Attempt error recovery
      const recovered = await this.errorRecovery.handleSpeechError(
        error as Error,
        this.currentProvider.name
      );

      if (recovered) {
        console.log('Speech error recovered, retrying...');
        return this.speak(message, options);
      }

      this.dispatchEvent(new CustomEvent('speechError', {
        detail: { error: error as Error, provider: this.currentProvider.name, message }
      }));

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.currentProvider) {
      try {
        await this.currentProvider.disconnect();
        this.currentProvider = null;
        
        this.dispatchEvent(new CustomEvent('disconnected', {
          detail: { provider: this.currentProvider?.name }
        }));
        
        console.log('Avatar manager disconnected');
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }

    // Cleanup resources
    this.performanceMonitor.cleanup();
    this.errorRecovery.cleanup();
  }

  // Getter methods
  getCurrentProvider(): string | null {
    return this.currentProvider?.name || null;
  }

  getCurrentProviderState(): string {
    return this.currentProvider?.getState() || 'disconnected';
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMonitor.getMetrics();
  }

  isConnected(): boolean {
    return this.currentProvider !== null && this.currentProvider.getState() === 'connected';
  }

  // Private helper methods
  private async getProviderConfig(providerName: string): Promise<ProviderConfig> {
    switch (providerName) {
      case 'heygen':
        const sessionManager = getHeyGenSessionManager(this.config.heygen!.token);
        const token = await sessionManager.getSessionToken();
        
        return {
          token,
          avatarId: this.config.heygen!.avatarId,
          voiceId: this.config.heygen!.voiceId,
          quality: this.config.heygen!.quality
        };
        
      case 'd-id':
        return {
          clientKey: this.config.did!.clientKey,
          agentId: this.config.did!.agentId,
          mode: this.config.did!.mode,
          orientation: this.config.did!.orientation,
          position: this.config.did!.position
        };
        
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  private setupProviderEvents(provider: AvatarProvider): void {
    // Forward provider events to avatar manager
    provider.on('speaking', () => {
      this.dispatchEvent(new CustomEvent('speaking', {
        detail: { provider: provider.name }
      }));
    });

    provider.on('speechEnded', () => {
      this.dispatchEvent(new CustomEvent('speechEnded', {
        detail: { provider: provider.name }
      }));
    });

    provider.on('streamReady', (data) => {
      this.dispatchEvent(new CustomEvent('streamReady', { 
        detail: { ...data, provider: provider.name }
      }));
    });

    provider.on('error', (data) => {
      this.dispatchEvent(new CustomEvent('providerError', { 
        detail: { ...data, provider: provider.name }
      }));
    });
  }

  private async handleConnectionError(error: Error, providerName: string): Promise<void> {
    console.error(`Connection error for ${providerName}:`, error);
    
    // Attempt error recovery
    const recovered = await this.errorRecovery.handleConnectionError(error, providerName);
    
    if (recovered) {
      console.log(`Connection error recovered for ${providerName}`);
      return;
    }

    // If recovery failed, try fallback provider
    const fallbackProvider = this.getFallbackProvider(providerName);
    if (fallbackProvider) {
      console.log(`Attempting fallback to ${fallbackProvider}`);
      try {
        await this.connect(fallbackProvider);
        this.dispatchEvent(new CustomEvent('fallbackActivated', {
          detail: { from: providerName, to: fallbackProvider }
        }));
        return;
      } catch (fallbackError) {
        console.error(`Fallback to ${fallbackProvider} failed:`, fallbackError);
      }
    }

    // All recovery attempts failed
    this.dispatchEvent(new CustomEvent('connectionFailed', {
      detail: { provider: providerName, error }
    }));

    throw error;
  }

  private getFallbackProvider(failedProvider: string): string | null {
    const availableProviders = this.getAvailableProviders();
    const fallbackProviders = availableProviders.filter(p => p !== failedProvider);
    
    return fallbackProviders.length > 0 ? fallbackProviders[0] : null;
  }
}