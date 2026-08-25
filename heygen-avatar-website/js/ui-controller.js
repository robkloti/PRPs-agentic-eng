// UIController - Manages UI state and user interactions
class UIController {
  constructor() {
    // DOM elements
    this.recordButton = document.getElementById('record-button');
    this.statusDisplay = document.getElementById('status-display');
    this.statusMessage = document.getElementById('status-message');
    this.progressBar = document.getElementById('progress-bar');
    this.usageStats = document.getElementById('usage-stats');
    this.usageCount = document.getElementById('usage-count');
    this.usageCost = document.getElementById('usage-cost');
    this.errorContainer = document.getElementById('error-container');
    this.errorText = document.getElementById('error-text');
    this.errorClose = document.getElementById('error-close');
    this.processingOverlay = document.getElementById('processing-overlay');
    this.processingTitle = document.getElementById('processing-title');
    this.processingSubtitle = document.getElementById('processing-subtitle');
    
    // Mode switcher elements
    this.n8nModeButton = document.getElementById('n8n-mode');
    this.interactiveModeButton = document.getElementById('interactive-mode');
    this.modeDescription = document.getElementById('mode-description');
    
    // Current state
    this.currentState = CONFIG.RECORDING_STATES.IDLE;
    this.currentMode = CONFIG.AVATAR_MODES.INTERACTIVE; // Start in interactive mode for real-time streaming
    this.isRecording = false;
    this.isProcessing = false;
    this.currentError = null;
    
    // Components (will be injected)
    this.audioRecorder = null;
    this.videoManager = null;
    this.webhookClient = null;
    this.costTracker = null;
    this.interactiveAvatar = null;
    
    // Event handlers
    this.recordingStartTime = null;
    this.recordingTimer = null;
    this.processingStepTimeout = null;
    
    // Touch/mouse state for press-and-hold
    this.isPressed = false;
    this.pressStartTime = null;
    
    this.init();
  }

  init() {
    Utils.info('Initializing UIController');
    
    this.setupEventListeners();
    this.initializeState();
    
    Utils.info('UIController initialized');
  }

  setupEventListeners() {
    // Record button - press and hold functionality
    this.setupRecordButton();
    
    // Error handling
    if (this.errorClose) {
      this.errorClose.addEventListener('click', () => {
        this.hideError();
      });
    }
    
    // Keyboard accessibility
    if (CONFIG.ACCESSIBILITY.KEYBOARD_NAVIGATION) {
      this.setupKeyboardNavigation();
    }
    
    // Settings changes
    this.setupSettingsListeners();
    
    // Mode switcher
    this.setupModeSwitcher();
  }

  setupRecordButton() {
    if (!this.recordButton) {
      Utils.error('Record button not found in DOM');
      return;
    }
    
    // Mouse events
    this.recordButton.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.startPressAndHold();
    });
    
    this.recordButton.addEventListener('mouseup', (e) => {
      e.preventDefault();
      this.endPressAndHold();
    });
    
    this.recordButton.addEventListener('mouseleave', (e) => {
      if (this.isPressed) {
        this.endPressAndHold();
      }
    });
    
    // Touch events (for mobile)
    this.recordButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startPressAndHold();
    });
    
    this.recordButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.endPressAndHold();
    });
    
    this.recordButton.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.endPressAndHold();
    });
    
    // Keyboard support
    Utils.enableKeyboardNavigation(this.recordButton, (e) => {
      if (e.key === ' ') {
        if (e.type === 'keydown' && !this.isPressed) {
          this.startPressAndHold();
        } else if (e.type === 'keyup') {
          this.endPressAndHold();
        }
      }
    });
    
    // Handle keyup for spacebar
    this.recordButton.addEventListener('keyup', (e) => {
      if (e.key === ' ' && this.isPressed) {
        this.endPressAndHold();
      }
    });
  }

  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Global keyboard shortcuts
      if (e.key === 'Escape') {
        if (this.currentError) {
          this.hideError();
        } else if (this.isRecording) {
          this.endPressAndHold();
        }
      }
    });
  }

  setupSettingsListeners() {
    // Recording time slider
    const recordingTimeSlider = document.getElementById('recording-time');
    const recordingTimeValue = document.getElementById('recording-time-value');
    
    if (recordingTimeSlider && recordingTimeValue) {
      recordingTimeSlider.addEventListener('input', (e) => {
        const seconds = parseInt(e.target.value);
        recordingTimeValue.textContent = seconds;
        
        if (this.audioRecorder) {
          this.audioRecorder.updateSettings({ maxDuration: seconds * 1000 });
        }
      });
    }
  }

  setupModeSwitcher() {
    if (!this.n8nModeButton || !this.interactiveModeButton) {
      Utils.warn('Mode switcher buttons not found in DOM');
      return;
    }
    
    // N8N mode button
    this.n8nModeButton.addEventListener('click', () => {
      this.switchMode(CONFIG.AVATAR_MODES.N8N);
    });
    
    // Interactive mode button
    this.interactiveModeButton.addEventListener('click', () => {
      this.switchMode(CONFIG.AVATAR_MODES.INTERACTIVE);
    });
    
    // Initialize with default mode
    this.updateModeDisplay();
    
    Utils.debug('Mode switcher initialized');
  }

  initializeState() {
    this.setState(CONFIG.RECORDING_STATES.IDLE);
    this.setStatus('Ready to start');
    this.updateUsageDisplay();
  }

  // Inject dependencies
  setComponents(audioRecorder, videoManager, webhookClient, costTracker, interactiveAvatar = null) {
    this.audioRecorder = audioRecorder;
    this.videoManager = videoManager;
    this.webhookClient = webhookClient;
    this.costTracker = costTracker;
    this.interactiveAvatar = interactiveAvatar;
    
    // Set up component event listeners
    this.setupComponentListeners();
    
    Utils.debug('Components injected into UIController');
  }

  setupComponentListeners() {
    // AudioRecorder events
    if (this.audioRecorder) {
      this.audioRecorder.onRecordingStart = () => {
        this.handleRecordingStart();
      };
      
      this.audioRecorder.onRecordingStop = (data) => {
        this.handleRecordingStop(data);
      };
      
      this.audioRecorder.onRecordingProgress = (progress) => {
        this.handleRecordingProgress(progress);
      };
      
      this.audioRecorder.onAudioLevel = (level) => {
        this.updateAudioLevel(level);
      };
      
      this.audioRecorder.onError = (error) => {
        this.handleError(error);
      };
    }
    
    // VideoManager events
    if (this.videoManager) {
      this.videoManager.onVideoLoaded = () => {
        this.setStatus('Ready to start');
        this.enableRecordButton();
      };
      
      this.videoManager.onVideoError = (error) => {
        this.handleError(error);
      };
      
      this.videoManager.onTransitionComplete = (type) => {
        if (type === 'idle') {
          this.setState(CONFIG.RECORDING_STATES.IDLE);
          this.setStatus('Ready for next interaction');
        }
      };
    }
    
    // WebhookClient events
    if (this.webhookClient) {
      this.webhookClient.onRequestStart = (request) => {
        this.handleProcessingStart(request);
      };
      
      this.webhookClient.onRequestProgress = (request) => {
        this.handleProcessingProgress(request);
      };
      
      this.webhookClient.onRequestComplete = (request, videoUrl) => {
        this.handleProcessingComplete(request, videoUrl);
      };
      
      this.webhookClient.onRequestError = (request, error) => {
        this.handleProcessingError(error);
      };
    }
    
    // CostTracker events
    if (this.costTracker) {
      this.costTracker.onUsageUpdate = (stats) => {
        this.updateUsageDisplay(stats);
      };
      
      this.costTracker.onWarning = (level, message, stats) => {
        this.showWarning(level, message);
      };
      
      this.costTracker.onLimitReached = (message, stats) => {
        this.handleLimitReached(message);
      };
    }
    
    // InteractiveAvatar events
    if (this.interactiveAvatar) {
      this.interactiveAvatar.onSessionStart = (sessionId) => {
        this.handleInteractiveSessionStart(sessionId);
      };
      
      this.interactiveAvatar.onSessionEnd = (reason) => {
        this.handleInteractiveSessionEnd(reason);
      };
      
      this.interactiveAvatar.onResponse = (response) => {
        this.handleInteractiveResponse(response);
      };
      
      this.interactiveAvatar.onError = (error) => {
        this.handleError(error);
      };
    }
  }

  // Press and hold functionality
  async startPressAndHold() {
    if (this.isPressed || this.isProcessing || this.isRecording) {
      Utils.debug('Ignoring press - already active');
      return;
    }
    
    Utils.debug('Starting press and hold');
    
    // Check if we can make a request
    if (this.costTracker && !this.costTracker.canMakeRequest()) {
      const stats = this.costTracker.getUsageStats();
      const message = stats.interactions >= stats.maxInteractions 
        ? CONFIG.ERROR_MESSAGES.DAILY_LIMIT_REACHED
        : CONFIG.ERROR_MESSAGES.COST_LIMIT_REACHED;
      this.showError(message);
      return;
    }
    
    this.isPressed = true;
    this.pressStartTime = Date.now();
    
    // Visual feedback
    this.recordButton.classList.add('pressed');
    this.setStatus('Starting recording...');
    
    try {
      // Request microphone permission if needed
      const hasPermission = await this.audioRecorder.requestMicrophonePermission();
      if (!hasPermission) {
        this.endPressAndHold();
        return;
      }
      
      // Start recording
      await this.audioRecorder.startRecording();
      
    } catch (error) {
      Utils.error('Failed to start recording:', error);
      this.handleError(error);
      this.endPressAndHold();
    }
  }

  async endPressAndHold() {
    if (!this.isPressed) return;
    
    Utils.debug('Ending press and hold');
    
    this.isPressed = false;
    this.recordButton.classList.remove('pressed');
    
    if (this.isRecording) {
      try {
        await this.audioRecorder.stopRecording();
      } catch (error) {
        Utils.error('Failed to stop recording:', error);
        this.handleError(error);
      }
    }
  }

  // Recording event handlers
  handleRecordingStart() {
    this.isRecording = true;
    this.setState(CONFIG.RECORDING_STATES.RECORDING);
    this.setStatus(CONFIG.SUCCESS_MESSAGES.RECORDING_STARTED);
    this.showProgress(0);
    
    // Visual feedback
    this.recordButton.classList.add('recording');
    
    Utils.announce(CONFIG.SUCCESS_MESSAGES.RECORDING_STARTED);
  }

  handleRecordingStop(data) {
    this.isRecording = false;
    this.recordButton.classList.remove('recording');
    this.hideProgress();
    
    this.setStatus(CONFIG.SUCCESS_MESSAGES.RECORDING_STOPPED);
    
    Utils.announce(CONFIG.SUCCESS_MESSAGES.RECORDING_STOPPED);
    
    // Process the audio
    this.processAudio(data.blob);
  }

  handleRecordingProgress(progress) {
    const percentage = Math.round(progress.progress);
    this.showProgress(percentage);
    
    const timeRemaining = Math.ceil(progress.timeRemaining / 1000);
    this.setStatus(`Recording... ${timeRemaining}s remaining`);
  }

  // Processing event handlers
  async processAudio(audioBlob) {
    // Prevent multiple processing requests
    if (this.isProcessing) {
      Utils.warn('Already processing a request, ignoring new one');
      return;
    }
    
    this.setState(CONFIG.RECORDING_STATES.PROCESSING);
    
    try {
      if (this.currentMode === CONFIG.AVATAR_MODES.INTERACTIVE) {
        // Use Interactive Avatar API for real-time responses
        await this.processAudioInteractive(audioBlob);
      } else {
        // Use N8N workflow for traditional processing
        await this.processAudioN8N(audioBlob);
      }
      
    } catch (error) {
      Utils.error('Failed to process audio:', error);
      this.handleError(error);
    }
  }

  async processAudioN8N(audioBlob) {
    this.setStatus(CONFIG.PROCESSING_MESSAGE);
    
    const responseVideoUrl = await this.webhookClient.sendAudioToN8N(audioBlob);
    
    // Switch to response video
    await this.videoManager.switchToResponse(responseVideoUrl);
    
    this.setState(CONFIG.RECORDING_STATES.PLAYING_RESPONSE);
    this.setStatus('Playing response...');
  }

  async processAudioInteractive(audioBlob) {
    this.setStatus('Processing with Interactive Avatar...');
    
    if (!this.interactiveAvatar) {
      throw new Error('Interactive Avatar not initialized');
    }
    
    // Start session if not already active
    if (!this.interactiveAvatar.isSessionActive) {
      await this.interactiveAvatar.startSession();
    }
    
    // Send audio to Interactive Avatar
    await this.interactiveAvatar.sendAudioMessage(audioBlob);
    
    this.setStatus('Waiting for real-time response...');
  }

  handleProcessingStart(request) {
    this.isProcessing = true;
    this.disableRecordButton();
    this.showProcessingOverlay();
    
    // Update button text to show it's disabled
    this.recordButton.querySelector('.button-text').textContent = 'Processing...';
    
    Utils.announce(CONFIG.PROCESSING_MESSAGE);
  }

  handleProcessingProgress(request) {
    this.updateProcessingStep(request);
  }

  handleProcessingComplete(request, videoUrl) {
    this.isProcessing = false;
    this.hideProcessingOverlay();
    this.enableRecordButton();
    
    // Reset button text
    this.recordButton.querySelector('.button-text').textContent = 'Hold to speak';
    
    Utils.info('Processing completed successfully');
  }

  handleProcessingError(error) {
    this.isProcessing = false;
    this.hideProcessingOverlay();
    this.enableRecordButton();
    
    // Reset button text
    this.recordButton.querySelector('.button-text').textContent = 'Hold to speak';
    
    this.handleError(error);
  }

  // Interactive Avatar event handlers
  handleInteractiveSessionStart(sessionId) {
    Utils.info('Interactive Avatar session started:', sessionId);
    this.setStatus('Interactive session active');
  }

  handleInteractiveSessionEnd(reason) {
    Utils.info('Interactive Avatar session ended:', reason);
    this.setStatus('Interactive session ended');
    
    // Reset to idle state
    this.setState(CONFIG.RECORDING_STATES.IDLE);
    this.isProcessing = false;
    this.enableRecordButton();
  }

  handleInteractiveResponse(response) {
    Utils.info('Interactive Avatar response:', response);
    
    if (response.type === 'start_talking') {
      this.setState(CONFIG.RECORDING_STATES.PLAYING_RESPONSE);
      this.setStatus('Avatar speaking...');
    } else if (response.type === 'stop_talking') {
      // Reset to ready state
      this.setState(CONFIG.RECORDING_STATES.IDLE);
      this.setStatus('Ready for next interaction');
      this.isProcessing = false;
      this.enableRecordButton();
    }
  }

  // Mode switching functionality
  async switchMode(newMode) {
    if (this.currentMode === newMode) {
      Utils.debug(`Already in ${newMode} mode`);
      return;
    }
    
    Utils.info(`Switching from ${this.currentMode} to ${newMode} mode`);
    
    // Prevent mode switching during active operations
    if (this.isRecording || this.isProcessing) {
      this.showError('Cannot switch modes during active recording or processing');
      return;
    }
    
    try {
      // Clean up current mode
      if (this.currentMode === CONFIG.AVATAR_MODES.INTERACTIVE && this.interactiveAvatar) {
        await this.interactiveAvatar.closeSession('mode_switch');
      }
      
      // Switch to new mode
      this.currentMode = newMode;
      
      // Initialize new mode if needed
      if (newMode === CONFIG.AVATAR_MODES.INTERACTIVE) {
        if (!this.interactiveAvatar) {
          this.showError('Interactive Avatar not available. Please check configuration.');
          this.currentMode = CONFIG.AVATAR_MODES.N8N; // Fall back to N8N
          this.updateModeDisplay();
          return;
        }
        
        if (!this.interactiveAvatar.isInitialized) {
          this.setStatus('Initializing Interactive Avatar...');
          try {
            await this.interactiveAvatar.init();
            this.setStatus('Interactive Avatar ready');
          } catch (error) {
            this.showError('Failed to initialize Interactive Avatar. Falling back to N8N mode.');
            this.currentMode = CONFIG.AVATAR_MODES.N8N;
            this.updateModeDisplay();
            return;
          }
        }
      }
      
      // Update UI
      this.updateModeDisplay();
      this.setStatus(newMode === CONFIG.AVATAR_MODES.INTERACTIVE 
        ? 'Real-time mode active - responses in 2-4 seconds' 
        : 'N8N mode active - full workflow responses');
      
      Utils.info(`Successfully switched to ${newMode} mode`);
      
    } catch (error) {
      Utils.error('Failed to switch modes:', error);
      this.handleError(error);
      
      // Revert to previous mode
      this.updateModeDisplay();
    }
  }

  updateModeDisplay() {
    if (!this.n8nModeButton || !this.interactiveModeButton || !this.modeDescription) {
      return;
    }
    
    // Update button states
    this.n8nModeButton.classList.toggle('active', this.currentMode === CONFIG.AVATAR_MODES.N8N);
    this.interactiveModeButton.classList.toggle('active', this.currentMode === CONFIG.AVATAR_MODES.INTERACTIVE);
    
    // Update description
    if (this.currentMode === CONFIG.AVATAR_MODES.INTERACTIVE) {
      this.modeDescription.textContent = 'Real-time Mode: 2-4 second responses with Interactive Avatar API';
    } else {
      this.modeDescription.textContent = 'N8N Mode: 1-3 minute responses with full ChatGPT + HeyGen workflow';
    }
    
    Utils.debug(`Mode display updated for ${this.currentMode} mode`);
  }

  // Processing overlay management
  showProcessingOverlay() {
    if (this.processingOverlay) {
      this.processingOverlay.style.display = 'flex';
      
      // Reset processing steps
      const steps = this.processingOverlay.querySelectorAll('.step');
      steps.forEach(step => {
        step.classList.remove('active', 'completed');
      });
      
      // Start first step
      if (steps.length > 0) {
        steps[0].classList.add('active');
      }
    }
  }

  hideProcessingOverlay() {
    if (this.processingOverlay) {
      this.processingOverlay.style.display = 'none';
    }
    
    if (this.processingStepTimeout) {
      clearTimeout(this.processingStepTimeout);
    }
  }

  updateProcessingStep(request) {
    if (!this.processingOverlay || !request.currentStep) return;
    
    const steps = this.processingOverlay.querySelectorAll('.step');
    const currentStepElement = document.getElementById(`step-${request.currentStep.id}`);
    
    if (currentStepElement) {
      // Mark previous steps as completed
      steps.forEach(step => {
        if (step !== currentStepElement && step.classList.contains('active')) {
          step.classList.remove('active');
          step.classList.add('completed');
        }
      });
      
      // Mark current step as active
      currentStepElement.classList.add('active');
    }
    
    // Update progress text
    if (this.processingTitle) {
      this.processingTitle.textContent = request.currentStep.label;
    }
  }

  // UI state management
  setState(newState) {
    const previousState = this.currentState;
    this.currentState = newState;
    
    document.body.setAttribute('data-state', newState);
    
    Utils.debug(`State changed: ${previousState} → ${newState}`);
  }

  setStatus(message) {
    if (this.statusMessage) {
      this.statusMessage.textContent = message;
    }
    
    Utils.debug('Status:', message);
  }

  showProgress(percentage) {
    if (this.progressBar) {
      this.progressBar.style.display = 'block';
      const fill = this.progressBar.querySelector('.progress-fill');
      if (fill) {
        fill.style.width = `${percentage}%`;
      }
    }
  }

  hideProgress() {
    if (this.progressBar) {
      this.progressBar.style.display = 'none';
    }
  }

  enableRecordButton() {
    if (this.recordButton) {
      this.recordButton.disabled = false;
      this.recordButton.setAttribute('aria-label', 'Press and hold to record your message');
    }
  }

  disableRecordButton() {
    if (this.recordButton) {
      this.recordButton.disabled = true;
      this.recordButton.setAttribute('aria-label', 'Recording disabled during processing');
    }
  }

  setRecordingEnabled(enabled) {
    if (enabled) {
      this.enableRecordButton();
    } else {
      this.disableRecordButton();
    }
  }

  updateAudioLevel(level) {
    // Visual feedback for audio level (optional)
    if (level > 20) { // Only show significant audio levels
      this.recordButton.style.setProperty('--audio-level', `${Math.min(level, 100)}%`);
    }
  }

  // Usage display
  updateUsageDisplay(stats = null) {
    if (!stats && this.costTracker) {
      stats = this.costTracker.getUsageStats();
    }
    
    if (!stats) return;
    
    const summary = this.costTracker ? this.costTracker.getUsageSummary() : null;
    
    if (this.usageCount && summary) {
      this.usageCount.textContent = summary.text;
      this.usageCount.className = `stat-value ${summary.status}`;
    }
    
    if (this.usageCost && summary) {
      this.usageCost.textContent = summary.cost;
      this.usageCost.className = `stat-value ${summary.status}`;
    }
    
    // Update container with warning class if needed
    if (this.usageStats) {
      this.usageStats.className = 'usage-stats';
      if (summary?.warning) {
        this.usageStats.classList.add(summary.warning);
      }
    }
  }

  // Error handling
  handleError(error) {
    this.currentError = error;
    this.showError(error.message);
    
    // Reset state
    this.setState(CONFIG.RECORDING_STATES.IDLE);
    this.isRecording = false;
    this.isProcessing = false;
    this.isPressed = false;
    
    // Reset UI
    this.recordButton?.classList.remove('pressed', 'recording');
    this.hideProcessingOverlay();
    this.hideProgress();
    this.enableRecordButton();
    
    Utils.reportError(error, { component: 'UIController', state: this.currentState });
  }

  showError(message) {
    if (this.errorContainer && this.errorText) {
      this.errorText.textContent = message;
      this.errorContainer.style.display = 'block';
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        this.hideError();
      }, 10000);
    }
    
    Utils.announce(`Error: ${message}`, 'assertive');
  }

  hideError() {
    if (this.errorContainer) {
      this.errorContainer.style.display = 'none';
    }
    
    this.currentError = null;
  }

  showWarning(level, message) {
    // For now, treat warnings like errors but with different styling
    // Could be enhanced with a separate warning system
    const warningPrefix = level === 'high' ? 'Critical Warning' : 'Warning';
    this.showError(`${warningPrefix}: ${message}`);
  }

  handleLimitReached(message) {
    this.showError(message);
    this.disableRecordButton();
    this.setStatus('Daily limit reached');
  }

  // Cleanup
  destroy() {
    Utils.info('Destroying UIController');
    
    // Clear timers
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
    }
    
    if (this.processingStepTimeout) {
      clearTimeout(this.processingStepTimeout);
    }
    
    // Reset state
    this.currentState = CONFIG.RECORDING_STATES.IDLE;
    this.isRecording = false;
    this.isProcessing = false;
    
    Utils.info('UIController destroyed');
  }
}

// Export UIController class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIController;
} else if (typeof window !== 'undefined') {
  window.UIController = UIController;
}