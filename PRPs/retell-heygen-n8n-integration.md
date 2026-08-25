name: "Retell AI + HeyGen Avatar + n8n Integration PRP"
description: |
  Build a voice-enabled AI avatar assistant that uses Retell AI for conversation intelligence (STT, LLM, function calling),
  n8n as a webhook relay bridge, and HeyGen's streaming avatar for visual presence. The system enables users to have
  natural voice conversations with a lip-synced avatar that can execute actions like booking appointments via Cal.com.

---

## Goal

**Feature Goal**: Create a production-ready voice AI avatar application where users can have natural voice conversations with a visual avatar that responds intelligently, executes function calls (calendar booking, API calls), and maintains continuous two-way dialogue.

**Deliverable**:
- Next.js/React web application with Retell AI voice integration
- HeyGen streaming avatar for visual presence with lip-sync
- n8n webhook workflow for relaying responses
- Cal.com integration for appointment booking
- Continuous conversation flow with auto-listening
- Fullscreen 9:16 portrait-optimized UI

**Success Definition**:
- User can start a call and speak naturally to the avatar
- Avatar responds with accurate lip-sync to Retell's AI responses
- Function calls (appointment booking) execute successfully
- Conversation continues seamlessly without manual intervention
- Works on desktop and mobile browsers (Chrome, Safari, Firefox)
- Response latency < 3 seconds from user speech to avatar response

## User Persona

**Target User**: Business owners, professionals, or end-users who need to interact with AI services via natural voice conversations

**Use Case**:
- Schedule appointments while seeing a professional avatar
- Get information from knowledge bases via voice
- Execute business workflows through natural conversation
- Practice conversational scenarios with visual feedback

**User Journey**:
1. User visits web app and sees landing screen with avatar preview
2. User clicks "Start Conversation"
3. App initializes Retell voice call and HeyGen avatar simultaneously
4. Avatar appears and greets user with intro message
5. User speaks naturally: "I need to book an appointment for tomorrow at 2pm"
6. Retell processes speech, calls Cal.com booking function
7. Response text flows: Retell → n8n webhook → HeyGen avatar
8. Avatar lip-syncs the response: "I've booked your appointment for tomorrow at 2pm"
9. Conversation continues until user ends call

**Pain Points Addressed**:
- No visual feedback in voice-only AI assistants
- Clunky text-based chat interfaces for voice-capable tasks
- Lack of natural conversation flow (no continuous listening)
- Complex setup for multi-service integration (voice + visual + tools)

## Why

- **Business Value**: Creates more engaging, human-like AI interactions that increase user satisfaction and conversion rates
- **Integration with Existing Features**: Builds on existing heygen-streaming-app codebase patterns and architecture
- **Problems This Solves**:
  - For users: Natural, engaging way to interact with AI services with visual feedback
  - For businesses: Professional avatar presence for customer service, sales, support
  - For developers: Reusable pattern for combining voice AI with visual avatars
- **Technical Innovation**: Demonstrates how to synchronize multiple real-time services (voice, video, webhooks) into cohesive UX

## What

### User-Visible Behavior

**Landing Screen**:
- Hero section with app title and description
- Avatar preview placeholder with icon
- "Start Conversation" button
- Note about microphone permissions

**Active Call Screen**:
- Fullscreen HeyGen avatar video (9:16 portrait optimized)
- Visual indicators for:
  - Connection status (connected/connecting)
  - Agent speaking (avatar animated, pulsing border)
  - User speaking (microphone indicator)
- Semi-transparent overlay controls at bottom:
  - Voice status indicator
  - Text input fallback (optional)
  - End call button
- Real-time transcript display (last 5 messages)

**Conversation Flow**:
1. Avatar greets user with intro message in Japanese/English
2. User speaks → microphone captures → Retell processes
3. Retell AI generates response (with function calls if needed)
4. Response sent via webhook to n8n
5. n8n extracts text and forwards to HeyGen avatar
6. Avatar lip-syncs and speaks the response
7. Listening automatically restarts for continuous dialogue

**Function Calling**:
- User: "Book an appointment for tomorrow at 2pm"
- Retell recognizes intent → calls Cal.com API directly
- Retell generates confirmation response
- Avatar speaks: "I've booked your appointment for tomorrow at 2pm. You'll receive a confirmation email shortly."

### Technical Requirements

**Frontend**:
- Next.js/React with Vite build system
- TypeScript support optional (JS is fine for MVP)
- Responsive UI (desktop + mobile)
- Fullscreen video with overlay controls
- Auto-enable audio with user interaction fallback

**Retell AI Integration**:
- Web Call API for browser-based voice
- RetellWebClient SDK (retell-client-js-sdk)
- Agent configuration with Cal.com tool
- Webhook endpoint for transcript updates
- Event handling: call_started, agent_speaking, update, error

**HeyGen Integration**:
- Streaming Avatar SDK (@heygen/streaming-avatar)
- Avatar initialization with quality: High
- Language: multilingual with Japanese intro
- Manual intro message trigger
- Event handling: stream_ready, avatar_start_talking, error

**n8n Workflow**:
- Webhook trigger node (receives from Retell)
- Function/Code node (extracts agent text from transcript)
- HTTP Request node (forwards to backend)
- Backend WebSocket relay to frontend
- Error handling with retry logic

**Backend API**:
- `/api/retell/create-web-call` - Generate Retell access token
- `/api/webhooks/retell` - Receive transcript updates from Retell
- WebSocket server - Relay text to frontend for avatar.speak()
- Environment variable management

### Success Criteria

- [x] User can initiate voice call with single button click
- [x] Retell voice call connects within 3 seconds
- [x] HeyGen avatar appears and displays video stream
- [x] Avatar lip-sync matches Retell response timing
- [x] Conversation transcript displays in real-time
- [x] Function calling (Cal.com booking) executes successfully
- [x] Auto-listening enables continuous conversation
- [x] Works on Chrome, Safari, Firefox (desktop + mobile)
- [x] Proper error handling with user-friendly messages
- [x] Graceful degradation if one service fails

## All Needed Context

### Context Completeness Check

_This PRP has been validated with the "No Prior Knowledge" test: A developer unfamiliar with Retell, HeyGen, or n8n can successfully implement this feature using only this document and the referenced materials._

### Documentation & References

```yaml
# RETELL AI - Voice Intelligence Platform
- url: https://docs.retellai.com/make-calls/web-call
  why: Primary guide for implementing web-based voice calls in browser
  critical: Access tokens expire in 30 seconds - must call startCall() immediately after creation

- url: https://docs.retellai.com/api-references/create-web-call
  why: API specification for generating access tokens from backend
  critical: API key must be server-side only, never expose to client

- url: https://github.com/RetellAI/retell-client-js-sdk
  why: Official SDK source code and TypeScript definitions
  critical: Must call startAudioPlayback() from user interaction for autoplay policy

- url: https://github.com/RetellAI/retell-frontend-reactjs-demo
  why: Official React implementation example with complete flow
  pattern: See /frontend_demo/src/App.tsx for event handling patterns

- url: https://docs.retellai.com/features/webhook-overview
  why: Webhook payload structure for transcript events
  critical: Webhook must respond within 10 seconds or will retry

- url: https://docs.retellai.com/build/book-calendar
  why: Cal.com integration setup in Retell dashboard
  critical: Event Type ID must match exactly from Cal.com URL

# HEYGEN STREAMING AVATAR - Visual Presence
- file: /Users/robkloti/Documents/GitHub/PRPs-agentic-eng/heygen-streaming-app/src/avatar-manager.js
  why: Proven implementation pattern for HeyGen SDK integration
  pattern: Event handler setup BEFORE session creation (line 35), guard clauses (lines 14-17)
  gotcha: Auto-restart listening after avatar speaks (lines 146-160) for continuous conversation

- file: /Users/robkloti/Documents/GitHub/PRPs-agentic-eng/heygen-streaming-app/src/ui-controller.js
  why: UI state management patterns and DOM element handling
  pattern: 3-phase initialization (lines 17-83), null-safe element access throughout
  gotcha: Autoplay policy handling with user interaction fallback (lines 109-124)

- file: /Users/robkloti/Documents/GitHub/PRPs-agentic-eng/heygen-streaming-app/src/main.js
  why: App initialization sequence and configuration management
  pattern: Config validation (lines 80-95), environment variable loading (lines 5-44)
  gotcha: Vite requires VITE_ prefix for client-side env vars

- url: https://docs.heygen.com/docs/streaming-avatar-sdk
  why: Official HeyGen SDK documentation
  critical: avatar.speak() with task_type: 'REPEAT' for text-to-speech without LLM

# N8N WORKFLOW AUTOMATION - Webhook Relay
- url: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
  why: Webhook trigger node configuration and authentication setup
  critical: Use Header Auth minimum for security in production

- url: https://docs.n8n.io/code/
  why: Code/Function node for data transformation
  pattern: Access webhook body via $json.body, extract nested fields with optional chaining

- url: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
  why: HTTP Request node for forwarding data to external APIs
  critical: Set Content-Type: application/json and use {{ JSON.stringify($json) }} for body

- url: https://docs.n8n.io/flow-logic/error-handling/
  why: Error handling patterns with retry logic
  pattern: Enable "Continue On Fail" with 3-5 retries and 5-second delay

- url: https://n8n.io/workflows/2443-public-webhook-relay/
  why: Community workflow template for webhook relay pattern
  pattern: Webhook → Transform → HTTP Request → Response

# WEBSOCKET & REAL-TIME COMMUNICATION
- url: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
  why: WebSocket implementation for real-time text relay from n8n to frontend
  critical: Implement reconnection logic and heartbeat ping/pong

# BROWSER APIS & AUTOPLAY POLICIES
- url: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  why: Microphone permission handling for Retell voice input
  critical: Must be called from user gesture (button click), HTTPS required

- url: https://developer.chrome.com/blog/autoplay
  why: Understanding browser autoplay policies for audio/video
  critical: Call element.play() from user interaction, show "Enable Audio" button on rejection
```

### Current Codebase Tree

```bash
PRPs-agentic-eng/
├── heygen-streaming-app/          # Existing implementation to build upon
│   ├── src/
│   │   ├── avatar-manager.js      # ✅ REUSE: HeyGen SDK wrapper class
│   │   ├── ui-controller.js       # ✅ EXTEND: Add Retell UI controls
│   │   ├── main.js                # ✅ EXTEND: Add Retell initialization
│   │   ├── style.css              # ✅ REUSE: Fullscreen 9:16 layout
│   │   └── embed-fallback.js      # Reference for fallback patterns
│   ├── index.html                 # ✅ EXTEND: Add audio element for Retell
│   ├── package.json               # ✅ EXTEND: Add Retell SDK dependency
│   ├── .env.example               # ✅ EXTEND: Add Retell config vars
│   └── README.md
├── PRPs/
│   ├── templates/
│   │   └── prp_base.md            # Template used for this PRP
│   └── ai_docs/                   # Context documentation
└── .claude/
    └── commands/                  # Claude Code commands
```

### Desired Codebase Tree

```bash
heygen-streaming-app/
├── src/
│   ├── retell-manager.js          # 🆕 CREATE: Retell SDK wrapper (mirror avatar-manager.js pattern)
│   ├── avatar-manager.js          # ✅ KEEP: Existing HeyGen wrapper
│   ├── integration-manager.js     # 🆕 CREATE: Coordinate Retell + HeyGen services
│   ├── ui-controller.js           # 📝 MODIFY: Add Retell UI controls and dual-manager support
│   ├── main.js                    # 📝 MODIFY: Initialize all three managers
│   ├── style.css                  # ✅ KEEP: Already optimized for fullscreen
│   └── embed-fallback.js          # ✅ KEEP: Reference only
│
├── api/                           # 🆕 CREATE: Backend API routes
│   ├── retell/
│   │   ├── create-web-call.js     # 🆕 CREATE: Generate Retell access token
│   │   └── webhooks/
│   │       └── retell.js          # 🆕 CREATE: Receive Retell transcript updates
│   └── ws-server.js               # 🆕 CREATE: WebSocket relay server
│
├── n8n-workflow/                  # 🆕 CREATE: n8n workflow configuration
│   └── retell-relay.json          # 🆕 CREATE: Workflow export for n8n import
│
├── index.html                     # 📝 MODIFY: Add audio element, call controls
├── package.json                   # 📝 MODIFY: Add retell-client-js-sdk, ws
├── .env.example                   # 📝 MODIFY: Add Retell config variables
├── vercel.json                    # 📝 MODIFY: Configure API routes for Vercel
└── README.md                      # 📝 MODIFY: Document Retell integration setup
```

### Known Gotchas & Library Quirks

```javascript
// CRITICAL: Retell AI - Access Token Expiration
// Access tokens expire 30 seconds after creation
// Must call retellClient.startCall() immediately after fetching token
const response = await fetch('/api/retell/create-web-call');
const { access_token } = await response.json();
await retellClient.startCall({ accessToken: access_token }); // <-- Do this immediately!

// CRITICAL: Retell AI - Autoplay Policy
// Must call startAudioPlayback() from user interaction
button.addEventListener('click', async () => {
  await retellClient.startCall({ accessToken });
  retellClient.startAudioPlayback(); // <-- Required for browser autoplay policy
});

// CRITICAL: HeyGen - Event Handlers Before Session
// Setup event handlers BEFORE creating avatar session
this.avatar = new StreamingAvatar({ token });
this.setupEventHandlers(); // <-- BEFORE this line
const session = await this.avatar.createStartAvatar(config);

// CRITICAL: HeyGen - Auto-Restart Listening
// Must restart listening after avatar finishes speaking for continuous conversation
this.avatar.on('avatar_stop_talking', async () => {
  await this.avatar.startListening(); // <-- Required for continuous dialogue
});

// CRITICAL: n8n Webhooks - Response Timeout
// n8n webhooks must respond within 10 seconds or will retry
app.post('/webhook/retell', async (req, res) => {
  res.json({ success: true }); // <-- Respond immediately
  processWebhookAsync(req.body); // <-- Process in background
});

// CRITICAL: Vite Environment Variables
// Client-side env vars MUST start with VITE_ prefix
const token = import.meta.env.VITE_RETELL_API_KEY; // ✅ Works
const token = import.meta.env.RETELL_API_KEY;      // ❌ Undefined in browser

// CRITICAL: iOS Safari - Autoplay Restrictions
// Most restrictive browser - requires explicit user interaction
videoElement.play().catch(error => {
  // Show "Enable Audio" button on autoplay rejection
  this.showAudioEnableButton();
});

// CRITICAL: WebSocket Reconnection
// Implement reconnection logic for production reliability
ws.onclose = () => {
  setTimeout(() => this.reconnectWebSocket(), 5000);
};

// CRITICAL: Retell Transcript - Last 5 Sentences Only
// Real-time transcript events only contain last 5 sentences
// Full transcript available in call_ended webhook
retellClient.on('update', (update) => {
  // Only last 5 sentences here
  console.log(update.transcript); // [{role: 'agent', content: '...'}, ...]
});

// CRITICAL: Double Initialization Prevention
// Guard flags prevent race conditions from multiple clicks
async initialize() {
  if (this.isInitializing || this.isConnected) return; // <-- Guard clause
  this.isInitializing = true;
  try {
    // ... initialization
  } finally {
    this.isInitializing = false;
  }
}
```

## Implementation Blueprint

### Data Models and Structure

```javascript
// Configuration Models
interface RetellConfig {
  apiKey: string;          // Server-side only
  agentId: string;         // Agent configured in Retell dashboard
  webhookUrl?: string;     // n8n webhook endpoint
}

interface HeyGenConfig {
  apiToken: string;
  avatarId: string;
  voiceId?: string;        // May not be needed if using Retell voice
  knowledgeId?: string;    // Optional knowledge base
}

interface AppConfig {
  retell: RetellConfig;
  heygen: HeyGenConfig;
  features: {
    fallbackMode: boolean;   // Continue if one service fails
    debugMode: boolean;      // Verbose logging
  };
}

// Event Payloads
interface RetellCallEvent {
  event: 'call_started' | 'call_ended' | 'agent_speaking' | 'update';
  call?: {
    call_id: string;
    agent_id: string;
  };
  transcript?: Array<{
    role: 'agent' | 'user';
    content: string;
  }>;
}

interface HeyGenStreamEvent {
  event: 'stream_ready' | 'speaking' | 'speechEnded';
  stream?: MediaStream;
  talking?: boolean;
  provider: 'heygen' | 'retell';
}

// WebSocket Messages
interface WSMessage {
  type: 'avatar_speak' | 'status_update' | 'error';
  text?: string;
  sessionId?: string;
  status?: string;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/retell-manager.js
  - IMPLEMENT: RetellManager class with initialization, event handling, connection management
  - FOLLOW pattern: src/avatar-manager.js (class structure, event emitter, guard clauses)
  - NAMING: RetellManager class, methods: initialize(), startCall(), stopCall(), mute(), unmute()
  - KEY METHODS:
    * constructor(config) - Store config, initialize state flags
    * async initialize() - Create RetellWebClient, setup event handlers
    * async startCall() - Fetch access token, call startCall(), handle autoplay
    * stopCall() - End call and cleanup
    * setupEventHandlers() - Map Retell events to app events
  - DEPENDENCIES: None (first component)
  - PLACEMENT: src/retell-manager.js
  - VALIDATION: Can instantiate, emits events correctly

Task 2: CREATE src/integration-manager.js
  - IMPLEMENT: IntegrationManager class to coordinate Retell + HeyGen
  - FOLLOW pattern: Event-driven coordination, no direct SDK calls
  - NAMING: IntegrationManager class, methods: initialize(), setupIntegration()
  - KEY LOGIC:
    * Listen to Retell 'agent_speaking' → trigger HeyGen speaking UI
    * Listen to Retell 'agent_stopped' → update HeyGen UI
    * Relay text from n8n WebSocket → call avatar.speak()
  - DEPENDENCIES: Task 1 (RetellManager)
  - PLACEMENT: src/integration-manager.js
  - VALIDATION: Events flow correctly between services

Task 3: CREATE api/retell/create-web-call.js
  - IMPLEMENT: API route to generate Retell access tokens
  - FOLLOW pattern: Next.js API route structure, environment variable usage
  - NAMING: /api/retell/create-web-call (POST)
  - REQUEST BODY: { agent_id, metadata?, retell_llm_dynamic_variables? }
  - RESPONSE: { access_token, call_id }
  - SECURITY: API key stored in server env (RETELL_API_KEY), never exposed to client
  - DEPENDENCIES: None (backend component)
  - PLACEMENT: api/retell/create-web-call.js
  - VALIDATION: Returns valid access token, token works with Retell SDK

Task 4: CREATE api/ws-server.js
  - IMPLEMENT: WebSocket server for real-time text relay
  - FOLLOW pattern: Node.js ws library, session-based connection management
  - NAMING: WebSocket server on /ws endpoint
  - KEY FEATURES:
    * Accept WebSocket connections with session ID
    * Store client connections in Map by sessionId
    * Receive text from n8n → broadcast to matching client
    * Implement ping/pong heartbeat
    * Reconnection handling
  - DEPENDENCIES: None (backend component)
  - PLACEMENT: api/ws-server.js
  - VALIDATION: Can send/receive messages, handles reconnection

Task 5: CREATE api/webhooks/retell.js
  - IMPLEMENT: Webhook endpoint to receive Retell transcript updates
  - FOLLOW pattern: Quick response (< 10s), async processing
  - NAMING: /api/webhooks/retell (POST)
  - REQUEST BODY: Retell webhook payload (event, call, transcript)
  - PROCESSING:
    * Extract agent text from transcript array (filter role === 'agent')
    * Get last agent message
    * Forward to WebSocket server for frontend delivery
  - DEPENDENCIES: Task 4 (ws-server.js for forwarding)
  - PLACEMENT: api/webhooks/retell.js
  - VALIDATION: Responds within 10s, forwards text correctly

Task 6: CREATE n8n-workflow/retell-relay.json
  - IMPLEMENT: n8n workflow with 3-4 nodes
  - NODE 1: Webhook trigger at /webhook/retell-to-heygen
  - NODE 2: Function node to extract agent text from transcript
  - NODE 3: HTTP Request to POST text to backend (/api/webhooks/retell)
  - NODE 4: (Optional) Database node to log transcript
  - FOLLOW pattern: Community webhook relay workflows
  - DEPENDENCIES: Task 5 (webhook endpoint must exist)
  - PLACEMENT: n8n-workflow/retell-relay.json
  - VALIDATION: Import into n8n, test with sample payload

Task 7: MODIFY src/ui-controller.js
  - IMPLEMENT: Add Retell UI controls and dual-manager support
  - FOLLOW pattern: Existing avatar-manager event handling (lines 85-161)
  - MODIFICATIONS:
    * Update constructor to accept retellManager and integrationManager
    * Add call button handlers (start call, end call, mute)
    * Add Retell event listeners (call_started, call_ended, error)
    * Update status indicators for voice call state
    * Add WebSocket connection handling
  - DEPENDENCIES: Task 1 (RetellManager), Task 2 (IntegrationManager)
  - PLACEMENT: Modify src/ui-controller.js
  - VALIDATION: UI updates correctly for all Retell events

Task 8: MODIFY src/main.js
  - IMPLEMENT: Initialize all three managers in correct order
  - FOLLOW pattern: Existing app initialization (lines 49-74)
  - INITIALIZATION ORDER:
    1. Validate retell and heygen configs
    2. Create RetellManager
    3. Create AvatarManager (existing)
    4. Create IntegrationManager with both managers
    5. Create UIController with all three managers
    6. Connect WebSocket to backend
  - ERROR HANDLING: Fallback modes if one service fails
  - DEPENDENCIES: Tasks 1, 2, 7
  - PLACEMENT: Modify src/main.js
  - VALIDATION: All managers initialize, UI shows correct initial state

Task 9: MODIFY index.html
  - IMPLEMENT: Add audio element for Retell, update controls
  - FOLLOW pattern: Existing video element structure (line 44)
  - ADDITIONS:
    * <audio id="retell-audio" autoplay></audio>
    * Call control buttons (start-call, end-call, mute)
    * Update meta tags if needed
  - DEPENDENCIES: None (HTML structure)
  - PLACEMENT: Modify index.html
  - VALIDATION: Audio element exists, controls render

Task 10: MODIFY package.json
  - IMPLEMENT: Add Retell SDK and WebSocket dependencies
  - ADDITIONS:
    * "retell-client-js-sdk": "latest"
    * "ws": "^8.x" (for WebSocket server)
  - DEPENDENCIES: None
  - PLACEMENT: Modify package.json
  - VALIDATION: npm install succeeds, no version conflicts

Task 11: MODIFY .env.example
  - IMPLEMENT: Add Retell configuration variables
  - ADDITIONS:
    * VITE_RETELL_AGENT_ID=your-agent-id-here
    * RETELL_API_KEY=your-api-key-here (server-side)
    * N8N_WEBHOOK_URL=https://your-n8n.com/webhook/retell-to-heygen
  - DEPENDENCIES: None
  - PLACEMENT: Modify .env.example
  - VALIDATION: All required vars documented

Task 12: CREATE vercel.json
  - IMPLEMENT: Configure API routes for Vercel deployment
  - CONFIGURATION:
    * Route /api/* to serverless functions
    * Set environment variables in Vercel dashboard
  - DEPENDENCIES: None
  - PLACEMENT: Create vercel.json
  - VALIDATION: Deploys successfully to Vercel
```

### Implementation Patterns & Key Details

```javascript
// ========================================
// PATTERN 1: RetellManager Class Structure
// ========================================
// File: src/retell-manager.js

import { RetellWebClient } from 'retell-client-js-sdk';

export class RetellManager {
  constructor(config) {
    this.retellClient = null;
    this.config = config;
    this.isConnected = false;
    this.isInitializing = false;
    this.callId = null;
    this.eventHandlers = new Map();
  }

  async initialize() {
    // GUARD CLAUSE - prevent double initialization
    if (this.isInitializing || this.isConnected) {
      console.log('Retell already initializing or connected');
      return;
    }

    this.isInitializing = true;

    try {
      // 1. Create Retell client
      this.retellClient = new RetellWebClient();

      // 2. Setup event handlers BEFORE call
      this.setupEventHandlers();

      // 3. Fetch access token from backend
      const response = await fetch('/api/retell/create-web-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: this.config.agentId,
          metadata: {
            session_id: Date.now().toString(),
            user_id: 'user_123'
          }
        })
      });

      if (!response.ok) throw new Error('Failed to create web call');

      const { access_token, call_id } = await response.json();
      this.callId = call_id;

      // 4. Start call immediately (token expires in 30s!)
      await this.retellClient.startCall({
        accessToken: access_token,
        sampleRate: 24000,
        emitRawAudioSamples: false
      });

      // 5. CRITICAL: Enable audio playback from user interaction
      // This must be called from click handler, not here
      // Will be called by UI controller

      this.isConnected = true;
      this.isInitializing = false;

      this.emit('connected', { call_id });

    } catch (error) {
      console.error('Retell initialization failed:', error);
      this.isInitializing = false;

      let errorMessage = `Call initialization failed: ${error.message}`;
      if (error.message?.includes('401') || error.message?.includes('403')) {
        errorMessage += '\n\n⚠️ Check:\n• Retell API key is valid\n• Agent ID is correct\n• Account has call credits';
      }

      this.emit('error', { error, message: errorMessage });
      throw error;
    }
  }

  setupEventHandlers() {
    if (!this.retellClient) return;

    // Call lifecycle
    this.retellClient.on('call_started', () => {
      console.log('[Retell] Call started');
      this.emit('callStarted');
    });

    this.retellClient.on('call_ended', () => {
      console.log('[Retell] Call ended');
      this.isConnected = false;
      this.emit('callEnded');
    });

    // Agent speaking events
    this.retellClient.on('agent_start_talking', () => {
      console.log('[Retell] Agent speaking');
      this.emit('agentSpeaking', { speaking: true });
    });

    this.retellClient.on('agent_stop_talking', () => {
      console.log('[Retell] Agent stopped');
      this.emit('agentStopped', { speaking: false });
    });

    // Transcript updates (last 5 sentences)
    this.retellClient.on('update', (update) => {
      if (update.transcript) {
        console.log('[Retell] Transcript update:', update.transcript);
        this.emit('transcriptUpdate', {
          transcript: update.transcript
        });
      }
    });

    // Error handling
    this.retellClient.on('error', (error) => {
      console.error('[Retell] Error:', error);
      this.emit('error', {
        error,
        message: `Retell error: ${error.message || 'Unknown'}`
      });
    });
  }

  // Call from UI after user interaction for autoplay policy
  enableAudioPlayback() {
    if (this.retellClient) {
      this.retellClient.startAudioPlayback();
      console.log('[Retell] Audio playback enabled');
    }
  }

  stopCall() {
    if (this.retellClient && this.isConnected) {
      this.retellClient.stopCall();
      this.isConnected = false;
      console.log('[Retell] Call stopped');
    }
  }

  mute() {
    if (this.retellClient) {
      this.retellClient.mute();
      this.emit('muted');
    }
  }

  unmute() {
    if (this.retellClient) {
      this.retellClient.unmute();
      this.emit('unmuted');
    }
  }

  // Event emitter (same pattern as avatar-manager.js)
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).delete(handler);
    }
  }

  emit(event, data = {}) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Event handler error for ${event}:`, error);
        }
      });
    }
  }
}

// ========================================
// PATTERN 2: IntegrationManager Coordination
// ========================================
// File: src/integration-manager.js

export class IntegrationManager {
  constructor(retellManager, avatarManager) {
    this.retellManager = retellManager;
    this.avatarManager = avatarManager;
    this.wsConnection = null;
    this.sessionId = null;

    this.setupIntegration();
  }

  setupIntegration() {
    // Sync Retell speaking state to avatar UI
    this.retellManager.on('agentSpeaking', (data) => {
      // Trigger avatar speaking animation
      this.avatarManager.emit('speaking', {
        talking: true,
        provider: 'retell'
      });
    });

    this.retellManager.on('agentStopped', (data) => {
      // Stop avatar speaking animation
      this.avatarManager.emit('speechEnded', {
        talking: false,
        provider: 'retell'
      });
    });

    // Handle errors from either service
    this.retellManager.on('error', (data) => {
      console.error('Retell error:', data);
      this.emit('error', { service: 'retell', ...data });
    });

    this.avatarManager.on('error', (data) => {
      console.error('Avatar error:', data);
      this.emit('error', { service: 'heygen', ...data });
    });
  }

  async initialize() {
    this.sessionId = Date.now().toString();

    // Connect WebSocket for text relay
    await this.connectWebSocket();

    console.log('[Integration] Managers synchronized');
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://localhost:8080/ws?session=${this.sessionId}`;
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('[WS] Connected');
        resolve();
      };

      this.wsConnection.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'avatar_speak' && data.text) {
            // Text from n8n → make avatar speak
            console.log('[WS] Received text for avatar:', data.text);

            if (this.avatarManager.avatar && this.avatarManager.isConnected) {
              await this.avatarManager.speak(data.text);
            }
          }
        } catch (error) {
          console.error('[WS] Message parse error:', error);
        }
      };

      this.wsConnection.onerror = (error) => {
        console.error('[WS] Error:', error);
        reject(error);
      };

      this.wsConnection.onclose = () => {
        console.log('[WS] Disconnected, reconnecting...');
        setTimeout(() => this.connectWebSocket(), 5000);
      };
    });
  }

  disconnect() {
    if (this.wsConnection) {
      this.wsConnection.close();
    }
  }
}

// ========================================
// PATTERN 3: Backend API - Create Web Call
// ========================================
// File: api/retell/create-web-call.js

import Retell from 'retell-sdk';

const retellClient = new Retell({
  apiKey: process.env.RETELL_API_KEY // Server-side only!
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agent_id, metadata, retell_llm_dynamic_variables } = req.body;

    // Create web call
    const webCall = await retellClient.call.createWebCall({
      agent_id: agent_id || process.env.RETELL_AGENT_ID,
      metadata: metadata || {},
      retell_llm_dynamic_variables: retell_llm_dynamic_variables || {}
    });

    // Return access token (expires in 30 seconds!)
    return res.status(200).json({
      access_token: webCall.access_token,
      call_id: webCall.call_id
    });

  } catch (error) {
    console.error('Create web call failed:', error);
    return res.status(500).json({
      error: 'Failed to create web call',
      details: error.message
    });
  }
}

// ========================================
// PATTERN 4: Backend Webhook - Retell Updates
// ========================================
// File: api/webhooks/retell.js

import { broadcast } from '../ws-server.js'; // WebSocket broadcast function

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    const { event, call } = payload;

    // Respond immediately (< 10s requirement)
    res.status(200).json({ success: true });

    // Process asynchronously
    processWebhookAsync(payload);

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
}

async function processWebhookAsync(payload) {
  const { event, call } = payload;

  if (event === 'update' && call.transcript_object) {
    // Extract last agent message
    const agentMessages = call.transcript_object.filter(
      msg => msg.role === 'agent'
    );

    if (agentMessages.length > 0) {
      const lastMessage = agentMessages[agentMessages.length - 1];

      // Forward to frontend via WebSocket
      broadcast(call.call_id, {
        type: 'avatar_speak',
        text: lastMessage.content,
        sessionId: call.metadata?.session_id
      });
    }
  }

  if (event === 'call_ended') {
    console.log('Call ended:', call.call_id);
    // Could save transcript to database here
  }
}

// ========================================
// PATTERN 5: WebSocket Server
// ========================================
// File: api/ws-server.js

import { WebSocket, WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
const clients = new Map(); // sessionId -> WebSocket

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const sessionId = url.searchParams.get('session');

  if (!sessionId) {
    ws.close(1008, 'Session ID required');
    return;
  }

  clients.set(sessionId, ws);
  console.log(`[WS] Client connected: ${sessionId}`);

  // Heartbeat ping
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on('pong', () => {
    console.log(`[WS] Pong from ${sessionId}`);
  });

  ws.on('close', () => {
    clients.delete(sessionId);
    clearInterval(pingInterval);
    console.log(`[WS] Client disconnected: ${sessionId}`);
  });

  ws.on('error', (error) => {
    console.error(`[WS] Error for ${sessionId}:`, error);
  });
});

// Export broadcast function for webhook handler
export function broadcast(sessionId, data) {
  const client = clients.get(sessionId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
    console.log(`[WS] Broadcasted to ${sessionId}:`, data.type);
  } else {
    console.log(`[WS] No client found for session: ${sessionId}`);
  }
}

console.log('[WS] Server running on ws://localhost:8080');

// ========================================
// PATTERN 6: n8n Workflow JSON
// ========================================
// File: n8n-workflow/retell-relay.json

{
  "name": "Retell to HeyGen Avatar Relay",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "retell-to-heygen",
        "responseMode": "lastNode",
        "options": {
          "authentication": "headerAuth"
        }
      },
      "position": [250, 300]
    },
    {
      "name": "Extract Agent Text",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "// Extract last agent message from Retell webhook\nconst payload = $json.body;\nconst transcript = payload.call?.transcript_object || [];\n\nconst agentMessages = transcript.filter(msg => msg.role === 'agent');\nconst lastMessage = agentMessages.length > 0 \n  ? agentMessages[agentMessages.length - 1].content \n  : '';\n\nreturn {\n  json: {\n    text: lastMessage,\n    call_id: payload.call?.call_id,\n    session_id: payload.call?.metadata?.session_id\n  }\n};"
      },
      "position": [450, 300]
    },
    {
      "name": "Forward to Backend",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://your-backend.com/api/webhooks/retell",
        "sendBody": true,
        "bodyContentType": "json",
        "jsonBody": "={{ JSON.stringify($json) }}",
        "options": {
          "timeout": 10000,
          "retry": {
            "enabled": true,
            "maxTries": 3,
            "waitBetween": 5000
          }
        }
      },
      "position": [650, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Extract Agent Text", "type": "main", "index": 0 }]]
    },
    "Extract Agent Text": {
      "main": [[{ "node": "Forward to Backend", "type": "main", "index": 0 }]]
    }
  }
}
```

### Integration Points

```yaml
FRONTEND:
  - Add audio element: <audio id="retell-audio" autoplay></audio>
  - Add call controls: Start Call, End Call, Mute buttons
  - Update UI controller to handle both Retell and HeyGen events
  - Connect WebSocket to ws://localhost:8080/ws

BACKEND:
  - Create API route: /api/retell/create-web-call
  - Create webhook handler: /api/webhooks/retell
  - Start WebSocket server: ws://localhost:8080/ws
  - Configure environment variables in Vercel

N8N:
  - Import workflow: n8n-workflow/retell-relay.json
  - Configure webhook URL in Retell dashboard
  - Update HTTP Request node with backend URL
  - Enable header authentication

RETELL DASHBOARD:
  - Create agent with Cal.com tool configured
  - Set webhook URL to n8n webhook
  - Note agent ID for VITE_RETELL_AGENT_ID

HEYGEN:
  - Configure existing avatar (already set up)
  - Ensure avatar has multilingual support
  - May disable voice on avatar (using Retell voice instead)

VERCEL:
  - Add environment variables:
    * RETELL_API_KEY (server-side)
    * VITE_RETELL_AGENT_ID (client-side)
    * N8N_WEBHOOK_URL
  - Deploy API routes as serverless functions
  - Configure WebSocket support (may need external WS server)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after creating each file
npm run lint                     # ESLint check
npm run format                   # Prettier format

# Expected: Zero errors. Fix before proceeding.
```

### Level 2: Component Testing (Unit Validation)

```bash
# Test backend API routes
curl -X POST http://localhost:3000/api/retell/create-web-call \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"test"}' \
  | jq .

# Expected: Returns { access_token, call_id }

# Test webhook endpoint
curl -X POST http://localhost:3000/api/webhooks/retell \
  -H "Content-Type: application/json" \
  -d '{
    "event": "update",
    "call": {
      "call_id": "test123",
      "transcript_object": [
        {"role": "agent", "content": "Hello, how can I help?"}
      ]
    }
  }'

# Expected: Returns { success: true }, check WS logs for broadcast

# Test WebSocket connection
node -e "
const ws = new (require('ws'))('ws://localhost:8080/ws?session=test');
ws.on('open', () => console.log('Connected'));
ws.on('message', (data) => console.log('Received:', data.toString()));
"

# Expected: Connected, can receive messages

# Test n8n workflow
# In n8n UI: Test workflow with sample Retell webhook payload
# Expected: Webhook triggers, text extracted, forwarded to backend
```

### Level 3: Integration Testing (System Validation)

```bash
# Start all services
npm run dev &                    # Frontend dev server
node api/ws-server.js &          # WebSocket server
# n8n should be running separately

# Open browser to http://localhost:5173

# MANUAL TEST FLOW:
# 1. Click "Start Conversation"
# 2. Grant microphone permission
# 3. Verify avatar appears and video plays
# 4. Speak: "Hello, can you hear me?"
# 5. Verify:
#    - Retell processes speech
#    - Transcript updates in UI
#    - Response sent to n8n webhook
#    - n8n forwards to backend
#    - WebSocket relays to frontend
#    - Avatar speaks response with lip-sync
# 6. Test function calling: "Book an appointment for tomorrow at 2pm"
# 7. Verify:
#    - Retell calls Cal.com API
#    - Confirmation response appears
#    - Avatar speaks confirmation

# BROWSER CONSOLE CHECKS:
# - [Retell] Call started
# - [Retell] Transcript update
# - [WS] Connected
# - [WS] Received text for avatar
# - [HeyGen] Avatar speaking
# - No errors in console

# NETWORK TAB CHECKS:
# - WebSocket connection active (ws://localhost:8080/ws)
# - Retell WebRTC connection established
# - HeyGen video stream loaded

# Expected: Complete conversation flow works end-to-end
```

### Level 4: Production Validation

```bash
# DEPLOYMENT VALIDATION
npm run build                    # Build production bundle
npm run preview                  # Test production build locally

# Deploy to Vercel
vercel deploy --prod

# PRODUCTION CHECKS:
# 1. Environment variables set correctly in Vercel dashboard
# 2. API routes accessible at https://your-app.vercel.app/api/*
# 3. WebSocket server running (may need external service like Railway/Fly.io)
# 4. n8n webhook URL updated to production URL
# 5. Retell dashboard webhook points to production n8n

# BROWSER COMPATIBILITY TESTING:
# - Chrome (desktop + mobile)
# - Safari (desktop + iOS)
# - Firefox (desktop + mobile)
# - Edge (desktop)

# MOBILE TESTING:
# - iOS Safari: Autoplay policy handling
# - Android Chrome: Microphone permissions
# - Portrait mode: Fullscreen video layout

# PERFORMANCE METRICS:
# - Time to first byte < 500ms
# - Call initialization < 3s
# - Response latency < 3s (speech to avatar response)
# - WebSocket reconnection < 5s
# - No memory leaks after 10+ calls

# ERROR SCENARIOS:
# - Invalid API keys → user-friendly error
# - Network timeout → retry with backoff
# - Microphone denied → clear instructions
# - One service fails → fallback mode works

# LOAD TESTING (optional):
# - Concurrent calls stress test
# - Long conversation (15+ minutes)
# - Rapid start/stop cycles

# Expected: Production deployment stable, all flows working
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] No console errors in browser
- [ ] No network errors (check Network tab)
- [ ] WebSocket connection stable with reconnection
- [ ] Retell call connects within 3 seconds
- [ ] HeyGen avatar appears within 2 seconds
- [ ] Response latency < 3 seconds end-to-end

### Feature Validation

- [ ] User can start call with single click
- [ ] Microphone permission handled gracefully
- [ ] Avatar intro plays (Japanese/English)
- [ ] Continuous conversation works (auto-listening)
- [ ] Transcript displays in real-time
- [ ] Avatar lip-sync matches Retell timing
- [ ] Function calling executes (Cal.com booking)
- [ ] End call button stops both services
- [ ] Mute button works correctly
- [ ] Error messages are user-friendly

### Browser Compatibility

- [ ] Chrome desktop: All features working
- [ ] Safari desktop: Autoplay handled
- [ ] Firefox desktop: All features working
- [ ] Chrome mobile: Portrait layout correct
- [ ] Safari iOS: Autoplay button shown
- [ ] Android Chrome: Permissions handled

### Code Quality Validation

- [ ] Follows existing codebase patterns
- [ ] Event emitter pattern used consistently
- [ ] Guard clauses prevent race conditions
- [ ] Null-safe element access throughout
- [ ] Error handling with try/catch
- [ ] State flags managed correctly
- [ ] WebSocket reconnection implemented
- [ ] No hardcoded values (uses env vars)

### Deployment & Configuration

- [ ] Environment variables documented in .env.example
- [ ] All secrets set in Vercel dashboard
- [ ] API routes deploy correctly to Vercel
- [ ] n8n workflow exported and importable
- [ ] Retell dashboard configured (webhook URL, Cal.com)
- [ ] README updated with setup instructions

---

## Anti-Patterns to Avoid

- ❌ Don't setup event handlers after initializing SDK (events will be missed)
- ❌ Don't forget autoplay policy - always call startAudioPlayback() from user gesture
- ❌ Don't ignore Retell access token expiration (30 seconds)
- ❌ Don't respond to n8n webhooks after 10 seconds (will retry)
- ❌ Don't expose Retell API key to client (server-side only)
- ❌ Don't use env vars without VITE_ prefix for client code
- ❌ Don't forget WebSocket reconnection logic
- ❌ Don't allow double initialization (use guard clauses)
- ❌ Don't skip null checks on DOM elements
- ❌ Don't forget to cleanup on errors (reset state flags)
- ❌ Don't use synchronous code in async functions
- ❌ Don't catch all errors - be specific with error types
