// AudioRecorder - Handles voice recording with cost controls and cross-browser compatibility
class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.maxDuration = CONFIG.MAX_RECORDING_TIME; // Default 10 seconds for MVP
    this.recordingTimer = null;
    this.recordingStartTime = null;
    this.currentRecordingTime = 0;
    
    // Audio analysis for visual feedback
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    
    // Recording state
    this.isRecording = false;
    this.isInitialized = false;
    
    // Event callbacks
    this.onRecordingStart = null;
    this.onRecordingStop = null;
    this.onRecordingProgress = null;
    this.onAudioLevel = null;
    this.onError = null;
    
    // Browser support detection
    this.supportedMimeType = null;
    
    this.init();
  }

  async init() {
    try {
      Utils.info('Initializing AudioRecorder');
      
      // Check browser support
      const browserSupport = Utils.checkBrowserSupport();
      if (!browserSupport.isSupported) {
        throw new Error(`Browser not supported. Missing: ${browserSupport.missingFeatures.join(', ')}`);
      }
      
      // Get supported MIME type
      this.supportedMimeType = Utils.getSupportedMimeType();
      Utils.debug('Audio MIME type:', this.supportedMimeType);
      
      // Initialize audio context for level detection
      await this.initializeAudioContext();
      
      this.isInitialized = true;
      Utils.info('AudioRecorder initialized successfully');
      
    } catch (error) {
      Utils.error('AudioRecorder initialization failed:', error);
      this.handleError(error);
    }
  }

  async initializeAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioContext = new AudioContext();
        Utils.debug('Audio context initialized');
      }
    } catch (error) {
      Utils.warn('Failed to initialize audio context:', error);
      // Continue without audio analysis features
    }
  }

  async requestMicrophonePermission() {
    Utils.info('Requesting microphone permission');
    
    try {
      // Request permission first (this requires user gesture)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: CONFIG.AUDIO_CONSTRAINTS
      });
      
      // Test the stream and then stop it
      stream.getTracks().forEach(track => track.stop());
      
      Utils.info('Microphone permission granted');
      return true;
      
    } catch (error) {
      Utils.error('Microphone permission denied:', error);
      
      let errorMessage;
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = CONFIG.ERROR_MESSAGES.MICROPHONE_ACCESS_DENIED;
          break;
        case 'NotFoundError':
          errorMessage = CONFIG.ERROR_MESSAGES.MICROPHONE_NOT_FOUND;
          break;
        case 'NotSupportedError':
          errorMessage = CONFIG.ERROR_MESSAGES.BROWSER_NOT_SUPPORTED;
          break;
        default:
          errorMessage = CONFIG.ERROR_MESSAGES.RECORDING_FAILED;
      }
      
      this.handleError(new Error(errorMessage));
      return false;
    }
  }

  async startRecording() {
    if (!this.isInitialized) {
      throw new Error('AudioRecorder not initialized');
    }
    
    if (this.isRecording) {
      Utils.warn('Already recording, ignoring start request');
      return;
    }
    
    Utils.info('Starting audio recording');
    
    try {
      // Get microphone stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: CONFIG.AUDIO_CONSTRAINTS
      });
      
      // Set up MediaRecorder
      this.setupMediaRecorder();
      
      // Set up audio level monitoring
      this.setupAudioLevelMonitoring();
      
      // Start recording
      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      
      // Set up auto-stop timer for cost control
      this.recordingTimer = setTimeout(() => {
        Utils.info('Auto-stopping recording due to max duration limit');
        this.stopRecording();
      }, this.maxDuration);
      
      // Start progress updates
      this.startProgressUpdates();
      
      Utils.info(`Recording started (max ${Utils.formatDuration(this.maxDuration)})`);
      Utils.announce(CONFIG.SUCCESS_MESSAGES.RECORDING_STARTED);
      
      if (this.onRecordingStart) {
        this.onRecordingStart();
      }
      
    } catch (error) {
      Utils.error('Failed to start recording:', error);
      this.cleanup();
      this.handleError(error);
      throw error;
    }
  }

  setupMediaRecorder() {
    const options = this.supportedMimeType;
    this.mediaRecorder = new MediaRecorder(this.stream, options);
    
    // Event listeners
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
        Utils.debug('Audio chunk recorded:', Utils.formatFileSize(event.data.size));
      }
    };

    this.mediaRecorder.onstart = () => {
      Utils.debug('MediaRecorder started');
    };

    this.mediaRecorder.onstop = () => {
      Utils.debug('MediaRecorder stopped');
    };

    this.mediaRecorder.onerror = (event) => {
      Utils.error('MediaRecorder error:', event.error);
      this.handleError(new Error(`Recording failed: ${event.error.message}`));
    };
  }

  setupAudioLevelMonitoring() {
    if (!this.audioContext) return;
    
    try {
      // Create analyser for audio level detection
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      
      // Connect microphone to analyser
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);
      
      // Start level monitoring
      this.startLevelMonitoring();
      
      Utils.debug('Audio level monitoring setup complete');
      
    } catch (error) {
      Utils.warn('Failed to setup audio level monitoring:', error);
      // Continue without level monitoring
    }
  }

  startLevelMonitoring() {
    if (!this.analyser) return;
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateLevel = () => {
      if (!this.isRecording) return;
      
      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const level = (rms / 255) * 100; // Convert to percentage
      
      if (this.onAudioLevel) {
        this.onAudioLevel(level);
      }
      
      // Continue monitoring
      requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  }

  startProgressUpdates() {
    const updateProgress = () => {
      if (!this.isRecording) return;
      
      this.currentRecordingTime = Date.now() - this.recordingStartTime;
      const progress = (this.currentRecordingTime / this.maxDuration) * 100;
      
      if (this.onRecordingProgress) {
        this.onRecordingProgress({
          currentTime: this.currentRecordingTime,
          maxTime: this.maxDuration,
          progress: Math.min(progress, 100),
          timeRemaining: Math.max(0, this.maxDuration - this.currentRecordingTime)
        });
      }
      
      // Continue updates
      if (this.currentRecordingTime < this.maxDuration) {
        setTimeout(updateProgress, 100); // Update every 100ms
      }
    };
    
    updateProgress();
  }

  async stopRecording() {
    if (!this.isRecording) {
      Utils.warn('Not currently recording, ignoring stop request');
      return null;
    }
    
    Utils.info('Stopping audio recording');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Recording stop timeout'));
      }, 5000);
      
      this.mediaRecorder.onstop = () => {
        clearTimeout(timeout);
        
        try {
          // Create blob from chunks
          const mimeType = this.mediaRecorder.mimeType || this.supportedMimeType.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          
          const duration = Date.now() - this.recordingStartTime;
          
          Utils.info(`Recording stopped - Duration: ${Utils.formatDuration(duration)}, Size: ${Utils.formatFileSize(audioBlob.size)}`);
          Utils.announce(CONFIG.SUCCESS_MESSAGES.RECORDING_STOPPED);
          
          // Cleanup
          this.cleanup();
          
          if (this.onRecordingStop) {
            this.onRecordingStop({
              blob: audioBlob,
              duration: duration,
              size: audioBlob.size,
              mimeType: mimeType
            });
          }
          
          resolve(audioBlob);
          
        } catch (error) {
          Utils.error('Failed to create audio blob:', error);
          reject(error);
        }
      };
      
      // Stop the recording
      this.isRecording = false;
      this.mediaRecorder.stop();
      
      // Clear timer
      if (this.recordingTimer) {
        clearTimeout(this.recordingTimer);
        this.recordingTimer = null;
      }
    });
  }

  cleanup() {
    Utils.debug('Cleaning up audio recorder');
    
    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        Utils.debug('Stopped audio track');
      });
      this.stream = null;
    }
    
    // Disconnect audio context nodes
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    // Clear recording data
    this.audioChunks = [];
    this.mediaRecorder = null;
    this.currentRecordingTime = 0;
    this.recordingStartTime = null;
    
    // Clear timer
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }
    
    this.isRecording = false;
  }

  // Get current recording state
  getRecordingState() {
    return {
      isRecording: this.isRecording,
      isInitialized: this.isInitialized,
      currentTime: this.currentRecordingTime,
      maxDuration: this.maxDuration,
      hasStream: !!this.stream,
      hasMediaRecorder: !!this.mediaRecorder,
      supportedMimeType: this.supportedMimeType
    };
  }

  // Update recording settings
  updateSettings(settings) {
    if (settings.maxDuration && settings.maxDuration !== this.maxDuration) {
      this.maxDuration = Math.max(1000, Math.min(settings.maxDuration, 30000)); // Between 1-30 seconds
      Utils.info('Updated max recording time:', Utils.formatDuration(this.maxDuration));
    }
  }

  // Test microphone access (without recording)
  async testMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get available audio input devices
  async getAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      Utils.debug('Available audio inputs:', audioInputs.length);
      return audioInputs;
    } catch (error) {
      Utils.error('Failed to enumerate audio devices:', error);
      return [];
    }
  }

  handleError(error) {
    Utils.error('AudioRecorder error:', error);
    
    // Cleanup on error
    this.cleanup();
    
    if (this.onError) {
      this.onError(error);
    }
    
    Utils.reportError(error, { 
      component: 'AudioRecorder',
      isRecording: this.isRecording,
      hasStream: !!this.stream,
      browserSupport: Utils.checkBrowserSupport()
    });
  }

  // Destroy the recorder and cleanup all resources
  destroy() {
    Utils.info('Destroying AudioRecorder');
    
    // Stop recording if active
    if (this.isRecording) {
      this.stopRecording().catch(error => {
        Utils.error('Error stopping recording during destroy:', error);
      });
    }
    
    // Cleanup resources
    this.cleanup();
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(error => {
        Utils.error('Failed to close audio context:', error);
      });
    }
    
    this.isInitialized = false;
    Utils.info('AudioRecorder destroyed');
  }
}

// Export AudioRecorder class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioRecorder;
} else if (typeof window !== 'undefined') {
  window.AudioRecorder = AudioRecorder;
}