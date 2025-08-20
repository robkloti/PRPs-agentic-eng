// Performance tests for measuring app performance and resource usage

async function runPerformanceTests() {
  log('⚡ Running performance tests...');
  let totalResults = { passed: 0, failed: 0, total: 0 };
  
  try {
    const results = await testFramework.suite('Performance Tests', function() {
      
      testFramework.test('Initial load performance', () => {
        const loadTime = performance.now();
        assertTrue(loadTime > 0, 'Should have valid load time');
        
        if (performance.timing) {
          const timing = performance.timing;
          const totalLoadTime = timing.loadEventEnd - timing.navigationStart;
          
          log(`📊 Page load time: ${totalLoadTime}ms`);
          
          if (totalLoadTime > 0) {
            assertTrue(totalLoadTime < 10000, 'Page should load within 10 seconds');
            log(`✅ Load time acceptable: ${totalLoadTime}ms`);
          }
        }
      });

      testFramework.test('Memory usage baseline', () => {
        const memory = testFramework.measureMemory();
        
        if (memory) {
          log(`💾 Memory usage: ${memory.used}MB / ${memory.total}MB (limit: ${memory.limit}MB)`);
          
          assertTrue(memory.used > 0, 'Should have memory usage data');
          assertTrue(memory.used < memory.limit, 'Should not exceed memory limit');
          assertTrue(memory.used < 100, 'Should use less than 100MB for basic page');
        } else {
          log('ℹ️ Memory API not available in this browser');
        }
      });

      testFramework.test('Component initialization performance', async () => {
        const measurements = [];
        
        // Test CostTracker initialization
        const costTrackerTime = testFramework.measurePerformance('CostTracker init', () => {
          const tracker = new CostTracker();
          tracker.resetUsage();
          return tracker;
        });
        measurements.push({ name: 'CostTracker', duration: costTrackerTime.duration });
        
        // Test AudioRecorder initialization
        const audioRecorderTime = testFramework.measurePerformance('AudioRecorder init', () => {
          return new AudioRecorder();
        });
        measurements.push({ name: 'AudioRecorder', duration: audioRecorderTime.duration });
        
        // Test Utils functions
        const utilsTime = testFramework.measurePerformance('Utils.checkBrowserSupport', () => {
          return Utils.checkBrowserSupport();
        });
        measurements.push({ name: 'Utils.checkBrowserSupport', duration: utilsTime.duration });
        
        // Verify all components initialize quickly
        measurements.forEach(measurement => {
          assertTrue(measurement.duration < 100, `${measurement.name} should initialize within 100ms`);
          log(`⚡ ${measurement.name}: ${measurement.duration.toFixed(2)}ms`);
        });
        
        const totalInitTime = measurements.reduce((sum, m) => sum + m.duration, 0);
        assertTrue(totalInitTime < 500, 'Total component init should be under 500ms');
        log(`📊 Total component init time: ${totalInitTime.toFixed(2)}ms`);
      });

      testFramework.asyncTest('Async operation performance', async () => {
        const measurements = [];
        
        // Test localStorage operations
        const storageTime = await testFramework.measureAsyncPerformance('localStorage operations', async () => {
          const testData = { test: 'data', timestamp: Date.now() };
          
          Utils.setLocalStorage('perf-test', testData);
          const retrieved = Utils.getLocalStorage('perf-test');
          Utils.removeLocalStorage('perf-test');
          
          return retrieved;
        });
        measurements.push({ name: 'localStorage', duration: storageTime.duration });
        
        // Test Utils.delay
        const delayTime = await testFramework.measureAsyncPerformance('Utils.delay(50)', async () => {
          await Utils.delay(50);
        });
        measurements.push({ name: 'Utils.delay(50)', duration: delayTime.duration });
        
        // Verify timing accuracy
        assertTrue(delayTime.duration >= 45, 'Delay should be at least 45ms');
        assertTrue(delayTime.duration < 100, 'Delay should be less than 100ms (allowing for overhead)');
        
        measurements.forEach(measurement => {
          log(`⚡ ${measurement.name}: ${measurement.duration.toFixed(2)}ms`);
        });
      });

      testFramework.test('DOM manipulation performance', () => {
        const iterations = 1000;
        
        const domTime = testFramework.measurePerformance(`DOM operations (${iterations}x)`, () => {
          const fragment = document.createDocumentFragment();
          
          for (let i = 0; i < iterations; i++) {
            const div = document.createElement('div');
            div.textContent = `Item ${i}`;
            div.className = 'test-item';
            fragment.appendChild(div);
          }
          
          return fragment;
        });
        
        assertTrue(domTime.duration < 1000, 'DOM operations should complete within 1 second');
        log(`📊 DOM performance: ${(domTime.duration / iterations).toFixed(3)}ms per operation`);
      });

      testFramework.test('Configuration access performance', () => {
        const iterations = 10000;
        
        const configTime = testFramework.measurePerformance(`CONFIG access (${iterations}x)`, () => {
          let result = null;
          for (let i = 0; i < iterations; i++) {
            result = CONFIG.MAX_RECORDING_TIME;
            result = CONFIG.DAILY_COST_LIMIT;
            result = CONFIG.N8N_WEBHOOK_URL;
          }
          return result;
        });
        
        assertTrue(configTime.duration < 100, 'Config access should be very fast');
        log(`📊 Config access: ${(configTime.duration / iterations * 1000).toFixed(3)}μs per access`);
      });

    });
    
    totalResults.passed += results.passed;
    totalResults.failed += results.failed;
    totalResults.total += results.total;
    
    testFramework.displayResults('performance-test-results', results);
    
  } catch (error) {
    log(`❌ Performance tests failed: ${error.message}`);
    totalResults.failed++;
    totalResults.total++;
  }
  
  return totalResults;
}

async function testPerformance() {
  log('🏁 Running comprehensive performance benchmark...');
  
  const button = event.target;
  button.disabled = true;
  button.textContent = 'Running...';
  
  try {
    const results = await testFramework.suite('Performance Benchmark', function() {
      
      testFramework.test('JavaScript execution performance', () => {
        // CPU intensive task
        const iterations = 100000;
        
        const cpuTime = testFramework.measurePerformance('CPU intensive task', () => {
          let result = 0;
          for (let i = 0; i < iterations; i++) {
            result += Math.sqrt(i) * Math.sin(i);
          }
          return result;
        });
        
        assertTrue(cpuTime.duration < 5000, 'CPU task should complete within 5 seconds');
        log(`🔢 CPU performance: ${cpuTime.duration.toFixed(2)}ms for ${iterations} operations`);
      });

      testFramework.asyncTest('Component stress test', async () => {
        const componentCount = 100;
        const components = [];
        
        const creationTime = testFramework.measurePerformance('Component creation', () => {
          for (let i = 0; i < componentCount; i++) {
            components.push(new CostTracker());
          }
        });
        
        assertTrue(creationTime.duration < 2000, 'Should create components quickly');
        log(`🏗️ Created ${componentCount} components in ${creationTime.duration.toFixed(2)}ms`);
        
        // Test component operations
        const operationTime = testFramework.measurePerformance('Component operations', () => {
          components.forEach((tracker, index) => {
            tracker.resetUsage();
            tracker.logInteraction(1.0);
            tracker.getUsageStats();
          });
        });
        
        assertTrue(operationTime.duration < 1000, 'Component operations should be fast');
        log(`⚙️ Performed operations on ${componentCount} components in ${operationTime.duration.toFixed(2)}ms`);
        
        // Cleanup
        components.forEach(component => {
          if (component.destroy) component.destroy();
        });
      });

      testFramework.test('Large data handling', () => {
        const largeArray = new Array(10000).fill(0).map((_, i) => ({
          id: i,
          name: `Item ${i}`,
          data: Math.random(),
          timestamp: Date.now() + i
        }));
        
        const processingTime = testFramework.measurePerformance('Large array processing', () => {
          // Simulate data processing
          return largeArray
            .filter(item => item.data > 0.5)
            .map(item => ({ ...item, processed: true }))
            .reduce((acc, item) => acc + item.data, 0);
        });
        
        assertTrue(processingTime.duration < 1000, 'Large data processing should be efficient');
        log(`📈 Processed ${largeArray.length} items in ${processingTime.duration.toFixed(2)}ms`);
      });

      testFramework.asyncTest('Simulated network delay handling', async () => {
        const delays = [10, 50, 100, 500, 1000];
        const results = [];
        
        for (const delay of delays) {
          const measureResult = await testFramework.measureAsyncPerformance(`Network simulation ${delay}ms`, async () => {
            await Utils.delay(delay);
            return `Response after ${delay}ms`;
          });
          
          results.push({
            expectedDelay: delay,
            actualDuration: measureResult.duration,
            response: measureResult.result
          });
        }
        
        results.forEach(result => {
          const accuracy = Math.abs(result.actualDuration - result.expectedDelay);
          assertTrue(accuracy < 50, `Delay accuracy should be within 50ms (was ${accuracy.toFixed(2)}ms off)`);
          
          log(`🌐 ${result.expectedDelay}ms delay → ${result.actualDuration.toFixed(2)}ms actual`);
        });
      });

      testFramework.test('Garbage collection impact', () => {
        const initialMemory = testFramework.measureMemory();
        
        // Create objects that will need garbage collection
        const garbageTime = testFramework.measurePerformance('Garbage generation', () => {
          const objects = [];
          for (let i = 0; i < 10000; i++) {
            objects.push({
              id: i,
              data: new Array(100).fill(Math.random()),
              nested: { value: i, timestamp: Date.now() }
            });
          }
          
          // Clear references
          objects.length = 0;
          return 'garbage created';
        });
        
        const afterMemory = testFramework.measureMemory();
        
        log(`🗑️ Garbage generation: ${garbageTime.duration.toFixed(2)}ms`);
        
        if (initialMemory && afterMemory) {
          const memoryDiff = afterMemory.used - initialMemory.used;
          log(`💾 Memory change: ${memoryDiff}MB`);
          
          // Memory might increase due to garbage, but shouldn't be excessive
          assertTrue(memoryDiff < 50, 'Memory increase should be reasonable');
        }
      });

    });
    
    testFramework.displayResults('performance-test-results', results);
    log(`⚡ Performance benchmark completed: ${results.passed} passed, ${results.failed} failed`);
    
  } catch (error) {
    log(`❌ Performance benchmark failed: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = 'Run Performance Tests';
  }
}

async function testMemoryUsage() {
  log('💾 Testing memory usage...');
  
  const button = event.target;
  button.disabled = true;
  button.textContent = 'Testing...';
  
  try {
    const results = await testFramework.suite('Memory Usage', function() {
      
      testFramework.test('Baseline memory measurement', () => {
        const memory = testFramework.measureMemory();
        
        if (memory) {
          assertTrue(memory.used >= 0, 'Memory usage should be non-negative');
          assertTrue(memory.total >= memory.used, 'Total memory should be >= used memory');
          assertTrue(memory.limit > memory.total, 'Memory limit should be > total memory');
          
          log(`📊 Current memory usage:`);
          log(`   Used: ${memory.used}MB`);
          log(`   Total: ${memory.total}MB`);
          log(`   Limit: ${memory.limit}MB`);
          log(`   Usage: ${((memory.used / memory.limit) * 100).toFixed(1)}%`);
          
          // Warn if memory usage is high
          if (memory.used > 50) {
            log(`⚠️ High memory usage detected: ${memory.used}MB`);
          }
          
        } else {
          log('ℹ️ Memory measurement not available in this browser');
        }
      });

      testFramework.test('Memory leak detection', () => {
        const initialMemory = testFramework.measureMemory();
        
        // Create and destroy components multiple times
        const iterations = 10;
        for (let i = 0; i < iterations; i++) {
          const tracker = new CostTracker();
          tracker.resetUsage();
          tracker.logInteraction(1.0);
          
          const recorder = new AudioRecorder();
          recorder.cleanup();
          
          // Force cleanup
          if (tracker.destroy) tracker.destroy();
          if (recorder.destroy) recorder.destroy();
        }
        
        const finalMemory = testFramework.measureMemory();
        
        if (initialMemory && finalMemory) {
          const memoryIncrease = finalMemory.used - initialMemory.used;
          log(`🔄 Memory change after ${iterations} component cycles: ${memoryIncrease}MB`);
          
          // Allow some memory increase, but not excessive
          assertTrue(memoryIncrease < 10, 'Memory increase should be minimal after cleanup');
          
          if (memoryIncrease < 0) {
            log('✅ Memory actually decreased (garbage collection occurred)');
          } else if (memoryIncrease < 2) {
            log('✅ Memory increase is minimal');
          }
        }
      });

      testFramework.asyncTest('Long-running operation memory', async () => {
        const initialMemory = testFramework.measureMemory();
        
        // Simulate long-running operations
        const operations = [];
        for (let i = 0; i < 1000; i++) {
          operations.push(Utils.delay(1)); // Many small delays
        }
        
        await Promise.all(operations);
        
        const finalMemory = testFramework.measureMemory();
        
        if (initialMemory && finalMemory) {
          const memoryChange = finalMemory.used - initialMemory.used;
          log(`⏳ Memory change after async operations: ${memoryChange}MB`);
          
          assertTrue(Math.abs(memoryChange) < 5, 'Memory should remain stable during async operations');
        }
        
        log('✅ Long-running operations completed without memory issues');
      });

      testFramework.test('Large object handling', () => {
        const initialMemory = testFramework.measureMemory();
        
        // Create large objects
        const largeObjects = [];
        for (let i = 0; i < 100; i++) {
          largeObjects.push({
            id: i,
            data: new Array(1000).fill(0).map(() => Math.random()),
            metadata: {
              created: Date.now(),
              index: i,
              description: `Large object ${i} with lots of data`
            }
          });
        }
        
        const afterCreation = testFramework.measureMemory();
        
        // Clear the objects
        largeObjects.length = 0;
        
        const afterCleanup = testFramework.measureMemory();
        
        if (initialMemory && afterCreation && afterCleanup) {
          const creationIncrease = afterCreation.used - initialMemory.used;
          const cleanupDecrease = afterCreation.used - afterCleanup.used;
          
          log(`📈 Memory increase during large object creation: ${creationIncrease}MB`);
          log(`📉 Memory decrease after cleanup: ${cleanupDecrease}MB`);
          
          assertTrue(creationIncrease > 0, 'Memory should increase when creating large objects');
          
          // Note: Garbage collection is not immediate, so cleanup might not show immediate decrease
          if (cleanupDecrease > 0) {
            log('✅ Immediate memory cleanup detected');
          } else {
            log('ℹ️ Memory cleanup will occur during next garbage collection');
          }
        }
      });

    });
    
    testFramework.displayResults('performance-test-results', results);
    log(`💾 Memory usage test completed: ${results.passed} passed, ${results.failed} failed`);
    
  } catch (error) {
    log(`❌ Memory usage test failed: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = 'Test Memory Usage';
  }
}

// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.isMonitoring = false;
  }
  
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor long tasks if available
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              log(`⚠️ Long task detected: ${entry.duration.toFixed(2)}ms`);
              this.recordMetric('longTask', entry.duration);
            }
          }
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
        
      } catch (error) {
        log(`ℹ️ Long task monitoring not available: ${error.message}`);
      }
    }
    
    log('📊 Performance monitoring started');
  }
  
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.isMonitoring = false;
    
    log('📊 Performance monitoring stopped');
  }
  
  recordMetric(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push(value);
  }
  
  getMetrics() {
    const summary = {};
    
    for (const [name, values] of this.metrics) {
      summary[name] = {
        count: values.length,
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        total: values.reduce((sum, val) => sum + val, 0)
      };
    }
    
    return summary;
  }
  
  clearMetrics() {
    this.metrics.clear();
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// Export for external access
if (typeof window !== 'undefined') {
  window.performanceMonitor = performanceMonitor;
}