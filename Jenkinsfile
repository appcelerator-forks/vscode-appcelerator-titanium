#! groovy
library 'pipeline-library'

timestamps {
  def nodeVersion = '8.11.4'
  def npmVersion = 'latest'

  node('osx') {
    stage('Checkout') {
      checkout([
        $class: 'GitSCM',
        branches: scm.branches,
        extensions: scm.extensions + [[$class: 'CleanBeforeCheckout']],
        userRemoteConfigs: scm.userRemoteConfigs
      ])
    }

    nodejs(nodeJSInstallationName: "node ${nodeVersion}") {
      ansiColor('xterm') {
        stage('Install') {
          timeout(15) {
            // Ensure we have npm
            ensureNPM(npmVersion)
            sh 'npm ci'
          } // timeout
        } // stage install

        stage('Lint and Test') {
          sh 'npm run lint'
          try {
            sh 'npm run test'
          } finally {
            junit 'junit_report.xml'
          }
        } // stage lint and test

        stage('Build vsix') {
          // Create the vsix package
          sh 'npx vsce package'
          // Archive it
          archiveArtifacts '*.vsix'
        }

        stage('Danger') {
          withEnv(["BUILD_STATUS=${currentBuild.currentResult}","DANGER_JS_APP_INSTALL_ID=''"]) {
            sh returnStatus: true, script: 'npx danger ci --verbose' // Don't fail build if danger fails. We want to retain existing build status.
          } // withEnv
        }
      } // ansiColor
    } // nodejs
  } // node
} // timestamps
