#!/usr/bin/env node

/**
 * Script สำหรับตั้งค่า Admin Custom Claims
 * ใช้ Firebase Admin SDK
 * 
 * Usage:
 *   node scripts/set-admin-claims.js <userId> <role>
 *   
 * Example:
 *   node scripts/set-admin-claims.js abc123xyz super-admin
 *   node scripts/set-admin-claims.js abc123xyz admin
 *   node scripts/set-admin-claims.js abc123xyz viewer
 *   node scripts/set-admin-claims.js abc123xyz revoke  # Revoke admin access
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
// หมายเหตุ: ต้องมี service account key file
// ดาวน์โหลดจาก Firebase Console > Project Settings > Service Accounts
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../service-account-key.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

/**
 * Grant admin access to user
 */
async function grantAdmin(userId, role = 'admin') {
  try {
    console.log(`\n🔐 Granting ${role} access to user: ${userId}`);

    // Set custom claims
    await admin.auth().setCustomUserClaims(userId, {
      admin: true,
      adminRole: role,
    });

    console.log('✅ Custom claims set successfully');

    // Get user data
    const user = await admin.auth().getUser(userId);
    console.log(`\n👤 User Info:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Display Name: ${user.displayName || 'Not set'}`);
    console.log(`   Role: ${role}`);

    // Save to admin-users collection
    const permissions = getPermissions(role);
    await db.collection('admin-users').doc(userId).set({
      userId,
      email: user.email,
      role,
      permissions,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'script',
    });

    console.log('\n✅ Admin user document created');
    console.log('\n📋 Permissions:');
    console.log(`   View Analytics: ${permissions.canViewAnalytics}`);
    console.log(`   Export Data: ${permissions.canExportData}`);
    console.log(`   Manage Users: ${permissions.canManageUsers}`);
    console.log(`   Manage Subscriptions: ${permissions.canManageSubscriptions}`);

    console.log('\n🎉 Admin access granted successfully!');
    console.log('\n⚠️  Note: User needs to log out and log back in for changes to take effect.');
    
  } catch (error) {
    console.error('\n❌ Error granting admin access:', error);
    process.exit(1);
  }
}

/**
 * Revoke admin access from user
 */
async function revokeAdmin(userId) {
  try {
    console.log(`\n🔐 Revoking admin access from user: ${userId}`);

    // Remove custom claims
    await admin.auth().setCustomUserClaims(userId, {
      admin: false,
      adminRole: null,
    });

    console.log('✅ Custom claims removed');

    // Delete from admin-users collection
    await db.collection('admin-users').doc(userId).delete();

    console.log('✅ Admin user document deleted');
    console.log('\n🎉 Admin access revoked successfully!');
    
  } catch (error) {
    console.error('\n❌ Error revoking admin access:', error);
    process.exit(1);
  }
}

/**
 * Get permissions based on role
 */
function getPermissions(role) {
  switch (role) {
    case 'super-admin':
      return {
        canViewAnalytics: true,
        canExportData: true,
        canManageUsers: true,
        canManageSubscriptions: true,
      };
    case 'admin':
      return {
        canViewAnalytics: true,
        canExportData: true,
        canManageUsers: false,
        canManageSubscriptions: false,
      };
    case 'viewer':
      return {
        canViewAnalytics: true,
        canExportData: false,
        canManageUsers: false,
        canManageSubscriptions: false,
      };
    default:
      throw new Error(`Invalid role: ${role}`);
  }
}

/**
 * List all admin users
 */
async function listAdmins() {
  try {
    console.log('\n📋 Listing all admin users...\n');

    const snapshot = await db.collection('admin-users').get();
    
    if (snapshot.empty) {
      console.log('No admin users found.');
      return;
    }

    console.log(`Found ${snapshot.size} admin user(s):\n`);

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`👤 ${data.email}`);
      console.log(`   User ID: ${doc.id}`);
      console.log(`   Role: ${data.role}`);
      console.log(`   Created: ${data.createdAt?.toDate().toISOString() || 'Unknown'}`);
      console.log(`   Permissions:`);
      console.log(`     - View Analytics: ${data.permissions.canViewAnalytics}`);
      console.log(`     - Export Data: ${data.permissions.canExportData}`);
      console.log(`     - Manage Users: ${data.permissions.canManageUsers}`);
      console.log(`     - Manage Subscriptions: ${data.permissions.canManageSubscriptions}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error listing admins:', error);
    process.exit(1);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args[0] === 'list') {
    await listAdmins();
  } else if (args.length < 2) {
    console.log(`
Usage:
  node scripts/set-admin-claims.js <userId> <role>
  node scripts/set-admin-claims.js list

Roles:
  super-admin  - Full access (all permissions)
  admin        - View analytics, export data
  viewer       - View analytics only
  revoke       - Remove admin access

Examples:
  node scripts/set-admin-claims.js abc123xyz super-admin
  node scripts/set-admin-claims.js abc123xyz admin
  node scripts/set-admin-claims.js abc123xyz viewer
  node scripts/set-admin-claims.js abc123xyz revoke
  node scripts/set-admin-claims.js list
    `);
    process.exit(1);
  } else {
    const [userId, role] = args;

    if (role === 'revoke') {
      await revokeAdmin(userId);
    } else if (['super-admin', 'admin', 'viewer'].includes(role)) {
      await grantAdmin(userId, role);
    } else {
      console.error(`\n❌ Invalid role: ${role}`);
      console.log('Valid roles: super-admin, admin, viewer, revoke');
      process.exit(1);
    }
  }

  process.exit(0);
}

main();
