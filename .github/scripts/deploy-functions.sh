#!/bin/bash

# Deployment script for Supabase Edge Functions
# This script handles deployment with proper error handling and logging

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${SUPABASE_PROJECT_ID:-onargmygfwynbbrytkpy}"
LOG_FILE="/tmp/supabase-deployment.log"
FUNCTIONS_DIR="supabase/functions"

# Initialize logging
echo "$(date): Starting Supabase Edge Functions deployment" > "$LOG_FILE"

# Function to log messages
log_message() {
    local level=$1
    local message=$2
    echo "$(date) [$level] $message" >> "$LOG_FILE"
    echo -e "${message}"
}

# Function to check if function exists
function_exists() {
    local func_name=$1
    if [ -d "$FUNCTIONS_DIR/$func_name" ] && [ -f "$FUNCTIONS_DIR/$func_name/index.ts" ]; then
        return 0
    else
        return 1
    fi
}

# Function to deploy with retry logic
deploy_with_retry() {
    local func_name=$1
    local description=$2
    local no_verify_jwt=${3:-false}
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        log_message "INFO" "${BLUE}Attempt $((retry_count + 1))/$max_retries for $func_name${NC}"
        
        if [ "$no_verify_jwt" = "true" ]; then
            if supabase functions deploy "$func_name" --no-verify-jwt >> "$LOG_FILE" 2>&1; then
                log_message "SUCCESS" "${GREEN}✅ $func_name deployed successfully${NC}"
                return 0
            fi
        else
            if supabase functions deploy "$func_name" >> "$LOG_FILE" 2>&1; then
                log_message "SUCCESS" "${GREEN}✅ $func_name deployed successfully${NC}"
                return 0
            fi
        fi
        
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $max_retries ]; then
            log_message "WARN" "${YELLOW}⏳ Retrying in 5 seconds...${NC}"
            sleep 5
        fi
    done
    
    log_message "ERROR" "${RED}❌ Failed to deploy $func_name after $max_retries attempts${NC}"
    return 1
}

# Function to check deployment status
check_deployment() {
    local func_name=$1
    log_message "INFO" "🔍 Verifying deployment for $func_name..."
    
    if supabase functions list | grep -q "$func_name"; then
        log_message "SUCCESS" "${GREEN}✅ $func_name is available${NC}"
        return 0
    else
        log_message "ERROR" "${RED}❌ $func_name not found in deployed functions${NC}"
        return 1
    fi
}

# Pre-deployment checks
pre_deployment_checks() {
    log_message "INFO" "${PURPLE}🔍 Running pre-deployment checks...${NC}"
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        log_message "ERROR" "${RED}❌ Supabase CLI is not installed${NC}"
        exit 1
    fi
    
    # Check if we're logged in
    if ! supabase projects list &> /dev/null; then
        log_message "ERROR" "${RED}❌ Not logged in to Supabase. Please run 'supabase login' first${NC}"
        exit 1
    fi
    
    # Check if project is linked
    if ! supabase status &> /dev/null; then
        log_message "INFO" "${YELLOW}⚡ Linking to project $PROJECT_ID...${NC}"
        if ! supabase link --project-ref "$PROJECT_ID"; then
            log_message "ERROR" "${RED}❌ Failed to link to project $PROJECT_ID${NC}"
            exit 1
        fi
    fi
    
    # Check functions directory
    if [ ! -d "$FUNCTIONS_DIR" ]; then
        log_message "ERROR" "${RED}❌ Functions directory not found: $FUNCTIONS_DIR${NC}"
        exit 1
    fi
    
    log_message "SUCCESS" "${GREEN}✅ Pre-deployment checks passed${NC}"
}

# Create standalone versions for functions that need them
create_standalone_versions() {
    log_message "INFO" "${PURPLE}📝 Creating standalone versions for functions with shared dependencies...${NC}"
    
    # List of functions that import from _shared and need standalone versions
    local functions_needing_standalone=(
        "manage-user-session"
        "validate-invite"
        "generate-invite"
        "join-organization"
        "admin-dashboard"
        "check-subscription"
        "setup-query-usage"
        "setup-user-sessions"
        "update-database-schema"
    )
    
    for func in "${functions_needing_standalone[@]}"; do
        if function_exists "$func"; then
            # Check if function imports from _shared
            if grep -q "from.*_shared" "$FUNCTIONS_DIR/$func/index.ts" 2>/dev/null; then
                log_message "WARN" "${YELLOW}⚠️  $func imports from _shared directory${NC}"
                log_message "INFO" "${BLUE}   This function may need a standalone version for deployment${NC}"
                log_message "INFO" "${BLUE}   Consider creating inline versions of shared dependencies${NC}"
            fi
        fi
    done
}

# Main deployment function
main() {
    log_message "INFO" "${PURPLE}🚀 Starting Supabase Edge Functions Deployment${NC}"
    log_message "INFO" "Project ID: $PROJECT_ID"
    log_message "INFO" "Log file: $LOG_FILE"
    
    # Run pre-deployment checks
    pre_deployment_checks
    
    # Create standalone versions if needed
    create_standalone_versions
    
    # Initialize counters
    local total_functions=0
    local deployed_count=0
    local failed_count=0
    local failed_functions=()
    
    # Define deployment phases with function configurations
    # Format: "function_name:description:no_verify_jwt"
    local deployment_phases=(
        # Phase 1: Security & Authentication
        "create-admin-user:Creates admin user accounts:true"
        "manage-user-session:Manages user sessions and authentication:false"
        "validate-invite:Validates organization invitations:true"
        
        # Phase 2: Core Infrastructure  
        "setup-user-sessions:Sets up user session tracking:false"
        "setup-query-usage:Sets up usage tracking:false"
        "update-database-schema:Database schema updates:false"
        
        # Phase 3: Document Processing
        "extract-document-text:Processes uploaded documents:false"
        "generate-embeddings:Creates AI embeddings for search:false"
        "search-embeddings:Searches document embeddings:false"
        
        # Phase 4: AI Chat
        "rita-chat:Main AI chat functionality:false"
        
        # Phase 5: Communication
        "send-email:Email sending functionality:true"
        "generate-invite:Creates organization invites:false"
        
        # Phase 6: Billing & Subscriptions
        "stripe-webhook:Handles Stripe webhooks:true"
        "create-checkout-session:Stripe checkout creation:false"
        "create-overage-checkout:Overage billing checkout:false"
        "customer-portal:Stripe customer portal:false"
        "check-subscription:Validates subscriptions:false"
        
        # Phase 7: Organization Management
        "join-organization:Handles organization joining:false"
        "setup-org-integrations:Organization integration setup:false"
        
        # Phase 8: Quickbase Integration
        "encrypt-quickbase-token:Encrypts Quickbase API tokens:false"
        "test-quickbase-connection:Tests Quickbase connectivity:false"
        "schedule-quickbase-sync:Schedules data sync:false"
        "sync-quickbase-data:Syncs Quickbase data:false"
        
        # Phase 9: Administrative
        "admin-dashboard:Admin dashboard backend:false"
        "update-promo-codes:Manages promotional codes:false"
    )
    
    # Deploy each function
    for func_config in "${deployment_phases[@]}"; do
        IFS=':' read -r func_name description no_verify_jwt <<< "$func_config"
        total_functions=$((total_functions + 1))
        
        if function_exists "$func_name"; then
            log_message "INFO" "${BLUE}📦 Deploying $func_name...${NC}"
            log_message "INFO" "   Description: $description"
            log_message "INFO" "   JWT Verification: $([ "$no_verify_jwt" = "true" ] && echo "Disabled" || echo "Enabled")"
            
            if deploy_with_retry "$func_name" "$description" "$no_verify_jwt"; then
                deployed_count=$((deployed_count + 1))
                
                # Verify deployment
                if ! check_deployment "$func_name"; then
                    log_message "WARN" "${YELLOW}⚠️  $func_name deployed but not found in function list${NC}"
                fi
            else
                failed_count=$((failed_count + 1))
                failed_functions+=("$func_name")
            fi
        else
            log_message "WARN" "${YELLOW}⚠️  Function $func_name not found, skipping...${NC}"
            total_functions=$((total_functions - 1))
        fi
        
        # Small delay between deployments
        sleep 2
    done
    
    # Final summary
    log_message "INFO" "${BLUE}📊 DEPLOYMENT SUMMARY${NC}"
    log_message "INFO" "=========================="
    log_message "INFO" "Total functions processed: $total_functions"
    log_message "SUCCESS" "${GREEN}✅ Successfully deployed: $deployed_count functions${NC}"
    
    if [ $failed_count -gt 0 ]; then
        log_message "ERROR" "${RED}❌ Failed deployments: $failed_count functions${NC}"
        log_message "ERROR" "${RED}Failed functions:${NC}"
        for func in "${failed_functions[@]}"; do
            log_message "ERROR" "${RED}  - $func${NC}"
        done
        
        log_message "INFO" "${BLUE}📋 Check the log file for detailed error information: $LOG_FILE${NC}"
        exit 1
    else
        log_message "SUCCESS" "${GREEN}🎉 All functions deployed successfully!${NC}"
        log_message "INFO" "${BLUE}📋 View functions at: https://$PROJECT_ID.supabase.co/functions/v1/${NC}"
    fi
    
    # List all deployed functions
    log_message "INFO" "${PURPLE}📋 Deployed functions list:${NC}"
    supabase functions list
}

# Run main function
main "$@"