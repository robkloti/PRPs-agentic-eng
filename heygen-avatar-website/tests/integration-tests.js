// Integration tests for component interactions

async function runIntegrationTests() {
  log('🔗 Running integration tests...');
  let totalResults = { passed: 0, failed: 0, total: 0 };
  
  try {
    const results = await testFramework.suite('Integration Tests', function() {
      
      testFramework.asyncTest('VideoManager and DOM integration', async () => {
        // Create mock video elements
        const container = document.createElement('div');
        container.id = 'test-video-container';
        document.body.appendChild(container);
        
        const idleVideo = document.createElement('video');
        idleVideo.id = 'idle-video';
        const responseVideo = document.createElement('video');
        responseVideo.id = 'response-video';
        const overlay = document.createElement('div');
        overlay.id = 'video-overlay';
        
        container.appendChild(idleVideo);
        container.appendChild(responseVideo);
        container.appendChild(overlay);
        
        try {
          const videoManager = new VideoManager('test://idle-video.mp4', '#test-video-container');
          
          assertInstanceOf(videoManager, VideoManager);
          assertEqual(videoManager.idleVideo, idleVideo);
          assertEqual(videoManager.responseVideo, responseVideo);
          
          const state = videoManager.getState();
          assertType(state.currentState, 'string');
          assertType(state.currentMode, 'string');
          
        } finally {
          document.body.removeChild(container);
        }
      });

      testFramework.test('CostTracker and WebhookClient integration', () => {
        const costTracker = new CostTracker();
        costTracker.resetUsage();
        
        const webhookClient = new WebhookClient('https://test-webhook.com', costTracker);
        
        assertInstanceOf(webhookClient, WebhookClient);
        assertEqual(webhookClient.costTracker, costTracker);
        
        // Test cost tracking integration
        assertTrue(costTracker.canMakeRequest());
        
        // Simulate reaching limit
        for (let i = 0; i < CONFIG.MAX_DAILY_INTERACTIONS; i++) {
          costTracker.logInteraction();
        }
        
        assertFalse(costTracker.canMakeRequest());
      });

      testFramework.test('AudioRecorder and CostTracker integration', () => {
        const costTracker = new CostTracker();
        const audioRecorder = new AudioRecorder();
        
        // Test that max recording time respects cost controls
        assertEqual(audioRecorder.maxDuration, CONFIG.MAX_RECORDING_TIME);
        
        const state = audioRecorder.getRecordingState();
        assertTrue(state.maxDuration <= CONFIG.MAX_RECORDING_TIME);
      });

      testFramework.test('Configuration and component integration', () => {
        // Test that components use CONFIG values
        const costTracker = new CostTracker();
        const audioRecorder = new AudioRecorder();
        
        assertEqual(audioRecorder.maxDuration, CONFIG.MAX_RECORDING_TIME);
        
        const stats = costTracker.getUsageStats();
        assertEqual(stats.maxInteractions, CONFIG.MAX_DAILY_INTERACTIONS);
        assertEqual(stats.maxCost, CONFIG.DAILY_COST_LIMIT);
      });

      testFramework.asyncTest('Error handling integration', async () => {
        const errors = [];
        
        // Mock error handler
        const errorHandler = (error, component) => {
          errors.push({ error: error.message, component });
        };
        
        const costTracker = new CostTracker();
        costTracker.onError = errorHandler;
        
        // Test error reporting integration
        const testError = new Error('Test integration error');
        Utils.reportError(testError, { component: 'TestIntegration' });
        
        // Check that error was stored
        const storedErrors = Utils.getLocalStorage(CONFIG.STORAGE_KEYS.ERROR_LOG, []);
        assertTrue(storedErrors.length > 0);
      });

    });
    
    totalResults.passed += results.passed;
    totalResults.failed += results.failed;
    totalResults.total += results.total;
    
    testFramework.displayResults('integration-test-results', results);
    
  } catch (error) {
    log(`❌ Integration tests failed: ${error.message}`);
    totalResults.failed++;
    totalResults.total++;
  }
  
  return totalResults;
}

async function testVideoManager() {
  log('🎬 Testing VideoManager integration...');
  
  try {
    // Create mock DOM elements
    const mockContainer = document.createElement('div');
    mockContainer.innerHTML = `
      <video id="test-idle-video"></video>
      <video id="test-response-video"></video>
      <div id="test-video-overlay"></div>
    `;
    document.body.appendChild(mockContainer);
    
    const results = await testFramework.suite('VideoManager Integration', function() {
      
      testFramework.test('VideoManager DOM integration', () => {
        const videoManager = new VideoManager('test://idle.mp4', mockContainer);
        
        assertInstanceOf(videoManager, VideoManager);
        assertNotNull(videoManager.container);
      });

      testFramework.test('VideoManager state management', () => {
        const videoManager = new VideoManager('test://idle.mp4', mockContainer);
        
        const initialState = videoManager.getState();
        assertType(initialState.currentState, 'string');
        assertType(initialState.currentMode, 'string');
        assertType(initialState.isTransitioning, 'boolean');
        
        assertFalse(initialState.isTransitioning, 'Should not be transitioning initially');
      });

      testFramework.test('VideoManager event handling', () => {
        const videoManager = new VideoManager('test://idle.mp4', mockContainer);
        let eventFired = false;
        
        videoManager.onVideoError = (error) => {
          eventFired = true;
        };
        
        videoManager.handleVideoError(new Error('Test error'));
        assertTrue(eventFired, 'Should fire error event');
      });

      testFramework.test('VideoManager cleanup', () => {
        const videoManager = new VideoManager('test://idle.mp4', mockContainer);
        
        // Should not throw during cleanup
        videoManager.destroy();
      });

    });
    
    document.body.removeChild(mockContainer);
    testFramework.displayResults('integration-test-results', results);
    return results;
    
  } catch (error) {
    log(`❌ VideoManager integration tests failed: ${error.message}`);
    return { passed: 0, failed: 1, total: 1 };
  }
}

async function testWebhookClient() {
  log('🌐 Testing WebhookClient integration...');
  
  try {
    const results = await testFramework.suite('WebhookClient Integration', function() {
      
      testFramework.test('WebhookClient initialization', () => {
        const costTracker = new CostTracker();
        costTracker.resetUsage();
        
        const webhookClient = new WebhookClient('https://test-webhook.com', costTracker);
        
        assertInstanceOf(webhookClient, WebhookClient);
        assertEqual(webhookClient.costTracker, costTracker);
        assertEqual(webhookClient.webhookUrl, 'https://test-webhook.com');
      });

      testFramework.test('WebhookClient URL validation', () => {
        assertThrows(() => {
          new WebhookClient('invalid-url');
        }, 'Should throw on invalid URL');
        
        assertThrows(() => {
          new WebhookClient('https://your-webhook-url.com');
        }, 'Should throw on unconfigured URL');
      });

      testFramework.test('WebhookClient cost integration', () => {
        const costTracker = new CostTracker();
        costTracker.resetUsage();
        
        const webhookClient = new WebhookClient('https://test-webhook.com', costTracker);
        
        // Block all requests by hitting limit
        for (let i = 0; i < CONFIG.MAX_DAILY_INTERACTIONS; i++) {
          costTracker.logInteraction();
        }
        
        // Mock audio blob
        const audioBlob = new Blob(['test'], { type: 'audio/webm' });
        
        assertThrowsAsync(async () => {
          await webhookClient.sendAudioToN8N(audioBlob);
        }, 'Should throw when limit reached');
      });

      testFramework.test('WebhookClient request tracking', () => {
        const webhookClient = new WebhookClient('https://test-webhook.com');
        
        const activeRequests = webhookClient.getActiveRequests();
        assertTrue(Array.isArray(activeRequests));
        assertEqual(activeRequests.length, 0);
        
        const stats = webhookClient.getStats();
        assertType(stats.webhookUrl, 'string');
        assertType(stats.activeRequests, 'number');
        assertType(stats.timeout, 'number');
      });

      testFramework.asyncTest('WebhookClient connectivity test', async () => {
        const webhookClient = new WebhookClient('https://httpbin.org/get');
        
        const testResult = await webhookClient.testWebhook();
        assertType(testResult.success, 'boolean');
        assertType(testResult.status, 'number');
        
        if (!testResult.success) {
          assertType(testResult.error, 'string');
        }
      });

      testFramework.test('WebhookClient URL update', () => {
        const webhookClient = new WebhookClient('https://test1.com');
        
        webhookClient.updateWebhookUrl('https://test2.com');
        assertEqual(webhookClient.webhookUrl, 'https://test2.com');
        
        assertThrows(() => {
          webhookClient.updateWebhookUrl('invalid-url');
        }, 'Should throw on invalid URL update');
      });

      testFramework.test('WebhookClient response parsing', () => {
        const webhookClient = new WebhookClient('https://test-webhook.com');
        
        // Test different response formats
        const responses = [
          { data: { video_url: 'https://example.com/video.mp4' } },
          { video_url: 'https://example.com/video.mp4' },
          { url: 'https://example.com/video.mp4' },
          'https://example.com/video.mp4',
          [{ video_url: 'https://example.com/video.mp4' }]
        ];
        
        responses.forEach((response, index) => {
          const extracted = webhookClient.extractVideoUrl(response);
          assertEqual(extracted, 'https://example.com/video.mp4', `Should extract URL from format ${index + 1}`);
        });
        
        // Test invalid responses
        const invalidResponses = [
          {},
          { data: {} },
          null,
          undefined,
          'not-a-url'
        ];
        
        invalidResponses.forEach(response => {
          const extracted = webhookClient.extractVideoUrl(response);
          assertNull(extracted, 'Should return null for invalid response');
        });
      });

    });
    
    testFramework.displayResults('integration-test-results', results);
    return results;
    
  } catch (error) {
    log(`❌ WebhookClient integration tests failed: ${error.message}`);
    return { passed: 0, failed: 1, total: 1 };
  }
}

async function testUIController() {
  log('🎮 Testing UIController integration...');
  
  try {
    // Create mock DOM elements
    const mockElements = document.createElement('div');
    mockElements.innerHTML = `
      <button id="record-button"></button>
      <div id="status-display"></div>
      <div id="status-message"></div>
      <div id="progress-bar"><div class="progress-fill"></div></div>
      <div id="usage-stats"></div>
      <span id="usage-count"></span>
      <span id="usage-cost"></span>
      <div id="error-container" style="display: none;">
        <div id="error-text"></div>
        <button id="error-close">×</button>
      </div>
      <div id="processing-overlay" style="display: none;">
        <div id="processing-title"></div>
        <div id="processing-subtitle"></div>
      </div>
    `;
    document.body.appendChild(mockElements);
    
    const results = await testFramework.suite('UIController Integration', function() {
      
      testFramework.test('UIController DOM integration', () => {
        const uiController = new UIController();
        
        assertInstanceOf(uiController, UIController);
        assertNotNull(uiController.recordButton);
        assertNotNull(uiController.statusMessage);
        assertNotNull(uiController.errorContainer);
      });

      testFramework.test('UIController state management', () => {
        const uiController = new UIController();
        
        assertEqual(uiController.currentState, CONFIG.RECORDING_STATES.IDLE);
        assertFalse(uiController.isRecording);
        assertFalse(uiController.isProcessing);
      });

      testFramework.test('UIController component integration', () => {
        const uiController = new UIController();
        const costTracker = new CostTracker();
        const audioRecorder = new AudioRecorder();
        const videoManager = new VideoManager('test://video.mp4', mockElements);
        const webhookClient = new WebhookClient('https://test.com', costTracker);
        
        // Set components
        uiController.setComponents(audioRecorder, videoManager, webhookClient, costTracker);
        
        assertEqual(uiController.audioRecorder, audioRecorder);
        assertEqual(uiController.videoManager, videoManager);
        assertEqual(uiController.webhookClient, webhookClient);
        assertEqual(uiController.costTracker, costTracker);
      });

      testFramework.test('UIController error handling', () => {
        const uiController = new UIController();
        
        const testError = new Error('Test UI error');
        uiController.handleError(testError);
        
        // Error container should be visible
        const errorContainer = document.getElementById('error-container');
        assertNotEqual(errorContainer.style.display, 'none');
        
        const errorText = document.getElementById('error-text');
        assertEqual(errorText.textContent, 'Test UI error');
      });

      testFramework.test('UIController status updates', () => {
        const uiController = new UIController();
        
        uiController.setStatus('Test status message');
        
        const statusMessage = document.getElementById('status-message');
        assertEqual(statusMessage.textContent, 'Test status message');
      });

      testFramework.test('UIController progress display', () => {
        const uiController = new UIController();
        
        uiController.showProgress(50);
        
        const progressBar = document.getElementById('progress-bar');
        assertNotEqual(progressBar.style.display, 'none');
        
        const progressFill = progressBar.querySelector('.progress-fill');
        assertEqual(progressFill.style.width, '50%');
        
        uiController.hideProgress();
        assertEqual(progressBar.style.display, 'none');
      });

      testFramework.test('UIController usage display', () => {
        const uiController = new UIController();
        const costTracker = new CostTracker();
        costTracker.resetUsage();
        
        uiController.setComponents(null, null, null, costTracker);
        uiController.updateUsageDisplay();
        
        const usageCount = document.getElementById('usage-count');
        const usageCost = document.getElementById('usage-cost');
        
        assertTrue(usageCount.textContent.includes('0'));
        assertTrue(usageCost.textContent.includes('$0'));
      });

      testFramework.test('UIController cleanup', () => {
        const uiController = new UIController();
        
        // Should not throw during cleanup
        uiController.destroy();
      });

    });
    
    document.body.removeChild(mockElements);
    testFramework.displayResults('integration-test-results', results);
    return results;
    
  } catch (error) {
    log(`❌ UIController integration tests failed: ${error.message}`);
    return { passed: 0, failed: 1, total: 1 };
  }
}