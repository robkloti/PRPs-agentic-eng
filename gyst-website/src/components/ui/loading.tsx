'use client'

import React from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  }

  return (
    <motion.div
      className={cn('inline-block', sizeClasses[size], className)}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <div className="w-full h-full border-2 border-current border-t-transparent rounded-full" />
    </motion.div>
  )
}

interface LoadingSkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  className, 
  variant = 'rectangular' 
}) => {
  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'h-48 rounded-lg',
    circular: 'h-12 w-12 rounded-full'
  }

  return (
    <motion.div
      className={cn(
        'bg-muted animate-pulse',
        variantClasses[variant],
        className
      )}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

interface LoadingCardProps {
  className?: string
  showImage?: boolean
  showBadge?: boolean
  showMeta?: boolean
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ 
  className,
  showImage = true,
  showBadge = true,
  showMeta = true
}) => {
  return (
    <div className={cn('bg-card border border-border rounded-lg overflow-hidden shadow-elegant', className)}>
      {showImage && (
        <LoadingSkeleton variant="rectangular" className="h-48" />
      )}
      
      <div className="p-6 space-y-4">
        {showBadge && (
          <LoadingSkeleton variant="text" className="h-6 w-24" />
        )}
        
        {showMeta && (
          <div className="flex items-center gap-4">
            <LoadingSkeleton variant="text" className="h-4 w-20" />
            <LoadingSkeleton variant="text" className="h-4 w-16" />
          </div>
        )}
        
        <LoadingSkeleton variant="text" className="h-6 w-full" />
        <LoadingSkeleton variant="text" className="h-6 w-3/4" />
        
        <div className="space-y-2">
          <LoadingSkeleton variant="text" className="h-4 w-full" />
          <LoadingSkeleton variant="text" className="h-4 w-5/6" />
          <LoadingSkeleton variant="text" className="h-4 w-2/3" />
        </div>
        
        <div className="flex gap-2">
          <LoadingSkeleton variant="text" className="h-5 w-16" />
          <LoadingSkeleton variant="text" className="h-5 w-20" />
          <LoadingSkeleton variant="text" className="h-5 w-14" />
        </div>
      </div>
    </div>
  )
}

interface LoadingPageProps {
  title?: string
  subtitle?: string
  showCards?: number
  className?: string
}

export const LoadingPage: React.FC<LoadingPageProps> = ({
  title = 'Loading...',
  subtitle,
  showCards = 3,
  className
}) => {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <LoadingSpinner size="lg" className="text-primary mr-4" />
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              {title}
            </h1>
          </div>
          {subtitle && (
            <LoadingSkeleton variant="text" className="h-6 w-96 mx-auto" />
          )}
        </div>
      </section>

      {/* Content Cards */}
      {showCards > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: showCards }).map((_, index) => (
                <LoadingCard key={index} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

// Loading states for specific components
export const LoadingButton: React.FC<{ children: React.ReactNode; loading?: boolean; className?: string }> = ({ 
  children, 
  loading, 
  className 
}) => {
  if (loading) {
    return (
      <div className={cn('inline-flex items-center justify-center', className)}>
        <LoadingSpinner size="sm" className="mr-2" />
        Loading...
      </div>
    )
  }
  return <>{children}</>
}

export const LoadingInsightCard: React.FC = () => (
  <LoadingCard showImage showBadge showMeta />
)

export const LoadingCaseStudyCard: React.FC = () => (
  <LoadingCard showImage={false} showBadge showMeta className="p-8" />
)