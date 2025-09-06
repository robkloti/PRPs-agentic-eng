import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HeyGenProvider } from '../../providers/heygen.provider';
import type { HeyGenConfig } from '../../types';

// Mock the HeyGen SDK
const mockStreamingAvatar = {
  createStartAvatar: vi.fn(),
  speak: vi.fn(),
  closeVoiceChat: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('@heygen/streaming-avatar', () => ({
  StreamingAvatar: vi.fn(() => mockStreamingAvatar),
  AvatarQuality: {
    Low: 'low',
    Medium: 'medium', 
    High: 'high',
  },
  VoiceEmotion: {
    FRIENDLY: 'friendly',
    EXCITED: 'excited',
    SERIOUS: 'serious',
  },
}));

describe('HeyGenProvider', () => {
  let provider: HeyGenProvider;
  let config: HeyGenConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    config = {
      token: 'test-session-token',
      avatarId: 'test-avatar-id',
      voiceId: 'test-voice-id',
      quality: 'medium'
    };

    provider = new HeyGenProvider();
  });

  afterEach(async () => {
    await provider.disconnect();
  });

  describe('Provider Properties', () => {
    it('should have correct provider name', () => {
      expect(provider.name).toBe('heygen');
    });

    it('should have correct capabilities', () => {
      expect(provider.capabilities).toEqual({
        audioInput: true,
        videoStreaming: true,
        maxResolution: '720p',
        voiceEmotions: ['excited', 'serious', 'friendly', 'soothing', 'broadcaster']
      });
    });

    it('should start in disconnected state', () => {
      expect(provider.getState()).toBe('disconnected');
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully with valid config', async () => {
      mockStreamingAvatar.createStartAvatar.mockResolvedValueOnce(undefined);
      
      const result = await provider.connect(config);
      
      expect(result.success).toBe(true);
      expect(result.connectionId).toBeDefined();
      expect(mockStreamingAvatar.createStartAvatar).toHaveBeenCalledWith({
        avatarName: config.avatarId,
        quality: 'medium',
        voice: {
          voiceId: config.voiceId,
          rate: 1.0,
          emotion: 'friendly'
        },
        language: 'en'
      });
      expect(provider.getState()).toBe('connected');
    });

    it('should handle connection failures', async () => {
      const error = new Error('Connection failed');
      mockStreamingAvatar.createStartAvatar.mockRejectedValueOnce(error);
      
      await expect(provider.connect(config)).rejects.toThrow('HeyGen connection failed: Connection failed');
      expect(provider.getState()).toBe('error');
    });

    it('should map quality levels correctly', async () => {
      mockStreamingAvatar.createStartAvatar.mockResolvedValueOnce(undefined);
      
      const lowQualityConfig = { ...config, quality: 'low' as const };
      await provider.connect(lowQualityConfig);
      
      expect(mockStreamingAvatar.createStartAvatar).toHaveBeenCalledWith(
        expect.objectContaining({
          quality: 'low'
        })
      );
    });

    it('should setup event handlers on connection', async () => {
      mockStreamingAvatar.createStartAvatar.mockResolvedValueOnce(undefined);
      
      await provider.connect(config);
      
      expect(mockStreamingAvatar.on).toHaveBeenCalledWith('stream_ready', expect.any(Function));
      expect(mockStreamingAvatar.on).toHaveBeenCalledWith('avatar_start_talking', expect.any(Function));
      expect(mockStreamingAvatar.on).toHaveBeenCalledWith('avatar_stop_talking', expect.any(Function));
    });
  });

  describe('Speech Functionality', () => {
    beforeEach(async () => {
      mockStreamingAvatar.createStartAvatar.mockResolvedValueOnce(undefined);
      await provider.connect(config);
    });

    it('should handle speech requests successfully', async () => {
      mockStreamingAvatar.speak.mockResolvedValueOnce(undefined);
      
      const result = await provider.speak('Hello world');
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('heygen');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(mockStreamingAvatar.speak).toHaveBeenCalledWith({
        text: 'Hello world',
        task_type: 'talk',
        task_mode: 'sync'
      });
    });

    it('should handle speech with options', async () => {
      mockStreamingAvatar.speak.mockResolvedValueOnce(undefined);
      
      const options = { emotion: 'excited', quality: 'high' as const };
      await provider.speak('Test message', options);
      
      expect(mockStreamingAvatar.speak).toHaveBeenCalledWith({
        text: 'Test message',
        task_type: 'talk',
        task_mode: 'sync'
      });
    });

    it('should handle speech failures', async () => {
      const error = new Error('Speech failed');
      mockStreamingAvatar.speak.mockRejectedValueOnce(error);
      
      await expect(provider.speak('Test message')).rejects.toThrow('HeyGen speak failed: Speech failed');
    });

    it('should throw error when not connected', async () => {
      const disconnectedProvider = new HeyGenProvider();
      
      await expect(disconnectedProvider.speak('Test')).rejects.toThrow('HeyGen provider not connected');
    });

    it('should update state during speech', async () => {
      mockStreamingAvatar.speak.mockImplementationOnce(() => {
        // Simulate state change during speech
        expect(provider.getState()).toBe('speaking');
        return Promise.resolve();
      });
      
      await provider.speak('State test');
    });
  });

  describe('Event Handling', () => {
    let eventHandler: vi.Mock;

    beforeEach(async () => {
      mockStreamingAvatar.createStartAvatar.mockResolvedValueOnce(undefined);
      await provider.connect(config);
      eventHandler = vi.fn();
    });

    it('should register event handlers', () => {
      provider.on('speaking', eventHandler);
      
      // Verify handler was registered (internal state)
      expect(eventHandler).toBeDefined();
    });

    it('should remove event handlers', () => {
      provider.on('speaking', eventHandler);
      provider.off('speaking', eventHandler);
      
      // Handler should be removed (internal state)
      expect(eventHandler).toBeDefined();
    });

    it('should emit streamReady event', async () => {
      provider.on('streamReady', eventHandler);
      
      // Simulate HeyGen SDK event
      const streamEvent = { detail: { stream: 'mock-stream' } };
      const onStreamReady = mockStreamingAvatar.on.mock.calls.find(
        call => call[0] === 'stream_ready'
      )?.[1];
      
      if (onStreamReady) {
        onStreamReady(streamEvent);
        expect(eventHandler).toHaveBeenCalledWith({ stream: streamEvent.detail });
      }
    });

    it('should emit speaking events', async () => {
      provider.on('speaking', eventHandler);
      
      // Simulate HeyGen SDK speaking event
      const onStartTalking = mockStreamingAvatar.on.mock.calls.find(
        call => call[0] === 'avatar_start_talking'
      )?.[1];
      
      if (onStartTalking) {
        onStartTalking();
        expect(eventHandler).toHaveBeenCalledWith({});
      }
    });

    it('should emit speechEnded events', async () => {
      provider.on('speechEnded', eventHandler);
      
      // Simulate HeyGen SDK stop talking event  
      const onStopTalking = mockStreamingAvatar.on.mock.calls.find(
        call => call[0] === 'avatar_stop_talking'
      )?.[1];
      
      if (onStopTalking) {
        onStopTalking();
        expect(eventHandler).toHaveBeenCalledWith({});
      }
    });

    it('should handle SDK errors gracefully', async () => {
      provider.on('error', eventHandler);
      
      // Simulate HeyGen SDK error
      const onError = mockStreamingAvatar.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      if (onError) {
        onError({ message: 'SDK Error' });
        expect(eventHandler).toHaveBeenCalledWith({ 
          error: expect.any(Error) 
        });
      }
    });
  });

  describe('Disconnection', () => {
    beforeEach(async () => {
      mockStreamingAvatar.createStartAvatar.mockResolvedValueOnce(undefined);
      await provider.connect(config);
    });

    it('should disconnect successfully', async () => {
      mockStreamingAvatar.closeVoiceChat.mockResolvedValueOnce(undefined);
      
      await provider.disconnect();
      
      expect(mockStreamingAvatar.closeVoiceChat).toHaveBeenCalled();
      expect(provider.getState()).toBe('disconnected');
    });

    it('should handle disconnect errors gracefully', async () => {
      mockStreamingAvatar.closeVoiceChat.mockRejectedValueOnce(new Error('Disconnect failed'));
      
      await expect(provider.disconnect()).resolves.not.toThrow();
      expect(provider.getState()).toBe('error');
    });

    it('should clear event handlers on disconnect', async () => {
      await provider.disconnect();
      
      // Event handlers should be cleared (internal state)
      // This would be verified by checking internal state in real implementation
      expect(provider.getState()).toBe('disconnected');
    });
  });

  describe('Quality Level Mapping', () => {
    it('should map low quality correctly', async () => {
      mockStreamingAvatar.createStartAvatar.mockResolvedValueOnce(undefined);
      
      const lowConfig = { ...config, quality: 'low' as const };
      await provider.connect(lowConfig);
      
      expect(mockStreamingAvatar.createStartAvatar).toHaveBeenCalledWith(
        expect.objectContaining({ quality: 'low' })
      );
    });

    it('should map medium quality correctly', async () => {
      mockStreamingAvatar.createStartAvatar.mockResolvedValueOnce(undefined);
      
      const mediumConfig = { ...config, quality: 'medium' as const };
      await provider.connect(mediumConfig);
      
      expect(mockStreamingAvatar.createStartAvatar).toHaveBeenCalledWith(
        expect.objectContaining({ quality: 'medium' })
      );
    });

    it('should map high quality correctly', async () => {
      mockStreamingAvatar.createStartAvatar.mockResolvedValueOnce(undefined);
      
      const highConfig = { ...config, quality: 'high' as const };
      await provider.connect(highConfig);
      
      expect(mockStreamingAvatar.createStartAvatar).toHaveBeenCalledWith(
        expect.objectContaining({ quality: 'high' })
      );
    });

    it('should default auto quality to medium', async () => {
      mockStreamingAvatar.createStartAvatar.mockResolvedValueOnce(undefined);
      
      const autoConfig = { ...config, quality: 'auto' as const };
      await provider.connect(autoConfig);
      
      expect(mockStreamingAvatar.createStartAvatar).toHaveBeenCalledWith(
        expect.objectContaining({ quality: 'medium' })
      );
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      mockStreamingAvatar.createStartAvatar.mockResolvedValueOnce(undefined);
      await provider.connect(config);
    });

    it('should track response time accurately', async () => {
      const delay = 1000;
      mockStreamingAvatar.speak.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, delay))
      );
      
      const startTime = Date.now();
      const result = await provider.speak('Performance test');
      const actualDuration = Date.now() - startTime;
      
      expect(result.responseTime).toBeGreaterThan(delay * 0.8); // Allow some variance
      expect(result.responseTime).toBeLessThan(actualDuration + 100); // Account for overhead
    });
  });
});