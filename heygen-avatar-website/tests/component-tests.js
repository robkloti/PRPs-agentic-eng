// Component tests for individual classes and modules

async function runComponentTests() {
  log('🧪 Running component tests...');
  let totalResults = { passed: 0, failed: 0, total: 0 };
  
  try {
    const results = await testFramework.suite('Component Tests', function() {
      
      // Configuration tests
      testFramework.test('CONFIG validation', () => {
        assert(typeof CONFIG === 'object', 'CONFIG should be an object');
        assert(typeof CONFIG.validate === 'function', 'CONFIG should have validate method');
        
        const validation = CONFIG.validate();
        assert(typeof validation === 'object', 'Validation should return object');
        assert(typeof validation.isValid === 'boolean', 'Should have isValid property');
        assert(Array.isArray(validation.errors), 'Should have errors array');
      });

      testFramework.test('CONFIG helper methods', () => {
        assertEqual(CONFIG.getCostUsagePercentage(50), 50, 'Cost percentage calculation');
        assertEqual(CONFIG.getInteractionUsagePercentage(25), 50, 'Interaction percentage calculation');
        
        const stats = { interactions: 40, cost: 80 };
        assertTrue(CONFIG.isApproachingLimits(stats), 'Should detect approaching limits');
      });

      // Utils tests
      testFramework.test('Utils logging', () => {
        assertType(Utils.log, 'function', 'Utils.log should be a function');
        assertType(Utils.info, 'function', 'Utils.info should be a function');
        assertType(Utils.error, 'function', 'Utils.error should be a function');
        
        // Test logging doesn't throw
        Utils.debug('Test debug message');
        Utils.info('Test info message');
        Utils.warn('Test warning message');
      });

      testFramework.test('Utils formatting', () => {
        assertEqual(Utils.formatDuration(1500), '1s', 'Format milliseconds to seconds');
        assertEqual(Utils.formatDuration(65000), '1m 5s', 'Format milliseconds to minutes');
        assertEqual(Utils.formatFileSize(1024), '1.00 KB', 'Format bytes to KB');
        assertEqual(Utils.formatFileSize(1048576), '1.00 MB', 'Format bytes to MB');
        
        const currency = Utils.formatCurrency(12.34);
        assertTrue(currency.includes('$12.34'), 'Format currency');
      });

      testFramework.test('Utils browser detection', () => {
        const support = Utils.checkBrowserSupport();
        assertType(support.isSupported, 'boolean', 'Should return boolean');
        assertTrue(Array.isArray(support.support), 'Should have support object');
        assertTrue(Array.isArray(support.missingFeatures), 'Should have missing features array');
        
        assertType(Utils.getBrowserName(), 'string', 'Should return browser name');
        assertType(Utils.isMobileDevice(), 'boolean', 'Should detect mobile device');
      });

      testFramework.test('Utils URL validation', () => {
        assertTrue(Utils.isValidUrl('https://example.com'), 'Valid HTTPS URL');
        assertTrue(Utils.isValidUrl('http://localhost:3000'), 'Valid local URL');
        assertFalse(Utils.isValidUrl('not-a-url'), 'Invalid URL');
        assertFalse(Utils.isValidUrl(''), 'Empty string');
      });

      testFramework.test('Utils localStorage helpers', () => {
        const testKey = 'test-key';
        const testData = { test: 'data', number: 123 };
        
        const saved = Utils.setLocalStorage(testKey, testData);
        assertTrue(saved, 'Should save to localStorage');
        
        const retrieved = Utils.getLocalStorage(testKey);
        assertObjectEqual(retrieved, testData, 'Should retrieve same data');
        
        const removed = Utils.removeLocalStorage(testKey);
        assertTrue(removed, 'Should remove from localStorage');
        
        const notFound = Utils.getLocalStorage(testKey, 'default');
        assertEqual(notFound, 'default', 'Should return default value');
      });

      // CostTracker tests
      testFramework.test('CostTracker initialization', () => {
        const tracker = new CostTracker();
        
        assertInstanceOf(tracker, CostTracker, 'Should create CostTracker instance');
        assertType(tracker.dailyInteractions, 'number', 'Should have dailyInteractions');
        assertType(tracker.dailyCost, 'number', 'Should have dailyCost');
        assertTrue(Array.isArray(tracker.interactionHistory), 'Should have interaction history');
      });

      testFramework.test('CostTracker usage tracking', () => {
        const tracker = new CostTracker();
        tracker.resetUsage(); // Start with clean state
        
        assertTrue(tracker.canMakeRequest(), 'Should allow requests initially');
        
        const interaction = tracker.logInteraction(2.50);
        assertType(interaction.id, 'string', 'Should return interaction with ID');
        assertEqual(interaction.cost, 2.50, 'Should record correct cost');
        
        const stats = tracker.getUsageStats();
        assertEqual(stats.interactions, 1, 'Should increment interaction count');
        assertEqual(stats.cost, 2.50, 'Should update cost');
        assertTrue(stats.canMakeRequest, 'Should still allow requests');
      });

      testFramework.test('CostTracker limits enforcement', () => {
        const tracker = new CostTracker();
        tracker.resetUsage();
        
        // Simulate reaching interaction limit
        for (let i = 0; i < CONFIG.MAX_DAILY_INTERACTIONS; i++) {
          tracker.logInteraction(1.00);
        }
        
        assertFalse(tracker.canMakeRequest(), 'Should prevent requests at limit');
        
        const stats = tracker.getUsageStats();
        assertEqual(stats.interactions, CONFIG.MAX_DAILY_INTERACTIONS, 'Should be at interaction limit');
      });

      testFramework.test('CostTracker export functionality', () => {
        const tracker = new CostTracker();
        tracker.resetUsage();
        tracker.logInteraction(5.00);
        
        const exportData = tracker.exportUsageData();
        assertType(exportData, 'string', 'Should return JSON string');
        
        const parsed = JSON.parse(exportData);
        assertType(parsed.exportDate, 'string', 'Should have export date');
        assertType(parsed.currentStats, 'object', 'Should have current stats');
        assertTrue(Array.isArray(parsed.historical), 'Should have historical data');
      });

    });
    
    totalResults.passed += results.passed;
    totalResults.failed += results.failed;
    totalResults.total += results.total;
    
    testFramework.displayResults('component-test-results', results);
    
  } catch (error) {
    log(`❌ Component tests failed: ${error.message}`);
    totalResults.failed++;
    totalResults.total++;
  }
  
  return totalResults;
}

async function testConfigValidation() {
  log('🔧 Testing configuration validation...');
  
  try {
    const results = await testFramework.suite('Configuration Validation', function() {
      
      testFramework.test('CONFIG object exists', () => {
        assertNotUndefined(CONFIG, 'CONFIG should be defined');
        assertType(CONFIG, 'object', 'CONFIG should be an object');
      });

      testFramework.test('Required configuration properties', () => {
        const required = [
          'N8N_WEBHOOK_URL', 'MAX_RECORDING_TIME', 'MAX_DAILY_INTERACTIONS',
          'DAILY_COST_LIMIT', 'ESTIMATED_COST_PER_INTERACTION', 'IDLE_VIDEO_URL',
          'RESPONSE_TIMEOUT', 'RECORDING_STATES', 'VIDEO_STATES', 'AVATAR_MODES'
        ];
        
        required.forEach(prop => {
          assertNotUndefined(CONFIG[prop], `CONFIG.${prop} should be defined`);
        });
      });

      testFramework.test('Configuration validation method', () => {
        assertType(CONFIG.validate, 'function', 'validate should be a function');
        
        const validation = CONFIG.validate();
        assertType(validation.isValid, 'boolean', 'Should return isValid boolean');
        assertTrue(Array.isArray(validation.errors), 'Should return errors array');
      });

      testFramework.test('Configuration helper methods', () => {
        assertType(CONFIG.getCostUsagePercentage, 'function', 'Should have getCostUsagePercentage');
        assertType(CONFIG.getInteractionUsagePercentage, 'function', 'Should have getInteractionUsagePercentage');
        assertType(CONFIG.isApproachingLimits, 'function', 'Should have isApproachingLimits');
      });

      testFramework.test('State constants', () => {
        const states = CONFIG.RECORDING_STATES;
        assertTrue(typeof states.IDLE === 'string', 'Should have IDLE state');
        assertTrue(typeof states.RECORDING === 'string', 'Should have RECORDING state');
        assertTrue(typeof states.PROCESSING === 'string', 'Should have PROCESSING state');
        assertTrue(typeof states.PLAYING_RESPONSE === 'string', 'Should have PLAYING_RESPONSE state');
      });

    });
    
    testFramework.displayResults('component-test-results', results);
    return results;
    
  } catch (error) {
    log(`❌ Configuration validation failed: ${error.message}`);
    return { passed: 0, failed: 1, total: 1 };
  }
}

async function testUtils() {
  log('🛠️ Testing utility functions...');
  
  try {
    const results = await testFramework.suite('Utils Tests', function() {
      
      testFramework.test('Logging functions', () => {
        // Test all log levels exist
        ['debug', 'info', 'warn', 'error'].forEach(level => {
          assertType(Utils[level], 'function', `Utils.${level} should be a function`);
        });
        
        // Test logging doesn't throw
        Utils.debug('Debug test');
        Utils.info('Info test');
        Utils.warn('Warn test');
        Utils.error('Error test');
      });

      testFramework.test('Format utilities', () => {
        // Duration formatting
        assertEqual(Utils.formatDuration(0), '0s');
        assertEqual(Utils.formatDuration(1000), '1s');
        assertEqual(Utils.formatDuration(61000), '1m 1s');
        assertEqual(Utils.formatDuration(3661000), '61m 1s');
        
        // File size formatting
        assertEqual(Utils.formatFileSize(0), '0 Bytes');
        assertEqual(Utils.formatFileSize(1024), '1.00 KB');
        assertEqual(Utils.formatFileSize(1048576), '1.00 MB');
        assertEqual(Utils.formatFileSize(1073741824), '1.00 GB');
        
        // Currency formatting
        const currency = Utils.formatCurrency(123.45);
        assertTrue(currency.includes('123.45'), 'Should format currency correctly');
      });

      testFramework.test('Browser detection', () => {
        const browserName = Utils.getBrowserName();
        assertType(browserName, 'string', 'Should return browser name');
        assertNotEqual(browserName, '', 'Browser name should not be empty');
        
        assertType(Utils.isMobileDevice(), 'boolean', 'Should detect mobile');
        assertType(Utils.isIOS(), 'boolean', 'Should detect iOS');
        assertType(Utils.isAndroid(), 'boolean', 'Should detect Android');
      });

      testFramework.test('Browser support check', () => {
        const support = Utils.checkBrowserSupport();
        
        assertType(support.isSupported, 'boolean', 'Should return isSupported');
        assertType(support.support, 'object', 'Should return support object');
        assertTrue(Array.isArray(support.missingFeatures), 'Should return missing features array');
        
        // Check required features are tested
        const required = ['mediaRecorder', 'getUserMedia', 'webAudio', 'video', 'localStorage', 'fetch'];
        required.forEach(feature => {
          assertType(support.support[feature], 'boolean', `Should test ${feature} support`);
        });
      });

      testFramework.test('MIME type detection', () => {
        const mimeType = Utils.getSupportedMimeType();
        assertType(mimeType, 'object', 'Should return MIME type object');
        
        if (mimeType.mimeType) {
          assertType(mimeType.mimeType, 'string', 'MIME type should be string');
          assertTrue(mimeType.mimeType.startsWith('audio/'), 'Should be audio MIME type');
        }
      });

      testFramework.test('URL validation', () => {
        // Valid URLs
        assertTrue(Utils.isValidUrl('https://example.com'));
        assertTrue(Utils.isValidUrl('http://localhost:3000'));
        assertTrue(Utils.isValidUrl('https://api.example.com/webhook/123'));
        
        // Invalid URLs
        assertFalse(Utils.isValidUrl('not-a-url'));
        assertFalse(Utils.isValidUrl(''));
        assertFalse(Utils.isValidUrl(null));
        assertFalse(Utils.isValidUrl(undefined));
      });

      testFramework.asyncTest('Async utilities', async () => {
        // Test delay
        const start = Date.now();
        await Utils.delay(100);
        const elapsed = Date.now() - start;
        assertTrue(elapsed >= 90, 'Delay should wait approximately correct time');
        
        // Test retry with success
        let attempts = 0;
        const result = await Utils.retry(() => {
          attempts++;
          return 'success';
        });
        assertEqual(result, 'success');
        assertEqual(attempts, 1, 'Should succeed on first attempt');
        
        // Test retry with eventual success
        attempts = 0;
        const retryResult = await Utils.retry(() => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Temporary failure');
          }
          return 'success';
        });
        assertEqual(retryResult, 'success');
        assertEqual(attempts, 3, 'Should retry until success');
      });

      testFramework.test('LocalStorage helpers', () => {
        const testKey = 'utils-test-key';
        const testData = { test: true, number: 42, string: 'hello' };
        
        // Test setting data
        const saved = Utils.setLocalStorage(testKey, testData);
        assertTrue(saved, 'Should save to localStorage');
        
        // Test getting data
        const retrieved = Utils.getLocalStorage(testKey);
        assertObjectEqual(retrieved, testData, 'Should retrieve same data');
        
        // Test getting with default
        const defaultValue = Utils.getLocalStorage('non-existent-key', 'default');
        assertEqual(defaultValue, 'default', 'Should return default value');
        
        // Test removing data
        const removed = Utils.removeLocalStorage(testKey);
        assertTrue(removed, 'Should remove from localStorage');
        
        // Test getting after removal
        const afterRemoval = Utils.getLocalStorage(testKey, null);
        assertNull(afterRemoval, 'Should return null after removal');
      });

      testFramework.test('ID generation', () => {
        const id1 = Utils.generateId();
        const id2 = Utils.generateId();
        
        assertType(id1, 'string', 'Should return string');
        assertType(id2, 'string', 'Should return string');
        assertNotEqual(id1, id2, 'Should generate unique IDs');
        assertTrue(id1.startsWith('id_'), 'Should have default prefix');
        
        const customId = Utils.generateId('custom');
        assertTrue(customId.startsWith('custom_'), 'Should use custom prefix');
      });

      testFramework.test('Error reporting', () => {
        const testError = new Error('Test error');
        const context = { component: 'TestComponent' };
        
        // Should not throw when reporting error
        Utils.reportError(testError, context);
        
        // Check that error was stored in localStorage
        const errors = Utils.getLocalStorage(CONFIG.STORAGE_KEYS.ERROR_LOG, []);
        assertTrue(Array.isArray(errors), 'Should store errors in array');
        
        if (errors.length > 0) {
          const lastError = errors[errors.length - 1];
          assertEqual(lastError.message, 'Test error', 'Should store error message');
          assertEqual(lastError.context.component, 'TestComponent', 'Should store error context');
        }
      });

    });
    
    testFramework.displayResults('component-test-results', results);
    return results;
    
  } catch (error) {
    log(`❌ Utils tests failed: ${error.message}`);
    return { passed: 0, failed: 1, total: 1 };
  }
}

async function testCostTracker() {
  log('💰 Testing CostTracker...');
  
  try {
    const results = await testFramework.suite('CostTracker Tests', function() {
      
      let tracker;
      
      testFramework.test('CostTracker initialization', () => {
        tracker = new CostTracker();
        
        assertInstanceOf(tracker, CostTracker);
        assertType(tracker.dailyInteractions, 'number');
        assertType(tracker.dailyCost, 'number');
        assertTrue(Array.isArray(tracker.interactionHistory));
        
        // Reset to clean state for testing
        tracker.resetUsage();
      });

      testFramework.test('Usage tracking', () => {
        assertEqual(tracker.dailyInteractions, 0, 'Should start with 0 interactions');
        assertEqual(tracker.dailyCost, 0, 'Should start with 0 cost');
        
        const interaction = tracker.logInteraction(2.50);
        
        assertType(interaction.id, 'string', 'Should generate interaction ID');
        assertEqual(interaction.cost, 2.50, 'Should record correct cost');
        assertType(interaction.timestamp, 'string', 'Should have timestamp');
        
        assertEqual(tracker.dailyInteractions, 1, 'Should increment interactions');
        assertEqual(tracker.dailyCost, 2.50, 'Should update cost');
      });

      testFramework.test('Usage limits', () => {
        tracker.resetUsage();
        
        assertTrue(tracker.canMakeRequest(), 'Should allow requests initially');
        
        // Test interaction limit
        for (let i = 0; i < CONFIG.MAX_DAILY_INTERACTIONS; i++) {
          tracker.logInteraction(0.50);
        }
        
        assertFalse(tracker.canMakeRequest(), 'Should block requests at interaction limit');
        assertEqual(tracker.dailyInteractions, CONFIG.MAX_DAILY_INTERACTIONS);
      });

      testFramework.test('Cost limits', () => {
        tracker.resetUsage();
        
        // Test cost limit
        const highCost = CONFIG.DAILY_COST_LIMIT + 10;
        tracker.logInteraction(highCost);
        
        assertFalse(tracker.canMakeRequest(), 'Should block requests at cost limit');
        assertTrue(tracker.dailyCost >= CONFIG.DAILY_COST_LIMIT);
      });

      testFramework.test('Usage statistics', () => {
        tracker.resetUsage();
        tracker.logInteraction(5.00);
        tracker.logInteraction(3.50);
        
        const stats = tracker.getUsageStats();
        
        assertEqual(stats.interactions, 2);
        assertEqual(stats.cost, 8.50);
        assertEqual(stats.maxInteractions, CONFIG.MAX_DAILY_INTERACTIONS);
        assertEqual(stats.maxCost, CONFIG.DAILY_COST_LIMIT);
        assertType(stats.interactionPercentage, 'number');
        assertType(stats.costPercentage, 'number');
        assertType(stats.canMakeRequest, 'boolean');
      });

      testFramework.test('Detailed statistics', () => {
        const detailed = tracker.getDetailedStats();
        
        assertTrue(Array.isArray(detailed.interactionHistory));
        assertType(detailed.totalInteractionsToday, 'number');
        assertType(detailed.averageCostPerInteraction, 'number');
        assertType(detailed.remainingInteractions, 'number');
        assertType(detailed.remainingCost, 'number');
      });

      testFramework.test('Usage summary', () => {
        const summary = tracker.getUsageSummary();
        
        assertType(summary.text, 'string');
        assertType(summary.cost, 'string');
        assertType(summary.percentage, 'number');
        assertType(summary.status, 'string');
        assertTrue(['ok', 'limit_reached'].includes(summary.status));
      });

      testFramework.test('Data export', () => {
        const exportData = tracker.exportUsageData();
        
        assertType(exportData, 'string', 'Should return JSON string');
        
        const parsed = JSON.parse(exportData);
        assertType(parsed.exportDate, 'string');
        assertType(parsed.currentStats, 'object');
        assertTrue(Array.isArray(parsed.historical));
        assertType(parsed.configuration, 'object');
      });

      testFramework.test('LocalStorage persistence', () => {
        tracker.resetUsage();
        tracker.logInteraction(1.00);
        
        // Create new tracker to test loading
        const newTracker = new CostTracker();
        
        // Should load the saved data
        assertEqual(newTracker.dailyInteractions, 1);
        assertEqual(newTracker.dailyCost, 1.00);
      });

    });
    
    testFramework.displayResults('component-test-results', results);
    return results;
    
  } catch (error) {
    log(`❌ CostTracker tests failed: ${error.message}`);
    return { passed: 0, failed: 1, total: 1 };
  }
}

async function testAudioRecorder() {
  log('🎤 Testing AudioRecorder...');
  
  try {
    const results = await testFramework.suite('AudioRecorder Tests', function() {
      
      testFramework.test('AudioRecorder initialization', () => {
        const recorder = new AudioRecorder();
        
        assertInstanceOf(recorder, AudioRecorder);
        assertType(recorder.maxDuration, 'number');
        assertType(recorder.isRecording, 'boolean');
        assertType(recorder.isInitialized, 'boolean');
        assertFalse(recorder.isRecording, 'Should not be recording initially');
        
        // Should have callback properties
        assertNull(recorder.onRecordingStart);
        assertNull(recorder.onRecordingStop);
        assertNull(recorder.onError);
      });

      testFramework.test('Recording state management', () => {
        const recorder = new AudioRecorder();
        
        const state = recorder.getRecordingState();
        assertType(state.isRecording, 'boolean');
        assertType(state.isInitialized, 'boolean');
        assertType(state.maxDuration, 'number');
        assertType(state.hasStream, 'boolean');
        assertType(state.hasMediaRecorder, 'boolean');
      });

      testFramework.test('Settings update', () => {
        const recorder = new AudioRecorder();
        const originalDuration = recorder.maxDuration;
        
        recorder.updateSettings({ maxDuration: 15000 });
        assertEqual(recorder.maxDuration, 15000);
        
        // Test bounds
        recorder.updateSettings({ maxDuration: 500 }); // Too low
        assertTrue(recorder.maxDuration >= 1000);
        
        recorder.updateSettings({ maxDuration: 50000 }); // Too high
        assertTrue(recorder.maxDuration <= 30000);
      });

      testFramework.asyncTest('Microphone test', async () => {
        const recorder = new AudioRecorder();
        
        const testResult = await recorder.testMicrophone();
        assertType(testResult.success, 'boolean');
        
        if (!testResult.success) {
          assertType(testResult.error, 'string');
        }
      });

      testFramework.asyncTest('Audio devices enumeration', async () => {
        const recorder = new AudioRecorder();
        
        const devices = await recorder.getAudioDevices();
        assertTrue(Array.isArray(devices));
        
        // Each device should have required properties
        devices.forEach(device => {
          assertType(device.deviceId, 'string');
          assertType(device.kind, 'string');
          assertEqual(device.kind, 'audioinput');
        });
      });

      testFramework.test('Cleanup', () => {
        const recorder = new AudioRecorder();
        
        // Should not throw during cleanup
        recorder.cleanup();
        recorder.destroy();
      });

    });
    
    testFramework.displayResults('component-test-results', results);
    return results;
    
  } catch (error) {
    log(`❌ AudioRecorder tests failed: ${error.message}`);
    return { passed: 0, failed: 1, total: 1 };
  }
}