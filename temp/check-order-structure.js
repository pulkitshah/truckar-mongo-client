require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkOrderStructure() {
  try {
    await mongoose.connect(process.env.MONGODB_URI_DEV);
    console.log('Connected to MongoDB\n');
    
    const Order = mongoose.connection.collection('orders');
    
    // Get sample orders from last 30 days
    const sampleOrders = await Order.find({
      saleDate: { 
        $gte: new Date('2025-10-16T18:30:00.000Z'),
        $lte: new Date('2025-11-16T18:29:59.999Z')
      }
    }).limit(3).toArray();
    
    console.log('=== CHECKING ORDER STRUCTURE ===\n');
    
    sampleOrders.forEach((order, idx) => {
      console.log(`Order ${idx + 1} (${order.orderNo}):`);
      console.log('  - Has deliveries field:', !!order.deliveries);
      console.log('  - Deliveries count:', order.deliveries?.length || 0);
      
      if (order.deliveries && order.deliveries.length > 0) {
        order.deliveries.forEach((delivery, dIdx) => {
          console.log(`    Delivery ${dIdx + 1}:`);
          console.log('      - Has lr field:', !!delivery.lr);
          if (delivery.lr) {
            console.log('      - lr.lrNo:', delivery.lr.lrNo || 'null');
          }
          console.log('      - Has invoices array:', !!delivery.invoices);
          console.log('      - Invoices count:', delivery.invoices?.length || 0);
        });
      }
    });

    // Count orders with embedded LR in deliveries
    const totalOrders = await Order.countDocuments({
      saleDate: { 
        $gte: new Date('2025-10-16T18:30:00.000Z'),
        $lte: new Date('2025-11-16T18:29:59.999Z')
      }
    });
    
    const ordersWithEmbeddedLR = await Order.countDocuments({
      saleDate: { 
        $gte: new Date('2025-10-16T18:30:00.000Z'),
        $lte: new Date('2025-11-16T18:29:59.999Z')
      },
      'deliveries.lr.lrNo': { $exists: true, $ne: null }
    });

    const ordersWithEmbeddedInvoices = await Order.countDocuments({
      saleDate: { 
        $gte: new Date('2025-10-16T18:30:00.000Z'),
        $lte: new Date('2025-11-16T18:29:59.999Z')
      },
      'deliveries.invoices': { $exists: true, $ne: [], $not: { $size: 0 } }
    });

    console.log('\n=== EMBEDDED DOCUMENTS (Last 30 Days) ===');
    console.log('Total orders:', totalOrders);
    console.log('Orders with embedded LR:', ordersWithEmbeddedLR, `(${((ordersWithEmbeddedLR/totalOrders)*100).toFixed(1)}%)`);
    console.log('Orders with embedded Invoices:', ordersWithEmbeddedInvoices, `(${((ordersWithEmbeddedInvoices/totalOrders)*100).toFixed(1)}%)`);
    
    // Check standalone LR collection
    console.log('\n=== STANDALONE LR COLLECTION ===');
    const LR = mongoose.connection.collection('lrs');
    const totalLRs = await LR.countDocuments({});
    console.log('Total LRs:', totalLRs);
    
    if (totalLRs > 0) {
      const sampleLR = await LR.findOne({});
      console.log('Sample LR structure:');
      console.log('  - Has order field:', !!sampleLR.order);
      console.log('  - order value:', sampleLR.order);
      
      // Count orders with LRs in standalone collection
      const orderIdsWithLR = await LR.distinct('order');
      console.log('Unique orders with LR:', orderIdsWithLR.length);
      
      // Find how many of those are in our date range
      const ordersInRangeWithLR = await Order.countDocuments({
        _id: { $in: orderIdsWithLR },
        saleDate: { 
          $gte: new Date('2025-10-16T18:30:00.000Z'),
          $lte: new Date('2025-11-16T18:29:59.999Z')
        }
      });
      console.log('Orders in last 30 days with LR:', ordersInRangeWithLR, `(${((ordersInRangeWithLR/totalOrders)*100).toFixed(1)}%)`);
    }
    
    // Check standalone Invoice collection
    console.log('\n=== STANDALONE INVOICE COLLECTION ===');
    const Invoice = mongoose.connection.collection('invoices');
    const totalInvoices = await Invoice.countDocuments({});
    console.log('Total Invoices:', totalInvoices);
    
    if (totalInvoices > 0) {
      const sampleInvoice = await Invoice.findOne({});
      console.log('Sample Invoice structure:');
      console.log('  - Has order field:', !!sampleInvoice.order);
      console.log('  - order value:', sampleInvoice.order);
      
      // Count orders with Invoices in standalone collection
      const orderIdsWithInvoice = await Invoice.distinct('order');
      console.log('Unique orders with Invoices:', orderIdsWithInvoice.length);
      
      // Find how many of those are in our date range
      const ordersInRangeWithInvoice = await Order.countDocuments({
        _id: { $in: orderIdsWithInvoice },
        saleDate: { 
          $gte: new Date('2025-10-16T18:30:00.000Z'),
          $lte: new Date('2025-11-16T18:29:59.999Z')
        }
      });
      console.log('Orders in last 30 days with Invoice:', ordersInRangeWithInvoice, `(${((ordersInRangeWithInvoice/totalOrders)*100).toFixed(1)}%)`);
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkOrderStructure().catch(console.error);
