const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/truckar-dev';

async function viewSampleData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected\n');
    
    const db = mongoose.connection.db;
    
    // Get sample account
    const account = await db.collection('accounts').findOne({});
    console.log('📋 Sample Account:');
    console.log(JSON.stringify(account, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Get sample parties (customers and transporters)
    const customers = await db.collection('parties').find({ 
      account: account._id,
      isTransporter: { $ne: true }
    }).limit(3).toArray();
    console.log('👥 Sample Customers:');
    console.log(JSON.stringify(customers, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');
    
    const transporters = await db.collection('parties').find({ 
      account: account._id,
      isTransporter: true
    }).limit(3).toArray();
    console.log('🚛 Sample Transporters:');
    console.log(JSON.stringify(transporters, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Get sample orders
    const orders = await db.collection('orders').find({ 
      account: account._id 
    }).sort({ saleDate: -1 }).limit(3).toArray();
    console.log('📦 Sample Orders:');
    console.log(JSON.stringify(orders, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Get sample vehicles
    const vehicles = await db.collection('vehicles').find({ 
      account: account._id 
    }).limit(3).toArray();
    console.log('🚗 Sample Vehicles:');
    console.log(JSON.stringify(vehicles, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Get sample organisations
    const organisations = await db.collection('organisations').find({ 
      account: account._id 
    }).limit(3).toArray();
    console.log('🏢 Sample Organisations:');
    console.log(JSON.stringify(organisations, null, 2));
    
    console.log('\n✅ Sample data viewing complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

viewSampleData();
