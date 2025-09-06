import type { 
  AvatarProvider, 
  DIDConfig, 
  ConnectionResult, 
  SpeechResult, 
  SpeechOptions, 
  ProviderState, 
  ProviderEvent, 
  ProviderEventCallback 
} from '../types/provider';
import { ConnectionError, SpeechError } from '../types';
import { PROVIDER_CONFIGS } from '../config/env';

export class DIDProvider implements AvatarProvider {
  readonly name = 'd-id' as const;
  readonly capabilities = {
    audioInput: true,
    videoStreaming: true,
    maxResolution: '1080p' as const,
    voiceEmotions: []
  };

  private agentContainer: HTMLDivElement | null = null;
  private embedScript: HTMLScriptElement | null = null;
  private currentState: ProviderState = 'disconnected';
  private eventHandlers = new Map<string, Set<Function>>();
  private messageHandlers = new Map<string, (data: any) => void>();
  private connectionPromise: Promise<void> | null = null;

  async connect(config: DIDConfig): Promise<ConnectionResult> {
    try {
      this.updateState('connecting');
      
      // Create container for D-ID agent
      this.agentContainer = this.createAgentContainer();
      document.body.appendChild(this.agentContainer);
      
      // Load D-ID embed script with configuration
      await this.loadEmbedScript(config);
      
      // Setup message handling
      this.setupMessageHandling();
      
      // Wait for agent ready signal
      await this.waitForAgentReady();
      
      this.updateState('connected');
      const connectionId = crypto.randomUUID();
      this.emit('connected', { provider: this.name, connectionId });
      
      return { success: true, connectionId };
    } catch (error) {
      this.updateState('error');
      await this.cleanup();
      throw new ConnectionError(`D-ID connection failed: ${(error as Error).message}`, this.name);
    }
  }

  async speak(message: string, options?: SpeechOptions): Promise<SpeechResult> {
    if (this.currentState !== 'connected') {
      throw new SpeechError('D-ID provider not connected', this.name);
    }

    try {
      const startTime = performance.now();
      
      // Send message to D-ID agent via postMessage
      const agentFrame = this.agentContainer?.querySelector('iframe');
      if (!agentFrame?.contentWindow) {
        throw new SpeechError('D-ID agent iframe not found', this.name);
      }

      agentFrame.contentWindow.postMessage({
        type: 'speak',
        data: { text: message }
      }, 'https://agent.d-id.com');

      const responseTime = performance.now() - startTime;
      return { success: true, responseTime, provider: this.name };
    } catch (error) {
      throw new SpeechError(`D-ID speak failed: ${(error as Error).message}`, this.name);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.cleanup();
      this.updateState('disconnected');
      this.emit('disconnected', { provider: this.name });
      this.clearEventHandlers();
    } catch (error) {
      console.error('D-ID disconnect error:', error);
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

  private createAgentContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'did-agent-container';
    container.className = 'did-container';
    container.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    `;
    return container;
  }

  private async loadEmbedScript(config: DIDConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      this.embedScript = document.createElement('script');
      this.embedScript.type = 'module';
      this.embedScript.src = PROVIDER_CONFIGS.did.scriptUrl;
      
      // Set configuration attributes from provided template
      const attributes = {
        'data-mode': config.mode || PROVIDER_CONFIGS.did.defaultMode,
        'data-client-key': config.clientKey,
        'data-agent-id': config.agentId,
        'data-name': 'did-agent',
        'data-monitor': 'false',
        'data-orientation': config.orientation || PROVIDER_CONFIGS.did.defaultOrientation,
        'data-position': config.position || PROVIDER_CONFIGS.did.defaultPosition
      };

      Object.entries(attributes).forEach(([key, value]) => {
        this.embedScript!.setAttribute(key, value);
      });

      this.embedScript.onload = () => {
        setTimeout(resolve, 1000); // Give the script time to initialize
      };
      this.embedScript.onerror = () => reject(new Error('Failed to load D-ID script'));
      
      if (this.agentContainer) {
        this.agentContainer.appendChild(this.embedScript);
      }
    });
  }

  private setupMessageHandling(): void {
    const messageHandler = (event: MessageEvent) => {
      // Only accept messages from D-ID domain
      if (event.origin !== 'https://agent.d-id.com') return;
      
      const { type, data } = event.data;
      
      switch (type) {
        case 'agent:ready':
          this.emit('streamReady', { agent: data });
          break;
        case 'agent:speaking':
          this.updateState('speaking');
          this.emit('speaking', {});
          break;
        case 'agent:speechEnded':
        case 'agent:idle':
          this.updateState('connected');
          this.emit('speechEnded', {});
          break;
        case 'agent:error':
          this.updateState('error');
          this.emit('error', { error: new Error(data?.message || 'D-ID agent error') });
          break;
        case 'agent:loaded':
          // Agent is fully loaded and ready
          break;
        default:
          // Handle other D-ID events as needed
          console.log('D-ID message:', type, data);
      }
    };

    window.addEventListener('message', messageHandler);
    this.messageHandlers.set('window', messageHandler);
  }

  private async waitForAgentReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('D-ID agent ready timeout'));
      }, 30000); // 30 second timeout

      const readyHandler = () => {
        clearTimeout(timeout);
        this.off('streamReady', readyHandler);
        resolve();
      };

      this.on('streamReady', readyHandler);
    });
  }

  private async cleanup(): Promise<void> {
    // Remove message handlers
    this.messageHandlers.forEach((handler, key) => {
      if (key === 'window') {
        window.removeEventListener('message', handler);
      }
    });
    this.messageHandlers.clear();

    // Remove DOM elements
    if (this.agentContainer) {
      this.agentContainer.remove();
      this.agentContainer = null;
    }

    if (this.embedScript) {
      this.embedScript.remove();
      this.embedScript = null;
    }
  }

  private updateState(newState: ProviderState): void {
    const previousState = this.currentState;
    this.currentState = newState;
    
    // Log state transitions for debugging
    console.log(`D-ID provider state: ${previousState} -> ${newState}`);
  }

  private emit<T extends ProviderEvent>(event: T, data: Parameters<ProviderEventCallback<T>>[0]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          (handler as ProviderEventCallback<T>)(data);
        } catch (error) {
          console.error(`Error in D-ID ${event} handler:`, error);
        }
      });
    }
  }

  private clearEventHandlers(): void {
    this.eventHandlers.clear();
  }
}