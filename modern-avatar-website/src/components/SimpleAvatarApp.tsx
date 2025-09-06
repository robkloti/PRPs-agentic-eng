import React, { useState, useEffect, useRef } from 'react';

export const SimpleAvatarApp = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<'heygen' | 'd-id' | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const didContainerRef = useRef<HTMLDivElement>(null);

  // Initialize D-ID embed on component mount
  useEffect(() => {
    if (currentProvider === 'd-id' && didContainerRef.current) {
      // Remove any existing D-ID script
      const existingScript = document.querySelector('script[src="https://agent.d-id.com/v2/index.js"]');
      if (existingScript) {
        existingScript.remove();
      }

      // Create and add the D-ID script with your configuration
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://agent.d-id.com/v2/index.js';
      script.setAttribute('data-mode', 'fabio');
      script.setAttribute('data-client-key', 'YXV0aDB8NjhiOTU5NmFkNGVkYWRmZDkzMDQ0YzhkOi1ObXhlQnpEWHNaaU56OTdnMUFHZQ==');
      script.setAttribute('data-agent-id', 'v2_agt_G7epb5HP');
      script.setAttribute('data-name', 'did-agent');
      script.setAttribute('data-monitor', 'true');
      script.setAttribute('data-orientation', 'horizontal');
      script.setAttribute('data-position', 'right');

      // Append to the D-ID container
      didContainerRef.current.appendChild(script);

      console.log('D-ID script loaded with your configuration');
    }
  }, [currentProvider]);

  const handleConnect = async (provider: 'heygen' | 'd-id') => {
    setIsLoading(true);
    setCurrentProvider(provider);
    
    try {
      if (provider === 'd-id') {
        // D-ID will embed automatically via the script
        setTimeout(() => {
          setIsConnected(true);
          setIsLoading(false);
        }, 2000); // Simulate connection time
      } else if (provider === 'heygen') {
        // For now, just simulate HeyGen connection
        // You'll need to add actual HeyGen SDK integration here
        setTimeout(() => {
          setIsConnected(true);
          setIsLoading(false);
        }, 2000);
      }
    } catch (error) {
      console.error(`Connection to ${provider} failed:`, error);
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setCurrentProvider(null);
    
    // Clean up D-ID script if it was loaded
    const didScript = document.querySelector('script[src="https://agent.d-id.com/v2/index.js"]');
    if (didScript) {
      didScript.remove();
    }
  };

  const handleSendMessage = () => {
    if (!message.trim() || !isConnected) return;
    
    console.log(`Sending message to ${currentProvider}: ${message}`);
    
    // Here you would integrate with the actual avatar APIs
    // For D-ID, you might use postMessage to communicate with the embed
    // For HeyGen, you would use their streaming SDK
    
    if (currentProvider === 'd-id') {
      // Try to communicate with D-ID embed via postMessage
      window.postMessage({
        type: 'SPEAK',
        message: message,
        target: 'did-agent'
      }, '*');
    }
    
    setMessage('');
  };

  return (
    <div className="avatar-app">
      <style>{`
        .avatar-app {
          min-height: 100vh;
          padding: 2rem;
          background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
          color: white;
          font-family: 'Inter', sans-serif;
        }
        
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .header {
          text-align: center;
          margin-bottom: 3rem;
        }
        
        .title {
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 1rem;
          background: linear-gradient(45deg, #fff, #f0f0f0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .subtitle {
          font-size: 1.25rem;
          opacity: 0.9;
          margin-bottom: 2rem;
        }
        
        .provider-selection {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 3rem;
        }
        
        .provider-btn {
          padding: 1rem 2rem;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }
        
        .provider-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
          transform: translateY(-2px);
        }
        
        .provider-btn.active {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.6);
        }
        
        .provider-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .avatar-container {
          max-width: 800px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .status {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .status-indicator {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 20px;
          font-weight: 500;
        }
        
        .status-indicator.connected {
          background: rgba(0, 255, 0, 0.3);
        }
        
        .avatar-display {
          width: 100%;
          height: 400px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
          position: relative;
        }
        
        .placeholder {
          text-align: center;
          opacity: 0.7;
        }
        
        .controls {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }
        
        .message-input {
          flex: 1;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          resize: vertical;
          min-height: 60px;
        }
        
        .message-input::placeholder {
          color: rgba(255, 255, 255, 0.7);
        }
        
        .send-btn {
          padding: 1rem 2rem;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .send-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
        }
        
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .disconnect-btn {
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background: rgba(255, 0, 0, 0.2);
          border: 1px solid rgba(255, 0, 0, 0.3);
          border-radius: 8px;
          color: white;
          cursor: pointer;
          font-weight: 500;
        }
        
        .loading {
          opacity: 0.7;
        }
      `}</style>

      <div className="header">
        <h1 className="title">Modern Avatar Interface</h1>
        <p className="subtitle">Choose your AI avatar provider and start chatting</p>
      </div>

      <div className="provider-selection">
        <button
          className={`provider-btn ${currentProvider === 'heygen' ? 'active' : ''}`}
          onClick={() => handleConnect('heygen')}
          disabled={isLoading || isConnected}
        >
          {isLoading && currentProvider === 'heygen' ? 'Connecting...' : 'HeyGen'}
        </button>
        <button
          className={`provider-btn ${currentProvider === 'd-id' ? 'active' : ''}`}
          onClick={() => handleConnect('d-id')}
          disabled={isLoading || isConnected}
        >
          {isLoading && currentProvider === 'd-id' ? 'Connecting...' : 'D-ID'}
        </button>
      </div>

      <div className="avatar-container">
        <div className="status">
          <div className={`status-indicator ${isConnected ? 'connected' : ''}`}>
            {isConnected 
              ? `Connected to ${currentProvider?.toUpperCase()}` 
              : 'Not Connected'
            }
          </div>
        </div>

        <div className="avatar-display">
          {currentProvider === 'd-id' && isConnected ? (
            <div ref={didContainerRef} style={{ width: '100%', height: '100%' }}>
              {/* D-ID embed will be injected here */}
            </div>
          ) : currentProvider === 'heygen' && isConnected ? (
            <div style={{ textAlign: 'center' }}>
              <h3>HeyGen Avatar</h3>
              <p>HeyGen integration will appear here</p>
              <p>(Requires HeyGen SDK implementation)</p>
            </div>
          ) : (
            <div className="placeholder">
              <h3>Select a Provider</h3>
              <p>Choose HeyGen or D-ID to start</p>
            </div>
          )}
        </div>

        {isConnected && (
          <div className="controls">
            <textarea
              className="message-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message here..."
              rows={3}
            />
            <button
              className="send-btn"
              onClick={handleSendMessage}
              disabled={!message.trim()}
            >
              Send
            </button>
          </div>
        )}

        {isConnected && (
          <button className="disconnect-btn" onClick={handleDisconnect}>
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
};