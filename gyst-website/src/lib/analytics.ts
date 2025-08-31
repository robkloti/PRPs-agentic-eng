'use client'

// Analytics and conversion tracking utilities

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    fbq?: (...args: any[]) => void
    dataLayer?: any[]
  }
}

export interface AnalyticsEvent {
  event: string
  category?: string
  action?: string
  label?: string
  value?: number
  custom_parameters?: Record<string, any>
}

class AnalyticsManager {
  private isInitialized = false
  private eventQueue: AnalyticsEvent[] = []

  init() {
    if (this.isInitialized || typeof window === 'undefined') return
    
    // Initialize analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.initializeGoogleAnalytics()
      this.initializeFacebookPixel()
    }
    
    this.isInitialized = true
    this.flushEventQueue()
  }

  private initializeGoogleAnalytics() {
    const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    
    if (!GA_MEASUREMENT_ID) return

    // Load Google Analytics script
    const script = document.createElement('script')
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    script.async = true
    document.head.appendChild(script)

    // Initialize gtag
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
      window.dataLayer?.push(arguments)
    }

    window.gtag('js', new Date())
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_title: document.title,
      page_location: window.location.href,
    })
  }

  private initializeFacebookPixel() {
    const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID
    
    if (!FB_PIXEL_ID) return

    // Facebook Pixel code
    !(function(f: any, b, e, v, n, t, s) {
      if (f.fbq) return
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      }
      if (!f._fbq) f._fbq = n
      n.push = n
      n.loaded = !0
      n.version = '2.0'
      n.queue = []
      t = b.createElement(e)
      t.async = !0
      t.src = v
      s = b.getElementsByTagName(e)[0]
      s.parentNode?.insertBefore(t, s)
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

    window.fbq?.('init', FB_PIXEL_ID)
    window.fbq?.('track', 'PageView')
  }

  private flushEventQueue() {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()
      if (event) {
        this.trackEvent(event)
      }
    }
  }

  trackEvent(event: AnalyticsEvent) {
    // Queue events if analytics isn't initialized yet
    if (!this.isInitialized) {
      this.eventQueue.push(event)
      return
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', event)
    }

    // Track with Google Analytics
    if (window.gtag) {
      window.gtag('event', event.action || event.event, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        ...event.custom_parameters,
      })
    }

    // Track with Facebook Pixel
    if (window.fbq) {
      window.fbq('track', event.event, event.custom_parameters)
    }
  }

  // Page tracking
  trackPageView(url: string, title?: string) {
    this.trackEvent({
      event: 'page_view',
      custom_parameters: {
        page_location: url,
        page_title: title || document.title,
      }
    })
  }

  // Conversion tracking
  trackConversion(type: 'consultation_request' | 'form_submit' | 'email_signup', value?: number) {
    this.trackEvent({
      event: 'conversion',
      category: 'conversion',
      action: type,
      value,
      custom_parameters: {
        conversion_type: type,
        timestamp: Date.now(),
      }
    })
  }

  // User engagement tracking
  trackEngagement(action: string, category = 'engagement', label?: string, value?: number) {
    this.trackEvent({
      event: 'engagement',
      category,
      action,
      label,
      value,
      custom_parameters: {
        engagement_type: action,
        timestamp: Date.now(),
      }
    })
  }

  // CTA button clicks
  trackCTAClick(buttonText: string, location: string, destination?: string) {
    this.trackEvent({
      event: 'cta_click',
      category: 'cta',
      action: 'click',
      label: buttonText,
      custom_parameters: {
        button_text: buttonText,
        button_location: location,
        destination_url: destination,
        timestamp: Date.now(),
      }
    })
  }

  // Form interactions
  trackFormInteraction(formName: string, action: 'start' | 'submit' | 'abandon', field?: string) {
    this.trackEvent({
      event: 'form_interaction',
      category: 'form',
      action,
      label: formName,
      custom_parameters: {
        form_name: formName,
        form_action: action,
        field_name: field,
        timestamp: Date.now(),
      }
    })
  }

  // Content engagement
  trackContentEngagement(contentType: string, contentTitle: string, action: 'view' | 'read' | 'share') {
    this.trackEvent({
      event: 'content_engagement',
      category: 'content',
      action,
      label: contentTitle,
      custom_parameters: {
        content_type: contentType,
        content_title: contentTitle,
        engagement_action: action,
        timestamp: Date.now(),
      }
    })
  }

  // Scroll tracking
  trackScroll(percentage: number) {
    this.trackEvent({
      event: 'scroll',
      category: 'engagement',
      action: 'scroll',
      label: `${percentage}%`,
      value: percentage,
      custom_parameters: {
        scroll_percentage: percentage,
        page_url: window.location.href,
        timestamp: Date.now(),
      }
    })
  }

  // Error tracking
  trackError(error: string, context?: string) {
    this.trackEvent({
      event: 'exception',
      category: 'error',
      action: 'javascript_error',
      label: error,
      custom_parameters: {
        error_message: error,
        error_context: context,
        page_url: window.location.href,
        timestamp: Date.now(),
      }
    })
  }
}

export const analytics = new AnalyticsManager()

// React hook for tracking
export function useAnalytics() {
  return {
    trackPageView: analytics.trackPageView.bind(analytics),
    trackConversion: analytics.trackConversion.bind(analytics),
    trackEngagement: analytics.trackEngagement.bind(analytics),
    trackCTAClick: analytics.trackCTAClick.bind(analytics),
    trackFormInteraction: analytics.trackFormInteraction.bind(analytics),
    trackContentEngagement: analytics.trackContentEngagement.bind(analytics),
    trackScroll: analytics.trackScroll.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
  }
}

// Higher-order component for automatic page tracking
export function withPageTracking<P extends object>(Component: React.ComponentType<P>) {
  const TrackedComponent = (props: P) => {
    React.useEffect(() => {
      analytics.trackPageView(window.location.href)
    }, [])

    return <Component {...props} />
  }

  TrackedComponent.displayName = `withPageTracking(${Component.displayName || Component.name})`
  return TrackedComponent
}

// Initialize analytics when this module is imported
if (typeof window !== 'undefined') {
  analytics.init()
}