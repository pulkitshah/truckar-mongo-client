const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/truckar-dev';
const DEMO_ACCOUNT_NAME = 'Demo Logistics Co.';

async function fixDemoOrders() {
  try {
    console.log('🔧 Fixing Demo Account Orders...\n');
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
    
    // Get all demo orders
    const orders = await db.collection('orders').find({ account: account._id }).toArray();
    console.log(`Found ${orders.length} orders to fix\n`);
    
    let fixedCount = 0;
    
    // Fix each order
    for (const order of orders) {
      const updates = {};
      let needsUpdate = false;
      
      // Fix orderExpenses to use orderExpenseAmount instead of amount
      if (order.orderExpenses && Array.isArray(order.orderExpenses)) {
        const fixedExpenses = order.orderExpenses.map(expense => {
          if (expense.amount !== undefined && expense.orderExpenseAmount === undefined) {
            return {
              ...expense,
              orderExpenseAmount: expense.amount
            };
          }
          return expense;
        });
        
        if (JSON.stringify(fixedExpenses) !== JSON.stringify(order.orderExpenses)) {
          updates.orderExpenses = fixedExpenses;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await db.collection('orders').updateOne(
          { _id: order._id },
          { $set: updates }
        );
        fixedCount++;
      }
    }
    
    console.log(`✅ Fixed ${fixedCount} orders\n`);
    
    // Verify the fix with a sample order
    const sampleFixed = await db.collection('orders').findOne({ 
      account: account._id,
      orderExpenses: { $exists: true, $ne: [] }
    });
    
    if (sampleFixed) {
      console.log('Sample Fixed Order:');
      console.log(`   Order #${sampleFixed.orderNo}`);
      console.log(`   orderExpenses: ${JSON.stringify(sampleFixed.orderExpenses, null, 2)}\n`);
    }
    
    console.log('=' .repeat(60));
    console.log('✅ FIX COMPLETE!');
    console.log('   Orders are now ready for analytics calculations');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

fixDemoOrders();
