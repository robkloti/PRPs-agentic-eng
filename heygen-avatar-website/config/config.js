// Configuration constants and environment settings
const CONFIG = {
  // N8N Configuration (MVP Phase)
  N8N_WEBHOOK_URL: 'https://robloiski.app.n8n.cloud/webhook/f6295fb1-89fb-4ff2-ba82-7457b4eb9fd5',
  
  // Cost Controls
  MAX_RECORDING_TIME: 10000, // 10 seconds
  MAX_DAILY_INTERACTIONS: 50,
  DAILY_COST_LIMIT: 100.00,
  ESTIMATED_COST_PER_INTERACTION: 2.00,
  
  // Application Settings
  IDLE_VIDEO_URL: './assets/idle-avatar.mp4',
  RESPONSE_TIMEOUT: 180000, // 180 seconds (3 minutes) for HeyGen processing
  
  // UI Feedback Messages
  PROCESSING_MESSAGE: 'Processing your request... (HeyGen video generation takes 1-3 minutes)',
  COST_WARNING_MESSAGE: 'Approaching daily usage limit',
  
  // Interactive Avatar API (Real-time Streaming)
  HEYGEN_ACCESS_TOKEN: 'M2JiZDZhMmUwODdjNGYzNzkyNzdjMGIwYzhjODYwZjMtMTc1ODU5NTI4OA==', // Add your HeyGen access token here for real-time mode (get from HeyGen dashboard)
  HEYGEN_AVATAR_ID: '58e445efc9d24453baeeb9d89f1bfa0b',
  HEYGEN_KNOWLEDGE_ID: '', // Optional knowledge base ID
  INTERACTIVE_SESSION_TIMEOUT: 120000, // 2 minutes (default HeyGen timeout)
  STATIC_AVATAR_IMAGE: 'assets/fallback/avatar-poster.jpg',
  
  // Recording States
  RECORDING_STATES: {
    IDLE: 'idle',
    RECORDING: 'recording',
    PROCESSING: 'processing',
    PLAYING_RESPONSE: 'playing_response'
  },
  
  // Video States
  VIDEO_STATES: {
    LOADING: 'loading',
    PLAYING: 'playing',
    ERROR: 'error'
  },
  
  // Avatar Modes
  AVATAR_MODES: {
    N8N: 'n8n',           // MVP mode using N8N workflow
    INTERACTIVE: 'interactive', // Future: Interactive Avatar API
    FALLBACK: 'fallback'   // Error fallback mode
  },
  
  // Audio Recording Settings
  AUDIO_CONSTRAINTS: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 44100
  },
  
  // Supported MIME Types (in order of preference)
  SUPPORTED_MIME_TYPES: [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus'
  ],
  
  // Video Settings
  VIDEO_PRELOAD_STRATEGY: 'metadata', // 'none', 'metadata', 'auto'
  
  // Error Messages
  ERROR_MESSAGES: {
    MICROPHONE_ACCESS_DENIED: 'Microphone access is required for voice interaction. Please allow microphone access and try again.',
    MICROPHONE_NOT_FOUND: 'No microphone found. Please connect a microphone and refresh the page.',
    RECORDING_FAILED: 'Recording failed. Please check your microphone connection.',
    WEBHOOK_TIMEOUT: 'Request timeout - please try again (processing takes ~45 seconds)',
    WEBHOOK_FAILED: 'Unable to process your request. Please check your internet connection and try again.',
    VIDEO_LOAD_FAILED: 'Unable to load video response. Please try again.',
    DAILY_LIMIT_REACHED: 'Daily usage limit reached. Please try again tomorrow.',
    COST_LIMIT_REACHED: 'Daily cost limit reached. Please contact support if you need additional usage.',
    NETWORK_ERROR: 'Network error. Please check your internet connection.',
    BROWSER_NOT_SUPPORTED: 'Your browser does not support this feature. Please use a modern browser like Chrome, Firefox, Safari, or Edge.'
  },
  
  // Success Messages
  SUCCESS_MESSAGES: {
    RECORDING_STARTED: 'Recording... Speak now',
    RECORDING_STOPPED: 'Recording complete',
    PROCESSING_STARTED: 'Processing your request...',
    VIDEO_LOADED: 'Response ready'
  },
  
  // Processing Steps
  PROCESSING_STEPS: [
    { id: 'transcribing', label: 'Transcribing audio...', duration: 5000 },
    { id: 'thinking', label: 'AI thinking...', duration: 15000 },
    { id: 'generating', label: 'Generating response...', duration: 25000 }
  ],
  
  // Local Storage Keys
  STORAGE_KEYS: {
    USAGE_STATS: 'avatarUsage',
    USER_PREFERENCES: 'avatarPreferences',
    ERROR_LOG: 'avatarErrors'
  },
  
  // Development Settings
  DEBUG: false,
  LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
  
  // Accessibility Settings
  ACCESSIBILITY: {
    ANNOUNCE_STATE_CHANGES: true,
    KEYBOARD_NAVIGATION: true,
    HIGH_CONTRAST_MODE: false
  }
};

// Validation function to check if configuration is valid
CONFIG.validate = function() {
  const errors = [];
  
  if (!this.N8N_WEBHOOK_URL || this.N8N_WEBHOOK_URL.includes('your-')) {
    errors.push('N8N_WEBHOOK_URL must be configured');
  }
  
  if (!this.IDLE_VIDEO_URL || this.IDLE_VIDEO_URL.includes('your-')) {
    errors.push('IDLE_VIDEO_URL must be configured');
  }
  
  if (this.MAX_RECORDING_TIME < 3000 || this.MAX_RECORDING_TIME > 30000) {
    errors.push('MAX_RECORDING_TIME must be between 3 and 30 seconds');
  }
  
  if (this.MAX_DAILY_INTERACTIONS < 1) {
    errors.push('MAX_DAILY_INTERACTIONS must be at least 1');
  }
  
  if (this.DAILY_COST_LIMIT < 0) {
    errors.push('DAILY_COST_LIMIT cannot be negative');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

// Helper function to get cost usage percentage
CONFIG.getCostUsagePercentage = function(currentCost) {
  return Math.round((currentCost / this.DAILY_COST_LIMIT) * 100);
};

// Helper function to get interaction usage percentage
CONFIG.getInteractionUsagePercentage = function(currentInteractions) {
  return Math.round((currentInteractions / this.MAX_DAILY_INTERACTIONS) * 100);
};

// Helper function to check if usage is approaching limits
CONFIG.isApproachingLimits = function(stats) {
  const costPercentage = this.getCostUsagePercentage(stats.cost);
  const interactionPercentage = this.getInteractionUsagePercentage(stats.interactions);
  
  return costPercentage >= 80 || interactionPercentage >= 80;
};

// Initialize configuration validation on load
if (typeof window !== 'undefined') {
  const validation = CONFIG.validate();
  if (!validation.isValid && CONFIG.DEBUG) {
    console.warn('Configuration validation failed:', validation.errors);
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}