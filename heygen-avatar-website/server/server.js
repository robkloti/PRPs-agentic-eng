// Simple development server for HeyGen Avatar Website
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

class DevServer {
  constructor(port = 8080, host = 'localhost') {
    this.port = port;
    this.host = host;
    this.rootDir = path.resolve(__dirname, '..');
    
    // MIME types for static files
    this.mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'font/eot'
    };
    
    this.server = null;
  }

  start() {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(this.port, this.host, () => {
      console.log(`🚀 HeyGen Avatar Website development server running:`);
      console.log(`   Local:   http://${this.host}:${this.port}`);
      console.log(`   Network: http://${this.getNetworkAddress()}:${this.port}`);
      console.log('');
      console.log('📋 Available pages:');
      console.log(`   App:     http://${this.host}:${this.port}`);
      console.log(`   Tests:   http://${this.host}:${this.port}/tests/test.html`);
      console.log('');
      console.log('Press Ctrl+C to stop');
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server...');
      this.server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    return this.server;
  }

  handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    
    // Log request
    console.log(`${new Date().toISOString()} ${req.method} ${pathname}`);
    
    // Default to index.html for root
    if (pathname === '/') {
      pathname = '/index.html';
    }
    
    // Security: prevent directory traversal
    if (pathname.includes('..')) {
      this.sendError(res, 403, 'Forbidden');
      return;
    }
    
    // Handle API endpoints (for future extension)
    if (pathname.startsWith('/api/')) {
      this.handleAPI(req, res, pathname);
      return;
    }
    
    // Serve static files
    this.serveStaticFile(req, res, pathname);
  }

  serveStaticFile(req, res, pathname) {
    const filePath = path.join(this.rootDir, pathname);
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        this.sendError(res, 404, 'File not found');
        return;
      }
      
      // Get file stats
      fs.stat(filePath, (err, stats) => {
        if (err) {
          this.sendError(res, 500, 'Internal server error');
          return;
        }
        
        // Don't serve directories
        if (stats.isDirectory()) {
          this.sendError(res, 403, 'Directory listing forbidden');
          return;
        }
        
        // Determine content type
        const ext = path.extname(filePath).toLowerCase();
        const contentType = this.mimeTypes[ext] || 'application/octet-stream';
        
        // Set headers
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': stats.size,
          'Cache-Control': 'no-cache', // Disable cache for development
          'Access-Control-Allow-Origin': '*', // CORS for development
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        
        // Stream file
        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
        
        readStream.on('error', (err) => {
          console.error('Error reading file:', err);
          if (!res.headersSent) {
            this.sendError(res, 500, 'Error reading file');
          }
        });
      });
    });
  }

  handleAPI(req, res, pathname) {
    // Handle preflight CORS requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }
    
    // API routes for future extension
    switch (pathname) {
      case '/api/health':
        this.sendJSON(res, { status: 'ok', timestamp: new Date().toISOString() });
        break;
        
      case '/api/config':
        // Return safe configuration (no sensitive data)
        this.sendJSON(res, {
          maxRecordingTime: 10000,
          supportedFormats: ['webm', 'mp4'],
          version: '1.0.0'
        });
        break;
        
      default:
        this.sendError(res, 404, 'API endpoint not found');
    }
  }

  sendError(res, statusCode, message) {
    res.writeHead(statusCode, {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': '*'
    });
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error ${statusCode}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a2e;
            color: #ffffff;
            margin: 0;
            padding: 40px;
            text-align: center;
          }
          .error-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          h1 { color: #ef4444; margin-bottom: 20px; }
          p { margin-bottom: 30px; opacity: 0.8; }
          a {
            color: #4f46e5;
            text-decoration: none;
            padding: 12px 24px;
            background: rgba(79, 70, 229, 0.2);
            border: 1px solid #4f46e5;
            border-radius: 6px;
            display: inline-block;
            transition: all 0.2s;
          }
          a:hover {
            background: rgba(79, 70, 229, 0.3);
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>Error ${statusCode}</h1>
          <p>${message}</p>
          <a href="/">← Back to Home</a>
        </div>
      </body>
      </html>
    `;
    
    res.end(html);
  }

  sendJSON(res, data) {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data, null, 2));
  }

  getNetworkAddress() {
    const interfaces = require('os').networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    
    return this.host;
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

// CLI usage
if (require.main === module) {
  const port = process.env.PORT || process.argv[2] || 8080;
  const host = process.env.HOST || 'localhost';
  
  const server = new DevServer(port, host);
  server.start();
}

module.exports = DevServer;