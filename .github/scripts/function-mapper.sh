#!/bin/bash

# Function Mapper Script
# Maps your intended functions to currently deployed functions
# This helps identify which functions are already deployed with auto-generated names

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

PROJECT_ID="${SUPABASE_PROJECT_ID:-onargmygfwynbbrytkpy}"

echo -e "${PURPLE}🔍 SUPABASE FUNCTION MAPPING TOOL${NC}"
echo "======================================"
echo "Project ID: $PROJECT_ID"
echo ""

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Supabase. Please run 'supabase login' first${NC}"
    exit 1
fi

# Link to project if needed
if ! supabase status &> /dev/null; then
    echo -e "${YELLOW}⚡ Linking to project $PROJECT_ID...${NC}"
    if ! supabase link --project-ref "$PROJECT_ID"; then
        echo -e "${RED}❌ Failed to link to project $PROJECT_ID${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}📋 Currently Deployed Functions:${NC}"
echo "================================"

# Get list of deployed functions
deployed_functions=$(supabase functions list 2>/dev/null | tail -n +2 | awk '{print $1}' | grep -v '^$' || echo "")

if [ -z "$deployed_functions" ]; then
    echo -e "${YELLOW}⚠️  No functions currently deployed${NC}"
    echo ""
    echo -e "${BLUE}📝 Intended Functions to Deploy:${NC}"
    echo "================================"
    
    # List intended functions from local directory
    if [ -d "supabase/functions" ]; then
        for func_dir in supabase/functions/*/; do
            if [ -d "$func_dir" ] && [ ! "$(basename "$func_dir")" = "_shared" ]; then
                func_name=$(basename "$func_dir")
                echo -e "${YELLOW}  📦 $func_name${NC}"
            fi
        done
    fi
    exit 0
fi

# Count deployed functions
function_count=0
echo "$deployed_functions" | while read -r func_name; do
    if [ -n "$func_name" ]; then
        function_count=$((function_count + 1))
        echo -e "${GREEN}  ✅ $func_name${NC}"
    fi
done

total_deployed=$(echo "$deployed_functions" | wc -l)
echo ""
echo -e "${GREEN}Total deployed functions: $total_deployed${NC}"

echo ""
echo -e "${BLUE}📝 Intended Functions (from local directory):${NC}"
echo "============================================="

intended_functions=()
if [ -d "supabase/functions" ]; then
    for func_dir in supabase/functions/*/; do
        if [ -d "$func_dir" ] && [ ! "$(basename "$func_dir")" = "_shared" ]; then
            func_name=$(basename "$func_dir")
            intended_functions+=("$func_name")
            
            # Check if this function is already deployed with correct name
            if echo "$deployed_functions" | grep -q "^$func_name$"; then
                echo -e "${GREEN}  ✅ $func_name (correctly named)${NC}"
            else
                echo -e "${YELLOW}  📦 $func_name (needs deployment)${NC}"
            fi
        fi
    done
fi

total_intended=${#intended_functions[@]}
echo ""
echo -e "${BLUE}Total intended functions: $total_intended${NC}"

echo ""
echo -e "${PURPLE}📊 MAPPING ANALYSIS${NC}"
echo "==================="

# Calculate functions that need deployment
functions_to_deploy=()
for func in "${intended_functions[@]}"; do
    if ! echo "$deployed_functions" | grep -q "^$func$"; then
        functions_to_deploy+=("$func")
    fi
done

functions_with_correct_names=()
for func in "${intended_functions[@]}"; do
    if echo "$deployed_functions" | grep -q "^$func$"; then
        functions_with_correct_names+=("$func")
    fi
done

echo -e "${GREEN}✅ Functions with correct names: ${#functions_with_correct_names[@]}${NC}"
if [ ${#functions_with_correct_names[@]} -gt 0 ]; then
    for func in "${functions_with_correct_names[@]}"; do
        echo -e "${GREEN}    - $func${NC}"
    done
fi

echo ""
echo -e "${YELLOW}📦 Functions needing deployment: ${#functions_to_deploy[@]}${NC}"
if [ ${#functions_to_deploy[@]} -gt 0 ]; then
    for func in "${functions_to_deploy[@]}"; do
        echo -e "${YELLOW}    - $func${NC}"
    done
fi

# Check for functions with auto-generated names
auto_generated_functions=()
echo "$deployed_functions" | while read -r func_name; do
    if [ -n "$func_name" ]; then
        # Check if this is an auto-generated name (not in intended list)
        if ! printf '%s\n' "${intended_functions[@]}" | grep -q "^$func_name$"; then
            echo -e "${RED}🤖 Auto-generated name detected: $func_name${NC}"
        fi
    fi
done

echo ""
echo -e "${BLUE}📋 RECOMMENDED ACTIONS${NC}"
echo "======================"

if [ ${#functions_to_deploy[@]} -gt 0 ]; then
    echo -e "${YELLOW}1. Deploy missing functions using GitHub Actions workflow${NC}"
    echo "   - Push changes to main branch, or"
    echo "   - Manually trigger workflow in GitHub Actions"
    echo ""
fi

if [ $total_deployed -gt ${#functions_with_correct_names[@]} ]; then
    echo -e "${YELLOW}2. Review auto-generated function names${NC}"
    echo "   - Some deployed functions may have auto-generated names"
    echo "   - Consider redeploying with correct names if needed"
    echo ""
fi

echo -e "${BLUE}3. Verify function endpoints after deployment${NC}"
echo "   Base URL: https://$PROJECT_ID.supabase.co/functions/v1/"
echo ""

echo -e "${GREEN}✅ Mapping analysis complete!${NC}"

# Generate deployment command
if [ ${#functions_to_deploy[@]} -gt 0 ]; then
    echo ""
    echo -e "${PURPLE}🚀 Quick Deploy Command:${NC}"
    echo "========================"
    echo "To deploy all missing functions manually:"
    echo ""
    for func in "${functions_to_deploy[@]}"; do
        echo "supabase functions deploy $func"
    done
    echo ""
    echo "Or use the automated GitHub Actions workflow for better error handling and logging."
fi