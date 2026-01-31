#!/bin/bash

# Security check script for Finance App
# Scans code for potential security issues

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔒 Running Security Checks...${NC}"
echo ""

ISSUES_FOUND=0

# Check for exposed secrets
check_secrets() {
    echo "1. Checking for exposed secrets..."
    
    SECRET_PATTERNS=(
        "password\s*=\s*['\"].*['\"]"
        "api_key\s*=\s*['\"].*['\"]"
        "secret\s*=\s*['\"].*['\"]"
        "token\s*=\s*['\"].*['\"]"
        "aws_access_key"
        "aws_secret_key"
        "private_key"
        "PRIVATE_KEY"
    )
    
    for pattern in "${SECRET_PATTERNS[@]}"; do
        if grep -rnI "$pattern" --include="*.js" --include="*.jsx" --include="*.json" \
            --include="*.env" --include="*.config.js" \
            "$PROJECT_DIR/src" "$PROJECT_DIR" 2>/dev/null | \
            grep -v node_modules | grep -v ".git" | grep -v "//.*example" | grep -v "//.*test"; then
            echo -e "${RED}⚠️  Warning: Potential secret pattern found: $pattern${NC}"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
    done
    
    if [ $ISSUES_FOUND -eq 0 ]; then
        echo -e "${GREEN}✅ No obvious secrets found${NC}"
    fi
    echo ""
}

# Check for console.log in production code
check_console_logs() {
    echo "2. Checking for console.log statements..."
    
    if find "$PROJECT_DIR/src" -name "*.js" -o -name "*.jsx" 2>/dev/null | \
        xargs grep -l "console\.log\|console\.debug\|console\.warn" 2>/dev/null | head -10; then
        echo -e "${YELLOW}⚠️  Warning: console.log statements found${NC}"
        echo "Consider removing for production builds"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✅ No console.log statements found${NC}"
    fi
    echo ""
}

# Check for vulnerable dependencies
check_dependencies() {
    echo "3. Checking for vulnerable dependencies..."
    
    if [ -f "$PROJECT_DIR/package.json" ]; then
        cd "$PROJECT_DIR"
        
        if command -v npm &> /dev/null; then
            npm audit --audit-level=moderate || {
                echo -e "${RED}❌ Vulnerable dependencies found${NC}"
                ISSUES_FOUND=$((ISSUES_FOUND + 1))
            }
        else
            echo -e "${YELLOW}⚠️  npm not found, skipping dependency check${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  package.json not found${NC}"
    fi
    echo ""
}

# Check for insecure HTTP requests
check_http_requests() {
    echo "4. Checking for insecure HTTP requests..."
    
    if grep -rnI "http://" --include="*.js" --include="*.jsx" \
        "$PROJECT_DIR/src" 2>/dev/null | \
        grep -v "localhost" | grep -v "127.0.0.1" | grep -v "//.*example"; then
        echo -e "${YELLOW}⚠️  Warning: HTTP requests found (should use HTTPS)${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✅ No insecure HTTP requests found${NC}"
    fi
    echo ""
}

# Check file permissions
check_permissions() {
    echo "5. Checking file permissions..."
    
    # Check for world-writable files
    if find "$PROJECT_DIR" -type f -perm -002 ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null | head -5; then
        echo -e "${YELLOW}⚠️  Warning: World-writable files found${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✅ File permissions look good${NC}"
    fi
    echo ""
}

# Run all checks
check_secrets
check_console_logs
check_dependencies
check_http_requests
check_permissions

# Summary
echo "================================"
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ All security checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $ISSUES_FOUND potential security issue(s)${NC}"
    echo "Please review and fix the issues above"
    exit 1
fi
