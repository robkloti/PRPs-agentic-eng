import { StreamingAvatar, AvatarQuality, VoiceEmotion } from '@heygen/streaming-avatar';
import type { 
  AvatarProvider, 
  HeyGenConfig, 
  ConnectionResult, 
  SpeechResult, 
  SpeechOptions, 
  ProviderState, 
  ProviderEvent, 
  ProviderEventCallback, 
  QualityLevel 
} from '../types/provider';
import { ConnectionError, SpeechError } from '../types';

export class HeyGenProvider implements AvatarProvider {
  readonly name = 'heygen' as const;
  readonly capabilities = {
    audioInput: true,
    videoStreaming: true,
    maxResolution: '720p' as const,
    voiceEmotions: ['excited', 'serious', 'friendly', 'soothing', 'broadcaster']
  };

  private streamingAvatar: StreamingAvatar | null = null;
  private currentState: ProviderState = 'disconnected';
  private eventEmitter = new EventTarget();
  private eventHandlers = new Map<string, Set<Function>>();

  async connect(config: HeyGenConfig): Promise<ConnectionResult> {
    try {
      this.updateState('connecting');
      
      this.streamingAvatar = new StreamingAvatar({ token: config.token });
      
      await this.streamingAvatar.createStartAvatar({
        avatarName: config.avatarId,
        quality: this.mapQualityLevel(config.quality),
        voice: {
          voiceId: config.voiceId,
          rate: 1.0,
          emotion: VoiceEmotion.FRIENDLY
        },
        language: 'en'
      });

      this.setupEventHandlers();
      this.updateState('connected');
      
      const connectionId = crypto.randomUUID();
      this.emit('connected', { provider: this.name, connectionId });
      
      return { success: true, connectionId };
    } catch (error) {
      this.updateState('error');
      const errorMessage = `HeyGen connection failed: ${(error as Error).message}`;
      throw new ConnectionError(errorMessage, this.name);
    }
  }

  async speak(message: string, options?: SpeechOptions): Promise<SpeechResult> {
    if (!this.streamingAvatar || this.currentState !== 'connected') {
      throw new SpeechError('HeyGen provider not connected', this.name);
    }

    try {
      this.updateState('speaking');
      const startTime = performance.now();
      
      await this.streamingAvatar.speak({
        text: message,
        task_type: 'talk',
        task_mode: 'sync'
      });

      const responseTime = performance.now() - startTime;
      return { success: true, responseTime, provider: this.name };
    } catch (error) {
      this.updateState('connected'); // Reset state on error
      throw new SpeechError(`HeyGen speak failed: ${(error as Error).message}`, this.name);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.streamingAvatar) {
        await this.streamingAvatar.closeVoiceChat();
        this.streamingAvatar = null;
      }
      
      this.updateState('disconnected');
      this.emit('disconnected', { provider: this.name });
      this.clearEventHandlers();
    } catch (error) {
      console.error('HeyGen disconnect error:', error);
      this.updateState('error');
    }
  }

  getState(): ProviderState {
    return this.currentState;
  }

  on<T extends ProviderEvent>(event: T, callback: ProviderEventCallback<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(callback);
  }

  off<T extends ProviderEvent>(event: T, callback: ProviderEventCallback<T>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(callback);
    }
  }

  private mapQualityLevel(level: QualityLevel): AvatarQuality {
    const qualityMap = {
      low: AvatarQuality.Low,
      medium: AvatarQuality.Medium,
      high: AvatarQuality.High,
      auto: AvatarQuality.Medium
    };
    return qualityMap[level];
  }

  private setupEventHandlers(): void {
    if (!this.streamingAvatar) return;

    // Handle stream ready event
    this.streamingAvatar.on('stream_ready', (event: any) => {
      this.emit('streamReady', { stream: event.detail });
    });

    // Handle avatar speaking events
    this.streamingAvatar.on('avatar_start_talking', () => {
      this.updateState('speaking');
      this.emit('speaking', {});
    });

    this.streamingAvatar.on('avatar_stop_talking', () => {
      this.updateState('connected');
      this.emit('speechEnded', {});
    });

    // Handle errors
    this.streamingAvatar.on('error', (error: any) => {
      this.updateState('error');
      this.emit('error', { error: new Error(error.message || 'HeyGen error') });
    });

    // Handle connection issues
    this.streamingAvatar.on('connection_error', (error: any) => {
      this.updateState('error');
      this.emit('error', { error: new ConnectionError(error.message || 'HeyGen connection error', this.name) });
    });
  }

  private updateState(newState: ProviderState): void {
    const previousState = this.currentState;
    this.currentState = newState;
    
    // Log state transitions for debugging
    console.log(`HeyGen provider state: ${previousState} -> ${newState}`);
  }

  private emit<T extends ProviderEvent>(event: T, data: Parameters<ProviderEventCallback<T>>[0]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          (handler as ProviderEventCallback<T>)(data);
        } catch (error) {
          console.error(`Error in HeyGen ${event} handler:`, error);
        }
      });
    }
  }

  private clearEventHandlers(): void {
    this.eventHandlers.clear();
  }
}