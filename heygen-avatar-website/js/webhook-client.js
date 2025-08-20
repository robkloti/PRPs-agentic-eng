// WebhookClient - Handles N8N webhook communication with timeout and error handling
class WebhookClient {
  constructor(webhookUrl, costTracker = null) {
    this.webhookUrl = webhookUrl;
    this.timeout = CONFIG.RESPONSE_TIMEOUT; // 60 seconds for full N8N workflow
    this.costTracker = costTracker;
    
    // Request tracking
    this.activeRequests = new Map();
    this.requestIdCounter = 0;
    
    // Event callbacks
    this.onRequestStart = null;
    this.onRequestProgress = null;
    this.onRequestComplete = null;
    this.onRequestError = null;
    
    // Retry configuration
    this.maxRetries = 2;
    this.retryDelay = 2000; // 2 seconds
    
    this.validateConfiguration();
  }

  validateConfiguration() {
    if (!this.webhookUrl || !Utils.isValidUrl(this.webhookUrl)) {
      throw new Error('Invalid webhook URL provided');
    }
    
    if (this.webhookUrl.includes('your-')) {
      throw new Error('Webhook URL must be configured (check config.js)');
    }
    
    Utils.info('WebhookClient initialized with URL:', this.webhookUrl);
  }

  async sendAudioToN8N(audioBlob, options = {}) {
    // Prevent duplicate requests
    if (this.activeRequests.size > 0) {
      Utils.warn('Request already in progress, blocking duplicate');
      throw new Error('Another request is already being processed. Please wait.');
    }
    
    const requestId = ++this.requestIdCounter;
    
    Utils.info(`Starting N8N request #${requestId} - Audio size: ${Utils.formatFileSize(audioBlob.size)}`);
    
    try {
      // Cost control check
      if (this.costTracker && !this.costTracker.canMakeRequest()) {
        const stats = this.costTracker.getUsageStats();
        const errorMsg = stats.interactions >= stats.maxInteractions 
          ? CONFIG.ERROR_MESSAGES.DAILY_LIMIT_REACHED
          : CONFIG.ERROR_MESSAGES.COST_LIMIT_REACHED;
        
        throw new Error(errorMsg);
      }
      
      // Track this request
      const request = this.createRequestTracker(requestId, audioBlob.size);
      this.activeRequests.set(requestId, request);
      
      if (this.onRequestStart) {
        this.onRequestStart(request);
      }
      
      // Start progress simulation (since N8N doesn't provide real progress)
      this.startProgressSimulation(requestId);
      
      // Send request with retry logic
      const responseVideoUrl = await this.sendWithRetry(audioBlob, requestId, options);
      
      // Mark request as complete
      request.status = 'completed';
      request.completedAt = Date.now();
      request.duration = request.completedAt - request.startedAt;
      
      // Log successful interaction for cost tracking
      if (this.costTracker) {
        this.costTracker.logInteraction(CONFIG.ESTIMATED_COST_PER_INTERACTION);
      }
      
      Utils.info(`N8N request #${requestId} completed in ${Utils.formatDuration(request.duration)}`);
      
      if (this.onRequestComplete) {
        this.onRequestComplete(request, responseVideoUrl);
      }
      
      // Cleanup
      this.activeRequests.delete(requestId);
      
      return responseVideoUrl;
      
    } catch (error) {
      // Mark request as failed
      const request = this.activeRequests.get(requestId);
      if (request) {
        request.status = 'failed';
        request.error = error.message;
        request.completedAt = Date.now();
        request.duration = request.completedAt - request.startedAt;
      }
      
      Utils.error(`N8N request #${requestId} failed:`, error);
      
      if (this.onRequestError) {
        this.onRequestError(request, error);
      }
      
      // Cleanup
      this.activeRequests.delete(requestId);
      
      throw error;
    }
  }

  createRequestTracker(requestId, audioSize) {
    return {
      id: requestId,
      status: 'pending',
      startedAt: Date.now(),
      completedAt: null,
      duration: null,
      audioSize: audioSize,
      error: null,
      retryCount: 0,
      progress: 0
    };
  }

  startProgressSimulation(requestId) {
    const request = this.activeRequests.get(requestId);
    if (!request) return;
    
    const steps = CONFIG.PROCESSING_STEPS;
    let currentStep = 0;
    let stepStartTime = Date.now();
    
    const updateProgress = () => {
      const currentRequest = this.activeRequests.get(requestId);
      if (!currentRequest || currentRequest.status !== 'pending') return;
      
      const totalElapsed = Date.now() - request.startedAt;
      
      // Move to next step if current step duration has passed
      if (currentStep < steps.length - 1 && 
          Date.now() - stepStartTime >= steps[currentStep].duration) {
        currentStep++;
        stepStartTime = Date.now();
      }
      
      // Calculate progress within current step
      const stepElapsed = Date.now() - stepStartTime;
      const stepProgress = Math.min(stepElapsed / steps[currentStep].duration, 1);
      
      // Calculate overall progress
      const completedSteps = currentStep;
      const overallProgress = (completedSteps + stepProgress) / steps.length;
      
      currentRequest.progress = Math.round(overallProgress * 100);
      currentRequest.currentStep = steps[currentStep];
      
      if (this.onRequestProgress) {
        this.onRequestProgress(currentRequest);
      }
      
      // Continue simulation if request is still pending
      if (currentRequest.status === 'pending' && overallProgress < 0.95) {
        setTimeout(updateProgress, 1000); // Update every second
      }
    };
    
    // Start progress simulation
    setTimeout(updateProgress, 1000);
  }

  async sendWithRetry(audioBlob, requestId, options) {
    let lastError = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const request = this.activeRequests.get(requestId);
      if (request) {
        request.retryCount = attempt;
      }
      
      try {
        Utils.debug(`N8N request #${requestId} attempt ${attempt + 1}/${this.maxRetries + 1}`);
        
        const result = await this.performRequest(audioBlob, requestId, options);
        return result;
        
      } catch (error) {
        lastError = error;
        
        Utils.warn(`N8N request #${requestId} attempt ${attempt + 1} failed:`, error.message);
        
        // Don't retry for certain error types
        if (this.shouldNotRetry(error)) {
          Utils.debug('Not retrying due to error type:', error.message);
          break;
        }
        
        // Wait before retry (except on last attempt)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt); // Exponential backoff
          Utils.debug(`Waiting ${delay}ms before retry...`);
          await Utils.delay(delay);
        }
      }
    }
    
    throw lastError;
  }

  async performRequest(audioBlob, requestId, options) {
    // Prepare FormData
    const formData = new FormData();
    
    // N8N expects 'file' parameter, not 'audio'
    const filename = `recording_${requestId}.webm`;
    formData.append('file', audioBlob, filename);
    
    // Add any additional parameters
    if (options.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeout);
    
    try {
      Utils.debug(`Sending ${Utils.formatFileSize(audioBlob.size)} audio to N8N webhook`);
      
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // Don't set Content-Type header - let browser set it with boundary for FormData
        headers: {
          'Accept': 'application/json',
          // Add any custom headers if needed
          ...(options.headers || {})
        }
      });
      
      clearTimeout(timeoutId);
      
      // Check response status
      if (!response.ok) {
        const responseText = await response.text().catch(() => 'No response body');
        throw new Error(`HTTP ${response.status}: ${response.statusText}. Response: ${responseText}`);
      }
      
      // Parse JSON response
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        Utils.error('Failed to parse N8N response as JSON:', parseError);
        throw new Error('Invalid JSON response from N8N webhook');
      }
      
      // Validate response structure
      const videoUrl = this.extractVideoUrl(result);
      if (!videoUrl) {
        Utils.error('Invalid N8N response structure:', result);
        throw new Error('No video URL found in N8N response');
      }
      
      // Validate video URL
      if (!Utils.isValidUrl(videoUrl)) {
        throw new Error(`Invalid video URL received: ${videoUrl}`);
      }
      
      Utils.info(`N8N webhook returned video URL: ${videoUrl}`);
      return videoUrl;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(CONFIG.ERROR_MESSAGES.WEBHOOK_TIMEOUT);
      }
      
      if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
        throw new Error(CONFIG.ERROR_MESSAGES.NETWORK_ERROR);
      }
      
      throw error;
    }
  }

  extractVideoUrl(response) {
    // Handle different possible response structures from N8N
    
    // Pattern 1: {data: {video_url: "https://..."}}
    if (response.data && response.data.video_url) {
      return response.data.video_url;
    }
    
    // Pattern 2: {video_url: "https://..."}
    if (response.video_url) {
      return response.video_url;
    }
    
    // Pattern 3: {url: "https://..."}
    if (response.url) {
      return response.url;
    }
    
    // Pattern 4: Direct URL string
    if (typeof response === 'string' && Utils.isValidUrl(response)) {
      return response;
    }
    
    // Pattern 5: Array with video URL
    if (Array.isArray(response) && response.length > 0) {
      const first = response[0];
      if (typeof first === 'string' && Utils.isValidUrl(first)) {
        return first;
      }
      if (first.video_url) {
        return first.video_url;
      }
    }
    
    Utils.debug('Could not extract video URL from response:', response);
    return null;
  }

  shouldNotRetry(error) {
    // Don't retry for certain error types
    const noRetryMessages = [
      'Daily usage limit reached',
      'Daily cost limit reached',
      'Invalid webhook URL',
      'Microphone access denied'
    ];
    
    return noRetryMessages.some(msg => error.message.includes(msg));
  }

  // Get status of active requests
  getActiveRequests() {
    return Array.from(this.activeRequests.values());
  }

  // Cancel an active request
  cancelRequest(requestId) {
    const request = this.activeRequests.get(requestId);
    if (request && request.status === 'pending') {
      request.status = 'cancelled';
      request.completedAt = Date.now();
      request.duration = request.completedAt - request.startedAt;
      
      Utils.info(`Cancelled N8N request #${requestId}`);
      
      this.activeRequests.delete(requestId);
      return true;
    }
    
    return false;
  }

  // Cancel all active requests
  cancelAllRequests() {
    const cancelled = [];
    
    for (const [requestId, request] of this.activeRequests) {
      if (request.status === 'pending') {
        request.status = 'cancelled';
        request.completedAt = Date.now();
        request.duration = request.completedAt - request.startedAt;
        cancelled.push(requestId);
      }
    }
    
    this.activeRequests.clear();
    
    if (cancelled.length > 0) {
      Utils.info(`Cancelled ${cancelled.length} active N8N requests:`, cancelled);
    }
    
    return cancelled;
  }

  // Test webhook connectivity
  async testWebhook() {
    try {
      Utils.info('Testing N8N webhook connectivity');
      
      const response = await fetch(this.webhookUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update webhook URL
  updateWebhookUrl(newUrl) {
    if (!Utils.isValidUrl(newUrl)) {
      throw new Error('Invalid webhook URL provided');
    }
    
    this.webhookUrl = newUrl;
    Utils.info('Updated webhook URL:', newUrl);
  }

  // Get client statistics
  getStats() {
    const activeRequests = this.getActiveRequests();
    
    return {
      webhookUrl: this.webhookUrl,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      activeRequests: activeRequests.length,
      pendingRequests: activeRequests.filter(r => r.status === 'pending').length,
      nextRequestId: this.requestIdCounter + 1
    };
  }

  // Cleanup method
  destroy() {
    Utils.info('Destroying WebhookClient');
    
    // Cancel all active requests
    this.cancelAllRequests();
    
    // Clear callbacks
    this.onRequestStart = null;
    this.onRequestProgress = null;
    this.onRequestComplete = null;
    this.onRequestError = null;
    
    Utils.info('WebhookClient destroyed');
  }
}

// Export WebhookClient class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebhookClient;
} else if (typeof window !== 'undefined') {
  window.WebhookClient = WebhookClient;
}