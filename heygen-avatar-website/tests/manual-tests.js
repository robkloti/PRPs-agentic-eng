// Manual tests requiring user interaction

async function testMicrophonePermission() {
  log('🎤 Testing microphone permission...');
  
  const button = event.target;
  button.disabled = true;
  button.textContent = 'Testing...';
  
  try {
    const results = await testFramework.suite('Microphone Permission', function() {
      
      testFramework.asyncTest('Request microphone access', async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: CONFIG.AUDIO_CONSTRAINTS
          });
          
          assertTrue(stream instanceof MediaStream, 'Should get MediaStream');
          assertTrue(stream.getAudioTracks().length > 0, 'Should have audio tracks');
          
          const audioTrack = stream.getAudioTracks()[0];
          assertEqual(audioTrack.kind, 'audio', 'Should be audio track');
          assertEqual(audioTrack.readyState, 'live', 'Track should be live');
          
          // Test track properties
          assertType(audioTrack.label, 'string', 'Should have label');
          assertType(audioTrack.id, 'string', 'Should have ID');
          
          log(`✅ Microphone access granted: ${audioTrack.label}`);
          
          // Clean up
          stream.getTracks().forEach(track => track.stop());
          
        } catch (error) {
          if (error.name === 'NotAllowedError') {
            log('❌ Microphone permission denied by user');
            throw new Error('Microphone permission denied - please allow microphone access and try again');
          } else if (error.name === 'NotFoundError') {
            log('❌ No microphone found');
            throw new Error('No microphone device found');
          } else {
            log(`❌ Microphone access failed: ${error.message}`);
            throw error;
          }
        }
      });

      testFramework.asyncTest('Enumerate audio devices', async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioInputs = devices.filter(device => device.kind === 'audioinput');
          
          assertTrue(audioInputs.length > 0, 'Should find at least one audio input device');
          
          audioInputs.forEach((device, index) => {
            assertType(device.deviceId, 'string', `Device ${index} should have deviceId`);
            assertType(device.label, 'string', `Device ${index} should have label`);
            assertEqual(device.kind, 'audioinput', `Device ${index} should be audio input`);
            
            log(`📱 Audio device ${index + 1}: ${device.label || 'Unknown Device'}`);
          });
          
        } catch (error) {
          log(`❌ Failed to enumerate devices: ${error.message}`);
          throw error;
        }
      });

      testFramework.asyncTest('Test audio constraints', async () => {
        try {
          const constraints = CONFIG.AUDIO_CONSTRAINTS;
          const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
          
          const audioTrack = stream.getAudioTracks()[0];
          const settings = audioTrack.getSettings();
          
          log(`🔧 Audio settings: ${JSON.stringify(settings, null, 2)}`);
          
          // Verify constraints were applied
          if (constraints.sampleRate && settings.sampleRate) {
            assertType(settings.sampleRate, 'number', 'Should have sample rate');
          }
          
          if (constraints.echoCancellation !== undefined && settings.echoCancellation !== undefined) {
            assertEqual(settings.echoCancellation, constraints.echoCancellation, 'Echo cancellation should match constraint');
          }
          
          if (constraints.noiseSuppression !== undefined && settings.noiseSuppression !== undefined) {
            assertEqual(settings.noiseSuppression, constraints.noiseSuppression, 'Noise suppression should match constraint');
          }
          
          // Clean up
          stream.getTracks().forEach(track => track.stop());
          
        } catch (error) {
          log(`❌ Audio constraints test failed: ${error.message}`);
          throw error;
        }
      });

    });
    
    testFramework.displayResults('manual-test-results', results);
    log(`✅ Microphone test completed: ${results.passed} passed, ${results.failed} failed`);
    
  } catch (error) {
    log(`❌ Microphone test failed: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = 'Test Microphone Permission';
  }
}

async function testRecordingFlow() {
  log('🎬 Testing recording flow...');
  
  const button = event.target;
  button.disabled = true;
  button.textContent = 'Testing...';
  
  try {
    const results = await testFramework.suite('Recording Flow', function() {
      
      testFramework.asyncTest('Full recording workflow', async () => {
        const audioRecorder = new AudioRecorder();
        
        // Wait for initialization
        await testFramework.timeout(1000);
        
        try {
          log('🎤 Starting recording test (3 seconds)...');
          
          // Start recording
          await audioRecorder.startRecording();
          assertTrue(audioRecorder.isRecording, 'Should be recording');
          
          const state = audioRecorder.getRecordingState();
          assertTrue(state.isRecording, 'State should show recording');
          assertTrue(state.hasStream, 'Should have media stream');
          assertTrue(state.hasMediaRecorder, 'Should have MediaRecorder');
          
          log('🔴 Recording started - please speak for 3 seconds...');
          
          // Record for 3 seconds
          await testFramework.timeout(3000);
          
          // Stop recording
          const audioBlob = await audioRecorder.stopRecording();
          
          assertInstanceOf(audioBlob, Blob, 'Should return Blob');
          assertTrue(audioBlob.size > 0, 'Blob should have content');
          assertTrue(audioBlob.type.startsWith('audio/'), 'Should be audio blob');
          
          log(`✅ Recording completed: ${Utils.formatFileSize(audioBlob.size)}, type: ${audioBlob.type}`);
          
          // Test blob URL creation
          const blobUrl = Utils.createBlobUrl(audioBlob);
          assertType(blobUrl, 'string', 'Should create blob URL');
          assertTrue(blobUrl.startsWith('blob:'), 'Should be blob URL');
          
          // Clean up
          Utils.revokeBlobUrl(blobUrl);
          audioRecorder.cleanup();
          
        } catch (error) {
          if (error.name === 'NotAllowedError') {
            throw new Error('Microphone permission required for recording test');
          }
          throw error;
        }
      });

      testFramework.asyncTest('Recording time limits', async () => {
        const audioRecorder = new AudioRecorder();
        
        // Set short duration for testing
        audioRecorder.updateSettings({ maxDuration: 2000 }); // 2 seconds
        
        try {
          log('⏱️ Testing recording time limit (2 seconds)...');
          
          const startTime = Date.now();
          await audioRecorder.startRecording();
          
          // Wait for auto-stop
          await testFramework.timeout(3000); // Wait 3 seconds
          
          const elapsed = Date.now() - startTime;
          assertTrue(elapsed >= 2000, 'Should record for at least 2 seconds');
          assertTrue(elapsed < 3000, 'Should auto-stop before 3 seconds');
          
          assertFalse(audioRecorder.isRecording, 'Should have stopped recording');
          
          log(`✅ Auto-stop worked after ${elapsed}ms`);
          
        } catch (error) {
          if (error.name === 'NotAllowedError') {
            throw new Error('Microphone permission required for time limit test');
          }
          throw error;
        } finally {
          audioRecorder.cleanup();
        }
      });

    });
    
    testFramework.displayResults('manual-test-results', results);
    log(`✅ Recording flow test completed: ${results.passed} passed, ${results.failed} failed`);
    
  } catch (error) {
    log(`❌ Recording flow test failed: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = 'Test Recording Flow';
  }
}

async function testVideoTransition() {
  log('🎬 Testing video transition...');
  
  const button = event.target;
  button.disabled = true;
  button.textContent = 'Testing...';
  
  try {
    // Create test video elements
    const testContainer = document.createElement('div');
    testContainer.style.cssText = 'width: 400px; height: 300px; background: #000; margin: 20px 0; position: relative;';
    testContainer.innerHTML = `
      <video id="test-idle-video" style="width: 100%; height: 100%; object-fit: cover;" muted loop>
        <source src="data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMWF2YzEAAAAIZnJlZQAAAO5tZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE1MiByMjg1NCBlOWE1OTAzIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxOCAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4Mzoz" type="video/mp4">
      </video>
      <video id="test-response-video" style="width: 100%; height: 100%; object-fit: cover; display: none;">
        <source src="data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMWF2YzEAAAAIZnJlZQAAAO5tZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE1MiByMjg1NCBlOWE1OTAzIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxOCAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4Mzoz" type="video/mp4">
      </video>
      <div id="test-video-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; color: white;">
        <div>Loading test video...</div>
      </div>
    `;
    
    const manualResults = document.getElementById('manual-test-results');
    manualResults.appendChild(testContainer);
    
    const results = await testFramework.suite('Video Transition', function() {
      
      testFramework.asyncTest('VideoManager initialization', async () => {
        const videoManager = new VideoManager('data:video/mp4;base64,AAAAIGZ0eXBpc29t', testContainer);
        
        assertInstanceOf(videoManager, VideoManager);
        assertNotNull(videoManager.idleVideo);
        assertNotNull(videoManager.responseVideo);
        
        // Wait for initialization
        await testFramework.timeout(2000);
        
        const state = videoManager.getState();
        log(`📊 VideoManager state: ${JSON.stringify(state, null, 2)}`);
        
        assertEqual(state.currentMode, CONFIG.AVATAR_MODES.N8N);
        assertType(state.currentState, 'string');
        
        videoManager.destroy();
      });

      testFramework.asyncTest('Video element properties', async () => {
        const idleVideo = document.getElementById('test-idle-video');
        const responseVideo = document.getElementById('test-response-video');
        
        assertNotNull(idleVideo, 'Should have idle video element');
        assertNotNull(responseVideo, 'Should have response video element');
        
        // Test video properties
        assertTrue(idleVideo.muted, 'Idle video should be muted');
        assertTrue(idleVideo.loop, 'Idle video should loop');
        
        // Test video methods exist
        assertType(idleVideo.play, 'function');
        assertType(idleVideo.pause, 'function');
        assertType(idleVideo.load, 'function');
        
        log('✅ Video elements configured correctly');
      });

      testFramework.asyncTest('Video transition simulation', async () => {
        const idleVideo = document.getElementById('test-idle-video');
        const responseVideo = document.getElementById('test-response-video');
        const overlay = document.getElementById('test-video-overlay');
        
        log('🎬 Simulating video transition...');
        
        // Hide overlay
        overlay.style.display = 'none';
        
        // Show idle video
        idleVideo.style.display = 'block';
        idleVideo.classList.add('active');
        
        await testFramework.timeout(1000);
        log('📺 Idle video shown');
        
        // Simulate transition to response
        idleVideo.style.opacity = '0';
        responseVideo.style.display = 'block';
        responseVideo.style.opacity = '1';
        responseVideo.classList.add('active');
        
        await testFramework.timeout(1000);
        log('🎭 Transitioned to response video');
        
        // Simulate return to idle
        responseVideo.style.opacity = '0';
        responseVideo.classList.remove('active');
        responseVideo.style.display = 'none';
        
        idleVideo.style.opacity = '1';
        
        await testFramework.timeout(1000);
        log('↩️ Returned to idle video');
        
        assertTrue(idleVideo.classList.contains('active'), 'Idle video should be active');
        assertFalse(responseVideo.classList.contains('active'), 'Response video should not be active');
      });

    });
    
    testFramework.displayResults('manual-test-results', results);
    log(`✅ Video transition test completed: ${results.passed} passed, ${results.failed} failed`);
    
    // Keep the test container for visual inspection
    const keepButton = document.createElement('button');
    keepButton.textContent = 'Remove Test Video';
    keepButton.className = 'test-button';
    keepButton.onclick = () => {
      testContainer.remove();
      keepButton.remove();
    };
    manualResults.appendChild(keepButton);
    
  } catch (error) {
    log(`❌ Video transition test failed: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = 'Test Video Transition';
  }
}

// Helper function for manual testing
function createInteractiveTest(name, description, testFn) {
  return {
    name,
    description,
    run: testFn,
    isManual: true
  };
}

// Collection of manual tests
const manualTests = [
  createInteractiveTest(
    'Microphone Permission',
    'Tests microphone access and audio device enumeration',
    testMicrophonePermission
  ),
  
  createInteractiveTest(
    'Recording Flow',
    'Tests complete audio recording workflow with user interaction',
    testRecordingFlow
  ),
  
  createInteractiveTest(
    'Video Transition',
    'Tests video element transitions and visual effects',
    testVideoTransition
  ),
  
  createInteractiveTest(
    'Full Application',
    'Tests the complete application workflow',
    async function() {
      log('🚀 Loading full application for manual testing...');
      
      // This test loads the actual application
      const iframe = document.createElement('iframe');
      iframe.src = '../index.html';
      iframe.style.cssText = 'width: 100%; height: 600px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; margin-top: 20px;';
      
      const manualResults = document.getElementById('manual-test-results');
      
      // Remove existing iframe
      const existingIframe = manualResults.querySelector('iframe');
      if (existingIframe) {
        existingIframe.remove();
      }
      
      manualResults.appendChild(iframe);
      
      return new Promise((resolve) => {
        iframe.onload = () => {
          log('✅ Application loaded successfully');
          log('👆 Please interact with the application above to test functionality');
          resolve();
        };
        
        iframe.onerror = () => {
          log('❌ Failed to load application');
          resolve();
        };
      });
    }
  )
];

// Export manual tests for external access
if (typeof window !== 'undefined') {
  window.manualTests = manualTests;
}