const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/truckar-dev';
const DEMO_ACCOUNT_NAME = 'Demo Logistics Co.';

async function verifyDemoData() {
  try {
    console.log('🔍 Verifying Sales Demo Account Data...\n');
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
    
    // Get counts
    const orgsCount = await db.collection('organisations').countDocuments({ account: account._id });
    const customersCount = await db.collection('parties').countDocuments({ 
      account: account._id, 
      isTransporter: { $ne: true } 
    });
    const transportersCount = await db.collection('parties').countDocuments({ 
      account: account._id, 
      isTransporter: true 
    });
    const vehiclesCount = await db.collection('vehicles').countDocuments({ account: account._id });
    const ordersCount = await db.collection('orders').countDocuments({ account: account._id });
    
    console.log('📊 Data Summary:');
    console.log(`   Organisations: ${orgsCount}`);
    console.log(`   Customers: ${customersCount}`);
    console.log(`   Transporters: ${transportersCount}`);
    console.log(`   Vehicles: ${vehiclesCount}`);
    console.log(`   Orders: ${ordersCount}\n`);
    
    // Get organisations details
    const orgs = await db.collection('organisations').find({ account: account._id }).toArray();
    console.log('🏢 Organisations:');
    orgs.forEach(org => {
      console.log(`   - ${org.name} (${org.initials})`);
    });
    console.log('');
    
    // Get order distribution by organisation
    const org1 = orgs[0];
    const org2 = orgs[1];
    const org1Orders = await db.collection('orders').countDocuments({ 
      account: account._id, 
      organisation: org1._id 
    });
    const org2Orders = await db.collection('orders').countDocuments({ 
      account: account._id, 
      organisation: org2._id 
    });
    
    console.log('📦 Order Distribution:');
    console.log(`   ${org1.name}: ${org1Orders} orders (Owned Fleet)`);
    console.log(`   ${org2.name}: ${org2Orders} orders (Outsourced)`);
    console.log('');
    
    // Get recent orders (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentOrders = await db.collection('orders').countDocuments({
      account: account._id,
      saleDate: { $gte: thirtyDaysAgo }
    });
    console.log(`   Recent Orders (last 30 days): ${recentOrders}\n`);
    
    // Sample orders
    const sampleOrders = await db.collection('orders').aggregate([
      { $match: { account: account._id } },
      { $sort: { saleDate: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: 'parties',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      {
        $lookup: {
          from: 'organisations',
          localField: 'organisation',
          foreignField: '_id',
          as: 'orgInfo'
        }
      }
    ]).toArray();
    
    console.log('📋 Sample Recent Orders:');
    sampleOrders.forEach(order => {
      const customer = order.customerInfo[0];
      const org = order.orgInfo[0];
      console.log(`   Order #${order.orderNo}:`);
      console.log(`     Date: ${order.saleDate.toISOString().split('T')[0]}`);
      console.log(`     Customer: ${customer?.name || 'Unknown'}`);
      console.log(`     Organisation: ${org?.name || 'Unknown'}`);
      console.log(`     Sale Rate: ₹${order.saleRate}`);
      console.log(`     ${order.transporter ? 'Outsourced' : 'Owned Fleet'}`);
      console.log('');
    });
    
    // Top customers by order count
    const topCustomers = await db.collection('orders').aggregate([
      { $match: { account: account._id } },
      { 
        $group: {
          _id: '$customer',
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'parties',
          localField: '_id',
          foreignField: '_id',
          as: 'customerInfo'
        }
      }
    ]).toArray();
    
    console.log('🌟 Top 5 Customers by Order Count:');
    topCustomers.forEach((item, idx) => {
      const customer = item.customerInfo[0];
      console.log(`   ${idx + 1}. ${customer?.name || 'Unknown'}: ${item.orderCount} orders`);
    });
    console.log('');
    
    console.log('=' .repeat(60));
    console.log('✅ VERIFICATION COMPLETE!\n');
    console.log('🌐 Next Steps:');
    console.log('   1. Open http://localhost:4000 in your browser');
    console.log('   2. Login to the application');
    console.log('   3. Select "Demo Logistics Co." account');
    console.log('   4. Navigate to Dashboard → Analytics');
    console.log('   5. Verify customer scoring, transporter analytics, etc.');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

verifyDemoData();
