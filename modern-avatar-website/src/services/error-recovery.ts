import type { AvatarManagerConfig } from '../types';

export class ErrorRecoveryManager {
  private config: AvatarManagerConfig['errorRecovery'];
  private avatarManager: any; // Will be set via constructor
  private retryAttempts = new Map<string, number>();
  private lastErrorTimes = new Map<string, number>();
  private backoffDelays = new Map<string, number>();

  constructor(config: AvatarManagerConfig['errorRecovery'], avatarManager: any) {
    this.config = config;
    this.avatarManager = avatarManager;
  }

  async handleConnectionError(error: Error, provider: string): Promise<boolean> {
    console.log(`Handling connection error for ${provider}:`, error.message);
    
    const retryKey = `connection:${provider}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;

    // Check if we've exceeded max retries
    if (currentAttempts >= this.config.maxRetries) {
      console.log(`Max connection retries (${this.config.maxRetries}) exceeded for ${provider}`);
      this.resetRetryCounter(retryKey);
      return false;
    }

    // Increment retry counter
    this.retryAttempts.set(retryKey, currentAttempts + 1);
    this.lastErrorTimes.set(retryKey, Date.now());

    // Calculate backoff delay
    const baseDelay = this.config.retryDelay;
    const backoffDelay = this.calculateBackoffDelay(baseDelay, currentAttempts);
    this.backoffDelays.set(retryKey, backoffDelay);

    console.log(`Retry attempt ${currentAttempts + 1}/${this.config.maxRetries} for ${provider} in ${backoffDelay}ms`);

    // Wait for backoff delay
    await this.delay(backoffDelay);

    try {
      // Attempt to reconnect
      await this.avatarManager.connect(provider);
      
      // Success - reset retry counter
      this.resetRetryCounter(retryKey);
      console.log(`Connection recovery successful for ${provider}`);
      return true;
      
    } catch (retryError) {
      console.log(`Connection retry failed for ${provider}:`, (retryError as Error).message);
      
      // If this was the last retry attempt, try fallback
      if (currentAttempts + 1 >= this.config.maxRetries && this.config.enableFallback) {
        return this.attemptFallback(provider);
      }
      
      // Continue with retry loop
      return this.handleConnectionError(retryError as Error, provider);
    }
  }

  async handleSpeechError(error: Error, provider: string): Promise<boolean> {
    console.log(`Handling speech error for ${provider}:`, error.message);
    
    const retryKey = `speech:${provider}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;

    // Check if we've exceeded max retries
    if (currentAttempts >= this.config.maxRetries) {
      console.log(`Max speech retries (${this.config.maxRetries}) exceeded for ${provider}`);
      this.resetRetryCounter(retryKey);
      
      // For speech errors, try fallback if enabled
      if (this.config.enableFallback) {
        return this.attemptFallback(provider);
      }
      
      return false;
    }

    // Increment retry counter
    this.retryAttempts.set(retryKey, currentAttempts + 1);
    this.lastErrorTimes.set(retryKey, Date.now());

    // Calculate backoff delay (shorter for speech errors)
    const baseDelay = Math.min(this.config.retryDelay, 2000);
    const backoffDelay = this.calculateBackoffDelay(baseDelay, currentAttempts);

    console.log(`Speech retry attempt ${currentAttempts + 1}/${this.config.maxRetries} for ${provider} in ${backoffDelay}ms`);

    // Wait for backoff delay
    await this.delay(backoffDelay);

    // Check if provider is still connected
    const providerState = this.avatarManager.getCurrentProviderState();
    if (providerState !== 'connected') {
      console.log(`Provider ${provider} disconnected during speech retry, attempting reconnection`);
      
      try {
        await this.avatarManager.connect(provider);
      } catch (reconnectError) {
        console.log(`Reconnection failed during speech retry for ${provider}`);
        return this.handleConnectionError(reconnectError as Error, provider);
      }
    }

    // Speech error recovery successful (we'll let the calling code retry the speech)
    this.resetRetryCounter(retryKey);
    return true;
  }

  private async attemptFallback(failedProvider: string): Promise<boolean> {
    if (!this.config.enableFallback) {
      return false;
    }

    console.log(`Attempting fallback from failed provider: ${failedProvider}`);
    
    // Get available providers
    const availableProviders = this.avatarManager.getAvailableProviders();
    const fallbackProviders = availableProviders.filter((p: string) => p !== failedProvider);

    if (fallbackProviders.length === 0) {
      console.log('No fallback providers available');
      return false;
    }

    // Wait for fallback delay
    await this.delay(this.config.fallbackDelay);

    // Try each fallback provider
    for (const fallbackProvider of fallbackProviders) {
      try {
        console.log(`Attempting fallback to ${fallbackProvider}`);
        await this.avatarManager.connect(fallbackProvider);
        
        console.log(`Fallback to ${fallbackProvider} successful`);
        return true;
        
      } catch (fallbackError) {
        console.log(`Fallback to ${fallbackProvider} failed:`, (fallbackError as Error).message);
      }
    }

    console.log('All fallback attempts failed');
    return false;
  }

  private calculateBackoffDelay(baseDelay: number, attemptNumber: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber);
    const maxDelay = 30000; // 30 seconds max
    const delayWithCap = Math.min(exponentialDelay, maxDelay);
    
    // Add jitter (±25% randomization)
    const jitter = delayWithCap * 0.25 * (Math.random() - 0.5);
    
    return Math.max(delayWithCap + jitter, 100); // Minimum 100ms delay
  }

  private resetRetryCounter(retryKey: string): void {
    this.retryAttempts.delete(retryKey);
    this.lastErrorTimes.delete(retryKey);
    this.backoffDelays.delete(retryKey);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Circuit breaker pattern methods
  isCircuitOpen(provider: string): boolean {
    const retryKey = `connection:${provider}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;
    const lastErrorTime = this.lastErrorTimes.get(retryKey) || 0;
    
    // Circuit is open if we've had max failures within the last 5 minutes
    const circuitOpenTime = 5 * 60 * 1000; // 5 minutes
    const timeSinceLastError = Date.now() - lastErrorTime;
    
    return currentAttempts >= this.config.maxRetries && timeSinceLastError < circuitOpenTime;
  }

  canRetry(provider: string, errorType: 'connection' | 'speech' = 'connection'): boolean {
    const retryKey = `${errorType}:${provider}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;
    
    return currentAttempts < this.config.maxRetries;
  }

  getRetryInfo(provider: string, errorType: 'connection' | 'speech' = 'connection'): {
    attempts: number;
    maxRetries: number;
    nextRetryDelay?: number;
    canRetry: boolean;
  } {
    const retryKey = `${errorType}:${provider}`;
    const attempts = this.retryAttempts.get(retryKey) || 0;
    const nextRetryDelay = attempts > 0 ? this.backoffDelays.get(retryKey) : this.config.retryDelay;
    
    return {
      attempts,
      maxRetries: this.config.maxRetries,
      nextRetryDelay,
      canRetry: this.canRetry(provider, errorType)
    };
  }

  // Health check methods
  getHealthStatus(): {
    totalErrors: number;
    activeRetries: number;
    circuitOpenProviders: string[];
  } {
    const totalErrors = Array.from(this.retryAttempts.values()).reduce((sum, attempts) => sum + attempts, 0);
    const activeRetries = this.retryAttempts.size;
    
    const allProviders = this.avatarManager.getAvailableProviders();
    const circuitOpenProviders = allProviders.filter((provider: string) => this.isCircuitOpen(provider));
    
    return {
      totalErrors,
      activeRetries,
      circuitOpenProviders
    };
  }

  cleanup(): void {
    this.retryAttempts.clear();
    this.lastErrorTimes.clear();
    this.backoffDelays.clear();
  }

  // Manual recovery methods
  resetProvider(provider: string): void {
    const connectionKey = `connection:${provider}`;
    const speechKey = `speech:${provider}`;
    
    this.resetRetryCounter(connectionKey);
    this.resetRetryCounter(speechKey);
    
    console.log(`Error recovery state reset for provider: ${provider}`);
  }

  resetAll(): void {
    this.cleanup();
    console.log('Error recovery state reset for all providers');
  }
}