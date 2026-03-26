import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';

const { workerId, dataFolder, testCasesPerThread, stepDelayMs } = workerData;

// Log file path for this worker
const logFilePath = path.join(dataFolder, `process_${workerId}.log`);

// Create write stream for logging
const logStream = fs.createWriteStream(logFilePath, { flags: 'w' });

// Statistics
const stats = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0
};

// Helper function to write logs
function writeLog(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [Worker-${workerId}] ${message}\n`;
  logStream.write(logEntry);
  console.log(`[Worker-${workerId}] ${message}`);
}

// Helper function to send message to parent
function notifyParent(message, data = {}) {
  if (parentPort) {
    parentPort.postMessage({ message, data, workerId });
  }
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simulate test step execution
async function executeTestStep(testCaseId, stepNumber) {
  const stepName = `Step ${stepNumber}`;
  const actions = [
    'Initializing test data',
    'Validating input parameters',
    'Executing business logic',
    'Verifying output results',
    'Cleaning up resources'
  ];
  
  const action = actions[stepNumber - 1] || 'Processing';
  writeLog(`  ├─ [TC-${testCaseId}] ${stepName}: ${action}`);
  
  // Simulate work with sleep
  await sleep(stepDelayMs);
  
  // Simulate occasional warnings
  if (Math.random() > 0.95) {
    writeLog(`  │  └─ [TC-${testCaseId}] ${stepName}: Warning - Minor issue detected but continuing`);
  }
}

// Execute a single test case
async function executeTestCase(testCaseId) {
  const startTime = Date.now();
  
  try {
    // Test case started
    writeLog(`┌─ [TC-${testCaseId}] TEST CASE STARTED - Test Case ${testCaseId}`);
    writeLog(`│  [TC-${testCaseId}] Description: Automated test execution for scenario ${testCaseId}`);
    
    stats.total++;
    
    // Execute 5 steps
    for (let step = 1; step <= 5; step++) {
      await executeTestStep(testCaseId, step);
    }
    
    // Simulate test result (95% pass rate)
    const passed = Math.random() > 0.05;
    const duration = Date.now() - startTime;
    
    if (passed) {
      stats.passed++;
      writeLog(`└─ [TC-${testCaseId}] TEST CASE PASSED - Duration: ${duration}ms`);
      return { testCaseId, status: 'PASSED', duration };
    } else {
      stats.failed++;
      writeLog(`└─ [TC-${testCaseId}] TEST CASE FAILED - Expected: true, Actual: false - Duration: ${duration}ms`);
      return { testCaseId, status: 'FAILED', duration };
    }
    
  } catch (error) {
    stats.failed++;
    const duration = Date.now() - startTime;
    writeLog(`└─ [TC-${testCaseId}] TEST CASE ERROR - ${error.message} - Duration: ${duration}ms`);
    return { testCaseId, status: 'ERROR', duration, error: error.message };
  }
}

// Main execution function
async function runTests() {
  const overallStartTime = Date.now();
  
  writeLog('='.repeat(70));
  writeLog('Worker thread started - Test execution beginning');
  writeLog(`Total test cases to execute: ${testCasesPerThread}`);
  writeLog(`Log file: ${logFilePath}`);
  writeLog(`Step delay: ${stepDelayMs}ms`);
  writeLog('='.repeat(70));
  
  notifyParent('Started', { testCasesPerThread });
  
  // Calculate test case IDs for this worker
  const startTestId = (workerId - 1) * testCasesPerThread + 1;
  const results = [];
  
  // Execute all test cases sequentially
  for (let i = 0; i < testCasesPerThread; i++) {
    const testCaseId = startTestId + i;
    const result = await executeTestCase(testCaseId);
    results.push(result);
    
    // Progress update every 10 test cases
    if ((i + 1) % 10 === 0) {
      const progress = ((i + 1) / testCasesPerThread * 100).toFixed(1);
      writeLog(`\n>>> Progress: ${i + 1}/${testCasesPerThread} (${progress}%) | Passed: ${stats.passed}, Failed: ${stats.failed}\n`);
      notifyParent('Progress', { 
        completed: i + 1, 
        total: testCasesPerThread, 
        stats: { ...stats }
      });
    }
  }
  
  // Final summary
  const totalDuration = Date.now() - overallStartTime;
  const minutes = Math.floor(totalDuration / 60000);
  const seconds = ((totalDuration % 60000) / 1000).toFixed(2);
  
  writeLog('\n' + '='.repeat(70));
  writeLog('TEST EXECUTION SUMMARY');
  writeLog('='.repeat(70));
  writeLog(`Total Test Cases: ${stats.total}`);
  writeLog(`Passed: ${stats.passed} (${(stats.passed / stats.total * 100).toFixed(2)}%)`);
  writeLog(`Failed: ${stats.failed} (${(stats.failed / stats.total * 100).toFixed(2)}%)`);
  writeLog(`Skipped: ${stats.skipped}`);
  writeLog(`Duration: ${minutes}m ${seconds}s`);
  writeLog('='.repeat(70));
  
  notifyParent('Completed', { 
    stats: { ...stats },
    duration: totalDuration,
    results
  });
  
  // Close log stream and exit
  logStream.end(() => {
    process.exit(stats.failed > 0 ? 1 : 0);
  });
}

// Start test execution
runTests().catch((error) => {
  writeLog(`FATAL ERROR: ${error.message}`);
  writeLog(error.stack);
  notifyParent('Error', { error: error.message });
  logStream.end(() => {
    process.exit(1);
  });
});

// Handle termination
process.on('SIGTERM', () => {
  writeLog('Worker terminated by parent');
  logStream.end();
  process.exit(1);
});
