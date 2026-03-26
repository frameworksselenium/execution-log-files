# Execution Log Files - Automated Test Execution Framework

A Node.js application that executes 500 test cases across 10 parallel worker threads, with each test case logging detailed execution steps. Designed for Jenkins CI/CD integration.

## Features

- 🧪 500 automated test cases
- 🔄 10 concurrent worker threads (50 tests per thread)
- 📁 Automatic creation of data folder
- 📝 10 separate process-level log files (one per worker)
- ⏱️ Minimum 15-minute runtime with configurable delays
- 📊 Detailed test case logging (start, 5 steps, end)
- 💯 Real-time pass/fail tracking
- 🎯 Progress updates every 10 test cases
- 🏗️ Jenkins-ready with proper exit codes
- 📈 Final test execution summary

## Project Structure

```
execution-log-files/
├── package.json          # Project configuration
├── index.js             # Main application orchestrator
├── worker.js            # Worker thread test executor
├── config.js            # Configuration file
├── Jenkinsfile          # Jenkins pipeline definition
├── run-tests.sh         # Shell script for Jenkins
├── README.md            # This file
└── data/                # Created automatically
    ├── process_1.log    # Worker 1 test logs (TC 1-50)
    ├── process_2.log    # Worker 2 test logs (TC 51-100)
    ├── ...
    └── process_10.log   # Worker 10 test logs (TC 451-500)
```

## Requirements

- Node.js 14.x or higher (for ES modules and worker threads support)

## Installation

No additional dependencies needed. The project uses only Node.js built-in modules.

## Usage

### Local Execution

Run the application:

```bash
npm start
```

Or directly:

```bash
node index.js
```

Using the shell script:

```bash
./run-tests.sh
```

### With Custom Configuration

```bash
TOTAL_TEST_CASES=1000 NUM_THREADS=20 MIN_RUNTIME_MINUTES=20 npm start
```

### Jenkins Execution

1. **Direct Pipeline**: Use the provided `Jenkinsfile` in your Jenkins pipeline job
2. **Shell Script**: Run `./run-tests.sh` in Jenkins Execute Shell step
3. **Custom Command**: Run `npm start` in Jenkins with environment variables

The application will:
1. Clean and create a `data` folder
2. Start 10 worker threads
3. Distribute 500 test cases across workers (50 each)
4. Each test case logs: START → 5 Steps → END
5. Run for minimum 15 minutes (18 seconds per test case)
6. Generate detailed logs for each worker
7. Report final summary with pass/fail counts
8. Exit with code 0 (success) or 1 (failures detected)

## Stopping the Application

Press `Ctrl+C` to gracefully stop all workers before the 30-minute runtime completes.

## Log File Format

Each log file contains structured test execution logs:

### Test Case Structure
- Test case START marker
- 5 detailed execution steps
- Test case END marker with PASS/FAIL status
- Duration in milliseconds

### Example Log Entry

```
[2026-03-25T10:30:45.123Z] [Worker-1] ┌─ [TC-25] TEST CASE STARTED - Test Case 25
[2026-03-25T10:30:45.124Z] [Worker-1] │  [TC-25] Description: Automated test execution for scenario 25
[2026-03-25T10:30:48.125Z] [Worker-1]   ├─ [TC-25] Step 1: Initializing test data
[2026-03-25T10:30:51.126Z] [Worker-1]   ├─ [TC-25] Step 2: Validating input parameters
[2026-03-25T10:30:54.127Z] [Worker-1]   ├─ [TC-25] Step 3: Executing business logic
[2026-03-25T10:30:57.128Z] [Worker-1]   ├─ [TC-25] Step 4: Verifying output results
[2026-03-25T10:31:00.129Z] [Worker-1]   ├─ [TC-25] Step 5: Cleaning up resources
[2026-03-25T10:31:00.130Z] [Worker-1] └─ [TC-25] TEST CASE PASSED - Duration: 15007ms
```

### Progress Markers

```
>>> Progress: 10/50 (20.0%) | Passed: 9, Failed: 1
```

### Summary Section

```
======================================================================
TEST EXECUTION SUMMARY
======================================================================
Total Test Cases: 50
Passed: 48 (96.00%)
Failed: 2 (4.00%)
Skipped: 0
Duration: 15m 23.45s
======================================================================
```

## Configuration

### Environment Variables

- `TOTAL_TEST_CASES`: Total number of test cases to execute (default: 500)
- `NUM_THREADS`: Number of parallel worker threads (default: 10)
- `MIN_RUNTIME_MINUTES`: Minimum runtime in minutes (default: 15)
- `DATA_FOLDER`: Directory for log files (default: './data')

### Configuration File

Edit [config.js](config.js) for advanced settings:
- Test pass rate simulation
- Jenkins integration options
- Verbose logging
- JUnit XML report generation

### Calculated Values

- **Test Cases per Thread**: `Math.ceil(TOTAL_TEST_CASES / NUM_THREADS)`
- **Step Delay**: Auto-calculated to ensure minimum runtime
- **Time per Test Case**: `(MIN_RUNTIME_MINUTES * 60) / TEST_CASES_PER_THREAD` seconds

## Jenkins Integration

### Pipeline Setup

1. Create a new Pipeline job in Jenkins
2. Point to your repository containing this code
3. Use the provided `Jenkinsfile`
4. Configure environment variables as needed

### Exit Codes

- **0**: All tests passed successfully
- **1**: One or more tests failed
- **130**: Interrupted by user (Ctrl+C)

### Jenkins Output

- Real-time progress updates in console
- Archived log files (data/*.log)
- Test summary report
- Pass/fail statistics

## Notes

- Each worker operates independently
- Test cases are evenly distributed across workers
- Log files are created fresh on each run
- All workers complete at approximately the same time
- Minimum 15-minute runtime ensures realistic test execution
- Sleep delays between steps simulate actual test operations
- 95% default pass rate (configurable)

## Troubleshooting

### Tests Complete Too Quickly

Increase `MIN_RUNTIME_MINUTES` environment variable:
```bash
MIN_RUNTIME_MINUTES=30 npm start
```

### Need More Test Cases

```bash
TOTAL_TEST_CASES=1000 npm start
```

### Jenkins Exit Code Issues

The application properly exits with:
- Code 0 when all tests pass
- Code 1 when any test fails

Check Jenkins console for the final summary.

## Example Output

```
================================================================================
AUTOMATED TEST EXECUTION FRAMEWORK
================================================================================
Total Test Cases: 500
Threads: 10
Test Cases per Thread: 50
Minimum Runtime: 15 minutes
Step Delay: 3000ms
Estimated Runtime: ~15.0 minutes per thread
Data Folder: ./data
================================================================================

Starting worker threads...

✓ Worker 1 started - Test cases 1 to 50
✓ Worker 2 started - Test cases 51 to 100
...
✓ Worker 10 started - Test cases 451 to 500

================================================================================
[Main] Worker 1: Started - 50 test cases assigned
[Main] Worker 2: Progress 20.0% (10/50) | P:9 F:1
...
[Main] Worker 10: Completed in 15.23 minutes | Passed:48 Failed:2

================================================================================
FINAL TEST EXECUTION SUMMARY
================================================================================
Total Test Cases Executed: 500
Passed: 478 (95.60%)
Failed: 22 (4.40%)
Total Duration: 15m 34.56s
Threads Used: 10
Average per Thread: 50 test cases
================================================================================
```
