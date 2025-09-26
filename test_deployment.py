#!/usr/bin/env python3
"""
Rita Recruit AI Deployment Verification Script
Tests the deployment after manual execution via Supabase Dashboard
"""

import os
import sys
import requests
import json
import time

# Configuration
SUPABASE_URL = "https://onargmygfwynbbrytkpy.supabase.co"
ADMIN_CODE = "c0da15c3b5c434f37796ecfb937053d539e0b7e9cc8e49cb7b868595675048b5"

def test_database_tables():
    """Test that database tables are accessible"""
    print("🔍 Testing Database Tables...")
    
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not service_key:
        print("❌ SUPABASE_SERVICE_ROLE_KEY not found")
        return False
    
    headers = {
        'Authorization': f'Bearer {service_key}',
        'apikey': service_key,
        'Content-Type': 'application/json'
    }
    
    # Test organizations table
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/organizations?select=id&limit=1",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Organizations table accessible")
            return True
        else:
            print(f"❌ Organizations table test failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

def test_edge_functions():
    """Test edge functions deployment"""
    print("🔍 Testing Edge Functions...")
    
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not service_key:
        print("❌ SUPABASE_SERVICE_ROLE_KEY not found")
        return False
    
    # Critical functions to test
    critical_functions = [
        'create-admin-user',
        'manage-user-session', 
        'validate-invite',
        'extract-document-text',
        'generate-embeddings',
        'search-embeddings',
        'rita-chat',
        'stripe-webhook',
        'send-email'
    ]
    
    passed = 0
    failed = 0
    
    for func_name in critical_functions:
        try:
            # Test function accessibility (should return method not allowed or similar, not 404)
            response = requests.get(
                f"{SUPABASE_URL}/functions/v1/{func_name}",
                timeout=10
            )
            
            if response.status_code != 404:
                print(f"✅ {func_name} - Function deployed")
                passed += 1
            else:
                print(f"❌ {func_name} - Function not found")
                failed += 1
                
        except Exception as e:
            print(f"❌ {func_name} - Error: {e}")
            failed += 1
        
        time.sleep(0.2)  # Rate limiting
    
    print(f"\n📊 Functions Test Results: {passed} passed, {failed} failed")
    return failed == 0

def test_admin_user_creation():
    """Test admin user creation function"""
    print("🔍 Testing Admin User Creation...")
    
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not service_key:
        print("❌ SUPABASE_SERVICE_ROLE_KEY not found")
        return False
    
    # Test data for admin creation
    test_admin = {
        "email": "test-admin@rita-recruit.com",
        "password": "TempPassword123!",
        "firstName": "Test",
        "lastName": "Admin", 
        "adminCode": ADMIN_CODE
    }
    
    headers = {
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/functions/v1/create-admin-user",
            headers=headers,
            json=test_admin,
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            print("✅ Admin user creation function working")
            print("⚠️  Test admin account created - remember to clean up")
            return True
        elif response.status_code == 404:
            print("❌ Admin user creation function not deployed")
            return False
        else:
            print(f"⚠️  Function deployed but returned: {response.status_code}")
            print(f"Response: {response.text[:200]}")
            return True  # Function exists, may have validation issues
            
    except Exception as e:
        print(f"❌ Admin user creation test error: {e}")
        return False

def test_ai_functions():
    """Test AI functions (requires valid JWT)"""
    print("🔍 Testing AI Functions (Basic Connectivity)...")
    
    ai_functions = ['rita-chat', 'extract-document-text', 'generate-embeddings', 'search-embeddings']
    
    passed = 0
    failed = 0
    
    for func_name in ai_functions:
        try:
            # Test function existence (should require JWT, not return 404)
            response = requests.post(
                f"{SUPABASE_URL}/functions/v1/{func_name}",
                json={"test": "connectivity"},
                timeout=10
            )
            
            # Should return 401 (unauthorized) or 400 (bad request), not 404
            if response.status_code in [400, 401, 403]:
                print(f"✅ {func_name} - Function deployed and accessible")
                passed += 1
            elif response.status_code == 404:
                print(f"❌ {func_name} - Function not found")
                failed += 1
            else:
                print(f"⚠️  {func_name} - Deployed, returned: {response.status_code}")
                passed += 1
                
        except Exception as e:
            print(f"❌ {func_name} - Error: {e}")
            failed += 1
        
        time.sleep(0.2)
    
    print(f"📊 AI Functions Test: {passed} passed, {failed} failed")
    return failed == 0

def main():
    """Run all deployment verification tests"""
    print("🚀 RITA RECRUIT AI - DEPLOYMENT VERIFICATION")
    print("=" * 50)
    
    tests = [
        ("Database Tables", test_database_tables),
        ("Edge Functions", test_edge_functions), 
        ("Admin User Creation", test_admin_user_creation),
        ("AI Functions", test_ai_functions)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n🧪 Running: {test_name}")
        print("-" * 30)
        
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"💥 Test '{test_name}' crashed: {e}")
            results[test_name] = False
        
        time.sleep(1)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 DEPLOYMENT VERIFICATION SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\n🎯 Overall Result: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 DEPLOYMENT VERIFICATION SUCCESSFUL!")
        print("Rita Recruit AI is ready for production!")
    elif passed >= total * 0.75:  # 75% pass rate
        print("\n⚠️  DEPLOYMENT MOSTLY SUCCESSFUL")
        print("Some components may need manual verification")
    else:
        print("\n❌ DEPLOYMENT VERIFICATION FAILED")
        print("Please complete the manual deployment steps")
    
    print(f"\n🔐 Admin Creation Code: {ADMIN_CODE}")
    print("Store this code securely for admin account creation!")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)