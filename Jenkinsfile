pipeline {
  agent any
  environment {
    AWS_REGION     = 'us-east-1'
    ECR_REGISTRY   = credentials('aws-account-id') + '.dkr.ecr.us-east-1.amazonaws.com'
    IMAGE_TAG      = "\"
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Build Images') {
      steps {
        script {
          ['auth-service','analysis-service','ml-service','frontend'].each { svc ->
            sh "docker build -t pca-insight/\:\ ./services/\"
          }
        }
      }
    }
    stage('Push to ECR') {
      steps {
        withCredentials([aws(credentialsId: 'aws-creds')]) {
          sh 'aws ecr get-login-password --region \ | docker login --username AWS --password-stdin \'
          script {
            ['auth-service','analysis-service','ml-service','frontend'].each { svc ->
              sh "docker tag pca-insight/\:\ \/pca-insight/\:\"
              sh "docker push \/pca-insight/\:\"
            }
          }
        }
      }
    }
    stage('Deploy to EKS') {
      steps {
        withCredentials([aws(credentialsId: 'aws-creds')]) {
          sh 'aws eks update-kubeconfig --region \ --name pca-insight-cluster'
          sh 'kubectl apply -f k8s/'
          sh 'kubectl rollout status deployment/auth-service'
          sh 'kubectl rollout status deployment/analysis-service'
        }
      }
    }
  }
  post {
    failure {
      sh 'kubectl rollout undo deployment/auth-service || true'
      sh 'kubectl rollout undo deployment/analysis-service || true'
    }
  }
}
