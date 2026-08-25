// Main application initialization and orchestration
class AvatarApp {
  constructor() {
    this.initialized = false;
    this.components = {
      videoManager: null,
      audioRecorder: null,
      webhookClient: null,
      costTracker: null,
      uiController: null,
      interactiveAvatar: null // Real-time streaming avatar
    };
    
    // Application state
    this.appState = {
      mode: CONFIG.AVATAR_MODES.INTERACTIVE, // Start in Interactive mode for real-time streaming
      isReady: false,
      hasError: false,
      lastError: null
    };
    
    // Bind methods to preserve context
    this.handleError = this.handleError.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    
    Utils.info('AvatarApp instance created');
  }

  async init() {
    try {
      Utils.info('Initializing Avatar Application...');
      
      // Check browser support first
      this.checkBrowserSupport();
      
      // Show loading state
      this.setLoadingState(true);
      
      // Initialize components in order
      await this.initializeComponents();
      
      // Wire up component interactions
      this.wireComponents();
      
      // Set up global event listeners
      this.setupGlobalEventListeners();
      
      // Set up error handling
      this.setupErrorHandling();
      
      // Start the application
      await this.start();
      
      this.initialized = true;
      this.appState.isReady = true;
      
      Utils.info('Avatar Application initialized successfully');
      
      // Hide loading state
      this.setLoadingState(false);
      
      // Announce readiness to screen readers
      Utils.announce('Avatar assistant ready. Press and hold the button to speak.');
      
    } catch (error) {
      Utils.error('Failed to initialize Avatar Application:', error);
      this.handleError(error);
    }
  }

  checkBrowserSupport() {
    const support = Utils.checkBrowserSupport();
    
    if (!support.isSupported) {
      const missingFeatures = support.missingFeatures.join(', ');
      const error = new Error(`${CONFIG.ERROR_MESSAGES.BROWSER_NOT_SUPPORTED}\n\nMissing features: ${missingFeatures}`);
      throw error;
    }
    
    Utils.info('Browser support check passed');
    
    // Log browser info for debugging
    Utils.debug('Browser info:', {
      userAgent: navigator.userAgent,
      browserName: Utils.getBrowserName(),
      isMobile: Utils.isMobileDevice(),
      isIOS: Utils.isIOS(),
      isAndroid: Utils.isAndroid()
    });
  }

  async initializeComponents() {
    Utils.info('Initializing application components...');
    
    try {
      // Initialize CostTracker first (no dependencies)
      Utils.debug('Initializing CostTracker...');
      this.components.costTracker = new CostTracker();
      
      // Initialize AudioRecorder (no dependencies)
      Utils.debug('Initializing AudioRecorder...');
      this.components.audioRecorder = new AudioRecorder();
      await this.waitForComponent(this.components.audioRecorder, 'isInitialized');
      
      // Initialize VideoManager (depends on DOM being ready)
      Utils.debug('Initializing VideoManager...');
      this.components.videoManager = new VideoManager(CONFIG.IDLE_VIDEO_URL, '#video-container');
      
      // Initialize WebhookClient (depends on CostTracker)
      Utils.debug('Initializing WebhookClient...');
      this.components.webhookClient = new WebhookClient(CONFIG.N8N_WEBHOOK_URL, this.components.costTracker);
      
      // Initialize UIController (depends on all other components)
      Utils.debug('Initializing UIController...');
      this.components.uiController = new UIController();
      
      // Initialize InteractiveAvatar (real-time streaming)
      Utils.debug('Initializing InteractiveAvatar...');
      try {
        this.components.interactiveAvatar = new InteractiveAvatar();
        
        // Set up interactive avatar event handlers
        this.components.interactiveAvatar.onSessionStart = (sessionId) => {
          Utils.info('Interactive Avatar session started:', sessionId);
          this.components.uiController.updateStatus('Avatar ready - Hold to speak', 'success');
        };
        
        this.components.interactiveAvatar.onSessionEnd = (reason) => {
          Utils.info('Interactive Avatar session ended:', reason);
          this.components.uiController.updateStatus('Click avatar to start conversation', 'info');
        };
        
        this.components.interactiveAvatar.onError = (error) => {
          Utils.error('Interactive Avatar error:', error);
          this.handleError(error);
        };
        
        this.components.interactiveAvatar.onStateChange = (state) => {
          this.handleAvatarStateChange(state);
        };
        
        // Initialize the interactive avatar
        await this.components.interactiveAvatar.init();
        
      } catch (error) {
        Utils.warn('InteractiveAvatar initialization failed - falling back to N8N mode:', error);
        this.components.interactiveAvatar = null;
        this.appState.mode = CONFIG.AVATAR_MODES.N8N;
      }
      
      Utils.info('All components initialized successfully');
      
    } catch (error) {
      Utils.error('Component initialization failed:', error);
      throw error;
    }
  }

  async waitForComponent(component, readyProperty, timeout = 10000) {
    const startTime = Date.now();
    
    while (!component[readyProperty] && Date.now() - startTime < timeout) {
      await Utils.delay(100);
    }
    
    if (!component[readyProperty]) {
      throw new Error(`Component failed to initialize within ${timeout}ms`);
    }
  }

  wireComponents() {
    Utils.info('Wiring component interactions...');
    
    // Inject dependencies into UIController
    this.components.uiController.setComponents(
      this.components.audioRecorder,
      this.components.videoManager,
      this.components.webhookClient,
      this.components.costTracker,
      this.components.interactiveAvatar
    );
    
    // Set up cross-component event handlers
    this.setupComponentEventHandlers();
    
    Utils.info('Component interactions wired successfully');
  }

  setupComponentEventHandlers() {
    // VideoManager error handling
    if (this.components.videoManager) {
      this.components.videoManager.onVideoError = (error) => {
        this.handleError(error, 'VideoManager');
      };
    }
    
    // AudioRecorder error handling
    if (this.components.audioRecorder) {
      this.components.audioRecorder.onError = (error) => {
        this.handleError(error, 'AudioRecorder');
      };
    }
    
    // WebhookClient error handling
    if (this.components.webhookClient) {
      this.components.webhookClient.onRequestError = (_request, error) => {
        this.handleError(error, 'WebhookClient');
      };
    }
    
    // CostTracker limit handling
    if (this.components.costTracker) {
      this.components.costTracker.onLimitReached = (message, _stats) => {
        Utils.warn('Usage limit reached:', message);
        // Additional app-level handling could go here
      };
    }
  }

  setupGlobalEventListeners() {
    Utils.debug('Setting up global event listeners...');
    
    // Window resize handling
    window.addEventListener('resize', Utils.throttle(this.handleResize, 250));
    
    // Visibility change handling (for mobile optimization)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Unload handling for cleanup
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
    
    // Error handling for unhandled promises
    window.addEventListener('unhandledrejection', (event) => {
      Utils.error('Unhandled promise rejection:', event.reason);
      this.handleError(new Error(`Unhandled promise rejection: ${event.reason}`));
      
      // Prevent default browser error handling
      event.preventDefault();
    });
    
    // Global error handling
    window.addEventListener('error', (event) => {
      Utils.error('Global error:', event.error);
      this.handleError(event.error || new Error(event.message));
    });
    
    // Mouse tracking for background effects (optional)
    if (!Utils.isMobileDevice()) {
      this.setupMouseTracking();
    }
  }

  setupMouseTracking() {
    // Track mouse position for subtle background effects
    document.addEventListener('mousemove', Utils.throttle((e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    }, 16)); // ~60fps
  }

  setupErrorHandling() {
    // Central error handler
    this.errorHandler = (error, source = 'Unknown') => {
      this.handleError(error, source);
    };
    
    // Configure components to use central error handler
    Object.values(this.components).forEach(component => {
      if (component && typeof component.setErrorHandler === 'function') {
        component.setErrorHandler(this.errorHandler);
      }
    });
  }

  async start() {
    Utils.info('Starting Avatar Application...');
    
    try {
      // Validate configuration
      const configValidation = CONFIG.validate();
      if (!configValidation.isValid) {
        Utils.warn('Configuration validation warnings:', configValidation.errors);
        
        // Show configuration errors to user if critical
        const criticalErrors = configValidation.errors.filter(error => 
          error.includes('WEBHOOK_URL') || error.includes('IDLE_VIDEO_URL')
        );
        
        if (criticalErrors.length > 0) {
          throw new Error(`Configuration error: ${criticalErrors.join(', ')}`);
        }
      }
      
      // Test critical connections
      await this.performStartupTests();
      
      // Start components that need to be running
      await this.startComponents();
      
      Utils.info('Avatar Application started successfully');
      
    } catch (error) {
      Utils.error('Failed to start Avatar Application:', error);
      throw error;
    }
  }

  async performStartupTests() {
    Utils.debug('Performing startup tests...');
    
    const tests = [];
    
    // Test microphone access (optional, don't fail startup)
    tests.push(
      this.components.audioRecorder.testMicrophone()
        .then(result => ({
          name: 'Microphone Test',
          success: result.success,
          error: result.error
        }))
        .catch(error => ({
          name: 'Microphone Test',
          success: false,
          error: error.message
        }))
    );
    
    // Test webhook connectivity (optional, don't fail startup)
    tests.push(
      this.components.webhookClient.testWebhook()
        .then(result => ({
          name: 'Webhook Test',
          success: result.success,
          error: result.error || `HTTP ${result.status}`
        }))
        .catch(error => ({
          name: 'Webhook Test',
          success: false,
          error: error.message
        }))
    );
    
    // Wait for all tests to complete
    const results = await Promise.all(tests);
    
    results.forEach(result => {
      if (result.success) {
        Utils.info(`✓ ${result.name} passed`);
      } else {
        Utils.warn(`⚠ ${result.name} failed: ${result.error}`);
      }
    });
    
    // Don't fail startup for optional tests, just log warnings
    Utils.debug('Startup tests completed');
  }

  async startComponents() {
    // VideoManager should already be started during initialization
    // Other components are event-driven and don't need explicit starting
    
    Utils.debug('All components started');
  }

  setLoadingState(isLoading) {
    const videoOverlay = document.getElementById('video-overlay');
    const statusMessage = document.getElementById('status-message');
    
    if (videoOverlay) {
      videoOverlay.style.display = isLoading ? 'flex' : 'none';
    }
    
    if (statusMessage) {
      statusMessage.textContent = isLoading ? 'Loading avatar...' : 'Ready to start';
    }
  }

  handleError(error, source = 'Unknown') {
    this.appState.hasError = true;
    this.appState.lastError = error;
    
    Utils.error(`Error from ${source}:`, error);
    
    // Report error for debugging
    Utils.reportError(error, {
      source,
      appState: { ...this.appState },
      components: Object.keys(this.components).reduce((acc, key) => {
        acc[key] = !!this.components[key];
        return acc;
      }, {})
    });
    
    // Show user-friendly error message
    if (this.components.uiController) {
      this.components.uiController.handleError(error);
    } else {
      // Fallback error display if UIController isn't available
      this.showFallbackError(error.message);
    }
  }

  showFallbackError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ef4444;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      max-width: calc(100vw - 40px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 10000);
  }

  handleResize() {
    Utils.debug('Window resized:', { width: window.innerWidth, height: window.innerHeight });
    
    // Notify components about resize if needed
    if (this.components.videoManager && typeof this.components.videoManager.handleResize === 'function') {
      this.components.videoManager.handleResize();
    }
  }

  handleVisibilityChange() {
    const isVisible = !document.hidden;
    
    Utils.debug('Visibility changed:', isVisible ? 'visible' : 'hidden');
    
    // Pause/resume components based on visibility
    if (this.components.videoManager) {
      if (isVisible) {
        this.components.videoManager.resumeCurrentVideo();
      } else {
        this.components.videoManager.pauseCurrentVideo();
      }
    }
  }

  // Public API methods
  async switchToInteractiveMode() {
    // FUTURE: Switch to Interactive Avatar mode
    Utils.info('Switching to Interactive Avatar mode (FUTURE FEATURE)');
    
    try {
      this.appState.mode = CONFIG.AVATAR_MODES.INTERACTIVE;
      
      // Initialize Interactive Avatar if not already done
      if (!this.components.interactiveAvatar) {
        const { default: InteractiveAvatar } = await import('./interactive-avatar.js');
        this.components.interactiveAvatar = new InteractiveAvatar();
      }
      
      // Start Interactive Avatar session
      await this.components.interactiveAvatar.startSession();
      
      Utils.info('Successfully switched to Interactive Avatar mode');
      
    } catch (error) {
      Utils.error('Failed to switch to Interactive Avatar mode:', error);
      this.appState.mode = CONFIG.AVATAR_MODES.N8N; // Fallback
      throw error;
    }
  }

  switchToN8NMode() {
    Utils.info('Switching to N8N mode');
    
    this.appState.mode = CONFIG.AVATAR_MODES.N8N;
    
    // Close Interactive Avatar session if active
    if (this.components.interactiveAvatar) {
      this.components.interactiveAvatar.closeSession();
    }
    
    Utils.info('Successfully switched to N8N mode');
  }

  getAppState() {
    return {
      ...this.appState,
      components: Object.keys(this.components).reduce((acc, key) => {
        const component = this.components[key];
        acc[key] = {
          initialized: !!component,
          ready: component && (component.isInitialized || component.isReady || true)
        };
        return acc;
      }, {})
    };
  }

  getUsageStats() {
    return this.components.costTracker ? this.components.costTracker.getDetailedStats() : null;
  }

  handleAvatarStateChange(state) {
    Utils.debug('Avatar state changed:', state);
    
    // Update UI based on avatar state
    switch (state) {
      case 'static':
        if (this.components.uiController) {
          this.components.uiController.updateStatus('Click avatar to start conversation', 'info');
          this.components.uiController.setRecordingEnabled(false);
        }
        break;
      case 'connecting':
        if (this.components.uiController) {
          this.components.uiController.updateStatus('Connecting to avatar...', 'processing');
          this.components.uiController.setRecordingEnabled(false);
        }
        break;
      case 'live':
        if (this.components.uiController) {
          this.components.uiController.updateStatus('Avatar ready - Hold to speak', 'success');
          this.components.uiController.setRecordingEnabled(true);
        }
        break;
      case 'talking':
        if (this.components.uiController) {
          this.components.uiController.updateStatus('Avatar is speaking...', 'processing');
          this.components.uiController.setRecordingEnabled(false);
        }
        break;
    }
  }

  // Cleanup method
  cleanup() {
    Utils.info('Cleaning up Avatar Application...');
    
    // Clean up components in reverse order
    const cleanupOrder = ['uiController', 'webhookClient', 'videoManager', 'audioRecorder', 'costTracker'];
    
    cleanupOrder.forEach(componentName => {
      const component = this.components[componentName];
      if (component && typeof component.destroy === 'function') {
        try {
          component.destroy();
          Utils.debug(`${componentName} cleaned up`);
        } catch (error) {
          Utils.error(`Failed to cleanup ${componentName}:`, error);
        }
      }
    });
    
    // Clean up event listeners
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    this.initialized = false;
    this.appState.isReady = false;
    
    Utils.info('Avatar Application cleanup completed');
  }

  // Static factory method
  static async create() {
    const app = new AvatarApp();
    await app.init();
    return app;
  }
}

// Auto-initialize when DOM is ready
let avatarApp = null;

async function initializeApp() {
  try {
    Utils.info('DOM ready, initializing Avatar Application...');
    avatarApp = await AvatarApp.create();
    
    // Make app globally available for debugging
    if (CONFIG.DEBUG) {
      window.avatarApp = avatarApp;
      Utils.debug('Avatar app available at window.avatarApp');
    }
    
  } catch (error) {
    Utils.error('Failed to initialize Avatar Application:', error);
    
    // Show fallback error message
    const errorMessage = error.message || 'Failed to initialize avatar application';
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = `Error: ${errorMessage}`;
      statusMessage.style.color = 'var(--error-color)';
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM is already ready
  initializeApp();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AvatarApp;
}