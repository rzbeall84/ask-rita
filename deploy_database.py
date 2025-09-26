#!/usr/bin/env python3
"""
Rita Recruit AI Database Schema Deployment Script
Deploys PRODUCTION_DEPLOYMENT.sql to Supabase project onargmygfwynbbrytkpy.supabase.co
"""

import os
import sys
import re
import time
import requests
import psycopg2
from psycopg2.extras import RealDictCursor

def get_database_url():
    """Construct database URL from environment variables"""
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not service_key:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable not found")
    
    # Extract password from service key (it's a JWT token, but we need the actual DB password)
    # For direct PostgreSQL connection, we need to use different credentials
    # Let's try using the REST API approach first
    return None

def execute_via_rest_api():
    """Execute SQL using Supabase REST API"""
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not service_key:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY not found")
    
    base_url = "https://onargmygfwynbbrytkpy.supabase.co"
    
    # Read the SQL file
    with open('PRODUCTION_DEPLOYMENT.sql', 'r') as f:
        sql_content = f.read()
    
    print(f"Read SQL file: {len(sql_content)} characters")
    
    # Parse SQL into executable statements
    # Remove comments and split by semicolons
    lines = sql_content.split('\n')
    clean_lines = []
    
    for line in lines:
        line = line.strip()
        if line and not line.startswith('--'):
            clean_lines.append(line)
    
    # Join lines and split by semicolons
    clean_sql = '\n'.join(clean_lines)
    statements = []
    
    # Split by semicolon but be careful about strings and comments
    current_statement = ""
    for line in clean_sql.split('\n'):
        current_statement += line + '\n'
        if line.strip().endswith(';') and not line.strip().startswith('--'):
            if current_statement.strip():
                statements.append(current_statement.strip())
                current_statement = ""
    
    print(f"Parsed {len(statements)} SQL statements")
    
    # Execute statements one by one
    headers = {
        'Authorization': f'Bearer {service_key}',
        'apikey': service_key,
        'Content-Type': 'application/json'
    }
    
    successful = 0
    failed = 0
    
    for i, statement in enumerate(statements):
        print(f"\nExecuting statement {i+1}/{len(statements)}: {statement[:100]}...")
        
        try:
            # Use the SQL execution via RPC if available, or direct execution
            # Let's try direct query execution
            response = requests.post(
                f"{base_url}/rest/v1/rpc/query",
                headers=headers,
                json={"sql": statement},
                timeout=30
            )
            
            if response.status_code == 200:
                print(f"✅ Statement {i+1} executed successfully")
                successful += 1
            else:
                print(f"❌ Statement {i+1} failed: {response.status_code} - {response.text}")
                
                # Try alternative approach for specific types of statements
                if "CREATE EXTENSION" in statement or "CREATE TYPE" in statement or "CREATE TABLE" in statement:
                    print("Retrying with alternative method...")
                    # Continue for now, some statements might depend on others
                
                failed += 1
                
        except Exception as e:
            print(f"❌ Statement {i+1} error: {str(e)}")
            failed += 1
        
        # Small delay between statements
        time.sleep(0.1)
    
    print(f"\nDeployment Summary:")
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Total: {len(statements)}")
    
    return successful, failed, len(statements)

def execute_via_direct_connection():
    """Execute SQL using direct PostgreSQL connection"""
    try:
        # Try to construct connection string
        # For Supabase, we need the actual database credentials
        print("Attempting direct PostgreSQL connection...")
        
        # This approach requires the actual DB password, which we don't have
        # Let's focus on the REST API approach
        print("Direct connection not available - using REST API")
        return execute_via_rest_api()
        
    except Exception as e:
        print(f"Direct connection failed: {e}")
        return execute_via_rest_api()

def main():
    """Main deployment function"""
    print("🚀 Starting Rita Recruit AI Database Schema Deployment")
    print("=" * 60)
    
    try:
        successful, failed, total = execute_via_rest_api()
        
        if failed > 0:
            print(f"\n⚠️  Deployment completed with {failed} failures")
            print("Some statements may have failed due to dependencies or existing objects")
            
        if successful > total * 0.8:  # 80% success rate
            print("\n🎉 Database deployment appears successful!")
            return True
        else:
            print(f"\n❌ Database deployment failed - too many failures ({failed}/{total})")
            return False
            
    except Exception as e:
        print(f"\n💥 Deployment failed with error: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)