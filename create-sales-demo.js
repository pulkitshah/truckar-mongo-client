const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/truckar-dev';

// Helper to generate random date within a range
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to get random element from array
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to generate random number in range
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Indian cities for parties
const cities = [
  { name: 'Mumbai', state: 'Maharashtra' },
  { name: 'Delhi', state: 'Delhi' },
  { name: 'Bangalore', state: 'Karnataka' },
  { name: 'Hyderabad', state: 'Telangana' },
  { name: 'Chennai', state: 'Tamil Nadu' },
  { name: 'Kolkata', state: 'West Bengal' },
  { name: 'Pune', state: 'Maharashtra' },
  { name: 'Ahmedabad', state: 'Gujarat' },
  { name: 'Surat', state: 'Gujarat' },
  { name: 'Rajkot', state: 'Gujarat' },
  { name: 'Vadodara', state: 'Gujarat' },
  { name: 'Jaipur', state: 'Rajasthan' },
  { name: 'Lucknow', state: 'Uttar Pradesh' },
  { name: 'Kanpur', state: 'Uttar Pradesh' },
  { name: 'Nagpur', state: 'Maharashtra' },
];

// Customer company names
const customerNames = [
  'Apex Industries', 'Steel Masters Ltd', 'Global Traders', 'Prime Manufacturing',
  'Sunrise Exports', 'Metro Suppliers', 'Elite Commodities', 'Zenith Enterprises',
  'Fortune Trading Co', 'Diamond Industries', 'Royal Exports', 'Stellar Goods',
  'Omega Manufacturing', 'Alpha Traders', 'Beta Industries', 'Gamma Exports',
  'Delta Suppliers', 'Epsilon Trading', 'Sigma Manufacturing', 'Theta Commodities'
];

// Transporter names
const transporterNames = [
  'Swift Transport', 'Express Logistics', 'Fast Track Carriers', 'Premium Freight',
  'Reliable Movers', 'Speedy Transport', 'Secure Logistics', 'Safe Cargo',
  'Quick Wheels', 'Trusty Transport'
];

// Vehicle makes and models
const vehicles = [
  { make: 'Tata', model: '4018', capacity: '40 Ton' },
  { make: 'Tata', model: 'LPT 3723', capacity: '37 Ton' },
  { make: 'Ashok Leyland', model: '3718', capacity: '37 Ton' },
  { make: 'Ashok Leyland', model: '4825', capacity: '48 Ton' },
  { make: 'Mahindra', model: 'Blazo X 35', capacity: '35 Ton' },
  { make: 'Eicher', model: 'Pro 6037', capacity: '37 Ton' },
  { make: 'Tata', model: 'Signa 4625', capacity: '46 Ton' },
  { make: 'Bharat Benz', model: '4228R', capacity: '42 Ton' },
];

async function createSalesDemo() {
  try {
    console.log('🚀 Starting Sales Demo Account Creation...\n');
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected\n');
    
    const db = mongoose.connection.db;
    
    // Step 1: Create Account
    console.log('📋 Creating Demo Account...');
    const accountResult = await db.collection('accounts').insertOne({
      name: 'Demo Logistics Co.',
      orderExpensesSettings: [
        { id: '1', name: 'Toll Charges', isActive: true },
        { id: '2', name: 'Loading Charges', isActive: true },
        { id: '3', name: 'Unloading Charges', isActive: true },
        { id: '4', name: 'Detention', isActive: true },
        { id: '5', name: 'Weighbridge', isActive: true },
      ],
      lrSettings: [
        { id: '1', name: 'Hamali', defaultAmount: 0, isActive: true },
        { id: '2', name: 'Door Collection', defaultAmount: 0, isActive: true },
        { id: '3', name: 'Door Delivery', defaultAmount: 0, isActive: true },
        { id: '4', name: 'Statistical Charges', defaultAmount: 50, isActive: true },
      ],
      taxOptions: [
        { id: '1', name: 'GST 5%', rate: 5 },
        { id: '2', name: 'GST 12%', rate: 12 },
        { id: '3', name: 'GST 18%', rate: 18 },
      ],
      lrFormat: 'standard',
      invoiceFormat: 'standard',
      analyticsSettings: {
        monthlyTargets: {
          sales: 5000000,
          profit: 750000,
          orders: 150,
          profitMargin: 15,
        },
        thresholds: {
          maxExpenseRatio: 15,
          minProfitMargin: 12,
          minDocumentCompletion: 80,
          minFleetUtilization: 70,
        },
        alertSettings: {
          outstandingDaysThreshold: 30,
          pendingLRDaysThreshold: 7,
          pendingInvoiceDaysThreshold: 15,
        },
      },
    });
    const accountId = accountResult.insertedId;
    console.log(`✓ Created Account: ${accountId}\n`);

    // Step 2: Create 2 Organisations
    console.log('🏢 Creating Organisations...');
    
    // Organisation 1: Owned Fleet
    const org1Result = await db.collection('organisations').insertOne({
      name: 'Demo Transport Services',
      initials: 'DTS',
      addressLine1: 'Plot No. 42, Industrial Area',
      addressLine2: 'Sector 15, Transport Nagar',
      city: 'Mumbai',
      pincode: '400001',
      contact: '+91 9876543210',
      email: 'info@demotransport.com',
      gstin: '27ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      invoiceTermsAndConditions: 'Payment due within 30 days. Interest @18% p.a. on delayed payments. Subject to Mumbai jurisdiction.',
      lrTermsAndConditions: 'Goods transported at owner\'s risk. Insurance must be arranged by consignor/consignee.',
      bankAccountNumber: '1234567890',
      bankName: 'HDFC Bank',
      bankBranchName: 'Mumbai Central',
      bankIFSC: 'HDFC0001234',
      account: accountId,
    });
    const org1Id = org1Result.insertedId;
    console.log(`✓ Created Organisation 1 (Owned Fleet): ${org1Id}`);

    // Organisation 2: Outsourced Operations
    const org2Result = await db.collection('organisations').insertOne({
      name: 'Demo Freight Solutions',
      initials: 'DFS',
      addressLine1: 'Office 301, Business Center',
      addressLine2: 'MG Road',
      city: 'Mumbai',
      pincode: '400002',
      contact: '+91 9876543211',
      email: 'contact@demofreight.com',
      gstin: '27FGHIJ5678K1Z9',
      pan: 'FGHIJ5678K',
      invoiceTermsAndConditions: 'Payment terms: 45 days. All disputes subject to Mumbai jurisdiction.',
      lrTermsAndConditions: 'Standard LR terms apply. Goods at owner\'s risk.',
      bankAccountNumber: '9876543210',
      bankName: 'ICICI Bank',
      bankBranchName: 'Mumbai South',
      bankIFSC: 'ICIC0009876',
      account: accountId,
    });
    const org2Id = org2Result.insertedId;
    console.log(`✓ Created Organisation 2 (Outsourced): ${org2Id}\n`);

    // Step 3: Create Customers
    console.log('👥 Creating Customers...');
    const customerIds = [];
    for (let i = 0; i < 18; i++) {
      const city = randomChoice(cities);
      const customerResult = await db.collection('parties').insertOne({
        name: customerNames[i],
        city: city,
        mobile: `+91 ${randomInt(9000000000, 9999999999)}`,
        isTransporter: false,
        account: accountId,
      });
      customerIds.push(customerResult.insertedId);
    }
    console.log(`✓ Created ${customerIds.length} customers\n`);

    // Step 4: Create Transporters
    console.log('🚛 Creating Transporters...');
    const transporterIds = [];
    for (let i = 0; i < 10; i++) {
      const city = randomChoice(cities);
      const transporterResult = await db.collection('parties').insertOne({
        name: transporterNames[i],
        city: city,
        mobile: `+91 ${randomInt(9000000000, 9999999999)}`,
        isTransporter: true,
        account: accountId,
      });
      transporterIds.push(transporterResult.insertedId);
    }
    console.log(`✓ Created ${transporterIds.length} transporters\n`);

    // Step 5: Create Vehicles (for Organisation 1 - Owned Fleet)
    console.log('🚗 Creating Vehicles for Owned Fleet...');
    const vehicleIds = [];
    const vehicleNumbers = [];
    for (let i = 0; i < 15; i++) {
      const vehicleData = randomChoice(vehicles);
      const stateCode = randomChoice(['MH', 'GJ', 'DL', 'KA', 'TN']);
      const vehicleNumber = `${stateCode}-${randomInt(10, 99)}-${String.fromCharCode(65 + randomInt(0, 25))}${String.fromCharCode(65 + randomInt(0, 25))}-${randomInt(1000, 9999)}`;
      vehicleNumbers.push(vehicleNumber);
      
      const vehicleResult = await db.collection('vehicles').insertOne({
        vehicleNumber: vehicleNumber,
        make: vehicleData.make,
        model: vehicleData.model,
        yearOfPurchase: String(randomInt(2018, 2024)),
        condition: randomChoice(['New', 'Good', 'Fair']),
        organisation: org1Id,
        account: accountId,
      });
      vehicleIds.push(vehicleResult.insertedId);
    }
    console.log(`✓ Created ${vehicleIds.length} vehicles\n`);

    // Step 6: Create Orders
    console.log('📦 Creating Orders...');
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const orders = [];
    let orderNo = 1000;
    
    // Create 180 orders with varied distribution
    for (let i = 0; i < 180; i++) {
      orderNo++;
      
      // 60% recent orders (last 2 months), 40% older
      const isRecent = Math.random() < 0.6;
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      
      const saleDate = isRecent 
        ? randomDate(twoMonthsAgo, now)
        : randomDate(sixMonthsAgo, twoMonthsAgo);
      
      // 70% owned fleet, 30% outsourced
      const isOwnedFleet = Math.random() < 0.7;
      const organisation = isOwnedFleet ? org1Id : org2Id;
      
      // Random customer (some customers more frequent)
      const customerWeights = customerIds.map((_, idx) => {
        if (idx < 5) return 3; // Top 5 customers get 3x weight
        if (idx < 12) return 2; // Next 7 get 2x weight
        return 1; // Rest get normal weight
      });
      const totalWeight = customerWeights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;
      let customerIdx = 0;
      for (let j = 0; j < customerWeights.length; j++) {
        random -= customerWeights[j];
        if (random <= 0) {
          customerIdx = j;
          break;
        }
      }
      const customerId = customerIds[customerIdx];
      
      // Sale and purchase rates
      const baseSaleRate = randomInt(8, 25) * 100; // 800-2500 per ton
      const purchaseRate = isOwnedFleet 
        ? 0 // No purchase cost for owned fleet
        : baseSaleRate * (0.6 + Math.random() * 0.25); // 60-85% of sale rate
      
      const quantity = randomInt(10, 40); // 10-40 tons
      const saleType = randomChoice([
        { value: 'fixed', label: 'Fixed', unit: 'Ton' },
        { value: 'perTon', label: 'Per Ton', unit: 'Ton' },
      ]);
      
      // Order expenses (random)
      const orderExpenses = [];
      if (Math.random() < 0.7) {
        orderExpenses.push({ name: 'Toll Charges', orderExpenseAmount: randomInt(200, 1000) });
      }
      if (Math.random() < 0.5) {
        orderExpenses.push({ name: 'Loading Charges', orderExpenseAmount: randomInt(300, 800) });
      }
      if (Math.random() < 0.5) {
        orderExpenses.push({ name: 'Unloading Charges', orderExpenseAmount: randomInt(300, 800) });
      }
      
      const order = {
        orderNo: orderNo,
        saleDate: saleDate,
        createdDate: saleDate,
        customer: customerId,
        vehicleNumber: isOwnedFleet ? randomChoice(vehicleNumbers) : `EXT-${randomInt(1000, 9999)}`,
        vehicle: isOwnedFleet ? randomChoice(vehicleIds) : null,
        deliveries: [{
          _id: `delivery-${orderNo}-1`,
          billQuantity: quantity,
          unloadingQuantity: quantity,
          loading: randomChoice(cities),
          unloading: randomChoice(cities),
          status: 'completed',
          remarks: '',
          invoices: [],
        }],
        orderExpenses: orderExpenses,
        transporter: isOwnedFleet ? null : randomChoice(transporterIds),
        saleType: saleType,
        saleRate: baseSaleRate,
        minimumSaleGuarantee: 0,
        saleAdvance: Math.random() < 0.3 ? randomInt(5000, 20000) : 0,
        purchaseType: isOwnedFleet ? null : 'fixed',
        purchaseRate: Math.round(purchaseRate),
        minimumPurchaseGuarantee: 0,
        purchaseAdvance: 0,
        purchaseRemarks: '',
        status: 'completed',
        organisation: organisation,
        account: accountId,
      };
      
      orders.push(order);
    }
    
    // Insert all orders
    const ordersResult = await db.collection('orders').insertMany(orders);
    console.log(`✓ Created ${Object.keys(ordersResult.insertedIds).length} orders\n`);

    // Summary
    console.log('=' .repeat(60));
    console.log('✅ SALES DEMO ACCOUNT CREATED SUCCESSFULLY!\n');
    console.log('📊 Summary:');
    console.log(`   Account: Demo Logistics Co. (${accountId})`);
    console.log(`   Organisations: 2`);
    console.log(`     - Demo Transport Services (Owned Fleet): ${org1Id}`);
    console.log(`     - Demo Freight Solutions (Outsourced): ${org2Id}`);
    console.log(`   Customers: ${customerIds.length}`);
    console.log(`   Transporters: ${transporterIds.length}`);
    console.log(`   Vehicles: ${vehicleIds.length}`);
    console.log(`   Orders: ${orders.length}`);
    console.log('=' .repeat(60));
    console.log('\n🌐 View in browser: http://localhost:4000');
    console.log('   Login and select "Demo Logistics Co." account\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

createSalesDemo();
