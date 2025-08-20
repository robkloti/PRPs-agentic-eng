## Migration Path to Interactive Avatar API

### Phase 2: Seamless Real-Time Upgrade

The beauty of this architecture is that the UX remains identical when migrating to Interactive Avatar API:

```javascript
// Phase 1: N8N Mode (Current)
// User sees: Idle Loop → [Record Voice] → Processing (45s) → Response Video → Idle Loop

// Phase 2: Interactive Avatar Mode (Future)  
// User sees: Idle Loop → [Record Voice] → Live Avatar Response (2-4s) → Idle Loop

class AvatarManager {
  constructor() {
    this.mode = AvatarMode.N8N; // Start with cost-effective N8N
    this.idleVideo = null;      // Same idle video for both modes
    this.interactiveSession = null;
  }
  
  async handleUserInput(audioBlob) {
    switch(this.mode) {
      case AvatarMode.N8N:
        // Current: Send to N8N webhook
        return await this.n8nWorkflow(audioBlob);
        
      case AvatarMode.INTERACTIVE:
        // Future: Send to Interactive Avatar
        return await this.interactiveWorkflow(audioBlob);
    }
  }
  
  async interactiveWorkflow(audioBlob) {
    // FUTURE IMPLEMENTATION:
    // 1. Start Interactive Avatar session (only when user speaks)
    // 2. Stream audio to avatar  
    // 3. Get real-time response
    // 4. Close session immediately (minimize billing)
    // 5. Return to idle loop
    
    // Key: Same idle video continues throughout
    // User never sees session start/stop
    // Billing optimized through smart session management
  }
}
```

### Cost Optimization Strategy for Interactive Avatar:

1. **Lazy Session Creation**: Only start Interactive Avatar when user actually speaks
2. **Immediate Teardown**: Close session right after response  
3. **Idle Video Continuation**: Keep showing same idle loop during sessions
4. **Smart Batching**: If multiple questions, keep session alive briefly
5. **Fallback Mode**: Drop back to N8N if Interactive Avatar fails

This approach gives you:
- **Same UX** regardless of backend
- **Cost control** through session management  
- **Risk mitigation** with N8N fallback
- **Easy A/B testing** between modes
- **Gradual migration** without breaking changes# HeyGen Interactive Avatar Website - MVP PRP

**name:** "Seamless Interactive Avatar Website with N8N Integration"
**description:** |

## Purpose
Build a seamless web application that displays a looping HeyGen avatar and enables voice interactions through N8N webhook integration. The system should provide an uninterrupted user experience where the avatar appears to be "thinking" until responding with AI-generated content.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance

---

## Goal
Create a cost-effective MVP web application where users can interact with a HeyGen avatar through voice input. The system should seamlessly transition from idle loop video to response video, connected to existing N8N workflow. Architecture should support future migration to Interactive Avatar API while maintaining the same seamless idle→active→idle UX pattern.

## Why
- **Business value**: Creates an engaging, human-like interface for customer interactions
- **User experience**: Provides seamless, natural conversation flow without obvious AI breaks
- **Integration**: Leverages existing N8N workflow and ChatGPT setup
- **Problems solved**: Eliminates jarring transitions and loading states in avatar interactions

## What
A cost-controlled responsive web application featuring:
- Looping idle HeyGen avatar video (generated with VO3 or similar)
- Voice recording capability with microphone activation
- N8N webhook integration for ChatGPT processing (MVP phase)
- Seamless video transition from idle to response state
- Cost controls and usage limits for affordable testing
- Modular architecture for future Interactive Avatar API migration
- Cross-browser audio/video compatibility
- Mobile-responsive design for tablet/kiosk deployment

### Success Criteria
- [ ] Avatar loops seamlessly in idle state
- [ ] Voice recording triggers N8N webhook successfully
- [ ] Video transitions are smooth and imperceptible
- [ ] Cost controls prevent overages during testing
- [ ] Works across modern browsers (Chrome, Firefox, Safari, Edge)
- [ ] Responsive design works on tablets/kiosks
- [ ] Engaging UX during 45-second processing time
- [ ] Error handling for network/API failures
- [ ] Architecture supports seamless migration to Interactive Avatar API

### Future Migration Success Criteria
- [ ] Same idle loop video maintained during Interactive Avatar sessions
- [ ] Interactive Avatar only activates during conversation
- [ ] Returns to idle seamlessly after conversation ends
- [ ] No visible difference in UX between N8N and Interactive Avatar modes
- [ ] Cost-effective session management (minimize idle time charges)

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://docs.heygen.com/v2/video/generate
  why: Core video generation API for responses
  
- url: https://docs.heygen.com/docs/streaming-api
  why: Future migration to Interactive Avatar SDK
  
- url: https://github.com/HeyGen-Official/InteractiveAvatarNextJSDemo
  why: Reference implementation patterns
  
- url: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
  why: Browser audio recording implementation
  
- url: https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement
  why: Video element control and events
  
- url: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
  why: N8N webhook configuration patterns
  
- doc: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
  section: Audio recording and processing
```

### Current Setup Context
```yaml
N8N_WORKFLOW:
  - ChatGPT node configured for conversation
  - 11Labs integration working
  - Webhook endpoint available
  - Expects audio input for transcription
  
HEYGEN_SETUP:
  - API key available
  - Avatar ID identified
  - Voice ID configured
  - Basic video generation working
  
FUTURE_MIGRATION:
  - Interactive Avatar API for real-time
  - Streaming SDK integration
  - WebRTC for lower latency
```

### Known Gotchas & Library Quirks
```javascript
// CRITICAL: N8N workflow takes 30-45 seconds (STT + ChatGPT + HeyGen + polling)
// CRITICAL: Webhook expects FormData with 'file' parameter (not 'audio')
// CRITICAL: Browser security requires user gesture for microphone access
// CRITICAL: Video preloading for smooth transitions - use video.preload = "metadata"
// CRITICAL: Mobile Safari has different audio/video behavior - test thoroughly
// CRITICAL: Response format: {data: {video_url: "https://..."}} from status check
// CRITICAL: Video crossOrigin issues with HeyGen URLs - may need proxy
// CRITICAL: MediaRecorder codec support varies - use webm/mp4 fallbacks
// CRITICAL: Audio context must be created after user interaction
// CRITICAL: Video autoplay policies vary by browser - muted autoplay only
// CRITICAL: Long processing time requires engaging UX to keep user waiting
// CRITICAL: Cost controls needed - limit recording time and daily usage
// FUTURE: Interactive Avatar API sessions charge per minute (including idle time)
// FUTURE: Seamless idle→Interactive→idle transition requires careful session management
// FUTURE: Interactive Avatar SDK requires WebRTC and specific browser support
```

## Implementation Blueprint

### Data models and structure

```javascript
// types.js - Core data structures
export const RecordingState = {
  IDLE: 'idle',
  RECORDING: 'recording', 
  PROCESSING: 'processing',
  PLAYING_RESPONSE: 'playing_response'
};

export const VideoState = {
  LOADING: 'loading',
  PLAYING: 'playing',
  ERROR: 'error'
};

export const CostControls = {
  MAX_RECORDING_TIME: 10000, // 10 seconds for MVP
  MAX_DAILY_INTERACTIONS: 50,
  DAILY_COST_LIMIT: 100, // $100 daily limit
  WARNING_THRESHOLD: 80 // Warn at 80% of limit
};

export const AvatarMode = {
  N8N: 'n8n',           // MVP mode using N8N workflow
  INTERACTIVE: 'interactive', // Future: Interactive Avatar API
  FALLBACK: 'fallback'   // Error fallback mode
};

export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.maxDuration = CostControls.MAX_RECORDING_TIME;
  }
}

export class VideoManager {
  constructor() {
    this.idleVideo = null;
    this.responseVideo = null;
    this.interactiveSession = null; // For future Interactive Avatar
    this.currentState = VideoState.LOADING;
    this.currentMode = AvatarMode.N8N;
  }
}

export class CostTracker {
  constructor() {
    this.dailyInteractions = 0;
    this.dailyCost = 0;
    this.lastResetDate = new Date().toDateString();
  }
}

export class WebhookClient {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
    this.timeout = 60000; // 60 seconds for full N8N workflow
    this.costTracker = new CostTracker();
  }
}
```

### Desired Project Structure
```bash
heygen-avatar-website/
├── index.html                    # Main application entry
├── css/
│   ├── styles.css               # Main styles with responsive design
│   └── animations.css           # CSS animations for transitions
├── js/
│   ├── main.js                  # Application initialization
│   ├── audio-recorder.js        # Audio recording with cost controls
│   ├── video-manager.js         # Video state management + future Interactive Avatar
│   ├── webhook-client.js        # N8N webhook communication
│   ├── ui-controller.js         # UI state management with cost feedback
│   ├── cost-tracker.js          # Usage and cost monitoring
│   ├── interactive-avatar.js    # Future: Interactive Avatar API integration
│   └── utils.js                 # Utility functions
├── assets/
│   ├── icons/                   # UI icons (microphone, etc.)
│   └── fallback/               # Fallback content for errors
├── config/
│   └── config.js               # Configuration constants
├── tests/
│   ├── test.html               # Browser-based test runner
│   ├── audio-recorder.test.js  # Audio recording tests
│   ├── video-manager.test.js   # Video management tests
│   └── integration.test.js     # End-to-end tests
├── .env.example                # Environment configuration template
├── package.json                # Dependencies (if using build tools)
├── README.md                   # Setup and deployment instructions
└── server/                     # Optional local server for development
    └── server.js               # Simple HTTP server
```

### List of tasks to be completed

```yaml
Task 1: Setup Project Structure and Configuration
CREATE index.html:
  - PATTERN: Single-page application with video elements
  - Semantic HTML5 structure with accessibility
  - Meta tags for mobile responsiveness
  - Preload hints for critical resources

CREATE config/config.js:
  - PATTERN: Environment-based configuration
  - N8N webhook URL configuration
  - HeyGen API endpoints and settings
  - Recording parameters and timeouts

Task 2: Implement Video Management System with Future Interactive Avatar Support
CREATE js/video-manager.js:
  - PATTERN: State machine for video transitions
  - Preload both idle and response videos
  - Seamless switching between video sources
  - Error handling for video load failures
  - Crossorigin handling for HeyGen videos
  - Future: Interactive Avatar session management
  - Future: Seamless idle→Interactive→idle transitions

Task 3: Implement Audio Recording with Cost Controls
CREATE js/audio-recorder.js:
  - PATTERN: MediaRecorder API with fallbacks
  - Support for multiple audio formats (webm, mp4)
  - Recording time limits (10 seconds for MVP)
  - Auto-stop functionality to prevent overages
  - Audio level detection for better UX
  - Browser compatibility checks
  - Cost tracking integration

Task 4: Create N8N Webhook Integration with Cost Monitoring
CREATE js/webhook-client.js:
  - PATTERN: FormData upload for audio files
  - Retry logic with exponential backoff
  - Timeout handling and error recovery
  - Response parsing for video URLs
  - Progress tracking for user feedback
  - Daily usage limits and cost tracking
  - Graceful degradation on limit reached

Task 5: Develop UI Controller with Cost Feedback and Extended Processing UX
CREATE js/ui-controller.js:
  - PATTERN: Event-driven UI state management
  - Microphone button with visual feedback
  - Extended processing indicators (45-second workflow)
  - Progress messaging ("Transcribing...", "Thinking...", "Generating response...")
  - Cost usage display and warnings
  - Error message handling with retry options
  - Mobile-friendly touch interactions
  - Keep-alive animations during long processing

Task 6: Implement Cost Tracking System
CREATE js/cost-tracker.js:
  - PATTERN: Local storage for usage tracking
  - Daily interaction counting and cost estimation
  - Warning thresholds and limit enforcement
  - Usage analytics and reporting
  - Reset functionality for new days

Task 7: Prepare Interactive Avatar Integration (Future)
CREATE js/interactive-avatar.js:
  - PATTERN: Modular design for easy swapping
  - Same idle video loop behavior
  - Session management to minimize costs
  - WebRTC setup and teardown
  - Fallback to N8N mode on errors
  - Seamless UX transition

Task 6: Style and Animation System
CREATE css/styles.css:
  - PATTERN: Mobile-first responsive design
  - Flexbox/Grid layouts for video container
  - Button styling with accessibility
  - Error state styling

CREATE css/animations.css:
  - PATTERN: Smooth transitions between states
  - Microphone pulse animations
  - Loading indicators
  - Video fade transitions

Task 7: Integration and Testing
CREATE tests/:
  - PATTERN: Browser-based testing with manual scenarios
  - Audio recording verification
  - Video transition testing
  - N8N webhook integration testing
  - Cross-browser compatibility checks

Task 8: Deployment Preparation
CREATE README.md:
  - PATTERN: Step-by-step setup instructions
  - Environment configuration guide
  - Troubleshooting common issues
  - Browser compatibility matrix
```

### Per task pseudocode

```javascript
// Task 2: Video Manager with Future Interactive Avatar Support
class VideoManager {
  constructor(idleVideoUrl, responseContainer) {
    this.idleVideo = this.createVideoElement(idleVideoUrl);
    this.responseContainer = responseContainer;
    this.currentState = 'idle';
    this.currentMode = AvatarMode.N8N;
    this.interactiveSession = null; // For future use
  }
  
  async preloadIdleVideo() {
    // PATTERN: Preload with error handling
    return new Promise((resolve, reject) => {
      this.idleVideo.onloadedmetadata = resolve;
      this.idleVideo.onerror = reject;
      this.idleVideo.preload = 'metadata';
      this.idleVideo.load();
    });
  }
  
  async switchToResponse(responseVideoUrl) {
    // CRITICAL: Seamless transition without flicker
    const responseVideo = this.createVideoElement(responseVideoUrl);
    
    // Preload response video while idle video continues
    await this.preloadVideo(responseVideo);
    
    // Smooth transition
    this.fadeTransition(this.idleVideo, responseVideo);
    
    // Return to idle when response ends
    responseVideo.onended = () => this.returnToIdle();
  }
  
  // FUTURE: Interactive Avatar Session Management
  async startInteractiveSession(avatarId, apiKey) {
    // This will replace N8N workflow in future
    // Keep same idle video until user speaks
    // Only start Interactive Avatar on voice input
    // Return to idle loop after conversation ends
    this.currentMode = AvatarMode.INTERACTIVE;
    
    // Implementation will use HeyGen Streaming SDK
    // But maintain same UX flow: idle → active → idle
  }
}

// Task 3: Audio Recorder with Cost Controls
class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.maxDuration = CostControls.MAX_RECORDING_TIME; // 10 seconds for MVP
    this.recordingTimer = null;
  }
  
  async startRecording() {
    // GOTCHA: Must be called from user gesture
    // COST CONTROL: Enforce maximum recording time
    
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      const options = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      
      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };
      
      // COST CONTROL: Auto-stop after max duration
      this.recordingTimer = setTimeout(() => {
        this.stopRecording();
      }, this.maxDuration);
      
      this.mediaRecorder.start();
    } catch (error) {
      throw new Error(`Microphone access denied: ${error.message}`);
    }
  }
  
  async stopRecording() {
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
    }
    
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { 
          type: this.mediaRecorder.mimeType 
        });
        this.cleanup();
        resolve(audioBlob);
      };
      
      this.mediaRecorder.stop();
    });
  }
}

// Task 4: Webhook Integration with Cost Tracking
class WebhookClient {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
    this.timeout = 60000; // 60 seconds for full N8N workflow
    this.costTracker = new CostTracker();
  }

  async sendAudioToN8N(audioBlob) {
    // COST CONTROL: Check daily limits
    if (!this.costTracker.canMakeRequest()) {
      throw new Error('Daily usage limit reached. Please try again tomorrow.');
    }
    
    const formData = new FormData();
    // CRITICAL: N8N expects 'file' parameter, not 'audio'
    formData.append('file', audioBlob, 'recording.webm');
    
    // PATTERN: Extended timeout for N8N workflow (STT + ChatGPT + HeyGen + polling)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      // COST TRACKING: Log successful interaction
      this.costTracker.logInteraction();
      
      // PATTERN: Extract video_url from N8N response structure
      if (result.data && result.data.video_url) {
        return result.data.video_url;
      } else {
        throw new Error('Invalid response format from N8N workflow');
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again (processing takes ~45 seconds)');
      }
      throw error;
    }
  }
}

// Task 6: Cost Tracking System
class CostTracker {
  constructor() {
    this.loadDailyStats();
  }
  
  loadDailyStats() {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('avatarUsage');
    
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === today) {
        this.dailyInteractions = data.interactions;
        this.dailyCost = data.cost;
        return;
      }
    }
    
    // Reset for new day
    this.dailyInteractions = 0;
    this.dailyCost = 0;
    this.saveDailyStats();
  }
  
  canMakeRequest() {
    return this.dailyInteractions < CostControls.MAX_DAILY_INTERACTIONS &&
           this.dailyCost < CostControls.DAILY_COST_LIMIT;
  }
  
  logInteraction(estimatedCost = 2.00) { // $2 estimated per N8N interaction
    this.dailyInteractions++;
    this.dailyCost += estimatedCost;
    this.saveDailyStats();
  }
  
  saveDailyStats() {
    const today = new Date().toDateString();
    localStorage.setItem('avatarUsage', JSON.stringify({
      date: today,
      interactions: this.dailyInteractions,
      cost: this.dailyCost
    }));
  }
  
  getUsageStats() {
    return {
      interactions: this.dailyInteractions,
      maxInteractions: CostControls.MAX_DAILY_INTERACTIONS,
      cost: this.dailyCost,
      maxCost: CostControls.DAILY_COST_LIMIT,
      warningThreshold: CostControls.WARNING_THRESHOLD
    };
  }
}
```

### Integration Points
```yaml
ENVIRONMENT:
  - add to: .env or config.js
  - vars: |
      # N8N Configuration (MVP Phase)
      N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/f6295fb1-89fb-4ff2-ba82-7457b4eb9fd5
      
      # Cost Controls
      MAX_RECORDING_TIME=10000
      MAX_DAILY_INTERACTIONS=50
      DAILY_COST_LIMIT=100
      ESTIMATED_COST_PER_INTERACTION=2.00
      
      # Application Settings
      IDLE_VIDEO_URL=https://your-cdn.com/idle-avatar-loop.mp4
      RESPONSE_TIMEOUT=60000
      
      # UI Feedback Messages
      PROCESSING_MESSAGE="Processing your request... (this takes about 45 seconds)"
      COST_WARNING_MESSAGE="Approaching daily usage limit"
      
      # Future: Interactive Avatar API (Phase 2)
      # HEYGEN_API_KEY=your-api-key
      # HEYGEN_AVATAR_ID=your-avatar-id
      # INTERACTIVE_SESSION_TIMEOUT=300000
      
CONFIG:
  - Idle video: Pre-generated looping avatar (using VO3)
  - Response videos: Generated by N8N workflow (STT → ChatGPT → HeyGen → polling)
  - Audio format: webm preferred, mp4 fallback
  - Processing time: 30-45 seconds (need engaging UX during wait)
  - Webhook format: FormData with 'file' parameter
  - Cost tracking: Local storage for daily usage monitoring
  
FUTURE_CONFIG:
  - Interactive Avatar: Same idle video, activate only during conversation
  - Session management: Minimize billable time through careful session control
  - Fallback: N8N mode available if Interactive Avatar fails
  - UX: Identical experience regardless of backend (N8N vs Interactive)
  
DEPENDENCIES:
  - Vanilla JavaScript (no frameworks for simplicity)
  - Modern browser APIs (MediaRecorder, Fetch, Video)
  - Optional: Simple HTTP server for local development
```

## Validation Loop

### Level 1: Basic Functionality
```bash
# Test in browser console - basic feature validation
# 1. Video loading
console.log('Testing idle video load...');
const video = document.querySelector('#idle-video');
video.play().then(() => console.log('✓ Idle video playing'));

# 2. Audio recording
console.log('Testing microphone access...');
navigator.mediaDevices.getUserMedia({audio: true})
  .then(() => console.log('✓ Microphone access granted'))
  .catch(err => console.error('✗ Microphone failed:', err));

# 3. Webhook connectivity
console.log('Testing N8N webhook...');
fetch(CONFIG.N8N_WEBHOOK_URL, {method: 'GET'})
  .then(response => console.log('✓ Webhook reachable:', response.status))
  .catch(err => console.error('✗ Webhook failed:', err));
```

### Level 2: Integration Testing
```javascript
// tests/integration.test.js
async function testFullWorkflow() {
  console.log('🧪 Testing full workflow...');
  
  // 1. Initialize components
  const videoManager = new VideoManager(CONFIG.IDLE_VIDEO_URL, '#video-container');
  const audioRecorder = new AudioRecorder();
  const webhookClient = new WebhookClient(CONFIG.N8N_WEBHOOK_URL);
  
  // 2. Test video loading
  await videoManager.preloadIdleVideo();
  console.log('✓ Idle video loaded');
  
  // 3. Test audio recording (requires user interaction)
  // Note: This test requires manual trigger
  document.getElementById('test-record').onclick = async () => {
    try {
      await audioRecorder.startRecording();
      console.log('✓ Recording started');
      
      setTimeout(async () => {
        const audioBlob = await audioRecorder.stopRecording();
        console.log('✓ Recording stopped, size:', audioBlob.size);
        
        // 4. Test webhook integration
        const responseVideoUrl = await webhookClient.sendAudioToN8N(audioBlob);
        console.log('✓ Webhook response:', responseVideoUrl);
        
        // 5. Test video transition
        await videoManager.switchToResponse(responseVideoUrl);
        console.log('✓ Video transition complete');
        
      }, 3000); // 3 second test recording
      
    } catch (error) {
      console.error('✗ Test failed:', error);
    }
  };
}

// Run test
testFullWorkflow();
```

### Level 3: Cross-Browser Testing
```bash
# Test across browsers - manual validation
echo "Testing Chrome..."
# Open in Chrome, test full workflow

echo "Testing Firefox..."
# Open in Firefox, test full workflow

echo "Testing Safari..."
# Open in Safari, test full workflow

echo "Testing Edge..."
# Open in Edge, test full workflow

# Check mobile compatibility
echo "Testing mobile Safari..."
# Open on iPhone/iPad

echo "Testing mobile Chrome..."
# Open on Android device
```

## Final Validation Checklist
- [ ] Idle video loops seamlessly without gaps
- [ ] Microphone button responsive and accessible
- [ ] Audio recording quality acceptable (tested with actual speech)
- [ ] N8N webhook receives audio and returns video URL
- [ ] Video transition smooth without flicker
- [ ] Error states handled gracefully with user feedback
- [ ] Works on desktop browsers (Chrome, Firefox, Safari, Edge)
- [ ] Works on mobile/tablet devices
- [ ] Performance acceptable on target hardware (kiosks/tablets)
- [ ] Accessibility features working (keyboard navigation, screen readers)

---

## Migration Path to Interactive Avatar API

### Phase 2: Future Enhancement
Once MVP is validated, migrate to HeyGen's Interactive Avatar API for true real-time interaction:

```javascript
// Future implementation using Streaming SDK
import { StreamingAvatar } from '@heygen/streaming-avatar';

const streamingAvatar = new StreamingAvatar({
  apiKey: process.env.HEYGEN_API_KEY,
  serverUrl: process.env.HEYGEN_SERVER_URL,
});

// Real-time voice chat
await streamingAvatar.startVoiceChat({
  useSilencePrompt: false,
  isInputAudioMuted: false
});
```

This migration will eliminate the N8N round-trip and provide true conversational AI experience.

## Anti-Patterns to Avoid
- ❌ Don't show loading spinners during video generation - use seamless idle loop
- ❌ Don't assume microphone permissions - always request gracefully  
- ❌ Don't use autoplay with sound - browsers block this
- ❌ Don't ignore mobile Safari's unique audio/video behavior
- ❌ Don't skip error handling for network failures
- ❌ Don't hardcode URLs - use configuration
- ❌ Don't forget HTTPS requirement for microphone access

## Confidence Score: 8/10

High confidence due to:
- Clear requirements and existing N8N workflow
- Well-documented HeyGen APIs and browser APIs
- Straightforward implementation using standard web technologies
- Clear migration path to advanced features

Minor uncertainty around:
- Specific video transition timing optimization
- Cross-browser audio format compatibility
- Optimal UX for processing delays