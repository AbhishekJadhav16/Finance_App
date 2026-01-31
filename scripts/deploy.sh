#!/bin/bash

# Deployment script for Finance App
# Usage: ./scripts/deploy.sh [environment] [version]

set -e

ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Finance App Deployment Script${NC}"
echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"
echo "Project Directory: $PROJECT_DIR"
echo ""

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}❌ Error: Invalid environment '$ENVIRONMENT'${NC}"
    echo "Usage: $0 [staging|production] [version]"
    exit 1
fi

# Functions
check_health() {
    local url=$1
    echo "Checking health at $url..."
    
    for i in {1..30}; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Health check passed!${NC}"
            return 0
        fi
        echo "Attempt $i/30: Waiting for service..."
        sleep 2
    done
    
    echo -e "${RED}❌ Health check failed!${NC}"
    return 1
}

create_backup() {
    if [ "$ENVIRONMENT" == "production" ]; then
        echo -e "${YELLOW}📦 Creating backup...${NC}"
        # Add your backup logic here
        # Example: docker exec container tar -czf backup.tar.gz /data
        echo "Backup created (placeholder)"
    fi
}

deploy_docker() {
    echo -e "${GREEN}🐳 Deploying with Docker...${NC}"
    
    cd "$PROJECT_DIR"
    
    # Stop existing containers
    echo "Stopping existing containers..."
    docker-compose -f docker-compose.${ENVIRONMENT}.yml down || true
    
    # Pull latest images
    echo "Pulling latest images..."
    docker-compose -f docker-compose.${ENVIRONMENT}.yml pull
    
    # Start new containers
    echo "Starting new containers..."
    docker-compose -f docker-compose.${ENVIRONMENT}.yml up -d
    
    # Wait for services to be ready
    echo "Waiting for services to start..."
    sleep 10
}

deploy_aws() {
    echo -e "${GREEN}☁️  Deploying to AWS...${NC}"
    
    # Example AWS deployment commands
    echo "Updating ECS service..."
    # aws ecs update-service \
    #     --cluster finance-app-cluster \
    #     --service finance-app-service \
    #     --force-new-deployment \
    #     --region us-east-1
    
    echo "AWS deployment completed (placeholder)"
}

deploy_kubernetes() {
    echo -e "${GREEN}☸️  Deploying to Kubernetes...${NC}"
    
    # Example Kubernetes deployment
    echo "Applying Kubernetes manifests..."
    # kubectl apply -f k8s/${ENVIRONMENT}/
    # kubectl rollout status deployment/finance-app -n ${ENVIRONMENT}
    
    echo "Kubernetes deployment completed (placeholder)"
}

# Main deployment logic
main() {
    echo -e "${YELLOW}Starting deployment process...${NC}"
    echo ""
    
    # Create backup for production
    create_backup
    
    # Choose deployment method based on configuration
    DEPLOYMENT_METHOD=${DEPLOYMENT_METHOD:-docker}
    
    case $DEPLOYMENT_METHOD in
        docker)
            deploy_docker
            HEALTH_URL="http://localhost:8080"
            ;;
        aws)
            deploy_aws
            HEALTH_URL="https://${ENVIRONMENT}-finance-app.example.com/health"
            ;;
        kubernetes)
            deploy_kubernetes
            HEALTH_URL="https://${ENVIRONMENT}-finance-app.example.com/health"
            ;;
        *)
            echo -e "${RED}❌ Unknown deployment method: $DEPLOYMENT_METHOD${NC}"
            exit 1
            ;;
    esac
    
    # Health check
    if [ -n "$HEALTH_URL" ]; then
        check_health "$HEALTH_URL"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo "Environment: $ENVIRONMENT"
    echo "Version: $VERSION"
    echo "Timestamp: $(date)"
}

# Run main function
main
