const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/truckar-dev';
const DEMO_ACCOUNT_NAME = 'Demo Logistics Co.';

async function testAnalyticsAPI() {
  try {
    console.log('🧪 Testing Analytics API Simulation...\n');
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
    
    console.log(`✓ Account: ${account.name} (${account._id})\n`);
    
    // Date range for last 6 months
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 6);
    
    console.log(`📅 Date Range:`);
    console.log(`   From: ${startDate.toISOString()}`);
    console.log(`   To: ${endDate.toISOString()}\n`);
    
    // Simulate customer scoring aggregation (simplified)
    console.log('🔍 Testing Customer Scoring Aggregation...\n');
    
    const result = await db.collection('orders').aggregate([
      {
        $match: {
          account: account._id,
          saleDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $addFields: {
         baseSale: {
            $cond: [
              { $eq: [{ $ifNull: ["$saleType.value", "quantity"] }, "fixed"] },
              { $ifNull: ["$saleRate", 0] },
              {
                $multiply: [
                  { $ifNull: ["$saleRate", 0] },
                  {
                    $sum: {
                      $map: {
                        input: "$deliveries",
                        as: "delivery",
                        in: { $ifNull: ["$$delivery.billQuantity", 0] }
                      }
                    }
                  }
                ]
              }
            ]
          },
          basePurchase: {
            $cond: [
              { $eq: [{ $ifNull: ["$purchaseType", "quantity"] }, "fixed"] },
              { $ifNull: ["$purchaseRate", 0] },
              {
                $multiply: [
                  { $ifNull: ["$purchaseRate", 0] },
                  {
                    $sum: {
                      $map: {
                        input: "$deliveries",
                        as: "delivery",
                        in: { $ifNull: ["$$delivery.billQuantity", 0] }
                      }
                    }
                  }
                ]
              }
            ]
          },
          orderExpensesTotal: {
            $sum: {
              $map: {
                input: { $ifNull: ["$orderExpenses", []] },
                as: "expense",
                in: { $ifNull: ["$$expense.orderExpenseAmount", 0] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$customer',
          orderCount: { $sum: 1 },
          totalSales: { $sum: '$baseSale' },
          totalPurchase: { $sum: '$basePurchase' },
          totalExpenses: { $sum: '$orderExpensesTotal' },
          lastOrderDate: { $max: '$saleDate' }
        }
      },
      {
        $addFields: {
          totalProfit: {
            $subtract: ['$totalSales', { $add: ['$totalPurchase', '$totalExpenses'] }]
          }
        }
      },
      {
        $lookup: {
          from: 'parties',
          localField: '_id',
          foreignField: '_id',
          as: 'customerData'
        }
      },
      {
        $unwind: {
          path: '$customerData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          customerId: '$_id',
          customerName: { $ifNull: ['$customerData.name', 'Unknown'] },
          orderCount: 1,
          totalSales: 1,
          totalPurchase: 1,
          totalExpenses: 1,
          totalProfit: 1,
          profitMargin: {
            $cond: [
              { $eq: ['$totalSales', 0] },
              0,
              { $multiply: [{ $divide: ['$totalProfit', '$totalSales'] }, 100] }
            ]
          },
          lastOrderDate: 1
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    console.log(`📊 Results: ${result.length} customers found\n`);
    
    result.forEach((customer, idx) => {
      console.log(`${idx + 1}. ${customer.customerName}:`);
      console.log(`   Orders: ${customer.orderCount}`);
      console.log(`   Sales: ₹${Math.round(customer.totalSales).toLocaleString()}`);
      console.log(`   Purchase: ₹${Math.round(customer.totalPurchase).toLocaleString()}`);
      console.log(`   Expenses: ₹${Math.round(customer.totalExpenses).toLocaleString()}`);
      console.log(`   Profit: ₹${Math.round(customer.totalProfit).toLocaleString()}`);
      console.log(`   Margin: ${customer.profitMargin.toFixed(2)}%`);
      console.log('');
    });
    
    if (result.length === 0) {
      console.log('⚠️  No data returned! This is the problem.\n');
      console.log('Debugging steps:');
      
      // Check if orders exist
      const orderCount = await db.collection('orders').countDocuments({
        account: account._id
      });
      console.log(`   Total orders for account: ${orderCount}`);
      
      const ordersInRange = await db.collection('orders').countDocuments({
        account: account._id,
        saleDate: { $gte: startDate, $lte: endDate }
      });
      console.log(`   Orders in date range: ${ordersInRange}`);
      
      if (ordersInRange > 0) {
        const sampleOrder = await db.collection('orders').findOne({
          account: account._id,
          saleDate: { $gte: startDate, $lte: endDate }
        });
        
        console.log('\n   Sample order structure:');
        console.log(`   customer: ${sampleOrder.customer}`);
        console.log(`   saleType: ${JSON.stringify(sampleOrder.saleType)}`);
        console.log(`   saleRate: ${sampleOrder.saleRate}`);
        console.log(`   deliveries: ${sampleOrder.deliveries?.length}`);
      }
    } else {
      console.log('✅ API is returning data correctly!');
      console.log('   Problem is likely in the frontend or API endpoint configuration.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

testAnalyticsAPI();
