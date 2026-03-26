#!/bin/bash

# Test Execution Script for Jenkins
# This script can be called from Jenkins or run standalone

set -e  # Exit on error

# Default values
TOTAL_TEST_CASES=${TOTAL_TEST_CASES:-500}
NUM_THREADS=${NUM_THREADS:-10}
MIN_RUNTIME_MINUTES=${MIN_RUNTIME_MINUTES:-15}

echo "================================================================================"
echo "Test Execution Script"
echo "================================================================================"
echo "Total Test Cases: $TOTAL_TEST_CASES"
echo "Number of Threads: $NUM_THREADS"
echo "Minimum Runtime: $MIN_RUNTIME_MINUTES minutes"
echo "================================================================================"

# Create data directory if it doesn't exist
mkdir -p data

# Clean old logs
echo "Cleaning old log files..."
rm -f data/*.log

# Export environment variables
export TOTAL_TEST_CASES
export NUM_THREADS
export MIN_RUNTIME_MINUTES

# Run the tests
echo "Starting test execution..."
node index.js

# Capture exit code
EXIT_CODE=$?

echo "================================================================================"
echo "Test execution completed with exit code: $EXIT_CODE"
echo "================================================================================"

# Generate summary
if [ -f data/process_1.log ]; then
    echo ""
    echo "Log files generated:"
    ls -lh data/*.log
    echo ""
    
    echo "Test Results Summary:"
    PASSED=$(grep -h "TEST CASE PASSED" data/*.log 2>/dev/null | wc -l | tr -d ' ')
    FAILED=$(grep -h "TEST CASE FAILED" data/*.log 2>/dev/null | wc -l | tr -d ' ')
    TOTAL=$((PASSED + FAILED))
    
    echo "  Total: $TOTAL"
    echo "  Passed: $PASSED"
    echo "  Failed: $FAILED"
    
    if [ $TOTAL -gt 0 ]; then
        PASS_RATE=$(awk "BEGIN {printf \"%.2f\", ($PASSED/$TOTAL)*100}")
        echo "  Pass Rate: ${PASS_RATE}%"
    fi
    echo ""
fi

exit $EXIT_CODE
