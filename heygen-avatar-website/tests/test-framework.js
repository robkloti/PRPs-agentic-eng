// Simple test framework for HeyGen Avatar Website
class TestFramework {
  constructor() {
    this.currentSuite = null;
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      suites: []
    };
  }

  suite(name, fn) {
    this.currentSuite = {
      name: name,
      tests: [],
      passed: 0,
      failed: 0
    };

    log(`📋 Starting test suite: ${name}`);

    try {
      fn.call(this);
      
      this.results.suites.push(this.currentSuite);
      this.results.passed += this.currentSuite.passed;
      this.results.failed += this.currentSuite.failed;
      this.results.total += this.currentSuite.tests.length;

      log(`✅ Suite "${name}" completed: ${this.currentSuite.passed} passed, ${this.currentSuite.failed} failed`);
      
    } catch (error) {
      log(`❌ Suite "${name}" failed: ${error.message}`);
      this.results.failed++;
      this.results.total++;
    } finally {
      this.currentSuite = null;
    }

    return this.results;
  }

  test(name, fn) {
    if (!this.currentSuite) {
      throw new Error('Tests must be run within a suite');
    }

    const test = {
      name: name,
      passed: false,
      error: null,
      duration: 0
    };

    const startTime = Date.now();

    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.then(() => {
          test.passed = true;
          test.duration = Date.now() - startTime;
          this.recordTestResult(test);
        }).catch(error => {
          test.error = error.message;
          test.duration = Date.now() - startTime;
          this.recordTestResult(test);
          throw error;
        });
      } else {
        test.passed = true;
        test.duration = Date.now() - startTime;
        this.recordTestResult(test);
      }
    } catch (error) {
      test.error = error.message;
      test.duration = Date.now() - startTime;
      this.recordTestResult(test);
      throw error;
    }
  }

  async asyncTest(name, fn) {
    if (!this.currentSuite) {
      throw new Error('Tests must be run within a suite');
    }

    const test = {
      name: name,
      passed: false,
      error: null,
      duration: 0
    };

    const startTime = Date.now();

    try {
      await fn();
      test.passed = true;
      test.duration = Date.now() - startTime;
      this.recordTestResult(test);
    } catch (error) {
      test.error = error.message;
      test.duration = Date.now() - startTime;
      this.recordTestResult(test);
      throw error;
    }
  }

  recordTestResult(test) {
    this.currentSuite.tests.push(test);
    
    if (test.passed) {
      this.currentSuite.passed++;
      log(`  ✅ ${test.name} (${test.duration}ms)`);
    } else {
      this.currentSuite.failed++;
      log(`  ❌ ${test.name}: ${test.error} (${test.duration}ms)`);
    }
  }

  // Assertion methods
  assert(condition, message = 'Assertion failed') {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertNotEqual(actual, expected, message) {
    if (actual === expected) {
      throw new Error(message || `Expected not to equal ${expected}, but got ${actual}`);
    }
  }

  assertTrue(condition, message) {
    this.assertEqual(condition, true, message || 'Expected true');
  }

  assertFalse(condition, message) {
    this.assertEqual(condition, false, message || 'Expected false');
  }

  assertNull(value, message) {
    if (value !== null) {
      throw new Error(message || `Expected null, got ${value}`);
    }
  }

  assertNotNull(value, message) {
    if (value === null) {
      throw new Error(message || 'Expected not null');
    }
  }

  assertUndefined(value, message) {
    if (value !== undefined) {
      throw new Error(message || `Expected undefined, got ${value}`);
    }
  }

  assertNotUndefined(value, message) {
    if (value === undefined) {
      throw new Error(message || 'Expected not undefined');
    }
  }

  assertThrows(fn, message) {
    let threw = false;
    try {
      fn();
    } catch (error) {
      threw = true;
    }
    if (!threw) {
      throw new Error(message || 'Expected function to throw');
    }
  }

  async assertThrowsAsync(fn, message) {
    let threw = false;
    try {
      await fn();
    } catch (error) {
      threw = true;
    }
    if (!threw) {
      throw new Error(message || 'Expected async function to throw');
    }
  }

  assertInstanceOf(object, constructor, message) {
    if (!(object instanceof constructor)) {
      throw new Error(message || `Expected instance of ${constructor.name}`);
    }
  }

  assertType(value, type, message) {
    if (typeof value !== type) {
      throw new Error(message || `Expected type ${type}, got ${typeof value}`);
    }
  }

  assertArrayEqual(actual, expected, message) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) {
      throw new Error(message || 'Both values must be arrays');
    }
    
    if (actual.length !== expected.length) {
      throw new Error(message || `Array lengths differ: ${actual.length} vs ${expected.length}`);
    }
    
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) {
        throw new Error(message || `Arrays differ at index ${i}: ${actual[i]} vs ${expected[i]}`);
      }
    }
  }

  assertObjectEqual(actual, expected, message) {
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    
    this.assertArrayEqual(actualKeys, expectedKeys, message || 'Object keys differ');
    
    for (const key of actualKeys) {
      if (actual[key] !== expected[key]) {
        throw new Error(message || `Objects differ at key ${key}: ${actual[key]} vs ${expected[key]}`);
      }
    }
  }

  // Utility methods for testing
  async timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  createMockElement(tagName, attributes = {}) {
    const element = document.createElement(tagName);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
  }

  createMockVideo(attributes = {}) {
    const video = this.createMockElement('video', {
      muted: true,
      playsinline: true,
      ...attributes
    });

    // Mock video methods
    video.play = async () => {};
    video.pause = () => {};
    video.load = () => {};
    
    return video;
  }

  mockFetch(responses = {}) {
    const originalFetch = window.fetch;
    
    window.fetch = jest.fn((url, options) => {
      if (responses[url]) {
        const response = responses[url];
        return Promise.resolve({
          ok: response.ok !== false,
          status: response.status || 200,
          statusText: response.statusText || 'OK',
          json: () => Promise.resolve(response.data || {}),
          text: () => Promise.resolve(response.text || ''),
          headers: new Headers(response.headers || {})
        });
      }
      
      return Promise.reject(new Error(`No mock response for ${url}`));
    });
    
    return () => {
      window.fetch = originalFetch;
    };
  }

  mockLocalStorage() {
    const storage = {};
    
    const mockStorage = {
      getItem: jest.fn(key => storage[key] || null),
      setItem: jest.fn((key, value) => { storage[key] = value; }),
      removeItem: jest.fn(key => { delete storage[key]; }),
      clear: jest.fn(() => { Object.keys(storage).forEach(key => delete storage[key]); }),
      get length() { return Object.keys(storage).length; },
      key: jest.fn(index => Object.keys(storage)[index] || null)
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true
    });
    
    return storage;
  }

  // Test result display helpers
  displayResults(containerId, results) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = results.suites.map(suite => {
      const suiteClass = suite.failed === 0 ? 'test-pass' : 'test-fail';
      
      const testsHtml = suite.tests.map(test => {
        const testClass = test.passed ? 'test-pass' : 'test-fail';
        const icon = test.passed ? '✅' : '❌';
        const error = test.error ? ` - ${test.error}` : '';
        
        return `<div class="test-result ${testClass}">
          ${icon} ${test.name} (${test.duration}ms)${error}
        </div>`;
      }).join('');

      return `
        <div class="test-result ${suiteClass}">
          <strong>${suite.name}</strong> - ${suite.passed}/${suite.tests.length} passed
        </div>
        ${testsHtml}
      `;
    }).join('');

    container.innerHTML = html;
  }

  // Performance testing utilities
  measurePerformance(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    const duration = end - start;
    log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    
    return { result, duration };
  }

  async measureAsyncPerformance(name, fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    const duration = end - start;
    log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    
    return { result, duration };
  }

  measureMemory() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }
}

// Global test framework instance
const testFramework = new TestFramework();

// Export test methods globally for convenience
const { suite, test, asyncTest } = testFramework;
const {
  assert, assertEqual, assertNotEqual, assertTrue, assertFalse,
  assertNull, assertNotNull, assertUndefined, assertNotUndefined,
  assertThrows, assertThrowsAsync, assertInstanceOf, assertType,
  assertArrayEqual, assertObjectEqual
} = testFramework;