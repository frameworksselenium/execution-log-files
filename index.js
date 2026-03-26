import { Worker } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TOTAL_TEST_CASES = parseInt(process.env.TOTAL_TEST_CASES) || 500;
const NUM_THREADS = parseInt(process.env.NUM_THREADS) || 10;
const MIN_RUNTIME_MINUTES = parseFloat(process.env.MIN_RUNTIME_MINUTES) || 15;
const DATA_FOLDER = process.env.DATA_FOLDER || './data';

// Calculate distribution
const TEST_CASES_PER_THREAD = Math.ceil(TOTAL_TEST_CASES / NUM_THREADS);

// Calculate timing to ensure minimum runtime
const minSecondsPerThread = MIN_RUNTIME_MINUTES * 60;
const timePerTestCase = minSecondsPerThread / TEST_CASES_PER_THREAD;
// Distribute time across 5 steps (in milliseconds)
const STEP_DELAY_MS = Math.floor((timePerTestCase * 1000) / 5);

// Global statistics
const globalStats = {
  workers: {},
  totalPassed: 0,
  totalFailed: 0,
  totalTests: 0,
  startTime: Date.now()
};

// Create data folder if it doesn't exist
if (!fs.existsSync(DATA_FOLDER)) {
  fs.mkdirSync(DATA_FOLDER, { recursive: true });
  console.log(`✓ Created data folder: ${DATA_FOLDER}`);
} else {
  // Clean up old log files
  const files = fs.readdirSync(DATA_FOLDER);
  files.forEach(file => {
    if (file.startsWith('runner') || file === 'step-count.csv') {
      fs.unlinkSync(path.join(DATA_FOLDER, file));
    }
  });
  console.log(`✓ Cleaned data folder: ${DATA_FOLDER}`);
}

// Generate step-count.csv file
function generateStepCountCSV() {
  const csvPath = path.join(DATA_FOLDER, 'step-count.csv');
  let csvContent = 'Test Case,Step Count\n';
  
  for (let i = 1; i <= TOTAL_TEST_CASES; i++) {
    csvContent += `TC-${i},5\n`;
  }
  
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`✓ Generated step-count.csv with ${TOTAL_TEST_CASES} test cases`);
}

generateStepCountCSV();

// Read step-count.csv and return array of { testCase, stepCount }
function loadTestCasesFromCSV() {
  const csvPath = path.join(DATA_FOLDER, 'step-count.csv');
  const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  // Skip header
  return lines.slice(1).map(line => {
    const [testCase, stepCount] = line.split(',');
    return { testCase: testCase.trim(), stepCount: parseInt(stepCount.trim()) };
  });
}

// Split array into N chunks
function chunkArray(arr, n) {
  const chunks = [];
  const size = Math.ceil(arr.length / n);
  for (let i = 0; i < n; i++) {
    chunks.push(arr.slice(i * size, (i + 1) * size));
  }
  return chunks;
}

// Load all test cases from CSV and distribute
const allTestCases = loadTestCasesFromCSV();
const testCaseChunks = chunkArray(allTestCases, NUM_THREADS);

console.log(`✓ Loaded ${allTestCases.length} test cases from step-count.csv`);

// Function to create and start a worker thread
function createWorker(workerId) {
  const assignedTestCases = testCaseChunks[workerId - 1] || [];

  globalStats.workers[workerId] = {
    status: 'running',
    completed: 0,
    total: assignedTestCases.length,
    passed: 0,
    failed: 0
  };

  const worker = new Worker('./worker.js', {
    workerData: {
      workerId,
      dataFolder: DATA_FOLDER,
      assignedTestCases,
      stepDelayMs: STEP_DELAY_MS
    }
  });

  worker.on('message', (msg) => {
    const { message, data, workerId: wId } = msg;
    
    if (message === 'Started') {
      console.log(`[Main] Worker ${wId}: Started - ${data.assignedCount} test cases assigned`);
    } else if (message === 'Progress') {
      globalStats.workers[wId].completed = data.completed;
      globalStats.workers[wId].passed = data.stats.passed;
      globalStats.workers[wId].failed = data.stats.failed;
      
      const progress = (data.completed / data.total * 100).toFixed(1);
      console.log(`[Main] Worker ${wId}: Progress ${progress}% (${data.completed}/${data.total}) | P:${data.stats.passed} F:${data.stats.failed}`);
    } else if (message === 'Completed') {
      globalStats.workers[wId].status = 'completed';
      globalStats.workers[wId].completed = data.stats.total;
      globalStats.workers[wId].passed = data.stats.passed;
      globalStats.workers[wId].failed = data.stats.failed;
      
      globalStats.totalPassed += data.stats.passed;
      globalStats.totalFailed += data.stats.failed;
      globalStats.totalTests += data.stats.total;
      
      const duration = (data.duration / 1000 / 60).toFixed(2);
      console.log(`[Main] Worker ${wId}: Completed in ${duration} minutes | Passed:${data.stats.passed} Failed:${data.stats.failed}`);
      
      checkAllWorkersCompleted();
    } else if (message === 'Error') {
      globalStats.workers[wId].status = 'error';
      console.error(`[Main] Worker ${wId}: ERROR - ${data.error}`);
    }
  });

  worker.on('error', (error) => {
    globalStats.workers[workerId].status = 'error';
    console.error(`[Main] Worker ${workerId} error:`, error.message);
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[Main] Worker ${workerId} exited with code ${code}`);
      globalStats.workers[workerId].status = 'failed';
    }
    checkAllWorkersCompleted();
  });

  return worker;
}

// Check if all workers completed and print final summary
function checkAllWorkersCompleted() {
  const allCompleted = Object.values(globalStats.workers).every(
    w => w.status === 'completed' || w.status === 'error' || w.status === 'failed'
  );
  
  if (allCompleted) {
    printFinalSummary();
  }
}

// Print final summary
function printFinalSummary() {
  const totalDuration = Date.now() - globalStats.startTime;
  const minutes = Math.floor(totalDuration / 60000);
  const seconds = ((totalDuration % 60000) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(80));
  console.log('FINAL TEST EXECUTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Test Cases Executed: ${globalStats.totalTests}`);
  console.log(`Passed: ${globalStats.totalPassed} (${(globalStats.totalPassed / globalStats.totalTests * 100).toFixed(2)}%)`);
  console.log(`Failed: ${globalStats.totalFailed} (${(globalStats.totalFailed / globalStats.totalTests * 100).toFixed(2)}%)`);
  console.log(`Total Duration: ${minutes}m ${seconds}s`);
  console.log(`Threads Used: ${NUM_THREADS}`);
  console.log(`Average per Thread: ${(globalStats.totalTests / NUM_THREADS).toFixed(0)} test cases`);
  console.log('='.repeat(80));
  console.log('\nPer-Worker Results:');
  Object.entries(globalStats.workers).forEach(([wId, stats]) => {
    console.log(`  Worker ${wId}: ${stats.passed}/${stats.completed} passed (Status: ${stats.status})`);
  });
  console.log('='.repeat(80));
  
  // Exit with appropriate code for Jenkins
  const exitCode = globalStats.totalFailed > 0 ? 1 : 0;
  console.log(`\nExiting with code ${exitCode} ${exitCode === 0 ? '(SUCCESS)' : '(FAILURE)'}`);
  
  setTimeout(() => {
    process.exit(exitCode);
  }, 1000);
}

// Start the application
console.log('='.repeat(80));
console.log('AUTOMATED TEST EXECUTION FRAMEWORK');
console.log('='.repeat(80));
console.log(`Total Test Cases (from CSV): ${allTestCases.length}`);
console.log(`Threads: ${NUM_THREADS}`);
console.log(`Test Cases per Thread: ~${TEST_CASES_PER_THREAD}`);
console.log(`Minimum Runtime: ${MIN_RUNTIME_MINUTES} minutes`);
console.log(`Step Delay: ${STEP_DELAY_MS}ms`);
console.log(`Estimated Runtime: ~${(TEST_CASES_PER_THREAD * timePerTestCase / 60).toFixed(1)} minutes per thread`);
console.log(`Data Folder: ${DATA_FOLDER}`);
console.log('='.repeat(80));

// Create and start all workers
const workers = [];
console.log('\nStarting worker threads...\n');
for (let i = 1; i <= NUM_THREADS; i++) {
  const chunk = testCaseChunks[i - 1] || [];
  const first = chunk[0]?.testCase || '-';
  const last = chunk[chunk.length - 1]?.testCase || '-';
  const worker = createWorker(i);
  workers.push(worker);
  console.log(`✓ Worker ${i} started - ${chunk.length} test cases (${first} → ${last})`);
}

console.log('\n' + '='.repeat(80));
console.log('All workers are running. Press Ctrl+C to stop.');
console.log('='.repeat(80) + '\n');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n[Main] Received SIGINT, shutting down workers...');
  workers.forEach((worker, index) => {
    worker.terminate();
    console.log(`✓ Terminated Worker ${index + 1}`);
  });
  console.log('\nTest execution interrupted by user.');
  process.exit(130); // Standard exit code for SIGINT
});
