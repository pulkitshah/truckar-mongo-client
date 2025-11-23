const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/truckar-dev';

async function checkUserConfig() {
  try {
    console.log('👤 Checking User Configuration...\n');
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected\n');
    
    const db = mongoose.connection.db;
    
    // Find demo user
    const user = await db.collection('users').findOne({ email: 'demo@demo.com' });
    if (!user) {
      console.log('❌ Demo user not found!');
      return;
    }
    
    console.log(' User Configuration:');
    console.log(JSON.stringify(user, null, 2));
    console.log('');
    
    // Check if user has accounts array or account field
    if (user.accounts && Array.isArray(user.accounts)) {
      console.log(`✓ User has accounts array: ${user.accounts.length} accounts`);
      user.accounts.forEach((acc, idx) => {
        console.log(`   ${idx + 1}. Account: ${acc.account}, Role: ${acc.role || 'N/A'}`);
      });
    } else if (user.account) {
      console.log(`⚠️  User has single account field (deprecated?): ${user.account}`);
      console.log('   This might be an issue - check if API expects accounts array');
    } else {
      console.log('❌ User has no account association!');
    }
    console.log('');
    
    // Find demo account
    const account = await db.collection('accounts').findOne({ name: 'Demo Logistics Co.' });
    if (!account) {
      console.log('❌ Demo account not found!');
      return;
    }
    
    console.log(`📋 Demo Account ID: ${account._id}\n`);
    
    // Check if there's a match
    let hasAccess = false;
    if (user.accounts && Array.isArray(user.accounts)) {
      hasAccess = user.accounts.some(acc => acc.account.toString() === account._id.toString());
    } else if (user.account) {
      hasAccess = user.account.toString() === account._id.toString();
    }
    
    if (hasAccess) {
      console.log('✅ User HAS access to Demo Logistics Co.');
    } else {
      console.log('❌ User DOES NOT have access to Demo Logistics Co.!');
      console.log('   This is the problem - need to fix user account association');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

checkUserConfig();
