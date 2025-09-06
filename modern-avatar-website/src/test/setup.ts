import { vi } from 'vitest';

// Mock DOM APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock WebRTC APIs
const mockRTCPeerConnection = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  createAnswer: vi.fn(),
  createOffer: vi.fn(),
  setLocalDescription: vi.fn(),
  setRemoteDescription: vi.fn(),
  addIceCandidate: vi.fn(),
  onicecandidate: null,
  ontrack: null,
  onconnectionstatechange: null,
  oniceconnectionstatechange: null,
  connectionState: 'new',
  iceConnectionState: 'new',
  getStats: vi.fn().mockResolvedValue(new Map()),
}));

Object.defineProperty(window, 'RTCPeerConnection', {
  writable: true,
  value: mockRTCPeerConnection,
});

// Mock MediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{
        stop: vi.fn(),
        getSettings: () => ({ width: 640, height: 480, frameRate: 30 })
      }]
    }),
    enumerateDevices: vi.fn().mockResolvedValue([]),
  },
});

// Mock crypto.randomUUID
Object.defineProperty(global.crypto, 'randomUUID', {
  value: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9))
});

// Mock performance API
Object.defineProperty(global.performance, 'mark', {
  value: vi.fn()
});

Object.defineProperty(global.performance, 'measure', {
  value: vi.fn()
});

Object.defineProperty(global.performance, 'now', {
  value: vi.fn(() => Date.now())
});

// Mock fetch
global.fetch = vi.fn();

// Mock postMessage
Object.defineProperty(window, 'postMessage', {
  value: vi.fn()
});

// Mock document.createElement for D-ID
const originalCreateElement = document.createElement;
document.createElement = vi.fn().mockImplementation((tagName: string) => {
  const element = originalCreateElement.call(document, tagName);
  
  if (tagName === 'script') {
    // Mock script loading
    setTimeout(() => {
      if (element.onload) element.onload(new Event('load'));
    }, 0);
  }
  
  if (tagName === 'div') {
    // Mock querySelector for D-ID containers
    element.querySelector = vi.fn().mockReturnValue({
      contentWindow: {
        postMessage: vi.fn()
      }
    });
  }
  
  return element;
});

// Mock HTMLVideoElement properties
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: vi.fn(),
});

// Mock environment variables for tests
vi.mock('../config/env', () => ({
  ENV: {
    HEYGEN_API_KEY: 'test-heygen-key',
    HEYGEN_AVATAR_ID: 'test-avatar',
    HEYGEN_VOICE_ID: 'test-voice',
    DID_CLIENT_KEY: 'test-did-key',
    DID_AGENT_ID: 'test-agent',
    NODE_ENV: 'test'
  },
  PROVIDER_CONFIGS: {
    heygen: {
      baseUrl: 'https://api.heygen.com',
      endpoints: {
        createToken: '/v1/streaming.create_token',
      },
      defaultAvatarId: 'test-avatar',
      defaultVoiceId: 'test-voice',
      tokenRefreshInterval: 25 * 60 * 1000,
    },
    did: {
      scriptUrl: 'https://agent.d-id.com/v2/index.js',
      defaultMode: 'fabio',
      defaultOrientation: 'horizontal',
      defaultPosition: 'center',
    },
  },
  APP_CONFIG: {
    performance: {
      maxResponseTime: 4000,
      memoryLimitPerSession: 100 * 1024 * 1024,
      maxConcurrentSessions: 100,
    },
    errorRecovery: {
      maxRetries: 3,
      retryDelay: 1000,
      enableFallback: true,
      fallbackDelay: 2000,
    },
    ui: {
      animationDuration: 300,
      gradientShiftDuration: 15000,
    },
  }
}));

// Mock HeyGen SDK
vi.mock('@heygen/streaming-avatar', () => ({
  StreamingAvatar: vi.fn().mockImplementation(() => ({
    createStartAvatar: vi.fn().mockResolvedValue(undefined),
    speak: vi.fn().mockResolvedValue(undefined),
    closeVoiceChat: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  })),
  AvatarQuality: {
    Low: 'low',
    Medium: 'medium',
    High: 'high',
  },
  VoiceEmotion: {
    EXCITED: 'excited',
    SERIOUS: 'serious',
    FRIENDLY: 'friendly',
    SOOTHING: 'soothing',
    BROADCASTER: 'broadcaster',
  },
}));

// Console cleanup
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  
  // Suppress expected console errors/warnings in tests
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterEach(() => {
  // Restore console methods
  console.error = originalError;
  console.warn = originalWarn;
});