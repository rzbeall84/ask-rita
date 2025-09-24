#!/usr/bin/env node

/**
 * Admin Setup Script for Rita Recruit AI
 * This script creates the master admin user and DriveLine Solutions organization
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need to add this to .env

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAdmin() {
  console.log('🚀 Setting up Rita Recruit AI Admin...\n');

  try {
    // 1. Create DriveLine Solutions organization
    console.log('1. Creating DriveLine Solutions organization...');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .upsert({
        name: 'DriveLine Solutions',
        subscription_status: 'active',
        plan_type: 'unlimited',
        storage_limit_gb: 999999,
        query_limit: 999999,
        storage_used_gb: 0,
        queries_used: 0
      }, { 
        onConflict: 'name',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (orgError) {
      console.error('❌ Error creating organization:', orgError);
      return;
    }
    console.log('✅ Organization created:', org.name);

    // 2. Create admin user in auth.users
    console.log('\n2. Creating admin user account...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'rebecca@drivelinesolutions.net',
      password: '84Honeybun#59!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Rebecca - Admin',
        role: 'admin'
      }
    });

    if (authError && !authError.message.includes('already registered')) {
      console.error('❌ Error creating auth user:', authError);
      return;
    }
    
    const userId = authUser?.user?.id || (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === 'rebecca@drivelinesolutions.net')?.id;
    
    if (!userId) {
      console.error('❌ Could not find or create user');
      return;
    }
    console.log('✅ Admin user created/found');

    // 3. Create admin profile
    console.log('\n3. Creating admin profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: 'rebecca@drivelinesolutions.net',
        full_name: 'Rebecca - Admin',
        organization_id: org.id,
        role: 'admin'
      }, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      return;
    }
    console.log('✅ Admin profile created');

    // 4. Update organization owner
    console.log('\n4. Setting organization owner...');
    const { error: ownerError } = await supabase
      .from('organizations')
      .update({ owner_id: userId })
      .eq('id', org.id);

    if (ownerError) {
      console.error('❌ Error setting owner:', ownerError);
      return;
    }
    console.log('✅ Organization owner set');

    // 5. Log admin activity
    console.log('\n5. Logging setup activity...');
    const { error: logError } = await supabase
      .from('admin_activity_log')
      .insert({
        admin_id: userId,
        action: 'Admin setup completed',
        target_type: 'system',
        details: {
          organization: org.name,
          setup_date: new Date().toISOString()
        }
      });

    if (logError) {
      console.warn('⚠️  Warning: Could not log activity:', logError.message);
    } else {
      console.log('✅ Setup activity logged');
    }

    console.log('\n🎉 Admin setup completed successfully!');
    console.log('\n📋 Admin Details:');
    console.log('   Email: rebecca@drivelinesolutions.net');
    console.log('   Password: 84Honeybun#59!');
    console.log('   Organization: DriveLine Solutions');
    console.log('   Role: Super Admin');
    console.log('   Access: Unlimited');
    console.log('\n🔗 Admin Dashboard: /admin');
    console.log('🔗 Regular Dashboard: /dashboard');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the setup
setupAdmin();
