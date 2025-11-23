const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/truckar-dev';
const DEMO_ACCOUNT_NAME = 'Demo Logistics Co.';

async function debugDemoData() {
  try {
    console.log('🔍 Debugging Demo Account Data...\n');
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
    
    console.log(`✓ Found Account: ${account.name}`);
    console.log(`   ID: ${account._id}\n`);
    
    // Check orders
    const orders = await db.collection('orders').find({ 
      account: account._id 
    }).limit(5).toArray();
    
    console.log(`📦 Sample Orders (first 5):\n`);
    orders.forEach((order, idx) => {
      console.log(`${idx + 1}. Order #${order.orderNo}:`);
      console.log(`   _id: ${order._id}`);
      console.log(`   account: ${order.account}`);
      console.log(`   customer: ${order.customer}`);
      console.log(`   saleDate: ${order.saleDate}`);
      console.log(`   saleRate: ${order.saleRate}`);
      console.log(`   purchaseRate: ${order.purchaseRate}`);
      console.log(`   organisation: ${order.organisation}`);
      console.log(`   status: ${order.status}`);
      console.log('');
    });
    
    // Check if orders have necessary financial fields
    console.log('💰 Checking Financial Data Structure:\n');
    if (orders.length > 0) {
      const sampleOrder = orders[0];
      console.log('Sample Order Financial Fields:');
      console.log(`   saleType: ${JSON.stringify(sampleOrder.saleType)}`);
      console.log(`   saleRate: ${sampleOrder.saleRate}`);
      console.log(`   purchaseType: ${sampleOrder.purchaseType}`);
      console.log(`   purchaseRate: ${sampleOrder.purchaseRate}`);
      console.log(`   deliveries: ${sampleOrder.deliveries?.length || 0} deliveries`);
      
      if (sampleOrder.deliveries && sampleOrder.deliveries.length > 0) {
        const delivery = sampleOrder.deliveries[0];
        console.log(`   delivery billQuantity: ${delivery.billQuantity}`);
        console.log(`   delivery loading: ${JSON.stringify(delivery.loading)}`);
        console.log(`   delivery unloading: ${JSON.stringify(delivery.unloading)}`);
      }
      console.log('');
    }
    
    // Check date range of orders
    const dateStats = await db.collection('orders').aggregate([
      { $match: { account: account._id } },
      {
        $group: {
          _id: null,
          minDate: { $min: '$saleDate' },
          maxDate: { $max: '$saleDate' },
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    if (dateStats.length > 0) {
      console.log('📅 Order Date Range:');
      console.log(`   Earliest: ${dateStats[0].minDate}`);
      console.log(`   Latest: ${dateStats[0].maxDate}`);
      console.log(`   Total: ${dateStats[0].count} orders\n`);
    }
    
    // Check customers
    const customers = await db.collection('parties').find({
      account: account._id,
      isTransporter: { $ne: true }
    }).limit(3).toArray();
    
    console.log(`👥 Sample Customers (first 3):\n`);
    customers.forEach((customer, idx) => {
      console.log(`${idx + 1}. ${customer.name}:`);
      console.log(`   _id: ${customer._id}`);
      console.log(`   account: ${customer.account}`);
      console.log(`   city: ${JSON.stringify(customer.city)}`);
      console.log('');
    });
    
    // Test aggregation similar to analytics API
    console.log('🧪 Testing Analytics Aggregation:\n');
    
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    console.log(`Date range: ${sixMonthsAgo.toISOString()} to ${now.toISOString()}\n`);
    
    const aggregationResult = await db.collection('orders').aggregate([
      {
        $match: {
          account: account._id,
          saleDate: { $gte: sixMonthsAgo, $lte: now }
        }
      },
      {
        $group: {
          _id: '$customer',
          orderCount: { $sum: 1 },
          lastOrderDate: { $max: '$saleDate' }
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: 5 }
    ]).toArray();
    
    console.log('Top 5 Customers by Order Count:');
    aggregationResult.forEach((item, idx) => {
      console.log(`${idx + 1}. Customer ID: ${item._id}, Orders: ${item.orderCount}, Last Order: ${item.lastOrderDate}`);
    });
    console.log('');
    
    // Check organisations
    const orgs = await db.collection('organisations').find({ account: account._id }).toArray();
    console.log(`🏢 Organisations (${orgs.length}):\n`);
    orgs.forEach(org => {
      console.log(`   - ${org.name} (${org._id})`);
    });
    console.log('');
    
    console.log('✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

debugDemoData();
