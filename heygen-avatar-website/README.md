# HeyGen Interactive Avatar Website

A seamless web application that displays a looping HeyGen avatar and enables voice interactions through N8N webhook integration, with built-in cost controls and future migration path to Interactive Avatar API.

## 🎯 Features

### Current (MVP Phase)
- **Seamless Avatar Loop**: Continuous avatar video display with smooth transitions
- **Voice Recording**: Press-and-hold microphone recording with cost controls
- **N8N Integration**: Complete workflow (STT → ChatGPT → HeyGen → Response)
- **Cost Management**: Daily usage limits and cost tracking
- **Extended Processing UX**: Engaging 45-second processing experience
- **Cross-Browser Support**: Works on Chrome, Firefox, Safari, Edge
- **Mobile Responsive**: Tablet and kiosk-friendly design
- **Error Handling**: Graceful fallbacks and user feedback

### Future (Phase 2)
- **Interactive Avatar API**: Real-time avatar conversations
- **Same UX Pattern**: Identical idle→active→idle experience
- **Cost Optimization**: Smart session management for Interactive Avatar
- **Seamless Migration**: Switch between N8N and Interactive modes

## 🚀 Quick Start

### Prerequisites
- Modern web browser with microphone support
- N8N instance with configured workflow
- HeyGen account with API access
- Idle avatar video (MP4 format recommended)

### Installation

1. **Clone or download** the project files
2. **Configure environment** by copying `.env.example` to your configuration
3. **Update configuration** in `config/config.js`:

```javascript
const CONFIG = {
  // Required: N8N webhook URL
  N8N_WEBHOOK_URL: 'https://your-n8n-instance.com/webhook/your-id',
  
  // Required: Idle avatar video URL
  IDLE_VIDEO_URL: 'https://your-cdn.com/idle-avatar-loop.mp4',
  
  // Optional: Adjust cost controls
  MAX_DAILY_INTERACTIONS: 50,
  DAILY_COST_LIMIT: 100.00,
  MAX_RECORDING_TIME: 10000, // 10 seconds
};
```

4. **Serve the files** using any web server:

```bash
# Using Node.js http-server
npm install -g http-server
http-server . -p 8080

# Using Python
python -m http.server 8080

# Using PHP
php -S localhost:8080
```

5. **Open** `http://localhost:8080` in your browser

## ⚙️ Configuration

### Required Settings

| Setting | Description | Example |
|---------|-------------|---------|
| `N8N_WEBHOOK_URL` | Your N8N webhook endpoint | `https://n8n.example.com/webhook/abc123` |
| `IDLE_VIDEO_URL` | URL to your idle avatar video | `https://cdn.example.com/avatar-idle.mp4` |

### Cost Controls

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_RECORDING_TIME` | 10000ms | Maximum recording duration |
| `MAX_DAILY_INTERACTIONS` | 50 | Daily interaction limit |
| `DAILY_COST_LIMIT` | $100 | Daily spending limit |
| `ESTIMATED_COST_PER_INTERACTION` | $2.00 | Cost estimation per request |

### Audio Settings

```javascript
AUDIO_CONSTRAINTS: {
  echoCancellation: true,
  noiseSuppression: true,
  sampleRate: 44100
}
```

## 🎤 N8N Workflow Setup

Your N8N workflow should handle this flow:

1. **Webhook Trigger** - Receives audio file via FormData
2. **Speech-to-Text** - Transcribe audio (OpenAI Whisper, AssemblyAI, etc.)
3. **ChatGPT Node** - Generate response text
4. **HeyGen Node** - Create response video
5. **Return Response** - JSON with `video_url`

### Expected Response Format

```json

```

Alternative formats supported:
- `{ "video_url": "..." }`
- `{ "url": "..." }`
- `"https://direct-url.mp4"`

## 🎨 Customization

### Styling

Edit `css/styles.css` to customize:
- Color scheme (CSS custom properties in `:root`)
- Button design and animations
- Layout and spacing
- Mobile responsiveness

### Branding

1. **Update colors** in CSS custom properties
2. **Replace icons** in `assets/icons/`
3. **Customize messages** in `config/config.js`
4. **Add logo** to HTML structure

### Cost Controls

Adjust limits in `config/config.js`:

```javascript
// Tighter controls for testing
MAX_RECORDING_TIME: 5000,    // 5 seconds
MAX_DAILY_INTERACTIONS: 10,  // 10 per day
DAILY_COST_LIMIT: 20.00,     // $20 daily limit

// Looser controls for production
MAX_RECORDING_TIME: 15000,   // 15 seconds  
MAX_DAILY_INTERACTIONS: 200, // 200 per day
DAILY_COST_LIMIT: 500.00,    // $500 daily limit
```

## 🧪 Testing

### Browser Test Suite

Open `tests/test.html` to run comprehensive tests:

1. **Browser Compatibility** - API support verification
2. **Component Tests** - Individual module testing
3. **Integration Tests** - Component interaction testing
4. **Manual Tests** - User interaction testing
5. **Performance Tests** - Memory and speed testing

### Manual Testing Checklist

- [ ] Microphone permission granted
- [ ] Audio recording works (check browser console)
- [ ] Idle video loads and loops seamlessly
- [ ] N8N webhook responds correctly
- [ ] Video transitions are smooth
- [ ] Cost tracking updates properly
- [ ] Error states display appropriately
- [ ] Mobile/tablet compatibility verified

## 🔧 Troubleshooting

### Common Issues

**Microphone not working:**
- Ensure HTTPS (required for getUserMedia)
- Check browser permissions
- Test on different browsers

**Video not loading:**
- Verify video URL is accessible
- Check CORS headers for cross-origin videos
- Try different video formats (MP4, WebM)

**N8N webhook timeout:**
- Increase `RESPONSE_TIMEOUT` in config
- Optimize N8N workflow performance
- Check network connectivity

**High costs:**
- Reduce `MAX_DAILY_INTERACTIONS`
- Lower `MAX_RECORDING_TIME`
- Monitor usage in browser localStorage

### Debug Mode

Enable debug logging:

```javascript
// In config.js
DEBUG: true,
LOG_LEVEL: 'debug'
```

Check browser console for detailed logs.

### Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 70+ | ✅ Fully supported |
| Firefox | 65+ | ✅ Fully supported |
| Safari | 14+ | ✅ Supported (test audio) |
| Edge | 79+ | ✅ Fully supported |
| Mobile Safari | 14+ | ⚠️ Test recording |
| Chrome Mobile | 70+ | ✅ Supported |

## 🚀 Deployment

### Static Hosting (Recommended)

Deploy to any static host:

1. **Netlify**
   ```bash
   # Build command: (none)
   # Publish directory: .
   ```

2. **Vercel**
   ```bash
   vercel --prod
   ```

3. **AWS S3 + CloudFront**
   ```bash
   aws s3 sync . s3://your-bucket/
   ```

### HTTPS Requirement

**Critical**: Application requires HTTPS for microphone access. Ensure your hosting provider supports SSL/TLS.

### Environment Variables

For dynamic configuration, use your hosting provider's environment variable system and modify `config/config.js` to read from `process.env`.

### CDN Optimization

1. **Host videos on CDN** (CloudFront, CloudFlare)
2. **Enable compression** (gzip/brotli)
3. **Set cache headers** for static assets
4. **Use HTTP/2** for better performance

## 📊 Monitoring

### Usage Analytics

The application tracks:
- Daily interaction count
- Cost estimation
- Error occurrences
- Performance metrics

Access data via browser localStorage or implement server-side logging.

### Cost Monitoring

Monitor costs by:
1. Checking daily usage stats in UI
2. Reviewing localStorage data
3. Implementing server-side cost tracking
4. Setting up N8N usage alerts

## 🔮 Migration to Interactive Avatar

### Phase 2: Interactive Avatar API

When ready to migrate to real-time Interactive Avatar:

1. **Get HeyGen API access** for Interactive Avatar
2. **Update configuration**:
   ```javascript
   HEYGEN_API_KEY: 'your-api-key',
   HEYGEN_AVATAR_ID: 'your-avatar-id'
   ```
3. **Load HeyGen SDK**:
   ```html
   <script src="https://sdk.heygen.com/streaming-avatar.js"></script>
   ```
4. **Switch modes**:
   ```javascript
   avatarApp.switchToInteractiveMode();
   ```

### Migration Benefits
- **2-4 second response time** (vs 45 seconds)
- **Real-time conversation** capability
- **Same UX pattern** maintained
- **Automatic fallback** to N8N if needed

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly using `tests/test.html`
5. Submit pull request

### Code Style

- Use ES6+ features
- Follow existing naming conventions
- Add JSDoc comments for functions
- Test on multiple browsers
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Documentation
- [HeyGen API Docs](https://docs.heygen.com)
- [N8N Documentation](https://docs.n8n.io)
- [MDN Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)

### Common Questions

**Q: Can I use this without N8N?**
A: Yes, modify `webhook-client.js` to integrate with your preferred workflow platform.

**Q: How much does this cost to run?**
A: Costs depend on usage. Estimate ~$2 per interaction for N8N + HeyGen + OpenAI services.

**Q: Can I customize the avatar?**
A: Yes, create your own idle video and configure HeyGen avatar settings.

**Q: Does this work offline?**
A: No, requires internet for N8N webhook and video streaming.

---

Built with ❤️ using the PRP Framework for one-pass AI implementation success.