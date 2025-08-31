'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import MagneticButton from './motion/magnetic-button'
import { Badge } from './ui/badge'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service in production
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // In production, you would send this to your error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } })
      // Example: Analytics.track('Error Boundary Triggered', { error: error.message })
    }

    this.setState({ error, errorInfo })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md mx-auto text-center">
            <div className="mb-6">
              <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <Badge variant="destructive" className="mb-4">
                Something went wrong
              </Badge>
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Oops! Something unexpected happened
            </h2>
            
            <p className="text-muted-foreground mb-6 leading-relaxed">
              We're sorry for the inconvenience. Our team has been notified and is working to fix this issue.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 p-4 bg-muted rounded-lg text-left">
                <summary className="cursor-pointer font-semibold mb-2 text-destructive">
                  Error Details (Development Only)
                </summary>
                <pre className="text-xs overflow-auto">
                  <code>{this.state.error.toString()}</code>
                  {this.state.errorInfo?.componentStack && (
                    <code>{this.state.errorInfo.componentStack}</code>
                  )}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton 
                onClick={this.handleRetry}
                variant="primary"
                className="group"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </MagneticButton>
              
              <MagneticButton 
                href="/"
                variant="outline"
                className="group"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </MagneticButton>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Specific error boundaries for different sections
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      // Log page-level errors with additional context
      console.error('Page Error:', { error, errorInfo, url: window.location.href })
    }}
  >
    {children}
  </ErrorBoundary>
)

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode
  componentName?: string
  fallback?: ReactNode
}> = ({ children, componentName, fallback }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error(`${componentName || 'Component'} Error:`, { error, errorInfo })
    }}
    fallback={fallback || (
      <div className="p-6 text-center border border-destructive/20 rounded-lg bg-destructive/5">
        <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          {componentName ? `${componentName} failed to load` : 'Component failed to load'}
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="text-xs text-primary hover:underline mt-2"
        >
          Refresh page
        </button>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
)

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => (
    <ComponentErrorBoundary componentName={componentName}>
      <Component {...props} />
    </ComponentErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${componentName || Component.displayName || Component.name})`
  
  return WrappedComponent
}

export default ErrorBoundary