#!/bin/bash

# Quick Test Script - Runs a short test to verify functionality
# This runs 20 test cases across 4 threads for about 1 minute

echo "Running quick test (20 test cases, 4 threads, ~1 minute)..."
echo ""

TOTAL_TEST_CASES=20 NUM_THREADS=4 MIN_RUNTIME_MINUTES=1 node index.js

echo ""
echo "Quick test completed!"
