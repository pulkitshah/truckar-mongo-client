const mongoose = require('mongoose');

// Read MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/truckar-dev';

async function checkData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected\n');
    
    const db = mongoose.connection.db;
    
    // Check collections exist
    const collections = await db.listCollections().toArray();
    console.log('📦 Collections:', collections.map(c => c.name).join(', '));
    console.log('');
    
    // Check accounts
    const accountsCount = await db.collection('accounts').countDocuments();
    console.log(`👤 Accounts: ${accountsCount}`);
    if (accountsCount > 0) {
      const sampleAccount = await db.collection('accounts').findOne({});
      console.log('   Sample Account ID:', sampleAccount._id);
    }
    console.log('');
    
    // Check orders
    const ordersCount = await db.collection('orders').countDocuments();
    console.log(`📦 Orders: ${ordersCount}`);
    if (ordersCount > 0) {
      const sampleOrder = await db.collection('orders').findOne({});
      console.log('   Sample Order:', {
        _id: sampleOrder._id,
        account: sampleOrder.account,
        saleDate: sampleOrder.saleDate,
        freightAmount: sampleOrder.freightAmount,
        organisation: sampleOrder.organisation || 'NOT SET'
      });
      
      // Check for orders with dates
      const recentOrders = await db.collection('orders').countDocuments({
        saleDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });
      console.log(`   Recent orders (last 30 days): ${recentOrders}`);
    }
    console.log('');
    
    // Check organisations
    const orgsCount = await db.collection('organisations').countDocuments();
    console.log(`🏢 Organisations: ${orgsCount}`);
    if (orgsCount > 0) {
      const sampleOrg = await db.collection('organisations').findOne({});
      console.log('   Sample Organisation:', {
        _id: sampleOrg._id,
        name: sampleOrg.name,
        account: sampleOrg.account
      });
    }
    console.log('');
    
    // Check vehicles
    const vehiclesCount = await db.collection('vehicles').countDocuments();
    console.log(`🚛 Vehicles: ${vehiclesCount}`);
    console.log('');
    
    // Check invoices
    const invoicesCount = await db.collection('invoices').countDocuments();
    console.log(`💰 Invoices: ${invoicesCount}`);
    console.log('');
    
    // Check LRs
    const lrsCount = await db.collection('lrs').countDocuments();
    console.log(`📄 LRs: ${lrsCount}`);
    console.log('');
    
    console.log('✅ Data check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkData();
