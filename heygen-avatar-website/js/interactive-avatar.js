// InteractiveAvatar - Future integration with HeyGen Interactive Avatar API
// This module provides a modular design for easy migration from N8N to Interactive Avatar

class InteractiveAvatar {
  constructor() {
    this.isInitialized = false;
    this.session = null;
    this.streamingAvatar = null;
    
    // Session management
    this.sessionId = null;
    this.isSessionActive = false;
    this.lastActivityTime = null;
    
    // Cost optimization
    this.sessionTimeout = CONFIG.INTERACTIVE_SESSION_TIMEOUT; // 5 minutes default
    this.sessionTimer = null;
    this.isIdleBetweenInteractions = true;
    
    // Audio/video streams
    this.mediaStream = null;
    this.audioContext = null;
    
    // Event callbacks
    this.onSessionStart = null;
    this.onSessionEnd = null;
    this.onResponse = null;
    this.onError = null;
    this.onCostUpdate = null;
    
    // Configuration
    this.avatarConfig = {
      avatarId: CONFIG.HEYGEN_AVATAR_ID,
      apiKey: CONFIG.HEYGEN_API_KEY,
      serverUrl: 'https://api.heygen.com/v1/streaming.avatar.start',
      quality: 'high',
      voice: {
        voiceId: 'default',
        rate: 1.0,
        pitch: 1.0
      }
    };
    
    Utils.info('InteractiveAvatar module initialized (FUTURE FEATURE)');
  }

  async init() {
    try {
      Utils.info('Initializing Interactive Avatar SDK (FUTURE IMPLEMENTATION)');
      
      // Check if HeyGen SDK is available
      if (typeof window.HeyGenStreamingSDK === 'undefined') {
        throw new Error('HeyGen Streaming SDK not loaded. Please include the SDK script.');
      }
      
      // Validate configuration
      this.validateConfiguration();
      
      // Initialize SDK
      await this.initializeSDK();
      
      this.isInitialized = true;
      Utils.info('Interactive Avatar SDK initialized successfully');
      
    } catch (error) {
      Utils.error('Failed to initialize Interactive Avatar SDK:', error);
      throw error;
    }
  }

  validateConfiguration() {
    if (!this.avatarConfig.apiKey) {
      throw new Error('HeyGen API key not configured');
    }
    
    if (!this.avatarConfig.avatarId) {
      throw new Error('Avatar ID not configured');
    }
    
    Utils.debug('Interactive Avatar configuration validated');
  }

  async initializeSDK() {
    try {
      Utils.debug('Initializing HeyGen Streaming SDK...');
      
      // Import HeyGen Streaming SDK
      if (!window.StreamingAvatar) {
        throw new Error('HeyGen Streaming SDK not loaded. Please include the SDK script.');
      }
      
      // Initialize SDK with configuration
      this.streamingAvatar = new window.StreamingAvatar({
        token: this.avatarConfig.apiKey
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
    
    // Session events
    this.streamingAvatar.on('avatar_start_talking', () => {
      Utils.debug('Avatar started talking');
      if (this.onResponse) {
        this.onResponse({ type: 'start_talking' });
      }
    });
    
    this.streamingAvatar.on('avatar_stop_talking', () => {
      Utils.debug('Avatar stopped talking');
      if (this.onResponse) {
        this.onResponse({ type: 'stop_talking' });
      }
    });
    
    this.streamingAvatar.on('stream_ready', () => {
      Utils.info('Interactive Avatar stream ready');
      this.isSessionActive = true;
      if (this.onSessionStart) {
        this.onSessionStart(this.sessionId);
      }
    });
    
    this.streamingAvatar.on('stream_disconnected', () => {
      Utils.info('Interactive Avatar stream disconnected');
      this.isSessionActive = false;
      if (this.onSessionEnd) {
        this.onSessionEnd('disconnected');
      }
    });
    
    this.streamingAvatar.on('error', (error) => {
      Utils.error('Interactive Avatar SDK error:', error);
      this.handleSDKError(error);
    });
  }

  async startSession() {
    if (this.isSessionActive) {
      Utils.warn('Interactive Avatar session already active');
      return this.sessionId;
    }
    
    Utils.info('Starting Interactive Avatar session');
    
    try {
      this.sessionId = Utils.generateId('interactive_session');
      
      // Start HeyGen Interactive Avatar session
      const sessionConfig = {
        avatarName: this.avatarConfig.avatarId,
        quality: this.avatarConfig.quality,
        avatarVoice: this.avatarConfig.voice.voiceId,
        knowledgeBase: '', // Optional knowledge base
        knowledgeId: ''    // Optional knowledge ID
      };
      
      await this.streamingAvatar.createStartAvatar(sessionConfig);
      
      this.lastActivityTime = Date.now();
      
      // Start session timeout management
      this.startSessionTimeout();
      
      Utils.info(`Interactive Avatar session started: ${this.sessionId}`);
      
      return this.sessionId;
      
    } catch (error) {
      Utils.error('Failed to start Interactive Avatar session:', error);
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
      
      // FUTURE IMPLEMENTATION: Close actual HeyGen session
      /*
      if (this.streamingAvatar && this.sessionId) {
        await this.streamingAvatar.closeSession(this.sessionId);
      }
      */
      
      // Clean up resources
      await this.cleanupSession();
      
      this.isSessionActive = false;
      this.sessionId = null;
      
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
    }
  }

  async sendAudioMessage(audioBlob) {
    if (!this.isSessionActive) {
      throw new Error('No active Interactive Avatar session');
    }
    
    Utils.info('Sending audio message to Interactive Avatar');
    
    try {
      // Update activity timestamp
      this.lastActivityTime = Date.now();
      
      // Reset session timeout
      this.resetSessionTimeout();
      
      // Convert audio blob to base64 for HeyGen API
      const audioBase64 = await this.blobToBase64(audioBlob);
      
      // Send audio to HeyGen Interactive Avatar
      await this.streamingAvatar.speak({
        text: '', // Empty text since we're using audio
        taskType: 'REPEAT', // or 'TALK' depending on your use case
        audio: audioBase64
      });
      
      Utils.info('Audio sent to Interactive Avatar');
      
      // The response will come through the event listeners
      return { success: true, sessionId: this.sessionId };
      
    } catch (error) {
      Utils.error('Failed to send audio to Interactive Avatar:', error);
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