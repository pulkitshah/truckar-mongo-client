require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function testInsightsLogic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_DEV);
    console.log('Connected to MongoDB\n');
    
    const Order = mongoose.connection.collection('orders');
    
    const startDate = new Date('2025-10-16T18:30:00.000Z');
    const endDate = new Date('2025-11-16T18:29:59.999Z');
    
    console.log('=== Testing NEW Insights Logic (Embedded Data) ===\n');
    
    // New logic - checking embedded data
    const ordersWithDocs = await Order.aggregate([
      {
        $match: {
          saleDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $addFields: {
          // Check if any delivery has LR data
          hasLR: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: { $ifNull: ["$deliveries", []] },
                    as: "delivery",
                    cond: { $ifNull: ["$$delivery.lr.lrNo", false] },
                  },
                },
              },
              0,
            ],
          },
          // Check if any delivery has invoice references
          hasInvoice: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: { $ifNull: ["$deliveries", []] },
                    as: "delivery",
                    cond: {
                      $gt: [
                        { $size: { $ifNull: ["$$delivery.invoices", []] } },
                        0,
                      ],
                    },
                  },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          withLR: {
            $sum: {
              $cond: ["$hasLR", 1, 0],
            },
          },
          withInvoice: {
            $sum: {
              $cond: ["$hasInvoice", 1, 0],
            },
          },
        },
      },
    ]).toArray();
    
    const docCompletion = ordersWithDocs[0] || {
      total: 0,
      withLR: 0,
      withInvoice: 0,
    };
    
    const lrCompletionRate =
      docCompletion.total > 0
        ? (docCompletion.withLR / docCompletion.total) * 100
        : 0;
    const invoiceCompletionRate =
      docCompletion.total > 0
        ? (docCompletion.withInvoice / docCompletion.total) * 100
        : 0;
    
    console.log('Document Completion:');
    console.log('  Total Orders:', docCompletion.total);
    console.log('  Orders with LR:', docCompletion.withLR);
    console.log('  Orders with Invoice:', docCompletion.withInvoice);
    console.log('\nCompletion Rates:');
    console.log('  LR Completion:', lrCompletionRate.toFixed(1) + '%');
    console.log('  Invoice Completion:', invoiceCompletionRate.toFixed(1) + '%');
    
    // Generate the insight messages
    const minDocumentCompletion = 80;
    const insights = [];
    
    if (lrCompletionRate < minDocumentCompletion) {
      insights.push({
        type: "warning",
        message: `Only ${lrCompletionRate.toFixed(0)}% of orders have LRs generated`,
        action: "Follow up on pending documentation to ensure compliance",
        value: `${lrCompletionRate.toFixed(0)}%`,
      });
    }
    
    if (invoiceCompletionRate < minDocumentCompletion) {
      insights.push({
        type: "warning",
        message: `Only ${invoiceCompletionRate.toFixed(0)}% of orders are invoiced`,
        action: "Generate invoices promptly to improve cash flow",
        value: `${invoiceCompletionRate.toFixed(0)}%`,
      });
    }
    
    console.log('\n=== Generated Insights ===');
    insights.forEach((insight, idx) => {
      console.log(`\n${idx + 1}. [${insight.type.toUpperCase()}]`);
      console.log('   Message:', insight.message);
      console.log('   Action:', insight.action);
      console.log('   Value:', insight.value);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testInsightsLogic().catch(console.error);
