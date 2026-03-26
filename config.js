// Test Execution Configuration
// This file contains all configurable parameters for the test execution framework

export const config = {
  // Total number of test cases to execute
  totalTestCases: process.env.TOTAL_TEST_CASES || 500,
  
  // Number of parallel worker threads
  numThreads: process.env.NUM_THREADS || 10,
  
  // Minimum runtime in minutes
  minRuntimeMinutes: process.env.MIN_RUNTIME_MINUTES || 15,
  
  // Data folder for log files
  dataFolder: process.env.DATA_FOLDER || './data',
  
  // Test execution settings
  test: {
    // Number of steps per test case (default: 5)
    stepsPerTest: 5,
    
    // Pass rate percentage (for simulation, 0-100)
    passRate: 95,
    
    // Enable verbose logging
    verbose: process.env.VERBOSE === 'true' || false
  },
  
  // Jenkins integration settings
  jenkins: {
    // Enable Jenkins-specific output format
    enabled: process.env.JENKINS === 'true' || process.env.CI === 'true',
    
    // Generate JUnit XML report
    generateJUnitXML: process.env.GENERATE_JUNIT === 'true' || false,
    
    // JUnit XML output path
    junitOutputPath: process.env.JUNIT_OUTPUT_PATH || './test-results/results.xml'
  }
};

export default config;
