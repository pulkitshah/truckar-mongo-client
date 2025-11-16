const mongoose = require('mongoose');

async function checkOrders() {
  try {
    await mongoose.connect('mongodb://localhost:27017/truckar');
    const db = mongoose.connection.db;
    
    // Get a recent order
    const recentOrder = await db.collection('orders').findOne({ 
      saleDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    if (recentOrder) {
      console.log('Recent Order Fields:');
      console.log(Object.keys(recentOrder).join(', '));
      console.log('\nSample Recent Order:');
      console.log(JSON.stringify(recentOrder, null, 2).substring(0, 2000));
    } else {
      console.log('No recent orders found');
      // Try getting any order
      const anyOrder = await db.collection('orders').findOne({});
      if (anyOrder) {
        console.log('\nAny Order Fields:');
        console.log(Object.keys(anyOrder).join(', '));
        console.log('\nSample Order:');
        console.log(JSON.stringify(anyOrder, null, 2).substring(0, 2000));
      }
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkOrders();
