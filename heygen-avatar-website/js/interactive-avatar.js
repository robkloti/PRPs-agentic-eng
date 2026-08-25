// InteractiveAvatar - Real-time streaming integration with HeyGen Interactive Avatar API
// This module provides seamless transition from static avatar to live streaming

class InteractiveAvatar {
  constructor() {
    this.isInitialized = false;
    this.session = null;
    this.streamingAvatar = null;
    
    // Session management
    this.sessionId = null;
    this.isSessionActive = false;
    this.lastActivityTime = null;
    this.isConnecting = false;
    
    // Static to live transition
    this.isUsingStaticAvatar = true;
    this.staticImageElement = null;
    this.liveVideoElement = null;
    
    // Cost optimization
    this.sessionTimeout = CONFIG.INTERACTIVE_SESSION_TIMEOUT || 120000; // 2 minutes default
    this.sessionTimer = null;
    this.isIdleBetweenInteractions = true;
    
    // Audio/video streams
    this.mediaStream = null;
    this.audioContext = null;
    this.videoElement = null;
    
    // Event callbacks
    this.onSessionStart = null;
    this.onSessionEnd = null;
    this.onResponse = null;
    this.onError = null;
    this.onCostUpdate = null;
    this.onStateChange = null;
    
    // Configuration
    this.avatarConfig = {
      avatarName: CONFIG.HEYGEN_AVATAR_ID || 'default-avatar',
      quality: 'medium', // Balance speed vs quality for faster connection
      voice: {
        voiceId: 'default',
        rate: 1.0,
        pitch: 1.0
      },
      disableIdleTimeout: false, // Use default 2-min timeout
      knowledgeId: CONFIG.HEYGEN_KNOWLEDGE_ID || '',
      language: 'en'
    };
    
    Utils.info('InteractiveAvatar module initialized - Real-time streaming ready');
  }

  async init() {
    try {
      Utils.info('Initializing Interactive Avatar SDK');
      
      // Check if HeyGen SDK is available
      if (typeof window.StreamingAvatar === 'undefined') {
        throw new Error('HeyGen Streaming SDK not loaded. Please include the SDK script.');
      }
      
      // Validate configuration
      this.validateConfiguration();
      
      // Initialize video elements
      this.initializeVideoElements();
      
      // Show static avatar initially
      this.showStaticAvatar();
      
      // Initialize SDK (but don't start session yet)
      await this.initializeSDK();
      
      this.isInitialized = true;
      Utils.info('Interactive Avatar SDK initialized successfully');
      
    } catch (error) {
      Utils.error('Failed to initialize Interactive Avatar SDK:', error);
      throw error;
    }
  }

  validateConfiguration() {
    // For now, we'll use a token from environment or show error in UI
    // In production, you'd get this from your backend
    if (!CONFIG.HEYGEN_ACCESS_TOKEN) {
      Utils.warn('HeyGen access token not configured - interactive mode will be disabled');
      return false;
    }
    
    if (!this.avatarConfig.avatarName) {
      Utils.warn('Avatar name not configured - using default');
      this.avatarConfig.avatarName = 'default-avatar';
    }
    
    Utils.debug('Interactive Avatar configuration validated');
    return true;
  }

  initializeVideoElements() {
    // Get the video container
    const videoContainer = document.getElementById('video-container');
    if (!videoContainer) {
      throw new Error('Video container not found');
    }

    // Create static avatar image element
    this.staticImageElement = document.createElement('img');
    this.staticImageElement.className = 'avatar-image static-avatar';
    this.staticImageElement.src = CONFIG.STATIC_AVATAR_IMAGE || 'assets/fallback/avatar-poster.jpg';
    this.staticImageElement.alt = 'Interactive Avatar - Click to start conversation';
    this.staticImageElement.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      cursor: pointer;
      transition: opacity 0.3s ease;
    `;

    // Create live video element
    this.liveVideoElement = document.createElement('video');
    this.liveVideoElement.className = 'avatar-video live-avatar';
    this.liveVideoElement.autoplay = true;
    this.liveVideoElement.muted = false;
    this.liveVideoElement.playsInline = true;
    this.liveVideoElement.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    // Add click handler to static image to start live session
    this.staticImageElement.addEventListener('click', () => {
      this.startLiveSession();
    });

    videoContainer.appendChild(this.staticImageElement);
    videoContainer.appendChild(this.liveVideoElement);
    
    Utils.debug('Video elements initialized');
  }

  showStaticAvatar() {
    if (this.staticImageElement) {
      this.staticImageElement.style.opacity = '1';
    }
    if (this.liveVideoElement) {
      this.liveVideoElement.style.opacity = '0';
    }
    this.isUsingStaticAvatar = true;
    
    // Update UI to show "Click to talk" state
    this.updateUIState('static');
  }

  showLiveAvatar() {
    if (this.staticImageElement) {
      this.staticImageElement.style.opacity = '0';
    }
    if (this.liveVideoElement) {
      this.liveVideoElement.style.opacity = '1';
    }
    this.isUsingStaticAvatar = false;
    
    // Update UI to show live state
    this.updateUIState('live');
  }

  updateUIState(state) {
    const statusMessage = document.getElementById('status-message');
    const recordButton = document.getElementById('record-button');
    
    switch (state) {
      case 'static':
        if (statusMessage) statusMessage.textContent = 'Click avatar to start conversation';
        if (recordButton) recordButton.disabled = true;
        break;
      case 'connecting':
        if (statusMessage) statusMessage.textContent = 'Connecting to avatar...';
        if (recordButton) recordButton.disabled = true;
        break;
      case 'live':
        if (statusMessage) statusMessage.textContent = 'Avatar ready - Hold to speak';
        if (recordButton) recordButton.disabled = false;
        break;
      case 'talking':
        if (statusMessage) statusMessage.textContent = 'Avatar is speaking...';
        if (recordButton) recordButton.disabled = true;
        break;
    }

    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  async initializeSDK() {
    try {
      Utils.debug('Initializing HeyGen Streaming SDK...');
      
      // Import HeyGen Streaming SDK
      if (!window.StreamingAvatar) {
        throw new Error('HeyGen Streaming SDK not loaded. Please include the SDK script.');
      }
      
      // Initialize SDK with access token (not API key)
      this.streamingAvatar = new window.StreamingAvatar({
        token: CONFIG.HEYGEN_ACCESS_TOKEN
      });
      
      // Set up SDK event listeners
      this.setupSDKEventListeners();
      
      Utils.debug('HeyGen Streaming SDK initialized');
      
    } catch (error) {
      Utils.error('SDK initialization failed:', error);
      throw error;
    }
  }

  setupSDKEventListeners() {
    if (!this.streamingAvatar) return;
    
    Utils.debug('Setting up HeyGen SDK event listeners');
    
    // Import streaming events
    const { StreamingEvents } = window;
    
    // Avatar talking events
    this.streamingAvatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
      Utils.debug('Avatar started talking');
      this.updateUIState('talking');
      if (this.onResponse) {
        this.onResponse({ type: 'start_talking' });
      }
    });
    
    this.streamingAvatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
      Utils.debug('Avatar stopped talking');
      this.updateUIState('live');
      if (this.onResponse) {
        this.onResponse({ type: 'stop_talking' });
      }
    });
    
    // Stream lifecycle events
    this.streamingAvatar.on(StreamingEvents.STREAM_READY, (event) => {
      Utils.info('Interactive Avatar stream ready');
      this.isSessionActive = true;
      this.isConnecting = false;
      
      // Connect video element to stream
      if (this.liveVideoElement && event.mediaStream) {
        this.liveVideoElement.srcObject = event.mediaStream;
      }
      
      // Transition to live avatar
      this.showLiveAvatar();
      
      if (this.onSessionStart) {
        this.onSessionStart(this.sessionId);
      }
    });
    
    this.streamingAvatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      Utils.info('Interactive Avatar stream disconnected');
      this.isSessionActive = false;
      this.isConnecting = false;
      
      // Return to static avatar
      this.showStaticAvatar();
      
      if (this.onSessionEnd) {
        this.onSessionEnd('disconnected');
      }
    });

    // Voice chat events
    this.streamingAvatar.on(StreamingEvents.USER_START, () => {
      Utils.debug('User started speaking');
      this.updateUIState('live');
    });

    this.streamingAvatar.on(StreamingEvents.USER_STOP, () => {
      Utils.debug('User stopped speaking');
    });
    
    // Error handling
    this.streamingAvatar.on(StreamingEvents.STREAM_ERROR, (error) => {
      Utils.error('Interactive Avatar stream error:', error);
      this.isConnecting = false;
      this.showStaticAvatar();
      this.handleSDKError(error);
    });
  }

  // Method called when user clicks static avatar to start live session
  async startLiveSession() {
    if (this.isConnecting || this.isSessionActive) {
      Utils.warn('Session already starting or active');
      return;
    }

    this.isConnecting = true;
    this.updateUIState('connecting');
    
    try {
      await this.startSession();
    } catch (error) {
      this.isConnecting = false;
      this.showStaticAvatar();
      throw error;
    }
  }

  async startSession() {
    if (this.isSessionActive) {
      Utils.warn('Interactive Avatar session already active');
      return this.sessionId;
    }
    
    Utils.info('Starting Interactive Avatar session');
    
    try {
      this.sessionId = Utils.generateId('interactive_session');
      
      // Start HeyGen Interactive Avatar session with optimized config
      const sessionConfig = {
        avatarName: this.avatarConfig.avatarName,
        quality: this.avatarConfig.quality, // 'medium' for faster connection
        voice: {
          voiceId: this.avatarConfig.voice.voiceId
        },
        knowledgeId: this.avatarConfig.knowledgeId,
        language: this.avatarConfig.language,
        disableIdleTimeout: this.avatarConfig.disableIdleTimeout
      };
      
      // Create and start avatar session
      await this.streamingAvatar.createStartAvatar(sessionConfig);
      
      this.lastActivityTime = Date.now();
      
      // Start session timeout management
      this.startSessionTimeout();
      
      Utils.info(`Interactive Avatar session started: ${this.sessionId}`);
      
      return this.sessionId;
      
    } catch (error) {
      Utils.error('Failed to start Interactive Avatar session:', error);
      this.isConnecting = false;
      this.handleError(error);
      throw error;
    }
  }

  async closeSession(reason = 'user_initiated') {
    if (!this.isSessionActive) {
      Utils.warn('No active Interactive Avatar session to close');
      return;
    }
    
    Utils.info(`Closing Interactive Avatar session: ${reason}`);
    
    try {
      // Clear session timeout
      if (this.sessionTimer) {
        clearTimeout(this.sessionTimer);
        this.sessionTimer = null;
      }
      
      // Close voice chat if active
      if (this.isVoiceChatActive && this.streamingAvatar) {
        await this.streamingAvatar.closeVoiceChat();
        this.isVoiceChatActive = false;
      }
      
      // Close HeyGen streaming session
      if (this.streamingAvatar) {
        await this.streamingAvatar.interrupt();
      }
      
      // Clean up resources
      await this.cleanupSession();
      
      this.isSessionActive = false;
      this.sessionId = null;
      
      // Return to static avatar
      this.showStaticAvatar();
      
      Utils.info('Interactive Avatar session closed successfully');
      
      if (this.onSessionEnd) {
        this.onSessionEnd(reason);
      }
      
    } catch (error) {
      Utils.error('Failed to close Interactive Avatar session:', error);
      // Force cleanup even if close fails
      await this.cleanupSession();
      this.isSessionActive = false;
      this.sessionId = null;
      this.showStaticAvatar();
    }
  }

  async sendAudioMessage(audioBlob) {
    if (!this.isSessionActive) {
      // If not active, start a live session first
      await this.startLiveSession();
      // Wait a moment for session to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    Utils.info('Sending audio message to Interactive Avatar');
    
    try {
      // Update activity timestamp
      this.lastActivityTime = Date.now();
      
      // Reset session timeout
      this.resetSessionTimeout();
      
      // Start voice chat mode for real-time audio handling
      if (!this.isVoiceChatActive) {
        await this.streamingAvatar.startVoiceChat({
          useSilencePrompt: true,
          isInputAudioMuted: false
        });
        this.isVoiceChatActive = true;
      }
      
      // For real-time streaming, we use the voice chat mode
      // The audio will be automatically processed through the WebRTC connection
      // No need to manually send audio blobs
      
      Utils.info('Voice chat active - audio being processed in real-time');
      
      // The response will come through the event listeners
      return { success: true, sessionId: this.sessionId };
      
    } catch (error) {
      Utils.error('Failed to send audio to Interactive Avatar:', error);
      this.handleError(error);
      throw error;
    }
  }

  async sendTextMessage(text) {
    if (!this.isSessionActive) {
      await this.startLiveSession();
      // Wait a moment for session to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    Utils.info('Sending text message to Interactive Avatar:', text);
    
    try {
      // Update activity timestamp
      this.lastActivityTime = Date.now();
      
      // Reset session timeout
      this.resetSessionTimeout();
      
      // Send text to avatar
      await this.streamingAvatar.speak({
        text: text,
        taskType: 'TALK'
      });
      
      Utils.info('Text sent to Interactive Avatar');
      
      return { success: true, sessionId: this.sessionId };
      
    } catch (error) {
      Utils.error('Failed to send text to Interactive Avatar:', error);
      this.handleError(error);
      throw error;
    }
  }
  
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Remove data:audio/... prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  startSessionTimeout() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    
    this.sessionTimer = setTimeout(() => {
      const inactiveTime = Date.now() - this.lastActivityTime;
      const timeoutReached = inactiveTime >= this.sessionTimeout;
      
      if (timeoutReached) {
        Utils.info('Interactive Avatar session timeout reached');
        this.closeSession('timeout');
      } else {
        // Reschedule timeout check
        this.startSessionTimeout();
      }
    }, Math.min(this.sessionTimeout, 60000)); // Check at least every minute
  }

  resetSessionTimeout() {
    this.lastActivityTime = Date.now();
    this.startSessionTimeout();
  }

  async cleanupSession() {
    Utils.debug('Cleaning up Interactive Avatar session resources');
    
    // Clean up media streams
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    // Clean up audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }

  // Cost optimization methods
  async pauseSession() {
    if (!this.isSessionActive) return;
    
    Utils.info('Pausing Interactive Avatar session to save costs');
    
    // FUTURE: Implement session pause/resume if supported by HeyGen
    // For now, we'll close and restart sessions as needed
    await this.closeSession('paused');
  }

  async resumeSession() {
    if (this.isSessionActive) return;
    
    Utils.info('Resuming Interactive Avatar session');
    
    // Restart session
    await this.startSession();
  }

  // Session state management for cost optimization
  async optimizeForIdlePeriod() {
    if (!this.isSessionActive) return;
    
    const idleTime = Date.now() - this.lastActivityTime;
    const shouldPause = idleTime > 30000; // Pause after 30 seconds of inactivity
    
    if (shouldPause && this.isIdleBetweenInteractions) {
      await this.pauseSession();
    }
  }

  // Event handlers
  handleSessionStarted(sessionData) {
    Utils.info('Interactive Avatar session started:', sessionData);
    
    this.sessionId = sessionData.session_id;
    this.isSessionActive = true;
    
    if (this.onSessionStart) {
      this.onSessionStart(sessionData);
    }
  }

  handleAvatarResponse(response) {
    Utils.info('Received Interactive Avatar response:', response);
    
    this.lastActivityTime = Date.now();
    
    if (this.onResponse) {
      this.onResponse(response);
    }
  }

  handleSessionEnded(reason) {
    Utils.info('Interactive Avatar session ended:', reason);
    
    this.isSessionActive = false;
    this.sessionId = null;
    
    if (this.onSessionEnd) {
      this.onSessionEnd(reason);
    }
  }

  handleSDKError(error) {
    Utils.error('Interactive Avatar SDK error:', error);
    this.handleError(error);
  }

  handleError(error) {
    if (this.onError) {
      this.onError(error);
    }
    
    Utils.reportError(error, {
      component: 'InteractiveAvatar',
      sessionId: this.sessionId,
      isSessionActive: this.isSessionActive
    });
  }

  // Configuration methods
  updateAvatarConfig(config) {
    this.avatarConfig = { ...this.avatarConfig, ...config };
    Utils.info('Interactive Avatar configuration updated');
  }

  updateVoiceConfig(voiceConfig) {
    this.avatarConfig.voice = { ...this.avatarConfig.voice, ...voiceConfig };
    Utils.info('Interactive Avatar voice configuration updated');
  }

  // Status methods
  getSessionStatus() {
    return {
      isInitialized: this.isInitialized,
      isSessionActive: this.isSessionActive,
      sessionId: this.sessionId,
      lastActivityTime: this.lastActivityTime,
      sessionDuration: this.isSessionActive 
        ? Date.now() - this.lastActivityTime 
        : 0,
      configuration: { ...this.avatarConfig }
    };
  }

  getCostEstimate() {
    const status = this.getSessionStatus();
    const durationMinutes = Math.ceil(status.sessionDuration / 60000);
    
    // FUTURE: Get actual HeyGen pricing
    const costPerMinute = 0.10; // Placeholder cost
    const estimatedCost = durationMinutes * costPerMinute;
    
    return {
      sessionDuration: status.sessionDuration,
      durationMinutes: durationMinutes,
      costPerMinute: costPerMinute,
      estimatedCost: estimatedCost
    };
  }

  // Testing methods
  async testConnection() {
    try {
      Utils.info('Testing Interactive Avatar connection');
      
      // FUTURE: Implement actual connection test
      /*
      const testResult = await this.streamingAvatar.testConnection();
      return testResult;
      */
      
      // Placeholder test
      await Utils.delay(1000);
      
      return {
        success: true,
        message: 'Connection test successful (mock)',
        latency: 150 // ms
      };
      
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  // Migration helpers
  static isSDKAvailable() {
    return typeof window.HeyGenStreamingSDK !== 'undefined';
  }

  static getRequiredSDKVersion() {
    return '1.0.0'; // Minimum required SDK version
  }

  static async loadSDK() {
    // FUTURE: Dynamic SDK loading
    Utils.info('Loading HeyGen Streaming SDK (FUTURE IMPLEMENTATION)');
    
    // Placeholder for SDK loading
    return new Promise((resolve, reject) => {
      // In real implementation, this would load the SDK script
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });
  }

  // Cleanup
  async destroy() {
    Utils.info('Destroying Interactive Avatar module');
    
    // Close active session
    if (this.isSessionActive) {
      await this.closeSession('destroy');
    }
    
    // Clean up resources
    await this.cleanupSession();
    
    // Clear timers
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    
    // Reset state
    this.isInitialized = false;
    this.streamingAvatar = null;
    
    // Clear callbacks
    this.onSessionStart = null;
    this.onSessionEnd = null;
    this.onResponse = null;
    this.onError = null;
    this.onCostUpdate = null;
    
    Utils.info('Interactive Avatar module destroyed');
  }
}

// Export InteractiveAvatar class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InteractiveAvatar;
} else if (typeof window !== 'undefined') {
  window.InteractiveAvatar = InteractiveAvatar;
}