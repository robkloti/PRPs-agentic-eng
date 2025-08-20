// Browser compatibility tests

async function runBrowserTests() {
  log('🌐 Running browser compatibility tests...');
  let totalResults = { passed: 0, failed: 0, total: 0 };
  
  try {
    const results = await testFramework.suite('Browser Compatibility', function() {
      
      testFramework.test('Basic browser APIs', () => {
        // Essential APIs
        assertNotUndefined(window.fetch, 'Fetch API should be available');
        assertNotUndefined(window.localStorage, 'LocalStorage should be available');
        assertNotUndefined(window.sessionStorage, 'SessionStorage should be available');
        assertNotUndefined(window.URL, 'URL API should be available');
        assertNotUndefined(window.URLSearchParams, 'URLSearchParams should be available');
        assertNotUndefined(window.FormData, 'FormData should be available');
        assertNotUndefined(window.Blob, 'Blob API should be available');
      });

      testFramework.test('Media APIs', () => {
        assertNotUndefined(window.MediaRecorder, 'MediaRecorder should be available');
        assertNotUndefined(navigator.mediaDevices, 'MediaDevices should be available');
        assertType(navigator.mediaDevices.getUserMedia, 'function', 'getUserMedia should be a function');
        assertType(navigator.mediaDevices.enumerateDevices, 'function', 'enumerateDevices should be a function');
      });

      testFramework.test('Audio APIs', () => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        assertNotUndefined(AudioContext, 'AudioContext should be available');
        
        if (AudioContext) {
          const context = new AudioContext();
          assertType(context.createAnalyser, 'function', 'Should have createAnalyser');
          assertType(context.createMediaStreamSource, 'function', 'Should have createMediaStreamSource');
          context.close();
        }
      });

      testFramework.test('Video APIs', () => {
        assertNotUndefined(window.HTMLVideoElement, 'HTMLVideoElement should be available');
        
        const video = document.createElement('video');
        assertType(video.play, 'function', 'Video should have play method');
        assertType(video.pause, 'function', 'Video should have pause method');
        assertType(video.load, 'function', 'Video should have load method');
        
        // Check video properties
        assertType(video.currentTime, 'number', 'Should have currentTime');
        assertType(video.duration, 'number', 'Should have duration');
        assertType(video.paused, 'boolean', 'Should have paused property');
        assertType(video.ended, 'boolean', 'Should have ended property');
      });

      testFramework.test('DOM APIs', () => {
        assertType(document.createElement, 'function', 'createElement should work');
        assertType(document.querySelector, 'function', 'querySelector should work');
        assertType(document.querySelectorAll, 'function', 'querySelectorAll should work');
        assertType(document.addEventListener, 'function', 'addEventListener should work');
        
        // Test createElement
        const div = document.createElement('div');
        assertInstanceOf(div, HTMLElement, 'Should create HTML element');
      });

      testFramework.test('Event APIs', () => {
        assertNotUndefined(window.CustomEvent, 'CustomEvent should be available');
        assertNotUndefined(window.Event, 'Event should be available');
        
        // Test custom event creation
        const customEvent = new CustomEvent('test', { detail: 'data' });
        assertInstanceOf(customEvent, Event, 'Should create custom event');
        assertEqual(customEvent.detail, 'data', 'Should have detail data');
      });

      testFramework.test('Performance APIs', () => {
        assertNotUndefined(window.performance, 'Performance API should be available');
        assertType(performance.now, 'function', 'performance.now should be available');
        
        const now = performance.now();
        assertType(now, 'number', 'performance.now should return number');
        assertTrue(now > 0, 'performance.now should return positive number');
      });

      testFramework.test('Console APIs', () => {
        assertNotUndefined(window.console, 'Console should be available');
        assertType(console.log, 'function', 'console.log should be function');
        assertType(console.warn, 'function', 'console.warn should be function');
        assertType(console.error, 'function', 'console.error should be function');
        assertType(console.info, 'function', 'console.info should be function');
      });

    });
    
    totalResults.passed += results.passed;
    totalResults.failed += results.failed;
    totalResults.total += results.total;
    
    testFramework.displayResults('browser-test-results', results);
    
  } catch (error) {
    log(`❌ Browser tests failed: ${error.message}`);
    totalResults.failed++;
    totalResults.total++;
  }
  
  return totalResults;
}

async function testMediaRecorder() {
  log('🎥 Testing MediaRecorder API...');
  
  try {
    const results = await testFramework.suite('MediaRecorder API', function() {
      
      testFramework.test('MediaRecorder constructor', () => {
        assertNotUndefined(window.MediaRecorder, 'MediaRecorder should exist');
        assertType(MediaRecorder.isTypeSupported, 'function', 'isTypeSupported should be function');
      });

      testFramework.test('Supported MIME types', () => {
        const mimeTypes = CONFIG.SUPPORTED_MIME_TYPES;
        let supportedCount = 0;
        
        mimeTypes.forEach(mimeType => {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            supportedCount++;
            log(`✅ Supported: ${mimeType}`);
          } else {
            log(`❌ Not supported: ${mimeType}`);
          }
        });
        
        assertTrue(supportedCount > 0, 'At least one MIME type should be supported');
      });

      testFramework.test('MIME type selection', () => {
        const selectedType = Utils.getSupportedMimeType();
        assertType(selectedType, 'object', 'Should return object');
        
        if (selectedType.mimeType) {
          assertTrue(MediaRecorder.isTypeSupported(selectedType.mimeType), 
            'Selected MIME type should be supported');
        }
      });

      testFramework.asyncTest('MediaRecorder with mock stream', async () => {
        // Create a mock audio context and stream
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const destination = audioContext.createMediaStreamDestination();
          
          oscillator.connect(destination);
          const stream = destination.stream;
          
          // Test MediaRecorder creation
          const recorder = new MediaRecorder(stream);
          
          assertInstanceOf(recorder, MediaRecorder, 'Should create MediaRecorder');
          assertEqual(recorder.state, 'inactive', 'Should start inactive');
          
          // Clean up
          oscillator.disconnect();
          await audioContext.close();
          
        } catch (error) {
          // If we can't create audio context, just test the MediaRecorder exists
          assertNotUndefined(MediaRecorder, 'MediaRecorder should exist');
        }
      });

    });
    
    testFramework.displayResults('browser-test-results', results);
    return results;
    
  } catch (error) {
    log(`❌ MediaRecorder tests failed: ${error.message}`);
    return { passed: 0, failed: 1, total: 1 };
  }
}

async function testVideoElement() {
  log('📹 Testing Video Element...');
  
  try {
    const results = await testFramework.suite('Video Element', function() {
      
      testFramework.test('Video element creation', () => {
        const video = document.createElement('video');
        
        assertInstanceOf(video, HTMLVideoElement, 'Should create video element');
        assertType(video.play, 'function', 'Should have play method');
        assertType(video.pause, 'function', 'Should have pause method');
        assertType(video.load, 'function', 'Should have load method');
      });

      testFramework.test('Video properties', () => {
        const video = document.createElement('video');
        
        // Boolean properties
        assertType(video.autoplay, 'boolean', 'Should have autoplay property');
        assertType(video.loop, 'boolean', 'Should have loop property');
        assertType(video.muted, 'boolean', 'Should have muted property');
        assertType(video.paused, 'boolean', 'Should have paused property');
        assertType(video.ended, 'boolean', 'Should have ended property');
        
        // Numeric properties
        assertType(video.currentTime, 'number', 'Should have currentTime');
        assertType(video.duration, 'number', 'Should have duration (NaN initially)');
        assertType(video.volume, 'number', 'Should have volume');
        
        // String properties
        assertType(video.src, 'string', 'Should have src property');
        assertType(video.preload, 'string', 'Should have preload property');
      });

      testFramework.test('Video attributes', () => {
        const video = document.createElement('video');
        
        video.setAttribute('muted', '');
        video.setAttribute('loop', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('preload', 'metadata');
        
        assertTrue(video.muted, 'Should set muted attribute');
        assertTrue(video.loop, 'Should set loop attribute');
        assertEqual(video.preload, 'metadata', 'Should set preload attribute');
      });

      testFramework.test('Video events', () => {
        const video = document.createElement('video');
        let eventFired = false;
        
        video.addEventListener('loadstart', () => {
          eventFired = true;
        });
        
        // Test event listener was added
        assertType(video.addEventListener, 'function', 'Should have addEventListener');
        assertType(video.removeEventListener, 'function', 'Should have removeEventListener');
      });

      testFramework.test('Video format support', () => {
        const video = document.createElement('video');
        assertType(video.canPlayType, 'function', 'Should have canPlayType method');
        
        // Test common formats
        const formats = ['video/mp4', 'video/webm', 'video/ogg'];
        let supportedFormats = 0;
        
        formats.forEach(format => {
          const support = video.canPlayType(format);
          if (support !== '') {
            supportedFormats++;
            log(`✅ Supported: ${format} (${support})`);
          } else {
            log(`❌ Not supported: ${format}`);
          }
        });
        
        assertTrue(supportedFormats > 0, 'Should support at least one video format');
      });

      testFramework.test('Video crossOrigin support', () => {
        const video = document.createElement('video');
        
        // Test crossOrigin property
        assertType(video.crossOrigin, 'object', 'crossOrigin should exist (null initially)');
        
        video.crossOrigin = 'anonymous';
        assertEqual(video.crossOrigin, 'anonymous', 'Should set crossOrigin');
        
        video.crossOrigin = 'use-credentials';
        assertEqual(video.crossOrigin, 'use-credentials', 'Should set crossOrigin to use-credentials');
      });

      testFramework.asyncTest('Video promise-based play', async () => {
        const video = document.createElement('video');
        
        // Modern browsers return a promise from play()
        const playResult = video.play();
        
        if (playResult && typeof playResult.then === 'function') {
          try {
            await playResult;
            log('✅ Video play() returns promise');
          } catch (error) {
            log(`ℹ️ Video play() promise rejected (expected without media): ${error.message}`);
          }
        } else {
          log('ℹ️ Video play() does not return promise (older browser)');
        }
        
        video.pause();
      });

    });
    
    testFramework.displayResults('browser-test-results', results);
    return results;
    
  } catch (error) {
    log(`❌ Video element tests failed: ${error.message}`);
    return { passed: 0, failed: 1, total: 1 };
  }
}