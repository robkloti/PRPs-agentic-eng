// CostTracker - Monitors usage and enforces cost limits
class CostTracker {
  constructor() {
    this.dailyInteractions = 0;
    this.dailyCost = 0;
    this.lastResetDate = null;
    this.interactionHistory = [];
    
    // Warning thresholds
    this.warningThreshold = 80; // Warn at 80% of limits
    this.criticalThreshold = 95; // Critical warning at 95%
    
    // Event callbacks
    this.onUsageUpdate = null;
    this.onWarning = null;
    this.onLimitReached = null;
    
    // Load existing data from localStorage
    this.loadDailyStats();
    
    // Check if we need to reset for a new day
    this.checkDailyReset();
    
    Utils.info('CostTracker initialized', this.getUsageStats());
  }

  loadDailyStats() {
    try {
      const stored = Utils.getLocalStorage(CONFIG.STORAGE_KEYS.USAGE_STATS);
      
      if (stored) {
        this.dailyInteractions = stored.interactions || 0;
        this.dailyCost = stored.cost || 0;
        this.lastResetDate = stored.date || null;
        this.interactionHistory = stored.history || [];
        
        Utils.debug('Loaded usage stats from storage:', stored);
      } else {
        Utils.debug('No existing usage stats found, starting fresh');
        this.initializeFreshStats();
      }
    } catch (error) {
      Utils.error('Failed to load usage stats from storage:', error);
      this.initializeFreshStats();
    }
  }

  initializeFreshStats() {
    this.dailyInteractions = 0;
    this.dailyCost = 0;
    this.lastResetDate = new Date().toDateString();
    this.interactionHistory = [];
    this.saveDailyStats();
  }

  checkDailyReset() {
    const today = new Date().toDateString();
    
    if (this.lastResetDate !== today) {
      Utils.info('New day detected, resetting usage stats');
      this.resetDailyStats();
    }
  }

  resetDailyStats() {
    const previousStats = {
      date: this.lastResetDate,
      interactions: this.dailyInteractions,
      cost: this.dailyCost,
      history: [...this.interactionHistory]
    };
    
    // Archive previous day's stats
    this.archivePreviousDay(previousStats);
    
    // Reset current stats
    this.dailyInteractions = 0;
    this.dailyCost = 0;
    this.lastResetDate = new Date().toDateString();
    this.interactionHistory = [];
    
    this.saveDailyStats();
    
    Utils.info('Daily usage stats reset for new day');
  }

  archivePreviousDay(stats) {
    if (stats.interactions === 0) return; // Don't archive empty days
    
    try {
      const archives = Utils.getLocalStorage('avatarUsageArchive', []);
      
      // Add previous day to archives
      archives.push(stats);
      
      // Keep only last 30 days
      if (archives.length > 30) {
        archives.splice(0, archives.length - 30);
      }
      
      Utils.setLocalStorage('avatarUsageArchive', archives);
      Utils.debug('Archived previous day stats:', stats);
    } catch (error) {
      Utils.error('Failed to archive previous day stats:', error);
    }
  }

  canMakeRequest() {
    // Check daily interaction limit
    if (this.dailyInteractions >= CONFIG.MAX_DAILY_INTERACTIONS) {
      Utils.warn('Daily interaction limit reached:', this.dailyInteractions);
      return false;
    }
    
    // Check daily cost limit
    if (this.dailyCost >= CONFIG.DAILY_COST_LIMIT) {
      Utils.warn('Daily cost limit reached:', this.dailyCost);
      return false;
    }
    
    return true;
  }

  logInteraction(estimatedCost = CONFIG.ESTIMATED_COST_PER_INTERACTION) {
    const interaction = {
      timestamp: new Date().toISOString(),
      cost: estimatedCost,
      id: Utils.generateId('interaction')
    };
    
    // Update counters
    this.dailyInteractions++;
    this.dailyCost += estimatedCost;
    this.interactionHistory.push(interaction);
    
    // Keep history manageable (last 100 interactions)
    if (this.interactionHistory.length > 100) {
      this.interactionHistory.shift();
    }
    
    // Save updated stats
    this.saveDailyStats();
    
    // Check for warnings and limits
    this.checkWarningsAndLimits();
    
    Utils.info(`Logged interaction #${this.dailyInteractions} - Cost: ${Utils.formatCurrency(estimatedCost)}`);
    
    // Notify listeners
    if (this.onUsageUpdate) {
      this.onUsageUpdate(this.getUsageStats());
    }
    
    return interaction;
  }

  checkWarningsAndLimits() {
    const stats = this.getUsageStats();
    
    // Check interaction limits
    const interactionPercentage = CONFIG.getInteractionUsagePercentage(this.dailyInteractions);
    const costPercentage = CONFIG.getCostUsagePercentage(this.dailyCost);
    
    const maxPercentage = Math.max(interactionPercentage, costPercentage);
    
    if (maxPercentage >= 100) {
      // Limit reached
      this.handleLimitReached(stats);
    } else if (maxPercentage >= this.criticalThreshold) {
      // Critical warning
      this.handleWarning('critical', stats);
    } else if (maxPercentage >= this.warningThreshold) {
      // Warning
      this.handleWarning('warning', stats);
    }
  }

  handleWarning(level, stats) {
    const message = level === 'critical' 
      ? `Critical: ${stats.interactions}/${stats.maxInteractions} interactions used (${stats.cost.toFixed(2)}/${stats.maxCost} cost limit)`
      : CONFIG.COST_WARNING_MESSAGE;
    
    Utils.warn(`Usage ${level}:`, message);
    
    if (this.onWarning) {
      this.onWarning(level, message, stats);
    }
    
    // Announce to screen readers
    Utils.announce(message, level === 'critical' ? 'assertive' : 'polite');
  }

  handleLimitReached(stats) {
    const message = stats.interactions >= stats.maxInteractions 
      ? CONFIG.ERROR_MESSAGES.DAILY_LIMIT_REACHED
      : CONFIG.ERROR_MESSAGES.COST_LIMIT_REACHED;
    
    Utils.error('Usage limit reached:', message);
    
    if (this.onLimitReached) {
      this.onLimitReached(message, stats);
    }
    
    // Announce to screen readers
    Utils.announce(message, 'assertive');
  }

  saveDailyStats() {
    const data = {
      date: this.lastResetDate,
      interactions: this.dailyInteractions,
      cost: this.dailyCost,
      history: this.interactionHistory,
      savedAt: new Date().toISOString()
    };
    
    const saved = Utils.setLocalStorage(CONFIG.STORAGE_KEYS.USAGE_STATS, data);
    
    if (!saved) {
      Utils.error('Failed to save usage stats to localStorage');
    } else {
      Utils.debug('Usage stats saved to localStorage');
    }
  }

  getUsageStats() {
    return {
      // Current usage
      interactions: this.dailyInteractions,
      cost: this.dailyCost,
      
      // Limits
      maxInteractions: CONFIG.MAX_DAILY_INTERACTIONS,
      maxCost: CONFIG.DAILY_COST_LIMIT,
      
      // Percentages
      interactionPercentage: CONFIG.getInteractionUsagePercentage(this.dailyInteractions),
      costPercentage: CONFIG.getCostUsagePercentage(this.dailyCost),
      
      // Status
      canMakeRequest: this.canMakeRequest(),
      isApproachingLimits: CONFIG.isApproachingLimits({
        interactions: this.dailyInteractions,
        cost: this.dailyCost
      }),
      
      // Metadata
      date: this.lastResetDate,
      lastInteraction: this.interactionHistory.length > 0 
        ? this.interactionHistory[this.interactionHistory.length - 1]
        : null
    };
  }

  getDetailedStats() {
    const basic = this.getUsageStats();
    
    return {
      ...basic,
      
      // History
      interactionHistory: [...this.interactionHistory],
      totalInteractionsToday: this.dailyInteractions,
      
      // Averages
      averageCostPerInteraction: this.dailyInteractions > 0 
        ? this.dailyCost / this.dailyInteractions 
        : 0,
      
      // Time analysis
      firstInteractionToday: this.interactionHistory.length > 0 
        ? this.interactionHistory[0].timestamp 
        : null,
      lastInteractionToday: this.interactionHistory.length > 0 
        ? this.interactionHistory[this.interactionHistory.length - 1].timestamp 
        : null,
      
      // Remaining capacity
      remainingInteractions: Math.max(0, CONFIG.MAX_DAILY_INTERACTIONS - this.dailyInteractions),
      remainingCost: Math.max(0, CONFIG.DAILY_COST_LIMIT - this.dailyCost),
      
      // Warnings
      warningThreshold: this.warningThreshold,
      criticalThreshold: this.criticalThreshold
    };
  }

  getHistoricalData(days = 7) {
    try {
      const archives = Utils.getLocalStorage('avatarUsageArchive', []);
      
      // Get last N days
      const historical = archives.slice(-days);
      
      // Include today's data
      if (this.dailyInteractions > 0) {
        historical.push({
          date: this.lastResetDate,
          interactions: this.dailyInteractions,
          cost: this.dailyCost,
          history: [...this.interactionHistory]
        });
      }
      
      return historical;
    } catch (error) {
      Utils.error('Failed to get historical data:', error);
      return [];
    }
  }

  // Get usage summary for display
  getUsageSummary() {
    const stats = this.getUsageStats();
    
    return {
      text: `${stats.interactions}/${stats.maxInteractions}`,
      cost: Utils.formatCurrency(stats.cost),
      percentage: Math.max(stats.interactionPercentage, stats.costPercentage),
      status: stats.canMakeRequest ? 'ok' : 'limit_reached',
      warning: stats.isApproachingLimits ? 'approaching_limit' : null
    };
  }

  // Reset usage for testing/admin purposes
  resetUsage() {
    Utils.info('Manually resetting usage stats');
    
    this.dailyInteractions = 0;
    this.dailyCost = 0;
    this.interactionHistory = [];
    this.lastResetDate = new Date().toDateString();
    
    this.saveDailyStats();
    
    if (this.onUsageUpdate) {
      this.onUsageUpdate(this.getUsageStats());
    }
  }

  // Update cost estimate for future interactions
  updateCostEstimate(newEstimate) {
    if (newEstimate > 0 && newEstimate !== CONFIG.ESTIMATED_COST_PER_INTERACTION) {
      Utils.info(`Updated cost estimate from ${CONFIG.ESTIMATED_COST_PER_INTERACTION} to ${newEstimate}`);
      // Note: We don't modify CONFIG directly, but could store user preference
    }
  }

  // Export usage data
  exportUsageData() {
    try {
      const currentStats = this.getDetailedStats();
      const historical = this.getHistoricalData(30); // Last 30 days
      
      const exportData = {
        exportDate: new Date().toISOString(),
        currentStats: currentStats,
        historical: historical,
        configuration: {
          maxDailyInteractions: CONFIG.MAX_DAILY_INTERACTIONS,
          dailyCostLimit: CONFIG.DAILY_COST_LIMIT,
          estimatedCostPerInteraction: CONFIG.ESTIMATED_COST_PER_INTERACTION
        }
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      Utils.error('Failed to export usage data:', error);
      return null;
    }
  }

  // Cleanup method
  destroy() {
    Utils.info('Destroying CostTracker');
    
    // Save final stats
    this.saveDailyStats();
    
    // Clear callbacks
    this.onUsageUpdate = null;
    this.onWarning = null;
    this.onLimitReached = null;
    
    Utils.info('CostTracker destroyed');
  }
}

// Export CostTracker class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CostTracker;
} else if (typeof window !== 'undefined') {
  window.CostTracker = CostTracker;
}