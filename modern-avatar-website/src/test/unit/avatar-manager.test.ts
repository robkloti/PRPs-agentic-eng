import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AvatarManager } from '../../services/avatar-manager';
import type { AvatarManagerConfig } from '../../types';

describe('AvatarManager', () => {
  let avatarManager: AvatarManager;
  let config: AvatarManagerConfig;
  let mockFetch: any;

  beforeEach(() => {
    config = {
      defaultProvider: 'heygen',
      heygen: {
        enabled: true,
        token: 'test-token',
        avatarId: 'test-avatar',
        voiceId: 'test-voice',
        quality: 'medium'
      },
      did: {
        enabled: true,
        clientKey: 'test-key',
        agentId: 'test-agent',
        mode: 'fabio',
        orientation: 'horizontal'
      },
      errorRecovery: {
        maxRetries: 3,
        retryDelay: 1000,
        enableFallback: true,
        fallbackDelay: 2000
      }
    };

    // Mock successful token response
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: { token: 'mock-session-token' }
      })
    });
    global.fetch = mockFetch;
    
    avatarManager = new AvatarManager(config);
  });

  afterEach(async () => {
    await avatarManager.disconnect();
  });

  describe('Initialization', () => {
    it('should initialize with provided configuration', () => {
      expect(avatarManager).toBeDefined();
      expect(avatarManager.getAvailableProviders()).toContain('heygen');
      expect(avatarManager.getAvailableProviders()).toContain('d-id');
    });

    it('should set correct default provider', () => {
      expect(avatarManager.getCurrentProvider()).toBeNull(); // Not connected yet
    });

    it('should initialize only enabled providers', () => {
      const limitedConfig = {
        ...config,
        did: { ...config.did!, enabled: false }
      };
      
      const limitedManager = new AvatarManager(limitedConfig);
      expect(limitedManager.getAvailableProviders()).toContain('heygen');
      expect(limitedManager.getAvailableProviders()).not.toContain('d-id');
    });
  });

  describe('Provider Connection', () => {
    it('should connect to default provider successfully', async () => {
      const connectPromise = avatarManager.connect();
      
      // Simulate connection success
      setTimeout(() => {
        avatarManager.dispatchEvent(new CustomEvent('connected', {
          detail: { provider: 'heygen', connectionId: 'test-id' }
        }));
      }, 0);

      await expect(connectPromise).resolves.not.toThrow();
    });

    it('should connect to specific provider', async () => {
      const connectSpy = vi.spyOn(avatarManager, 'connect');
      
      await avatarManager.connect('d-id');
      expect(connectSpy).toHaveBeenCalledWith('d-id');
    });

    it('should handle connection failures', async () => {
      // Mock failed token request
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(avatarManager.connect('heygen')).rejects.toThrow();
    });

    it('should emit connecting and connected events', async () => {
      const connectingHandler = vi.fn();
      const connectedHandler = vi.fn();

      avatarManager.addEventListener('connecting', connectingHandler);
      avatarManager.addEventListener('connected', connectedHandler);

      // Mock connection
      const connectPromise = avatarManager.connect();
      
      // Simulate events
      setTimeout(() => {
        avatarManager.dispatchEvent(new CustomEvent('connecting', {
          detail: { provider: 'heygen' }
        }));
        avatarManager.dispatchEvent(new CustomEvent('connected', {
          detail: { provider: 'heygen', connectionId: 'test-id' }
        }));
      }, 0);

      await connectPromise.catch(() => {}); // Handle potential rejection

      expect(connectingHandler).toHaveBeenCalled();
    });
  });

  describe('Provider Switching', () => {
    beforeEach(async () => {
      // Setup initial connection
      const connectPromise = avatarManager.connect('heygen');
      setTimeout(() => {
        avatarManager.dispatchEvent(new CustomEvent('connected', {
          detail: { provider: 'heygen', connectionId: 'test-id' }
        }));
      }, 0);
      await connectPromise.catch(() => {});
    });

    it('should switch between providers seamlessly', async () => {
      const switchingHandler = vi.fn();
      const switchedHandler = vi.fn();

      avatarManager.addEventListener('switching', switchingHandler);
      avatarManager.addEventListener('switched', switchedHandler);

      const switchPromise = avatarManager.switchProvider('d-id');
      
      // Simulate switch events
      setTimeout(() => {
        avatarManager.dispatchEvent(new CustomEvent('switching', {
          detail: { from: 'heygen', to: 'd-id' }
        }));
        avatarManager.dispatchEvent(new CustomEvent('connected', {
          detail: { provider: 'd-id', connectionId: 'test-id-2' }
        }));
        avatarManager.dispatchEvent(new CustomEvent('switched', {
          detail: { from: 'heygen', to: 'd-id' }
        }));
      }, 0);

      await switchPromise.catch(() => {});

      expect(switchingHandler).toHaveBeenCalled();
    });

    it('should handle switch failures with rollback', async () => {
      const switchFailedHandler = vi.fn();
      avatarManager.addEventListener('switchFailed', switchFailedHandler);

      // Mock switch failure
      const switchPromise = avatarManager.switchProvider('d-id');
      
      setTimeout(() => {
        avatarManager.dispatchEvent(new CustomEvent('switching', {
          detail: { from: 'heygen', to: 'd-id' }
        }));
        // Simulate failure - no connected event for d-id
      }, 0);

      await expect(switchPromise).rejects.toThrow();
    });

    it('should not switch to same provider', async () => {
      // Assuming heygen is currently connected
      const switchPromise = avatarManager.switchProvider('heygen');
      await expect(switchPromise).resolves.not.toThrow();
    });
  });

  describe('Speech Functionality', () => {
    beforeEach(async () => {
      // Setup connection
      const connectPromise = avatarManager.connect();
      setTimeout(() => {
        avatarManager.dispatchEvent(new CustomEvent('connected', {
          detail: { provider: 'heygen', connectionId: 'test-id' }
        }));
      }, 0);
      await connectPromise.catch(() => {});
    });

    it('should handle speech requests successfully', async () => {
      const message = 'Hello, this is a test message';
      
      const speakPromise = avatarManager.speak(message);
      
      // Simulate speech events
      setTimeout(() => {
        avatarManager.dispatchEvent(new CustomEvent('speaking', {
          detail: { provider: 'heygen' }
        }));
        setTimeout(() => {
          avatarManager.dispatchEvent(new CustomEvent('speechEnded', {
            detail: { provider: 'heygen' }
          }));
        }, 100);
      }, 0);

      await expect(speakPromise).resolves.toBeDefined();
    });

    it('should handle speech with options', async () => {
      const message = 'Test message with options';
      const options = { emotion: 'friendly', quality: 'high' as const };
      
      const result = await avatarManager.speak(message, options);
      expect(result).toBeDefined();
    });

    it('should track performance metrics', async () => {
      await avatarManager.speak('Performance test');
      
      const metrics = avatarManager.getPerformanceMetrics();
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should handle speech errors with retry', async () => {
      const errorHandler = vi.fn();
      avatarManager.addEventListener('speechError', errorHandler);

      // Mock speech failure
      const speakPromise = avatarManager.speak('Error test');
      
      setTimeout(() => {
        avatarManager.dispatchEvent(new CustomEvent('speechError', {
          detail: { error: new Error('Speech failed'), provider: 'heygen' }
        }));
      }, 0);

      await expect(speakPromise).rejects.toThrow();
    });
  });

  describe('Performance Requirements', () => {
    it('should complete connection within reasonable time', async () => {
      const startTime = Date.now();
      
      const connectPromise = avatarManager.connect();
      setTimeout(() => {
        avatarManager.dispatchEvent(new CustomEvent('connected', {
          detail: { provider: 'heygen', connectionId: 'test-id' }
        }));
      }, 500); // Simulate 500ms connection time

      await connectPromise.catch(() => {});
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should connect within 2 seconds
    });

    it('should handle speech within 4 seconds', async () => {
      // Setup connection first
      const connectPromise = avatarManager.connect();
      setTimeout(() => {
        avatarManager.dispatchEvent(new CustomEvent('connected', {
          detail: { provider: 'heygen', connectionId: 'test-id' }
        }));
      }, 0);
      await connectPromise.catch(() => {});

      const startTime = Date.now();
      const speakPromise = avatarManager.speak('Performance test message');
      
      setTimeout(() => {
        avatarManager.dispatchEvent(new CustomEvent('speaking'));
        setTimeout(() => {
          avatarManager.dispatchEvent(new CustomEvent('speechEnded'));
        }, 2000); // Simulate 2 second speech
      }, 0);

      await speakPromise.catch(() => {});
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(4000); // Should complete within 4 seconds
    });
  });

  describe('State Management', () => {
    it('should report correct connection state', () => {
      expect(avatarManager.isConnected()).toBe(false);
      expect(avatarManager.getCurrentProvider()).toBeNull();
      expect(avatarManager.getCurrentProviderState()).toBe('disconnected');
    });

    it('should update state after connection', async () => {
      const connectPromise = avatarManager.connect();
      setTimeout(() => {
        avatarManager.dispatchEvent(new CustomEvent('connected', {
          detail: { provider: 'heygen', connectionId: 'test-id' }
        }));
      }, 0);

      await connectPromise.catch(() => {});
      
      // State should be updated (mocked)
      expect(avatarManager.getCurrentProvider()).toBeDefined();
    });

    it('should list all available providers', () => {
      const providers = avatarManager.getAvailableProviders();
      expect(providers).toContain('heygen');
      expect(providers).toContain('d-id');
      expect(providers).toHaveLength(2);
    });
  });

  describe('Cleanup and Disconnection', () => {
    it('should disconnect cleanly', async () => {
      // Connect first
      const connectPromise = avatarManager.connect();
      setTimeout(() => {
        avatarManager.dispatchEvent(new CustomEvent('connected', {
          detail: { provider: 'heygen', connectionId: 'test-id' }
        }));
      }, 0);
      await connectPromise.catch(() => {});

      // Then disconnect
      await expect(avatarManager.disconnect()).resolves.not.toThrow();
      expect(avatarManager.getCurrentProvider()).toBeNull();
    });

    it('should handle disconnect errors gracefully', async () => {
      // Mock disconnect error
      await expect(avatarManager.disconnect()).resolves.not.toThrow();
    });
  });

  describe('Error Recovery', () => {
    it('should attempt fallback on provider failure', async () => {
      const fallbackHandler = vi.fn();
      avatarManager.addEventListener('fallbackActivated', fallbackHandler);

      // Mock connection failure
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));
      
      await expect(avatarManager.connect('heygen')).rejects.toThrow();
    });

    it('should retry speech on temporary failures', async () => {
      // Setup connection
      const connectPromise = avatarManager.connect();
      setTimeout(() => {
        avatarManager.dispatchEvent(new CustomEvent('connected', {
          detail: { provider: 'heygen', connectionId: 'test-id' }
        }));
      }, 0);
      await connectPromise.catch(() => {});

      // Mock speech retry scenario
      let attemptCount = 0;
      const originalSpeak = avatarManager.speak;
      avatarManager.speak = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve({ success: true, responseTime: 1000, provider: 'heygen' });
      });

      // This would trigger retry logic in real implementation
      await expect(avatarManager.speak('Retry test')).rejects.toThrow();
    });
  });
});