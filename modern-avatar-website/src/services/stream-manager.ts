export class StreamManager {
  private streams = new Map<string, MediaStream>();
  private connections = new Map<string, RTCPeerConnection>();
  private videoElements = new Map<string, HTMLVideoElement>();
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' }
  ];

  constructor() {
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  async setupProviderStream(
    provider: string, 
    videoElement: HTMLVideoElement,
    stream?: MediaStream
  ): Promise<void> {
    try {
      console.log(`Setting up stream for provider: ${provider}`);

      // Store video element reference
      this.videoElements.set(provider, videoElement);

      if (stream) {
        // Direct stream assignment (for HeyGen)
        await this.assignStreamToVideo(provider, stream, videoElement);
      } else {
        // Setup WebRTC connection (for future use or other providers)
        await this.setupWebRTCConnection(provider, videoElement);
      }

      console.log(`Stream setup completed for provider: ${provider}`);
    } catch (error) {
      console.error(`Stream setup failed for provider ${provider}:`, error);
      throw error;
    }
  }

  private async assignStreamToVideo(
    provider: string, 
    stream: MediaStream, 
    videoElement: HTMLVideoElement
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Store the stream
        this.streams.set(`${provider}:remote`, stream);

        // Configure video element
        videoElement.srcObject = stream;
        videoElement.muted = false;
        videoElement.playsInline = true;
        videoElement.autoplay = true;

        // Handle video events
        const onLoadedMetadata = () => {
          console.log(`Video metadata loaded for ${provider}`);
          videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          resolve();
        };

        const onError = (event: Event) => {
          console.error(`Video error for ${provider}:`, event);
          videoElement.removeEventListener('error', onError);
          reject(new Error(`Video playback error for ${provider}`));
        };

        videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
        videoElement.addEventListener('error', onError);

        // Attempt to play
        videoElement.play().catch(playError => {
          console.warn(`Autoplay failed for ${provider}, user interaction required:`, playError);
          // Don't reject here, as autoplay failure is common and expected
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private async setupWebRTCConnection(
    provider: string, 
    videoElement: HTMLVideoElement
  ): Promise<void> {
    const connection = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10
    });

    // Handle remote stream
    connection.ontrack = (event) => {
      console.log(`Received remote track for ${provider}`);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        this.streams.set(`${provider}:remote`, remoteStream);
        videoElement.srcObject = remoteStream;
        
        // Configure video element
        videoElement.muted = false;
        videoElement.playsInline = true;
        videoElement.autoplay = true;
        
        // Attempt to play
        videoElement.play().catch(error => {
          console.warn(`WebRTC autoplay failed for ${provider}:`, error);
        });
      }
    };

    // Handle connection state changes
    connection.onconnectionstatechange = () => {
      console.log(`WebRTC connection state for ${provider}: ${connection.connectionState}`);
      
      if (connection.connectionState === 'failed') {
        console.error(`WebRTC connection failed for ${provider}`);
        this.handleConnectionFailure(provider);
      }
    };

    // Handle ICE connection state changes
    connection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${provider}: ${connection.iceConnectionState}`);
    };

    // Store connection
    this.connections.set(provider, connection);
  }

  getStream(provider: string): MediaStream | null {
    return this.streams.get(`${provider}:remote`) || null;
  }

  getVideoElement(provider: string): HTMLVideoElement | null {
    return this.videoElements.get(provider) || null;
  }

  async switchProvider(fromProvider: string, toProvider: string): Promise<void> {
    console.log(`Switching stream from ${fromProvider} to ${toProvider}`);
    
    const fromVideo = this.videoElements.get(fromProvider);
    const toVideo = this.videoElements.get(toProvider);

    if (fromVideo) {
      // Pause and hide the previous provider's video
      fromVideo.pause();
      fromVideo.style.display = 'none';
    }

    if (toVideo) {
      // Show and play the new provider's video
      toVideo.style.display = 'block';
      try {
        await toVideo.play();
      } catch (error) {
        console.warn(`Could not auto-play ${toProvider} video:`, error);
      }
    }
  }

  async enableUserMedia(constraints: MediaStreamConstraints = { audio: true }): Promise<MediaStream> {
    try {
      const userStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.streams.set('user:local', userStream);
      return userStream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw new Error(`Failed to access user media: ${(error as Error).message}`);
    }
  }

  async cleanupProvider(provider: string): Promise<void> {
    console.log(`Cleaning up stream for provider: ${provider}`);

    // Stop and remove streams
    const remoteStream = this.streams.get(`${provider}:remote`);
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => {
        track.stop();
      });
      this.streams.delete(`${provider}:remote`);
    }

    // Close WebRTC connection
    const connection = this.connections.get(provider);
    if (connection) {
      connection.close();
      this.connections.delete(provider);
    }

    // Clean up video element
    const videoElement = this.videoElements.get(provider);
    if (videoElement) {
      videoElement.srcObject = null;
      videoElement.pause();
      this.videoElements.delete(provider);
    }
  }

  async cleanupAll(): Promise<void> {
    console.log('Cleaning up all streams');

    // Cleanup all providers
    const providers = Array.from(this.connections.keys());
    await Promise.all(providers.map(provider => this.cleanupProvider(provider)));

    // Stop user media
    const userStream = this.streams.get('user:local');
    if (userStream) {
      userStream.getTracks().forEach(track => track.stop());
      this.streams.delete('user:local');
    }

    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleConnectionFailure(provider: string): void {
    console.error(`Connection failure detected for ${provider}`);
    // Emit custom event for connection failure
    window.dispatchEvent(new CustomEvent('streamConnectionFailure', {
      detail: { provider }
    }));
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page is hidden - pause all videos to save bandwidth
      this.videoElements.forEach((video, provider) => {
        video.pause();
      });
    } else {
      // Page is visible - resume videos
      this.videoElements.forEach((video, provider) => {
        if (video.srcObject) {
          video.play().catch(error => {
            console.warn(`Could not resume video for ${provider}:`, error);
          });
        }
      });
    }
  }

  // Utility methods for stream analysis
  getStreamStats(provider: string): Promise<RTCStatsReport | null> {
    const connection = this.connections.get(provider);
    if (!connection) return Promise.resolve(null);
    
    return connection.getStats();
  }

  async getStreamQuality(provider: string): Promise<{ width: number; height: number; frameRate: number } | null> {
    const stream = this.getStream(provider);
    if (!stream) return null;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return null;

    const settings = videoTrack.getSettings();
    return {
      width: settings.width || 0,
      height: settings.height || 0,
      frameRate: settings.frameRate || 0
    };
  }
}