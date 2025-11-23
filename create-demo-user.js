const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/truckar-dev';
const DEMO_ACCOUNT_NAME = 'Demo Logistics Co.';

async function createDemoUser() {
  try {
    console.log('👤 Creating Demo User for Account Access...\n');
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected\n');
    
    const db = mongoose.connection.db;
    
    // Find demo account
    const account = await db.collection('accounts').findOne({ name: DEMO_ACCOUNT_NAME });
    if (!account) {
      console.log('❌ Demo account not found!');
      return;
    }
    
    console.log(`✓ Found Account: ${account.name} (${account._id})\n`);
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ 
      email: 'demo@demo.com' 
    });
    
    if (existingUser) {
      console.log('ℹ️  User demo@demo.com already exists');
      console.log(`   Updating account to: ${account._id}\n`);
      
      await db.collection('users').updateOne(
        { email: 'demo@demo.com' },
        { 
          $set: { 
            account: account._id,
            name: 'Demo User'
          } 
        }
      );
      
      console.log('✅ Updated existing user with demo account\n');
    } else {
      console.log('Creating new user: demo@demo.com');
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('demo123', salt);
      
      await db.collection('users').insertOne({
        name: 'Demo User',
        email: 'demo@demo.com',
        password: hashedPassword,
        account: account._id,
        createdDate: new Date(),
      });
      
      console.log('✅ Created new demo user\n');
    }
    
    console.log('=' .repeat(60));
    console.log('✅ DEMO USER READY!\n');
    console.log('🔑 Login Credentials:');
    console.log('   Email: demo@demo.com');
    console.log('   Password: demo123\n');
    console.log('🌐 Access:');
    console.log('   1. Open http://localhost:4000');
    console.log('   2. Click "Log in"');
    console.log('   3. Enter the credentials above');
    console.log('   4. You should now see "Demo Logistics Co." account');
    console.log('   5. Navigate to Dashboard → Analytics');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

createDemoUser();
