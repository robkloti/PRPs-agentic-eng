// VideoManager - Handles seamless video transitions and future Interactive Avatar support
class VideoManager {
  constructor(idleVideoUrl, containerSelector) {
    this.idleVideoUrl = idleVideoUrl;
    this.container = document.querySelector(containerSelector);
    this.idleVideo = document.getElementById('idle-video');
    this.responseVideo = document.getElementById('response-video');
    this.videoOverlay = document.getElementById('video-overlay');
    
    this.currentState = CONFIG.VIDEO_STATES.LOADING;
    this.currentMode = CONFIG.AVATAR_MODES.N8N;
    this.interactiveSession = null; // For future Interactive Avatar
    this.isTransitioning = false;
    
    // Event callbacks
    this.onVideoLoaded = null;
    this.onVideoError = null;
    this.onTransitionComplete = null;
    
    this.init();
  }

  async init() {
    try {
      Utils.info('Initializing VideoManager');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Configure initial video settings
      this.configureVideos();
      
      // Load idle video
      await this.preloadIdleVideo();
      
      this.currentState = CONFIG.VIDEO_STATES.PLAYING;
      this.hideOverlay();
      
      Utils.info('VideoManager initialized successfully');
      
      if (this.onVideoLoaded) {
        this.onVideoLoaded();
      }
      
    } catch (error) {
      Utils.error('VideoManager initialization failed:', error);
      this.handleVideoError(error);
    }
  }

  configureVideos() {
    // Configure idle video
    this.idleVideo.muted = true;
    this.idleVideo.loop = true;
    this.idleVideo.playsInline = true;
    this.idleVideo.preload = CONFIG.VIDEO_PRELOAD_STRATEGY;
    
    // Set crossorigin for HeyGen URLs
    if (this.idleVideoUrl.includes('heygen') || this.idleVideoUrl.includes('cdn')) {
      this.idleVideo.crossOrigin = 'anonymous';
    }
    
    // Configure response video
    this.responseVideo.playsInline = true;
    this.responseVideo.preload = 'none';
    
    Utils.debug('Video elements configured');
  }

  setupEventListeners() {
    // Idle video events
    this.idleVideo.addEventListener('loadedmetadata', () => {
      Utils.debug('Idle video metadata loaded');
    });

    this.idleVideo.addEventListener('canplay', () => {
      Utils.debug('Idle video can play');
      this.playIdleVideo();
    });

    this.idleVideo.addEventListener('error', (event) => {
      Utils.error('Idle video error:', event);
      this.handleVideoError(new Error('Failed to load idle video'));
    });

    this.idleVideo.addEventListener('ended', () => {
      // Shouldn't happen with loop, but handle just in case
      Utils.debug('Idle video ended - restarting');
      this.playIdleVideo();
    });

    // Response video events
    this.responseVideo.addEventListener('loadedmetadata', () => {
      Utils.debug('Response video metadata loaded');
    });

    this.responseVideo.addEventListener('canplay', () => {
      Utils.debug('Response video can play');
    });

    this.responseVideo.addEventListener('ended', () => {
      Utils.debug('Response video ended - returning to idle');
      this.returnToIdle();
    });

    this.responseVideo.addEventListener('error', (event) => {
      Utils.error('Response video error:', event);
      this.handleVideoError(new Error('Failed to load response video'));
    });

    // Handle visibility change (for mobile optimization)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseCurrentVideo();
      } else {
        this.resumeCurrentVideo();
      }
    });
  }

  async preloadIdleVideo() {
    Utils.info('Preloading idle video:', this.idleVideoUrl);
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Idle video preload timeout'));
      }, 15000); // 15 second timeout

      const onLoad = () => {
        clearTimeout(timeoutId);
        this.idleVideo.removeEventListener('loadedmetadata', onLoad);
        this.idleVideo.removeEventListener('error', onError);
        resolve();
      };

      const onError = (event) => {
        clearTimeout(timeoutId);
        this.idleVideo.removeEventListener('loadedmetadata', onLoad);
        this.idleVideo.removeEventListener('error', onError);
        reject(new Error(`Failed to load idle video: ${event.message || 'Unknown error'}`));
      };

      this.idleVideo.addEventListener('loadedmetadata', onLoad);
      this.idleVideo.addEventListener('error', onError);
      
      // Set video source and trigger load
      this.idleVideo.src = this.idleVideoUrl;
      this.idleVideo.load();
    });
  }

  async playIdleVideo() {
    try {
      Utils.debug('Playing idle video');
      await this.idleVideo.play();
      this.showVideo(this.idleVideo);
    } catch (error) {
      Utils.error('Failed to play idle video:', error);
      
      // Try to play muted if autoplay failed
      if (error.name === 'NotAllowedError') {
        try {
          this.idleVideo.muted = true;
          await this.idleVideo.play();
          this.showVideo(this.idleVideo);
          Utils.info('Idle video playing (muted due to autoplay policy)');
        } catch (mutedError) {
          Utils.error('Failed to play idle video even when muted:', mutedError);
          this.handleVideoError(mutedError);
        }
      } else {
        this.handleVideoError(error);
      }
    }
  }

  async switchToResponse(responseVideoUrl) {
    if (this.isTransitioning) {
      Utils.warn('Already transitioning, ignoring switch request');
      return;
    }

    Utils.info('Switching to response video:', responseVideoUrl);
    this.isTransitioning = true;

    try {
      // Validate URL
      if (!Utils.isValidUrl(responseVideoUrl)) {
        throw new Error('Invalid response video URL');
      }

      // Preload response video while idle continues
      await this.preloadResponseVideo(responseVideoUrl);

      // Smooth transition from idle to response
      await this.fadeTransition(this.idleVideo, this.responseVideo);

      // Play response video
      await this.responseVideo.play();
      
      Utils.info('Successfully switched to response video');
      
      if (this.onTransitionComplete) {
        this.onTransitionComplete('response');
      }

    } catch (error) {
      Utils.error('Failed to switch to response video:', error);
      this.handleVideoError(error);
      this.returnToIdle(); // Fallback to idle
    } finally {
      this.isTransitioning = false;
    }
  }

  async preloadResponseVideo(url) {
    Utils.debug('Preloading response video:', url);
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Response video preload timeout'));
      }, 10000); // 10 second timeout

      const onLoad = () => {
        clearTimeout(timeoutId);
        this.responseVideo.removeEventListener('loadedmetadata', onLoad);
        this.responseVideo.removeEventListener('error', onError);
        Utils.debug('Response video preloaded successfully');
        resolve();
      };

      const onError = (event) => {
        clearTimeout(timeoutId);
        this.responseVideo.removeEventListener('loadedmetadata', onLoad);
        this.responseVideo.removeEventListener('error', onError);
        reject(new Error(`Failed to preload response video: ${event.message || 'Unknown error'}`));
      };

      this.responseVideo.addEventListener('loadedmetadata', onLoad);
      this.responseVideo.addEventListener('error', onError);

      // Set crossorigin for HeyGen URLs
      if (url.includes('heygen') || url.includes('cdn')) {
        this.responseVideo.crossOrigin = 'anonymous';
      }
      
      // Set video source and trigger load
      this.responseVideo.src = url;
      this.responseVideo.load();
    });
  }

  async fadeTransition(fromVideo, toVideo) {
    Utils.debug('Starting fade transition');
    
    return new Promise((resolve) => {
      // Ensure both videos are positioned correctly
      this.showVideo(toVideo);
      
      // Set initial opacity
      fromVideo.style.opacity = '1';
      toVideo.style.opacity = '0';
      
      // Animate transition
      const startTime = performance.now();
      const duration = 500; // 500ms transition
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-in-out)
        const easing = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        fromVideo.style.opacity = 1 - easing;
        toVideo.style.opacity = easing;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Transition complete
          this.hideVideo(fromVideo);
          fromVideo.pause();
          fromVideo.style.opacity = '';
          toVideo.style.opacity = '';
          
          Utils.debug('Fade transition complete');
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }

  async returnToIdle() {
    if (this.isTransitioning) {
      Utils.warn('Already transitioning, ignoring return to idle');
      return;
    }

    Utils.debug('Returning to idle video');
    this.isTransitioning = true;

    try {
      // Fade back to idle video
      await this.fadeTransition(this.responseVideo, this.idleVideo);
      
      // Start idle video if not already playing
      if (this.idleVideo.paused) {
        await this.playIdleVideo();
      }
      
      // Clean up response video
      this.responseVideo.src = '';
      
      Utils.info('Successfully returned to idle video');
      
      if (this.onTransitionComplete) {
        this.onTransitionComplete('idle');
      }

    } catch (error) {
      Utils.error('Failed to return to idle:', error);
      // Force show idle video as fallback
      this.showVideo(this.idleVideo);
      this.hideVideo(this.responseVideo);
    } finally {
      this.isTransitioning = false;
    }
  }

  showVideo(video) {
    video.classList.add('active');
    video.style.display = 'block';
  }

  hideVideo(video) {
    video.classList.remove('active');
    video.style.display = 'none';
  }

  pauseCurrentVideo() {
    if (this.responseVideo.classList.contains('active') && !this.responseVideo.paused) {
      this.responseVideo.pause();
      Utils.debug('Paused response video');
    } else if (this.idleVideo.classList.contains('active') && !this.idleVideo.paused) {
      this.idleVideo.pause();
      Utils.debug('Paused idle video');
    }
  }

  resumeCurrentVideo() {
    if (this.responseVideo.classList.contains('active') && this.responseVideo.paused) {
      this.responseVideo.play().catch(error => {
        Utils.error('Failed to resume response video:', error);
      });
      Utils.debug('Resumed response video');
    } else if (this.idleVideo.classList.contains('active') && this.idleVideo.paused) {
      this.playIdleVideo();
      Utils.debug('Resumed idle video');
    }
  }

  showOverlay() {
    this.videoOverlay.style.display = 'flex';
  }

  hideOverlay() {
    this.videoOverlay.style.display = 'none';
  }

  handleVideoError(error) {
    Utils.error('Video error occurred:', error);
    
    this.currentState = CONFIG.VIDEO_STATES.ERROR;
    this.showOverlay();
    
    const overlayText = this.videoOverlay.querySelector('p');
    if (overlayText) {
      overlayText.textContent = 'Video failed to load. Please refresh the page.';
    }

    if (this.onVideoError) {
      this.onVideoError(error);
    }

    Utils.reportError(error, { 
      component: 'VideoManager', 
      currentState: this.currentState,
      currentMode: this.currentMode
    });
  }

  // FUTURE: Interactive Avatar Session Management
  async startInteractiveSession(avatarId, apiKey) {
    Utils.info('Starting Interactive Avatar session (FUTURE FEATURE)');
    
    // This will replace N8N workflow in future
    // Keep same idle video until user speaks
    // Only start Interactive Avatar on voice input
    // Return to idle loop after conversation ends
    
    try {
      this.currentMode = CONFIG.AVATAR_MODES.INTERACTIVE;
      
      // Implementation will use HeyGen Streaming SDK
      // But maintain same UX flow: idle → active → idle
      
      // Placeholder for future implementation
      this.interactiveSession = {
        avatarId: avatarId,
        apiKey: apiKey,
        isActive: false,
        sessionId: Utils.generateId('session')
      };
      
      Utils.info('Interactive Avatar session ready (mock implementation)');
      
      return this.interactiveSession.sessionId;
      
    } catch (error) {
      Utils.error('Failed to start Interactive Avatar session:', error);
      this.currentMode = CONFIG.AVATAR_MODES.N8N; // Fallback to N8N mode
      throw error;
    }
  }

  async closeInteractiveSession() {
    if (this.interactiveSession) {
      Utils.info('Closing Interactive Avatar session');
      
      // Future: Close HeyGen streaming session
      this.interactiveSession = null;
      this.currentMode = CONFIG.AVATAR_MODES.N8N;
      
      // Return to idle
      await this.returnToIdle();
    }
  }

  // Get current video state for debugging
  getState() {
    return {
      currentState: this.currentState,
      currentMode: this.currentMode,
      isTransitioning: this.isTransitioning,
      idleVideoPaused: this.idleVideo.paused,
      responseVideoPaused: this.responseVideo.paused,
      interactiveSession: this.interactiveSession ? {
        sessionId: this.interactiveSession.sessionId,
        isActive: this.interactiveSession.isActive
      } : null
    };
  }

  // Cleanup method
  destroy() {
    Utils.info('Destroying VideoManager');
    
    // Pause and clean up videos
    this.idleVideo.pause();
    this.responseVideo.pause();
    this.idleVideo.src = '';
    this.responseVideo.src = '';
    
    // Close Interactive Avatar session if active
    if (this.interactiveSession) {
      this.closeInteractiveSession();
    }
    
    // Clear event listeners would be added here if needed
    // (Current implementation uses inline event listeners)
    
    Utils.info('VideoManager destroyed');
  }
}

// Export VideoManager class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoManager;
} else if (typeof window !== 'undefined') {
  window.VideoManager = VideoManager;
}