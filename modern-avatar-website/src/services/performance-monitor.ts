import type { PerformanceMetrics } from '../types';
import { APP_CONFIG } from '../config/env';

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 1000;
  private performanceThresholds = {
    responseTime: APP_CONFIG.performance.maxResponseTime,
    memoryUsage: APP_CONFIG.performance.memoryLimitPerSession,
  };

  trackResponse(provider: string, responseTime: number, success: boolean): void {
    const metric: PerformanceMetrics = {
      provider,
      responseTime,
      success,
      timestamp: Date.now()
    };

    this.metrics.push(metric);
    
    // Maintain metrics history limit
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Log performance warnings
    if (responseTime > this.performanceThresholds.responseTime) {
      console.warn(`Performance warning: ${provider} response time ${responseTime}ms exceeds threshold of ${this.performanceThresholds.responseTime}ms`);
    }

    // Emit performance event for monitoring
    window.dispatchEvent(new CustomEvent('performanceMetric', {
      detail: metric
    }));
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getMetricsByProvider(provider: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.provider === provider);
  }

  getAverageResponseTime(provider?: string, timeWindow?: number): number {
    let relevantMetrics = provider ? 
      this.getMetricsByProvider(provider) : 
      this.metrics;

    if (timeWindow) {
      const cutoffTime = Date.now() - timeWindow;
      relevantMetrics = relevantMetrics.filter(m => m.timestamp > cutoffTime);
    }

    if (relevantMetrics.length === 0) return 0;

    const totalTime = relevantMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    return totalTime / relevantMetrics.length;
  }

  getSuccessRate(provider?: string, timeWindow?: number): number {
    let relevantMetrics = provider ? 
      this.getMetricsByProvider(provider) : 
      this.metrics;

    if (timeWindow) {
      const cutoffTime = Date.now() - timeWindow;
      relevantMetrics = relevantMetrics.filter(m => m.timestamp > cutoffTime);
    }

    if (relevantMetrics.length === 0) return 0;

    const successCount = relevantMetrics.filter(m => m.success).length;
    return successCount / relevantMetrics.length;
  }

  getProviderPerformanceReport(provider: string): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    recentPerformance: {
      last5Minutes: { successRate: number; avgResponseTime: number };
      last15Minutes: { successRate: number; avgResponseTime: number };
    };
  } {
    const allMetrics = this.getMetricsByProvider(provider);
    const last5Min = 5 * 60 * 1000;
    const last15Min = 15 * 60 * 1000;

    return {
      totalRequests: allMetrics.length,
      successRate: this.getSuccessRate(provider),
      averageResponseTime: this.getAverageResponseTime(provider),
      recentPerformance: {
        last5Minutes: {
          successRate: this.getSuccessRate(provider, last5Min),
          avgResponseTime: this.getAverageResponseTime(provider, last5Min)
        },
        last15Minutes: {
          successRate: this.getSuccessRate(provider, last15Min),
          avgResponseTime: this.getAverageResponseTime(provider, last15Min)
        }
      }
    };
  }

  isPerformanceDegraded(provider: string): boolean {
    const report = this.getProviderPerformanceReport(provider);
    const recentMetrics = report.recentPerformance.last5Minutes;

    // Check if recent success rate is below 50%
    if (recentMetrics.successRate < 0.5 && report.totalRequests > 5) {
      return true;
    }

    // Check if recent response time exceeds threshold significantly
    if (recentMetrics.avgResponseTime > this.performanceThresholds.responseTime * 2) {
      return true;
    }

    return false;
  }

  getBestPerformingProvider(providers: string[]): string | null {
    if (providers.length === 0) return null;
    if (providers.length === 1) return providers[0];

    let bestProvider: string | null = null;
    let bestScore = -1;

    providers.forEach(provider => {
      const report = this.getProviderPerformanceReport(provider);
      
      // Skip providers with insufficient data
      if (report.totalRequests < 3) return;

      // Calculate composite score (success rate weighted more heavily)
      const successWeight = 0.7;
      const responseTimeWeight = 0.3;
      const maxAcceptableResponseTime = this.performanceThresholds.responseTime;
      
      const normalizedResponseTime = Math.min(1, maxAcceptableResponseTime / Math.max(report.averageResponseTime, 1));
      const score = (report.successRate * successWeight) + (normalizedResponseTime * responseTimeWeight);

      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    });

    return bestProvider;
  }

  async getMemoryUsage(): Promise<number> {
    if ('memory' in performance) {
      // @ts-ignore - performance.memory is available in some browsers
      return performance.memory.usedJSHeapSize || 0;
    }
    return 0;
  }

  async checkSystemPerformance(): Promise<{
    memoryUsage: number;
    isMemoryExceeded: boolean;
    avgResponseTime: number;
    isResponseTimeDegraded: boolean;
  }> {
    const memoryUsage = await this.getMemoryUsage();
    const avgResponseTime = this.getAverageResponseTime();

    return {
      memoryUsage,
      isMemoryExceeded: memoryUsage > this.performanceThresholds.memoryUsage,
      avgResponseTime,
      isResponseTimeDegraded: avgResponseTime > this.performanceThresholds.responseTime
    };
  }

  cleanup(): void {
    this.metrics = [];
  }

  // Export metrics for analysis
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      exportedAt: new Date().toISOString(),
      summary: {
        totalRequests: this.metrics.length,
        overallSuccessRate: this.getSuccessRate(),
        overallAverageResponseTime: this.getAverageResponseTime()
      }
    }, null, 2);
  }
}