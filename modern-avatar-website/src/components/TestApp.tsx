import React, { useState } from 'react';

export const TestApp = () => {
  const [provider, setProvider] = useState<string>('');

  const handleDIDConnect = () => {
    setProvider('d-id');
    
    // Create and inject the D-ID script with your exact configuration
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
    
    document.body.appendChild(script);
    console.log('D-ID script added to page');
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
      backgroundSize: '400% 400%',
      animation: 'gradientShift 15s ease infinite',
      color: 'white',
      fontFamily: 'Inter, sans-serif',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      
      <h1 style={{ fontSize: '3rem', marginBottom: '2rem' }}>
        Modern Avatar Interface
      </h1>
      
      <p style={{ fontSize: '1.2rem', marginBottom: '3rem', opacity: 0.9 }}>
        React app is working! ✨
      </p>
      
      <div style={{ marginBottom: '3rem' }}>
        <button
          onClick={() => setProvider('heygen')}
          style={{
            padding: '1rem 2rem',
            margin: '0 1rem',
            background: provider === 'heygen' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '12px',
            color: 'white',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          HeyGen
        </button>
        
        <button
          onClick={handleDIDConnect}
          style={{
            padding: '1rem 2rem',
            margin: '0 1rem',
            background: provider === 'd-id' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '12px',
            color: 'white',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          D-ID (Click to Load)
        </button>
      </div>
      
      {provider && (
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '2rem',
          borderRadius: '12px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <h2>Selected: {provider.toUpperCase()}</h2>
          {provider === 'd-id' && (
            <p>D-ID script has been loaded. The avatar should appear shortly!</p>
          )}
        </div>
      )}
    </div>
  );
};