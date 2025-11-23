const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/truckar-dev';

async function fixUserAccess() {
  try {
    console.log('🔧 Fixing Demo User Account Access...\n');
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
    
    // Find demo account
    const account = await db.collection('accounts').findOne({ name: 'Demo Logistics Co.' });
    if (!account) {
      console.log('❌ Demo account not found!');
      return;
    }
    
    console.log(`✓ Found User: ${user.email}`);
    console.log(`✓ Found Account: ${account.name} (${account._id})\n`);
    
    // Update user to use accounts array instead of account field
    await db.collection('users').updateOne(
      { email: 'demo@demo.com' },
      {
        $set: {
          accounts: [{
            account: account._id,
            role: 'admin'
          }],
          onBoardingRequired: false
        },
        $unset: {
          account: '' // Remove old account field
        }
      }
    );
    
    console.log('✅ Updated user to use accounts array\n');
    
    // Verify the update
    const updatedUser = await db.collection('users').findOne({ email: 'demo@demo.com' });
    console.log('Updated User Structure:');
    console.log(JSON.stringify(updatedUser, null, 2));
    console.log('');
    
    console.log('=' .repeat(60));
    console.log('✅ USER ACCESS FIXED!');
    console.log('   User now has proper access to Demo Logistics Co.');
    console.log('   Please refresh the browser and try again');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

fixUserAccess();
