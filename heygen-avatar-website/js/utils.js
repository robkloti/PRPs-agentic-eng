// Utility functions for the avatar application

class Utils {
  // Logging utility with different levels
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logLevels = ['debug', 'info', 'warn', 'error'];
    const configLevel = CONFIG?.LOG_LEVEL || 'info';
    const currentLevelIndex = logLevels.indexOf(level);
    const configLevelIndex = logLevels.indexOf(configLevel);
    
    // Only log if current level is at or above config level
    if (currentLevelIndex >= configLevelIndex) {
      const logMethod = console[level] || console.log;
      if (data) {
        logMethod(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data);
      } else {
        logMethod(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
      }
    }
  }

  static debug(message, data) {
    this.log('debug', message, data);
  }

  static info(message, data) {
    this.log('info', message, data);
  }

  static warn(message, data) {
    this.log('warn', message, data);
  }

  static error(message, data) {
    this.log('error', message, data);
  }

  // Format duration in milliseconds to human readable format
  static formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }

  // Format file size in bytes to human readable format
  static formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2);
    
    return `${size} ${sizes[i]}`;
  }

  // Format currency
  static formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Debounce function for limiting rapid function calls
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle function for limiting function calls
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Check if device supports required features
  static checkBrowserSupport() {
    const support = {
      mediaRecorder: 'MediaRecorder' in window,
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      webAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
      video: 'HTMLVideoElement' in window,
      localStorage: 'localStorage' in window,
      fetch: 'fetch' in window
    };

    const isSupported = Object.values(support).every(Boolean);
    
    Utils.debug('Browser support check:', support);
    
    return {
      isSupported,
      support,
      missingFeatures: Object.entries(support)
        .filter(([_, supported]) => !supported)
        .map(([feature]) => feature)
    };
  }

  // Get supported MIME type for audio recording
  static getSupportedMimeType() {
    for (const mimeType of CONFIG.SUPPORTED_MIME_TYPES) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mimeType)) {
        Utils.debug('Selected MIME type:', mimeType);
        return { mimeType };
      }
    }
    
    Utils.warn('No supported MIME type found, using default');
    return {};
  }

  // Create a blob URL from blob data
  static createBlobUrl(blob) {
    try {
      return URL.createObjectURL(blob);
    } catch (error) {
      Utils.error('Failed to create blob URL:', error);
      throw new Error('Unable to create blob URL');
    }
  }

  // Revoke a blob URL to free memory
  static revokeBlobUrl(url) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      Utils.debug('Revoked blob URL:', url);
    }
  }

  // Wait for a specified amount of time
  static async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Retry a function with exponential backoff
  static async retry(fn, maxAttempts = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        Utils.debug(`Attempt ${attempt}/${maxAttempts}`);
        return await fn();
      } catch (error) {
        lastError = error;
        Utils.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          Utils.debug(`Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }
    
    throw lastError;
  }

  // Generate a random ID
  static generateId(prefix = 'id') {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `${prefix}_${timestamp}_${randomStr}`;
  }

  // Validate URL format
  static isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Parse query parameters from URL
  static getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    
    for (const [key, value] of params) {
      result[key] = value;
    }
    
    return result;
  }

  // Local storage helpers with error handling
  static setLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      Utils.error('Failed to save to localStorage:', error);
      return false;
    }
  }

  static getLocalStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      Utils.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  }

  static removeLocalStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      Utils.error('Failed to remove from localStorage:', error);
      return false;
    }
  }

  // Check if device is mobile
  static isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Check if device is iOS
  static isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  // Check if device is Android
  static isAndroid() {
    return /Android/.test(navigator.userAgent);
  }

  // Get browser name
  static getBrowserName() {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Unknown';
  }

  // Announce to screen readers (accessibility)
  static announce(message, priority = 'polite') {
    if (!CONFIG.ACCESSIBILITY.ANNOUNCE_STATE_CHANGES) return;
    
    const announcer = document.getElementById('sr-announcer') || this.createAnnouncer();
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }

  // Create screen reader announcer element
  static createAnnouncer() {
    const announcer = document.createElement('div');
    announcer.id = 'sr-announcer';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.overflow = 'hidden';
    
    document.body.appendChild(announcer);
    return announcer;
  }

  // Add keyboard navigation support
  static enableKeyboardNavigation(element, callback) {
    if (!CONFIG.ACCESSIBILITY.KEYBOARD_NAVIGATION) return;
    
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        callback(event);
      }
    });
  }

  // Error reporting helper
  static reportError(error, context = {}) {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      context
    };

    Utils.error('Error report:', errorReport);

    // Store error in localStorage for debugging
    const errors = this.getLocalStorage(CONFIG.STORAGE_KEYS.ERROR_LOG, []);
    errors.push(errorReport);
    
    // Keep only last 10 errors
    if (errors.length > 10) {
      errors.shift();
    }
    
    this.setLocalStorage(CONFIG.STORAGE_KEYS.ERROR_LOG, errors);
  }
}

// Export Utils class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
} else if (typeof window !== 'undefined') {
  window.Utils = Utils;
}