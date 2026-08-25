# PRP: HeyGen Streaming Avatar Application

## Goal
Create a production-ready web application that integrates HeyGen's Streaming Avatar SDK for real-time voice conversations with a custom avatar. The app should be clean, professional, and completely separate from any D-ID implementations.

## Why
- **Clean Implementation**: Build from scratch without legacy code conflicts
- **Modern Architecture**: Use latest HeyGen Streaming Avatar SDK (v2.1.0+)
- **Voice-First Experience**: Enable seamless voice conversations with custom avatar
- **Professional UI**: Beautiful, responsive interface for avatar interactions
- **Independent Deployment**: Separate from existing D-ID implementations

## What (User-Visible Behavior)
1. **Landing Page**: Beautiful gradient background with avatar preview
2. **Voice Chat**: Click-to-start voice conversations with custom avatar
3. **Real-time Responses**: 2-4 second response times with avatar video stream
4. **Modern UI**: Glass-morphism design with smooth animations
5. **Mobile Responsive**: Works perfectly on all devices
6. **Error Handling**: Graceful fallbacks and user-friendly error messages

## All Needed Context

### HeyGen Streaming Avatar SDK Documentation
- **Official SDK**: `@heygen/streaming-avatar` v2.1.0
- **API Docs**: https://docs.heygen.com/docs/streaming-avatar-sdk-v2-guide
- **Key Classes**: `StreamingAvatar`, `AvatarQuality`, `VoiceEmotion`
- **Authentication**: Requires API token from HeyGen dashboard

### Your Avatar Configuration
```javascript
{
  avatarId: "58e445efc9d24453baeeb9d89f1bfa0b",
  voiceId: "4236dcb88773404baee23e847a559efb",
  apiToken: "your-heygen-api-token" // From dashboard
}
```

### Technical Requirements
- **Framework**: Vanilla JavaScript (no React complexity)
- **Build Tool**: Vite for modern development
- **Styling**: Modern CSS with animations
- **Audio**: WebRTC for voice input/output
- **Error Recovery**: Retry logic and fallbacks

### Design Pattern
```
┌─────────────────────────────────────┐
│           Landing Screen            │
│  ┌─────────────────────────────────┐ │
│  │     Avatar Preview Image        │ │
│  └─────────────────────────────────┘ │
│         [Start Conversation]         │
└─────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────┐
│          Active Chat Screen         │
│  ┌─────────────────────────────────┐ │
│  │      Live Avatar Video          │ │
│  │       (Streaming)               │ │
│  └─────────────────────────────────┘ │
│    🎤 [Hold to Talk]  💬 [Text]     │
└─────────────────────────────────────┘
```

### Critical SDK Integration Points
```javascript
// 1. Initialize Avatar
const avatar = new StreamingAvatar({ token });

// 2. Create Session
await avatar.createStartAvatar({
  avatarName: "your-avatar-id",
  quality: AvatarQuality.High,
  voice: { voiceId: "your-voice-id" }
});

// 3. Start Voice Chat
await avatar.startVoiceChat();

// 4. Handle Events
avatar.on('stream_ready', (event) => {
  // Display video stream
});
```

### Common Pitfalls & Solutions
1. **Token Issues**: Ensure API token is valid and not base64 encoded
2. **CORS Problems**: Serve from proper domain, not file://
3. **Audio Permissions**: Request microphone access early
4. **Stream Display**: Properly handle MediaStream in video element
5. **Memory Leaks**: Clean up avatar sessions on page unload

## Implementation Blueprint

### Project Structure
```
heygen-streaming-app/
├── index.html              # Entry point
├── package.json            # Dependencies
├── vite.config.js          # Build configuration
├── src/
│   ├── main.js            # Application entry
│   ├── avatar-manager.js   # HeyGen SDK wrapper
│   ├── ui-controller.js    # UI state management
│   ├── audio-handler.js    # Microphone/audio logic
│   └── styles/
│       ├── main.css       # Core styles
│       └── animations.css # UI animations
├── public/
│   └── avatar-preview.jpg # Avatar preview image
└── .env                   # Environment variables
```

### Core Implementation Steps

#### Step 1: Project Setup
```bash
npm create vite@latest heygen-streaming-app --template vanilla
cd heygen-streaming-app
npm install @heygen/streaming-avatar
```

#### Step 2: Environment Configuration
```env
VITE_HEYGEN_API_TOKEN=your-actual-token-here
VITE_HEYGEN_AVATAR_ID=58e445efc9d24453baeeb9d89f1bfa0b
VITE_HEYGEN_VOICE_ID=4236dcb88773404baee23e847a559efb
```

#### Step 3: Avatar Manager Class
```javascript
class AvatarManager {
  constructor(config) {
    this.avatar = null;
    this.config = config;
    this.isConnected = false;
  }

  async initialize() {
    this.avatar = new StreamingAvatar({
      token: this.config.apiToken
    });

    await this.avatar.createStartAvatar({
      avatarName: this.config.avatarId,
      quality: AvatarQuality.High,
      voice: {
        voiceId: this.config.voiceId,
        emotion: VoiceEmotion.FRIENDLY
      }
    });

    this.setupEventHandlers();
    await this.avatar.startVoiceChat();
    this.isConnected = true;
  }

  setupEventHandlers() {
    this.avatar.on('stream_ready', this.handleStreamReady);
    this.avatar.on('avatar_start_talking', this.handleSpeaking);
    this.avatar.on('avatar_stop_talking', this.handleSilence);
  }
}
```

#### Step 4: UI Controller
```javascript
class UIController {
  constructor(avatarManager) {
    this.avatarManager = avatarManager;
    this.videoElement = document.getElementById('avatar-video');
    this.setupEventListeners();
  }

  showLandingScreen() {
    // Display avatar preview and start button
  }

  showChatScreen() {
    // Display live avatar video and controls
  }

  handleStartConversation() {
    this.avatarManager.initialize()
      .then(() => this.showChatScreen())
      .catch(this.handleError);
  }
}
```

### Task Breakdown
1. **Setup Vite Project** - Create clean project structure
2. **Install Dependencies** - Add HeyGen SDK and dev tools
3. **Create Avatar Manager** - Wrap SDK with error handling
4. **Build UI Controller** - Handle screen transitions and user input
5. **Add Audio Handler** - Manage microphone permissions and audio
6. **Style Interface** - Beautiful animations and responsive design
7. **Test Integration** - Validate all functionality works end-to-end
8. **Add Error Recovery** - Graceful handling of connection issues
9. **Optimize Performance** - Ensure smooth video streaming
10. **Deploy Setup** - Configure for production hosting

## Validation Loop

### Level 1: Basic Setup ✅
```bash
npm run dev
# ✓ Server starts on localhost:5173
# ✓ Page loads without console errors
# ✓ Environment variables loaded correctly
```

### Level 2: Avatar Connection ✅
```bash
# ✓ HeyGen API token validates
# ✓ Avatar initializes without errors
# ✓ Stream ready event fires
# ✓ Video element receives MediaStream
```

### Level 3: Voice Interaction ✅
```bash
# ✓ Microphone permission granted
# ✓ Voice input detected
# ✓ Avatar responds with speech and animation
# ✓ Audio output clear and synchronized
```

### Level 4: UI/UX Polish ✅
```bash
# ✓ Smooth transitions between screens
# ✓ Responsive design works on mobile
# ✓ Loading states provide feedback
# ✓ Error messages are user-friendly
```

### Level 5: Production Ready ✅
```bash
npm run build
# ✓ Build succeeds without warnings
# ✓ Assets optimized and minified
# ✓ Works with production domain
# ✓ Performance metrics acceptable
```

This PRP provides everything needed for a clean, professional HeyGen streaming avatar implementation that's completely separate from your D-ID setup.