import React, { useState, useEffect, useRef } from 'react';
import { AvatarManager } from '../services/avatar-manager';
import { StreamManager } from '../services/stream-manager';
import { ENV } from '../config/env';
import type { AvatarManagerConfig, AppState } from '../types';

interface AvatarAppProps {
  config?: Partial<AvatarManagerConfig>;
}

export const AvatarApp: React.FC<AvatarAppProps> = ({ config }) => {
  // State management
  const [appState, setAppState] = useState<AppState>({
    currentProvider: null,
    isConnected: false,
    isConnecting: false,
    isSpeaking: false,
    error: null,
    performanceMetrics: []
  });
  
  const [message, setMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarManagerRef = useRef<AvatarManager>();
  const streamManagerRef = useRef<StreamManager>();

  // Default configuration
  const defaultConfig: AvatarManagerConfig = {
    defaultProvider: 'heygen',
    heygen: {
      enabled: true,
      token: ENV.HEYGEN_API_KEY,
      avatarId: ENV.HEYGEN_AVATAR_ID,
      voiceId: ENV.HEYGEN_VOICE_ID,
      quality: 'medium'
    },
    did: {
      enabled: true,
      clientKey: ENV.DID_CLIENT_KEY,
      agentId: ENV.DID_AGENT_ID,
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

  const finalConfig = { ...defaultConfig, ...config };

  // Initialize services
  useEffect(() => {
    console.log('Initializing Avatar App with config:', finalConfig);
    
    avatarManagerRef.current = new AvatarManager(finalConfig);
    streamManagerRef.current = new StreamManager();
    
    const manager = avatarManagerRef.current;
    
    // Setup avatar manager event listeners
    const handleConnecting = (event: CustomEvent) => {
      console.log('Avatar connecting:', event.detail);
      setConnectionStatus('connecting');
      setAppState(prev => ({ 
        ...prev, 
        isConnecting: true, 
        error: null 
      }));
    };

    const handleConnected = (event: CustomEvent) => {
      console.log('Avatar connected:', event.detail);
      setConnectionStatus('connected');
      setAppState(prev => ({ 
        ...prev, 
        isConnected: true,
        isConnecting: false,
        currentProvider: event.detail.provider,
        error: null 
      }));
    };

    const handleSpeaking = (event: CustomEvent) => {
      console.log('Avatar speaking:', event.detail);
      setAppState(prev => ({ 
        ...prev, 
        isSpeaking: true 
      }));
    };

    const handleSpeechEnded = (event: CustomEvent) => {
      console.log('Avatar speech ended:', event.detail);
      setAppState(prev => ({ 
        ...prev, 
        isSpeaking: false 
      }));
    };
    
    const handleStreamReady = async (event: CustomEvent) => {
      console.log('Stream ready:', event.detail);
      if (videoRef.current && streamManagerRef.current) {
        try {
          await streamManagerRef.current.setupProviderStream(
            event.detail.provider, 
            videoRef.current,
            event.detail.stream
          );
          console.log(`Stream setup completed for ${event.detail.provider}`);
        } catch (error) {
          console.error('Stream setup failed:', error);
        }
      }
    };

    const handleError = (event: CustomEvent) => {
      console.error('Avatar error:', event.detail);
      setConnectionStatus('error');
      setAppState(prev => ({ 
        ...prev, 
        error: event.detail.error?.message || 'Unknown error',
        isConnecting: false,
        isSpeaking: false
      }));
    };

    const handleSwitching = (event: CustomEvent) => {
      console.log('Provider switching:', event.detail);
      setAppState(prev => ({ 
        ...prev, 
        isConnecting: true 
      }));
    };

    const handleSwitched = (event: CustomEvent) => {
      console.log('Provider switched:', event.detail);
      setAppState(prev => ({ 
        ...prev, 
        currentProvider: event.detail.to,
        isConnecting: false
      }));
    };

    const handleDisconnected = () => {
      console.log('Avatar disconnected');
      setConnectionStatus('idle');
      setAppState(prev => ({ 
        ...prev, 
        isConnected: false,
        isConnecting: false,
        isSpeaking: false,
        currentProvider: null
      }));
    };

    // Add event listeners
    manager.addEventListener('connecting', handleConnecting as EventListener);
    manager.addEventListener('connected', handleConnected as EventListener);
    manager.addEventListener('speaking', handleSpeaking as EventListener);
    manager.addEventListener('speechEnded', handleSpeechEnded as EventListener);
    manager.addEventListener('streamReady', handleStreamReady as EventListener);
    manager.addEventListener('providerError', handleError as EventListener);
    manager.addEventListener('connectionFailed', handleError as EventListener);
    manager.addEventListener('switching', handleSwitching as EventListener);
    manager.addEventListener('switched', handleSwitched as EventListener);
    manager.addEventListener('disconnected', handleDisconnected as EventListener);

    return () => {
      // Cleanup
      manager.removeEventListener('connecting', handleConnecting as EventListener);
      manager.removeEventListener('connected', handleConnected as EventListener);
      manager.removeEventListener('speaking', handleSpeaking as EventListener);
      manager.removeEventListener('speechEnded', handleSpeechEnded as EventListener);
      manager.removeEventListener('streamReady', handleStreamReady as EventListener);
      manager.removeEventListener('providerError', handleError as EventListener);
      manager.removeEventListener('connectionFailed', handleError as EventListener);
      manager.removeEventListener('switching', handleSwitching as EventListener);
      manager.removeEventListener('switched', handleSwitched as EventListener);
      manager.removeEventListener('disconnected', handleDisconnected as EventListener);
      
      manager.disconnect();
      streamManagerRef.current?.cleanupAll();
    };
  }, []);

  // Event handlers
  const handleConnect = async () => {
    if (!avatarManagerRef.current) return;
    
    try {
      await avatarManagerRef.current.connect(finalConfig.defaultProvider);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleSpeak = async () => {
    if (!avatarManagerRef.current || !message.trim()) return;
    
    try {
      await avatarManagerRef.current.speak(message);
      setMessage('');
    } catch (error) {
      console.error('Speech failed:', error);
      setAppState(prev => ({ 
        ...prev, 
        error: (error as Error).message 
      }));
    }
  };

  const handleProviderSwitch = async (provider: string) => {
    if (!avatarManagerRef.current || provider === appState.currentProvider) return;
    
    try {
      await avatarManagerRef.current.switchProvider(provider);
      
      // Handle stream switching
      if (streamManagerRef.current) {
        await streamManagerRef.current.switchProvider(
          appState.currentProvider!, 
          provider
        );
      }
    } catch (error) {
      console.error('Provider switch failed:', error);
      setAppState(prev => ({ 
        ...prev, 
        error: (error as Error).message 
      }));
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSpeak();
    }
  };

  const clearError = () => {
    setAppState(prev => ({ ...prev, error: null }));
  };

  return (
    <div className="avatar-app">
      <header className="app-header">
        <div className="header-content">
          <h1>Modern Avatar Interface</h1>
          <div className="provider-selector">
            <button
              onClick={() => handleProviderSwitch('heygen')}
              className={`provider-btn ${appState.currentProvider === 'heygen' ? 'active' : ''}`}
              disabled={appState.isConnecting}
              data-testid="provider-heygen"
            >
              HeyGen
            </button>
            <button
              onClick={() => handleProviderSwitch('d-id')}
              className={`provider-btn ${appState.currentProvider === 'd-id' ? 'active' : ''}`}
              disabled={appState.isConnecting}
              data-testid="provider-did"
            >
              D-ID
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="video-section">
          <div className="video-container">
            <video
              ref={videoRef}
              className={`avatar-video ${appState.isSpeaking ? 'speaking' : ''}`}
              autoPlay
              muted={false}
              playsInline
              controls={false}
            />
            <div className="video-overlay">
              <div 
                className={`status-indicator ${connectionStatus}`}
                data-testid="status-indicator"
              >
                {appState.currentProvider?.toUpperCase() || 'DISCONNECTED'}
              </div>
              {appState.isSpeaking && (
                <div className="speaking-indicator">
                  <span className="pulse"></span>
                  Speaking...
                </div>
              )}
            </div>
            {!appState.isConnected && connectionStatus === 'idle' && (
              <div className="video-placeholder">
                <div className="placeholder-content">
                  <h3>Avatar Ready</h3>
                  <p>Click "Connect Avatar" to start</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="controls-section">
          <div className="controls-panel">
            {!appState.isConnected ? (
              <div className="connection-controls">
                <button
                  onClick={handleConnect}
                  disabled={appState.isConnecting}
                  className="connect-btn primary-button"
                  data-testid="connect-btn"
                >
                  {appState.isConnecting ? 'Connecting...' : 'Connect Avatar'}
                </button>
                {appState.error && (
                  <div className="error-message">
                    <span>{appState.error}</span>
                    <button onClick={clearError} className="error-close">×</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="message-controls">
                <div className="input-group">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter message to speak... (Press Enter to send)"
                    className="message-input"
                    rows={3}
                    maxLength={500}
                    data-testid="message-input"
                  />
                  <button
                    onClick={handleSpeak}
                    disabled={!message.trim() || appState.isSpeaking}
                    className="speak-btn primary-button"
                    data-testid="speak-btn"
                  >
                    {appState.isSpeaking ? 'Speaking...' : 'Speak'}
                  </button>
                </div>
                <div className="message-info">
                  <span>{message.length}/500 characters</span>
                </div>
                {appState.error && (
                  <div className="error-message">
                    <span>{appState.error}</span>
                    <button onClick={clearError} className="error-close">×</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};