pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        TOTAL_TEST_CASES = '500'
        NUM_THREADS = '10'
        MIN_RUNTIME_MINUTES = '15'
    }
    
    stages {
        stage('Setup') {
            steps {
                echo 'Setting up Node.js environment...'
                sh 'node --version'
                sh 'npm --version'
            }
        }
        
        stage('Clean') {
            steps {
                echo 'Cleaning previous test results...'
                sh 'rm -rf data/*.log'
                sh 'mkdir -p data'
            }
        }
        
        stage('Execute Tests') {
            steps {
                echo "Starting test execution: ${TOTAL_TEST_CASES} test cases across ${NUM_THREADS} threads"
                script {
                    def startTime = System.currentTimeMillis()
                    
                    // Run the test execution
                    def exitCode = sh(
                        script: 'npm start',
                        returnStatus: true
                    )
                    
                    def endTime = System.currentTimeMillis()
                    def duration = (endTime - startTime) / 1000 / 60
                    
                    echo "Test execution completed in ${duration} minutes"
                    
                    // Check exit code
                    if (exitCode != 0) {
                        error("Test execution failed with exit code ${exitCode}")
                    }
                }
            }
        }
        
        stage('Archive Results') {
            steps {
                echo 'Archiving test results...'
                archiveArtifacts artifacts: 'data/*.log', fingerprint: true
                
                script {
                    // Parse log files for summary
                    sh '''
                        echo "=== Test Results Summary ===" > test-summary.txt
                        grep -h "TEST EXECUTION SUMMARY" data/*.log >> test-summary.txt || true
                        grep -h "Total Test Cases:" data/*.log >> test-summary.txt || true
                        grep -h "Passed:" data/*.log >> test-summary.txt || true
                        grep -h "Failed:" data/*.log >> test-summary.txt || true
                        cat test-summary.txt
                    '''
                    
                    archiveArtifacts artifacts: 'test-summary.txt', fingerprint: true
                }
            }
        }
        
        stage('Analyze Results') {
            steps {
                script {
                    echo 'Analyzing test results...'
                    
                    // Count passes and failures from logs
                    def passCount = sh(
                        script: "grep -h 'TEST CASE PASSED' data/*.log | wc -l",
                        returnStdout: true
                    ).trim()
                    
                    def failCount = sh(
                        script: "grep -h 'TEST CASE FAILED' data/*.log | wc -l",
                        returnStdout: true
                    ).trim()
                    
                    echo "Total Passed: ${passCount}"
                    echo "Total Failed: ${failCount}"
                    
                    if (failCount.toInteger() > 0) {
                        unstable("${failCount} test case(s) failed")
                    }
                }
            }
        }
    }
    
    post {
        always {
            echo 'Cleaning up...'
            // Keep logs but clean up any temp files
        }
        success {
            echo 'Test execution completed successfully!'
        }
        failure {
            echo 'Test execution failed!'
        }
        unstable {
            echo 'Test execution completed with failures!'
        }
    }
}
