import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';

const { workerId, dataFolder, assignedTestCases, stepDelayMs } = workerData;

// Runner file only (no process log file)
const runnerFilePath = path.join(dataFolder, `runner${workerId - 1}.txt`);
const runnerStream = fs.createWriteStream(runnerFilePath, { flags: 'w' });

// Statistics
const stats = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0
};

// Log to console only (no log file)
function writeLog(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Worker-${workerId}] ${message}`);
}

// Helper function to write to runner file
function writeRunner(message) {
  runnerStream.write(message + '\n');
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
async function executeTestStep(stepNumber, tcLabel, stepCount) {
  const actions = [
    'Initializing test data',
    'Validating input parameters',
    'Executing business logic',
    'Verifying output results',
    'Cleaning up resources'
  ];
  
  const action = actions[(stepNumber - 1) % actions.length];
  writeLog(`  ├─ [${tcLabel}] Step ${stepNumber}/${stepCount}: ${action}`);
  
  // Write to runner file
  writeRunner(`|STEP START|${tcLabel}|${action}`);
  
  // Simulate work with sleep
  await sleep(stepDelayMs);
  
  // Write step end to runner file
  writeRunner(`|STEP END|${tcLabel}|${action}`);
  
  // Simulate occasional warnings
  if (Math.random() > 0.95) {
    writeLog(`  │  └─ [${tcLabel}] Step ${stepNumber}: Warning - Minor issue detected but continuing`);
  }
}

// Execute a single test case using CSV entry { testCase, stepCount }
async function executeTestCase(tcEntry) {
  const startTime = Date.now();
  const tcLabel   = tcEntry.testCase;        // e.g. "TC-1"
  const stepCount = tcEntry.stepCount || 5;  // from CSV column

  try {
    writeRunner(`SCENARIO START|${tcLabel}`);
    writeLog(`┌─ [${tcLabel}] TEST CASE STARTED (${stepCount} steps)`);

    stats.total++;

    for (let step = 1; step <= stepCount; step++) {
      await executeTestStep(step, tcLabel, stepCount);
    }

    const passed   = Math.random() > 0.05;
    const duration = Date.now() - startTime;

    writeRunner(`SCENARIO END|${tcLabel}`);
    writeRunner('');

    if (passed) {
      stats.passed++;
      writeLog(`└─ [${tcLabel}] TEST CASE PASSED - Duration: ${duration}ms`);
      return { tcLabel, status: 'PASSED', duration };
    } else {
      stats.failed++;
      writeLog(`└─ [${tcLabel}] TEST CASE FAILED - Duration: ${duration}ms`);
      return { tcLabel, status: 'FAILED', duration };
    }

  } catch (error) {
    stats.failed++;
    const duration = Date.now() - startTime;
    writeLog(`└─ [${tcLabel}] TEST CASE ERROR - ${error.message} - Duration: ${duration}ms`);
    writeRunner(`SCENARIO END|${tcLabel}`);
    writeRunner('');
    return { tcLabel, status: 'ERROR', duration, error: error.message };
  }
}

// Main execution function
async function runTests() {
  const overallStartTime = Date.now();
  
  writeLog('='.repeat(70));
  writeLog('Worker thread started - Test execution beginning');
  writeLog(`Assigned test cases : ${assignedTestCases.length}`);
  writeLog(`Range               : ${assignedTestCases[0]?.testCase} → ${assignedTestCases[assignedTestCases.length - 1]?.testCase}`);
  writeLog(`Runner file         : ${runnerFilePath}`);
  writeLog(`Step delay          : ${stepDelayMs}ms`);
  writeLog('='.repeat(70));
  
  notifyParent('Started', { assignedCount: assignedTestCases.length });
  
  const results = [];
  
  // Execute all assigned test cases from CSV
  for (let i = 0; i < assignedTestCases.length; i++) {
    const result = await executeTestCase(assignedTestCases[i]);
    results.push(result);
    
    // Progress update every 10 test cases
    if ((i + 1) % 10 === 0) {
      const progress = ((i + 1) / assignedTestCases.length * 100).toFixed(1);
      writeLog(`\n>>> Progress: ${i + 1}/${assignedTestCases.length} (${progress}%) | Passed: ${stats.passed}, Failed: ${stats.failed}\n`);
      notifyParent('Progress', { 
        completed: i + 1, 
        total: assignedTestCases.length, 
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
  
  runnerStream.end(() => {
    process.exit(stats.failed > 0 ? 1 : 0);
  });
}

// Start test execution
runTests().catch((error) => {
  writeLog(`FATAL ERROR: ${error.message}`);
  writeLog(error.stack);
  notifyParent('Error', { error: error.message });
  runnerStream.end(() => process.exit(1));
});

// Handle termination
process.on('SIGTERM', () => {
  writeLog('Worker terminated by parent');
  runnerStream.end();
  process.exit(1);
});
