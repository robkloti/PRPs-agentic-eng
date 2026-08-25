# Modern Avatar Website - Implementation PRP

## Goal

Create a production-ready modern avatar website with dual-provider support (HeyGen + D-ID) using TypeScript, featuring seamless provider switching, responsive design, comprehensive error handling, and <4 second response times. Enable one-pass development success through detailed implementation blueprints and executable validation loops.

**Success Criteria:**
- Dual-provider avatar support with seamless switching
- Sub-4-second response times for all interactions
- Mobile-responsive modern UI/UX with accessibility compliance
- Comprehensive error handling and automatic fallback
- Production-ready deployment with Docker containers
- 90%+ test coverage with full validation pipeline

## Why

### Business Value
- **Market Leadership**: First dual-provider avatar platform reduces vendor lock-in risk
- **Reliability**: Provider redundancy ensures 99.9% uptime through automatic failover
- **Performance**: Optimized WebRTC streaming delivers sub-200ms latency
- **Scalability**: Provider abstraction enables rapid integration of future avatar services

### Technical Value
- **Future-Proof Architecture**: Clean separation enables easy provider additions
- **Developer Experience**: TypeScript contracts prevent runtime errors
- **Maintainability**: Modular design simplifies debugging and updates
- **Production Ready**: Comprehensive monitoring, logging, and deployment automation

## What

### Core Features Implementation
- **HeyGen Integration**: Streaming Avatar SDK with session management
- **D-ID Integration**: v2 Agent Embed with iframe communication
- **Provider Abstraction**: Unified interface for seamless switching
- **Modern UI/UX**: Responsive design with glassmorphism effects
- **Real-time Monitoring**: Performance metrics and health checking
- **Error Recovery**: Intelligent fallback with exponential backoff

### Technical Architecture
- **TypeScript**: Full type safety with strict compilation
- **Vite**: Fast development and optimized production builds
- **WebRTC**: Cross-browser video streaming support
- **Docker**: Containerized deployment with multi-stage builds
- **Testing**: Vitest, Playwright, and Cypress for comprehensive coverage

## Context

### HeyGen Streaming Avatar Integration
- **SDK**: `@heygen/streaming-avatar` with WebSocket communication
- **Authentication**: Session tokens via `/create_token` endpoint
- **Key Events**: `AVATAR_START_TALKING`, `AVATAR_STOP_TALKING`, `STREAM_READY`
- **Quality Levels**: Low (360p), Medium (480p), High (720p)
- **Voice Emotions**: Excited, Serious, Friendly, Soothing, Broadcaster

### D-ID v2 Agent Embed Integration
- **Approach**: iframe embedding with postMessage communication
- **Script URL**: `https://agent.d-id.com/v2/index.js`
- **Configuration**: Data attributes (mode, orientation, client-key, agent-id)
- **Communication**: bidirectional messaging for control and feedback

### Provider Abstraction Pattern
```typescript
interface AvatarProvider {
  name: 'heygen' | 'd-id';
  connect(config: ProviderConfig): Promise<ConnectionResult>;
  speak(message: string, options?: SpeechOptions): Promise<SpeechResult>;
  disconnect(): Promise<void>;
  getState(): ProviderState;
}
```

### Performance Requirements
- **Response Time**: <4 seconds for avatar responses
- **Video Quality**: Adaptive streaming 360p-1080p
- **Concurrent Users**: Support 100+ simultaneous sessions
- **Memory Usage**: <100MB per session
- **CPU Usage**: <20% during normal operation

### Error Handling Gotchas
- HeyGen requires session token refresh every 30 minutes
- D-ID iframe requires proper CORS configuration
- WebRTC connections may fail on restrictive networks
- Provider switching must maintain conversation state
- Mobile browsers have different WebRTC support levels

## Implementation Blueprint

### Phase 1: Foundation & TypeScript Setup (Days 1-2)

#### Project Structure Creation
```bash
mkdir modern-avatar-website && cd modern-avatar-website
npm init -y
npm install -D typescript @types/node vite @vitejs/plugin-react
npm install @heygen/streaming-avatar recordrtc
```

#### TypeScript Configuration
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "removeComments": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### Core Provider Interface
```typescript
// src/types/provider.ts
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
```

#### Environment Configuration
```typescript
// src/config/env.ts
export interface EnvironmentConfig {
  HEYGEN_API_KEY: string;
  HEYGEN_AVATAR_ID: string;
  HEYGEN_VOICE_ID: string;
  DID_CLIENT_KEY: string;
  DID_AGENT_ID: string;
  NODE_ENV: 'development' | 'production';
}

export const ENV: EnvironmentConfig = {
  HEYGEN_API_KEY: import.meta.env.VITE_HEYGEN_API_KEY,
  HEYGEN_AVATAR_ID: import.meta.env.VITE_HEYGEN_AVATAR_ID || 'default',
  HEYGEN_VOICE_ID: import.meta.env.VITE_HEYGEN_VOICE_ID || 'voice-001',
  DID_CLIENT_KEY: import.meta.env.VITE_DID_CLIENT_KEY,
  DID_AGENT_ID: import.meta.env.VITE_DID_AGENT_ID,
  NODE_ENV: import.meta.env.MODE as 'development' | 'production'
};
```

### Phase 2: Provider Abstraction Layer (Days 3-4)

#### HeyGen Provider Implementation
```typescript
// src/providers/heygen.provider.ts
import { StreamingAvatar, AvatarQuality, VoiceEmotion } from '@heygen/streaming-avatar';
import type { AvatarProvider, HeyGenConfig } from '../types';

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

  async connect(config: HeyGenConfig): Promise<ConnectionResult> {
    try {
      this.updateState('connecting');
      
      this.streamingAvatar = new StreamingAvatar({ token: config.token });
      
      await this.streamingAvatar.newSession({
        avatarName: config.avatarId,
        quality: this.mapQualityLevel(config.quality),
        voice: {
          voiceId: config.voiceId,
          emotion: VoiceEmotion.FRIENDLY
        }
      });

      this.setupEventHandlers();
      this.updateState('connected');
      
      return { success: true, connectionId: crypto.randomUUID() };
    } catch (error) {
      this.updateState('error');
      throw new Error(`HeyGen connection failed: ${(error as Error).message}`);
    }
  }

  async speak(message: string, options?: SpeechOptions): Promise<SpeechResult> {
    if (!this.streamingAvatar || this.currentState !== 'connected') {
      throw new Error('HeyGen provider not connected');
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
      return { success: true, responseTime, provider: 'heygen' };
    } catch (error) {
      throw new Error(`HeyGen speak failed: ${(error as Error).message}`);
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

    this.streamingAvatar.on('stream_ready', (event: any) => {
      this.emit('streamReady', { stream: event.detail });
    });

    this.streamingAvatar.on('avatar_start_talking', () => {
      this.updateState('speaking');
      this.emit('speaking', {});
    });

    this.streamingAvatar.on('avatar_stop_talking', () => {
      this.updateState('connected');
      this.emit('speechEnded', {});
    });
  }

  // Additional methods: disconnect, getState, on, off, emit...
}
```

#### D-ID Provider Implementation
```typescript
// src/providers/did.provider.ts
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
  private messageHandlers = new Map<string, (data: any) => void>();

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
      return { success: true, connectionId: crypto.randomUUID() };
    } catch (error) {
      this.updateState('error');
      throw new Error(`D-ID connection failed: ${(error as Error).message}`);
    }
  }

  private async loadEmbedScript(config: DIDConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      this.embedScript = document.createElement('script');
      this.embedScript.type = 'module';
      this.embedScript.src = 'https://agent.d-id.com/v2/index.js';
      
      // Set configuration attributes from provided template
      this.embedScript.setAttribute('data-mode', config.mode || 'fabio');
      this.embedScript.setAttribute('data-client-key', config.clientKey);
      this.embedScript.setAttribute('data-agent-id', config.agentId);
      this.embedScript.setAttribute('data-name', 'did-agent');
      this.embedScript.setAttribute('data-monitor', 'false');
      this.embedScript.setAttribute('data-orientation', config.orientation || 'horizontal');
      
      this.embedScript.onload = () => resolve();
      this.embedScript.onerror = () => reject(new Error('Failed to load D-ID script'));
      
      document.head.appendChild(this.embedScript);
    });
  }

  private setupMessageHandling(): void {
    window.addEventListener('message', (event) => {
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
          this.updateState('connected');
          this.emit('speechEnded', {});
          break;
        case 'agent:error':
          this.updateState('error');
          this.emit('error', { error: new Error(data.message) });
          break;
      }
    });
  }

  async speak(message: string): Promise<SpeechResult> {
    if (this.currentState !== 'connected') {
      throw new Error('D-ID provider not connected');
    }

    try {
      const startTime = performance.now();
      
      // Send message to D-ID agent via postMessage
      const agentFrame = this.agentContainer?.querySelector('iframe');
      agentFrame?.contentWindow?.postMessage({
        type: 'speak',
        data: { text: message }
      }, 'https://agent.d-id.com');

      const responseTime = performance.now() - startTime;
      return { success: true, responseTime, provider: 'd-id' };
    } catch (error) {
      throw new Error(`D-ID speak failed: ${(error as Error).message}`);
    }
  }

  // Additional methods...
}
```

### Phase 3: HeyGen Streaming Integration (Days 5-6)

#### Session Token Management
```typescript
// src/services/heygen-session.service.ts
export class HeyGenSessionManager {
  private apiKey: string;
  private baseUrl = 'https://api.heygen.com';
  private tokenCache: SessionToken | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getSessionToken(): Promise<string> {
    if (this.tokenCache && !this.isTokenExpired(this.tokenCache)) {
      return this.tokenCache.token;
    }

    const response = await fetch(`${this.baseUrl}/v1/streaming.create_token`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Token creation failed: ${response.status}`);
    }

    const data = await response.json();
    this.tokenCache = {
      token: data.data.token,
      expiresAt: new Date(Date.now() + 25 * 60 * 1000) // 25 minutes
    };

    return this.tokenCache.token;
  }

  private isTokenExpired(token: SessionToken): boolean {
    return new Date() >= token.expiresAt;
  }
}

interface SessionToken {
  token: string;
  expiresAt: Date;
}
```

#### WebRTC Stream Handler
```typescript
// src/services/stream-manager.ts
export class StreamManager {
  private streams = new Map<string, MediaStream>();
  private connections = new Map<string, RTCPeerConnection>();

  async setupProviderStream(
    provider: string, 
    videoElement: HTMLVideoElement
  ): Promise<void> {
    const connection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    connection.ontrack = (event) => {
      const [stream] = event.streams;
      this.streams.set(`${provider}:remote`, stream);
      videoElement.srcObject = stream;
    };

    this.connections.set(provider, connection);
  }

  getStream(provider: string): MediaStream | null {
    return this.streams.get(`${provider}:remote`) || null;
  }

  async cleanupProvider(provider: string): Promise<void> {
    const connection = this.connections.get(provider);
    const stream = this.streams.get(`${provider}:remote`);

    if (connection) {
      connection.close();
      this.connections.delete(provider);
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.streams.delete(`${provider}:remote`);
    }
  }
}
```

### Phase 4: D-ID v2 Embed Integration (Days 7-8)

#### D-ID Container Management
```typescript
// src/components/DIDContainer.ts
export class DIDContainer {
  private container: HTMLDivElement;
  private iframe: HTMLIFrameElement | null = null;

  constructor(parentElement: HTMLElement) {
    this.container = this.createContainer();
    parentElement.appendChild(this.container);
  }

  private createContainer(): HTMLDivElement {
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

  async loadAgent(config: DIDConfig): Promise<void> {
    // Create script element with D-ID configuration
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://agent.d-id.com/v2/index.js';
    
    // Apply configuration from provided embed template
    Object.entries({
      'data-mode': config.mode || 'fabio',
      'data-client-key': config.clientKey,
      'data-agent-id': config.agentId,
      'data-name': 'did-agent',
      'data-monitor': 'false',
      'data-orientation': config.orientation || 'horizontal',
      'data-position': config.position || 'right'
    }).forEach(([key, value]) => {
      script.setAttribute(key, value);
    });

    return new Promise((resolve, reject) => {
      script.onload = () => {
        this.iframe = this.container.querySelector('iframe');
        resolve();
      };
      script.onerror = () => reject(new Error('D-ID script load failed'));
      
      this.container.appendChild(script);
    });
  }

  sendMessage(type: string, data: any): void {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage({ type, data }, '*');
    }
  }

  destroy(): void {
    this.container.remove();
  }
}
```

### Phase 5: Modern UI/UX Implementation (Days 9-11)

#### Main Application Component
```typescript
// src/components/AvatarApp.tsx
import React, { useState, useEffect, useRef } from 'react';
import { AvatarManager } from '../services/avatar-manager';
import { StreamManager } from '../services/stream-manager';

interface AvatarAppProps {
  config: AvatarManagerConfig;
}

export const AvatarApp: React.FC<AvatarAppProps> = ({ config }) => {
  const [currentProvider, setCurrentProvider] = useState<string>('heygen');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [message, setMessage] = useState('');
  const [avatarState, setAvatarState] = useState<'idle' | 'speaking'>('idle');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarManagerRef = useRef<AvatarManager>();
  const streamManagerRef = useRef<StreamManager>();

  useEffect(() => {
    avatarManagerRef.current = new AvatarManager(config);
    streamManagerRef.current = new StreamManager();
    
    const manager = avatarManagerRef.current;
    
    manager.on('connected', (data) => {
      setIsConnected(true);
      setIsConnecting(false);
      setCurrentProvider(data.provider);
    });
    
    manager.on('speaking', () => setAvatarState('speaking'));
    manager.on('speechEnded', () => setAvatarState('idle'));
    
    manager.on('streamReady', async (data) => {
      if (videoRef.current && streamManagerRef.current) {
        await streamManagerRef.current.setupProviderStream(
          currentProvider, 
          videoRef.current
        );
      }
    });

    return () => {
      manager.disconnect();
    };
  }, []);

  const handleConnect = async () => {
    if (!avatarManagerRef.current) return;
    
    setIsConnecting(true);
    try {
      await avatarManagerRef.current.connect(currentProvider);
    } catch (error) {
      console.error('Connection failed:', error);
      setIsConnecting(false);
    }
  };

  const handleSpeak = async () => {
    if (!avatarManagerRef.current || !message.trim()) return;
    
    try {
      await avatarManagerRef.current.speak(message);
      setMessage('');
    } catch (error) {
      console.error('Speech failed:', error);
    }
  };

  const handleProviderSwitch = async (provider: string) => {
    if (!avatarManagerRef.current || provider === currentProvider) return;
    
    try {
      await avatarManagerRef.current.switchProvider(provider);
    } catch (error) {
      console.error('Provider switch failed:', error);
    }
  };

  return (
    <div className="avatar-app">
      <header className="app-header">
        <h1>Modern Avatar Interface</h1>
        <div className="provider-selector">
          <button
            onClick={() => handleProviderSwitch('heygen')}
            className={`provider-btn ${currentProvider === 'heygen' ? 'active' : ''}`}
            disabled={isConnecting}
          >
            HeyGen
          </button>
          <button
            onClick={() => handleProviderSwitch('d-id')}
            className={`provider-btn ${currentProvider === 'd-id' ? 'active' : ''}`}
            disabled={isConnecting}
          >
            D-ID
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="video-container">
          <video
            ref={videoRef}
            className={`avatar-video ${avatarState}`}
            autoPlay
            muted={false}
            playsInline
          />
          <div className="video-overlay">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {currentProvider.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="controls-panel">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="connect-btn primary-button"
            >
              {isConnecting ? 'Connecting...' : 'Connect Avatar'}
            </button>
          ) : (
            <div className="message-controls">
              <div className="input-group">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter message to speak..."
                  className="message-input"
                  onKeyPress={(e) => e.key === 'Enter' && handleSpeak()}
                />
                <button
                  onClick={handleSpeak}
                  disabled={!message.trim() || avatarState === 'speaking'}
                  className="speak-btn primary-button"
                >
                  {avatarState === 'speaking' ? 'Speaking...' : 'Speak'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
```

#### Modern CSS with Glassmorphism
```css
/* src/styles/main.css */
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --glass-background: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --shadow-primary: 0 8px 32px rgba(102, 126, 234, 0.2);
  --shadow-glass: 0 4px 15px rgba(0, 0, 0, 0.1);
  --border-radius: 12px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.avatar-app {
  min-height: 100vh;
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
  padding: 2rem;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: var(--glass-background);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 1rem 2rem;
  box-shadow: var(--shadow-glass);
}

.provider-selector {
  display: flex;
  gap: 0.5rem;
}

.provider-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  transition: var(--transition);
}

.provider-btn.active {
  background: var(--primary-gradient);
  box-shadow: var(--shadow-primary);
}

.main-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  height: calc(100vh - 200px);
}

.video-container {
  position: relative;
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--shadow-glass);
}

.avatar-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: var(--transition);
}

.avatar-video.speaking {
  box-shadow: 0 0 30px rgba(102, 126, 234, 0.6);
}

.video-overlay {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.status-indicator {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-indicator.connected {
  background: rgba(34, 197, 94, 0.9);
  color: white;
}

.status-indicator.disconnected {
  background: rgba(239, 68, 68, 0.9);
  color: white;
}

.controls-panel {
  background: var(--glass-background);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.primary-button {
  background: var(--primary-gradient);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: var(--border-radius);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: var(--shadow-primary);
}

.primary-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.4);
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-group {
  display: flex;
  gap: 1rem;
  width: 100%;
}

.message-input {
  flex: 1;
  padding: 1rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
}

.message-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

/* Responsive Design */
@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
  
  .app-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .input-group {
    flex-direction: column;
  }
}

/* Loading Animation */
.loading-skeleton {
  background: linear-gradient(90deg, 
    rgba(255, 255, 255, 0.1) 25%, 
    rgba(255, 255, 255, 0.2) 50%, 
    rgba(255, 255, 255, 0.1) 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Phase 6: Provider Switching Logic (Days 12-13)

#### Avatar Manager Implementation
```typescript
// src/services/avatar-manager.ts
export class AvatarManager extends EventTarget {
  private providers = new Map<string, AvatarProvider>();
  private currentProvider: AvatarProvider | null = null;
  private config: AvatarManagerConfig;
  private performanceMonitor: PerformanceMonitor;
  private errorRecovery: ErrorRecoveryManager;

  constructor(config: AvatarManagerConfig) {
    super();
    this.config = config;
    this.performanceMonitor = new PerformanceMonitor();
    this.errorRecovery = new ErrorRecoveryManager(config.errorRecovery);
    
    this.initializeProviders();
  }

  private initializeProviders(): void {
    if (this.config.heygen?.enabled) {
      const heygenProvider = new HeyGenProvider();
      this.providers.set('heygen', heygenProvider);
      this.setupProviderEvents(heygenProvider);
    }

    if (this.config.did?.enabled) {
      const didProvider = new DIDProvider();
      this.providers.set('d-id', didProvider);
      this.setupProviderEvents(didProvider);
    }
  }

  async connect(providerName: string = this.config.defaultProvider): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    try {
      const config = this.getProviderConfig(providerName);
      await provider.connect(config);
      this.currentProvider = provider;
      
      this.dispatchEvent(new CustomEvent('connected', { 
        detail: { provider: providerName } 
      }));
    } catch (error) {
      await this.handleConnectionError(error as Error, providerName);
    }
  }

  async switchProvider(targetProvider: string): Promise<void> {
    if (!this.providers.has(targetProvider)) {
      throw new Error(`Provider ${targetProvider} not available`);
    }

    const newProvider = this.providers.get(targetProvider)!;
    const previousProvider = this.currentProvider;

    try {
      this.dispatchEvent(new CustomEvent('switching', {
        detail: { from: previousProvider?.name, to: targetProvider }
      }));

      // Graceful disconnect from current provider
      if (previousProvider) {
        await previousProvider.disconnect();
      }

      // Connect to new provider
      await this.connect(targetProvider);

      this.dispatchEvent(new CustomEvent('switched', {
        detail: { from: previousProvider?.name, to: targetProvider }
      }));

    } catch (error) {
      // Attempt rollback on failure
      if (previousProvider) {
        try {
          await this.connect(previousProvider.name);
        } catch (rollbackError) {
          this.dispatchEvent(new CustomEvent('switchFailed', {
            detail: { 
              targetProvider, 
              error: error as Error,
              rollbackError: rollbackError as Error 
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
      
      this.performanceMonitor.trackResponse(
        this.currentProvider.name,
        performance.now() - startTime,
        true
      );

      return result;
    } catch (error) {
      // Attempt error recovery
      const recovered = await this.errorRecovery.handleSpeechError(
        error as Error,
        this.currentProvider.name
      );

      if (recovered) {
        return this.speak(message, options);
      }

      throw error;
    }
  }

  private getProviderConfig(providerName: string): ProviderConfig {
    switch (providerName) {
      case 'heygen':
        return {
          token: this.config.heygen!.token,
          avatarId: this.config.heygen!.avatarId,
          voiceId: this.config.heygen!.voiceId,
          quality: this.config.heygen!.quality
        };
      case 'd-id':
        return {
          clientKey: this.config.did!.clientKey,
          agentId: this.config.did!.agentId,
          mode: this.config.did!.mode,
          orientation: this.config.did!.orientation
        };
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  private setupProviderEvents(provider: AvatarProvider): void {
    provider.on('speaking', () => {
      this.dispatchEvent(new CustomEvent('speaking'));
    });

    provider.on('speechEnded', () => {
      this.dispatchEvent(new CustomEvent('speechEnded'));
    });

    provider.on('streamReady', (data) => {
      this.dispatchEvent(new CustomEvent('streamReady', { detail: data }));
    });

    provider.on('error', (error) => {
      this.dispatchEvent(new CustomEvent('error', { detail: error }));
    });
  }
}
```

### Phase 7: Testing & Validation (Days 14-15)

#### Test Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      threshold: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
```

#### Unit Tests
```typescript
// src/test/avatar-manager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AvatarManager } from '@/services/avatar-manager';

describe('AvatarManager', () => {
  let avatarManager: AvatarManager;
  let config: AvatarManagerConfig;

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
        agentId: 'test-agent'
      },
      errorRecovery: {
        maxRetries: 3,
        retryDelay: 1000,
        enableFallback: true,
        fallbackDelay: 2000
      }
    };
    
    avatarManager = new AvatarManager(config);
  });

  describe('Provider Connection', () => {
    it('should connect to default provider', async () => {
      const connectSpy = vi.fn().mockResolvedValue({ success: true });
      vi.spyOn(avatarManager, 'connect').mockImplementation(connectSpy);
      
      await avatarManager.connect();
      expect(connectSpy).toHaveBeenCalledWith('heygen');
    });

    it('should handle connection failures with retry', async () => {
      const error = new Error('Connection failed');
      vi.spyOn(avatarManager, 'connect')
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(undefined);

      await expect(avatarManager.connect()).resolves.not.toThrow();
    });
  });

  describe('Provider Switching', () => {
    it('should switch between providers seamlessly', async () => {
      await avatarManager.connect('heygen');
      expect(avatarManager.getCurrentProvider()).toBe('heygen');
      
      await avatarManager.switchProvider('d-id');
      expect(avatarManager.getCurrentProvider()).toBe('d-id');
    });

    it('should rollback on switch failure', async () => {
      await avatarManager.connect('heygen');
      
      const switchError = new Error('Switch failed');
      vi.spyOn(avatarManager, 'connect')
        .mockRejectedValueOnce(switchError)
        .mockResolvedValueOnce(undefined); // Rollback success
      
      await expect(avatarManager.switchProvider('d-id')).rejects.toThrow();
      expect(avatarManager.getCurrentProvider()).toBe('heygen');
    });
  });

  describe('Performance Requirements', () => {
    it('should complete speech within 4 seconds', async () => {
      await avatarManager.connect();
      
      const startTime = performance.now();
      await avatarManager.speak('Hello world');
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(4000);
    });
  });
});
```

#### Integration Tests
```typescript
// src/test/integration/provider-integration.test.ts
import { test, expect } from '@playwright/test';

test.describe('Provider Integration', () => {
  test('HeyGen provider full workflow', async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to load
    await expect(page.locator('.avatar-app')).toBeVisible();
    
    // Select HeyGen provider
    await page.click('[data-testid="provider-heygen"]');
    
    // Connect to avatar
    await page.click('[data-testid="connect-btn"]');
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveText('HEYGEN');
    
    // Send message
    await page.fill('[data-testid="message-input"]', 'Hello, this is a test message');
    await page.click('[data-testid="speak-btn"]');
    
    // Verify avatar response
    await expect(page.locator('.avatar-video')).toHaveClass(/speaking/);
    
    // Wait for speech to complete
    await expect(page.locator('.avatar-video')).not.toHaveClass(/speaking/, { timeout: 10000 });
  });

  test('Provider switching without interruption', async ({ page }) => {
    await page.goto('/');
    
    // Connect to HeyGen
    await page.click('[data-testid="provider-heygen"]');
    await page.click('[data-testid="connect-btn"]');
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveText('HEYGEN');
    
    // Switch to D-ID
    await page.click('[data-testid="provider-did"]');
    
    // Verify seamless switch
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveText('D-ID');
    
    // Verify functionality after switch
    await page.fill('[data-testid="message-input"]', 'Testing D-ID provider');
    await page.click('[data-testid="speak-btn"]');
    await expect(page.locator('.avatar-video')).toHaveClass(/speaking/);
  });

  test('Error recovery and fallback', async ({ page }) => {
    // Mock network failure for primary provider
    await page.route('**/v1/streaming.create_token', route => {
      route.abort('failed');
    });
    
    await page.goto('/');
    await page.click('[data-testid="provider-heygen"]');
    await page.click('[data-testid="connect-btn"]');
    
    // Should automatically fallback to D-ID
    await expect(page.locator('[data-testid="status-indicator"]')).toHaveText('D-ID');
    
    // Verify fallback provider works
    await page.fill('[data-testid="message-input"]', 'Fallback test');
    await page.click('[data-testid="speak-btn"]');
    await expect(page.locator('.avatar-video')).toHaveClass(/speaking/);
  });
});
```

### Phase 8: Production Deployment (Days 16-17)

#### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Configuration
```nginx
# nginx.conf
server {
    listen 80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # WebRTC and WebSocket support
    location / {
        try_files $uri $uri/ /index.html;
        
        # CORS headers for avatar APIs
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    }
    
    # Handle WebSocket upgrades
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
```

#### Environment Configuration
```bash
# .env.production
VITE_HEYGEN_API_KEY=your_heygen_api_key_here
VITE_HEYGEN_AVATAR_ID=default
VITE_HEYGEN_VOICE_ID=voice-001
VITE_DID_CLIENT_KEY=YXV0aDB8NjhiOTU5NmFkNGVkYWRmZDkzMDQ0YzhkOi1ObXhlQnpEWHNaaU56OTdnMUFHZQ==
VITE_DID_AGENT_ID=v2_agt_G7epb5HP
VITE_NODE_ENV=production
```

#### Build Script
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write 'src/**/*.{ts,tsx,css}'",
    "docker:build": "docker build -t modern-avatar-website .",
    "docker:run": "docker run -p 3000:80 modern-avatar-website",
    "deploy": "npm run build && npm run docker:build"
  }
}
```

## Validation Loop

### Level 1: Syntax & Code Quality
```bash
# TypeScript compilation and linting
npm run type-check
npm run lint:fix
npm run format

# Security scanning
npm audit --audit-level moderate
npm run security:scan
```

### Level 2: Unit & Integration Tests
```bash
# Unit tests with coverage requirement
npm run test -- --coverage
npm run test:ui

# Provider integration tests
npm run test:integration

# Component testing
npm run test:components
```

### Level 3: End-to-End Testing
```bash
# Cross-browser compatibility
npm run test:e2e:chrome
npm run test:e2e:firefox
npm run test:e2e:safari

# Mobile device testing
npm run test:e2e:mobile

# Performance testing
npm run test:performance
npm run benchmark:response-times
```

### Level 4: Production Validation
```bash
# Build optimization
npm run build
npm run analyze:bundle

# Docker deployment
npm run docker:build
npm run docker:run

# Health checks
curl http://localhost:3000/health
npm run validate:providers

# Load testing
npm run load-test:concurrent
npm run stress-test:sustained
```

### Validation Success Criteria

#### Functional Requirements ✅
- Both HeyGen and D-ID providers fully operational
- Provider switching completes in <2 seconds without session loss
- Avatar response times consistently <4 seconds
- Video streaming maintains 480p+ quality with <200ms latency
- Error recovery with automatic fallback functioning
- Mobile responsiveness across all screen sizes (320px+)

#### Performance Requirements ✅
- Initial page load <3 seconds on 3G networks
- Avatar initialization <5 seconds
- Memory usage <100MB per session
- Bundle size <2MB gzipped
- 100+ concurrent users supported
- 99.9% uptime during load testing

#### Quality Requirements ✅
- TypeScript compilation 0 errors, 0 warnings
- ESLint passing with 0 violations
- Test coverage >90% for critical paths
- WCAG 2.1 AA accessibility compliance verified
- Cross-browser compatibility (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Security scan passing with 0 high-severity vulnerabilities

#### Deployment Requirements ✅
- Production build optimized with tree shaking
- Environment variables properly configured and validated
- SSL/TLS certificates configured for HTTPS
- Docker containerization with multi-stage builds
- Health monitoring endpoints active
- Error tracking and performance monitoring configured

This comprehensive implementation PRP provides everything needed for successful one-pass development of a modern avatar website with dual-provider support, complete with detailed code examples, deployment configurations, and exhaustive validation criteria.