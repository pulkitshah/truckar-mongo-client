#!/usr/bin/env node

/**
 * MongoDB Index Setup Script
 * Run this BEFORE deploying Phase 1 to production
 *
 * This will create all necessary indexes to optimize query performance
 * Expected time: 1-5 minutes depending on data volume
 */

const mongoose = require("mongoose");

// Update this with your MongoDB connection string
const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/truckar";

const indexes = [
  // Orders Collection - Most critical for analytics
  {
    collection: "orders",
    indexes: [
      { keys: { account: 1, saleDate: -1 }, name: "account_saleDate" },
      { keys: { account: 1, organisation: 1 }, name: "account_organisation" },
      { keys: { account: 1, vehicle: 1 }, name: "account_vehicle" },
      { keys: { account: 1, customer: 1 }, name: "account_customer" },
      { keys: { account: 1, driver: 1 }, name: "account_driver" },
      {
        keys: { account: 1, status: 1, saleDate: -1 },
        name: "account_status_saleDate",
      },
    ],
  },

  // Invoices Collection - For payment tracking
  {
    collection: "invoices",
    indexes: [
      { keys: { account: 1, paymentStatus: 1 }, name: "account_paymentStatus" },
      { keys: { account: 1, customer: 1 }, name: "account_customer" },
      { keys: { account: 1, dueDate: 1 }, name: "account_dueDate" },
      { keys: { account: 1, invoiceDate: -1 }, name: "account_invoiceDate" },
    ],
  },

  // LRs Collection - For document completion tracking
  {
    collection: "lrs",
    indexes: [
      { keys: { account: 1, order: 1 }, name: "account_order" },
      { keys: { account: 1, lrDate: -1 }, name: "account_lrDate" },
    ],
  },

  // Vehicles Collection - For fleet analytics
  {
    collection: "vehicles",
    indexes: [
      { keys: { account: 1, organisation: 1 }, name: "account_organisation" },
      { keys: { account: 1, status: 1 }, name: "account_status" },
    ],
  },

  // Drivers Collection - For driver analytics
  {
    collection: "drivers",
    indexes: [{ keys: { account: 1, status: 1 }, name: "account_status" }],
  },

  // Organisations Collection - For multi-org filtering
  {
    collection: "organisations",
    indexes: [{ keys: { account: 1 }, name: "account" }],
  },
];

async function createIndexes() {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║   MongoDB Index Setup for Phase 1 Analytics       ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  try {
    console.log(
      `Connecting to MongoDB: ${MONGO_URI.replace(/:[^:@]*@/, ":****@")}`
    );
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✓ Connected successfully\n");

    const db = mongoose.connection.db;
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const collectionDef of indexes) {
      const { collection, indexes: indexList } = collectionDef;

      console.log(`\n📦 Processing collection: ${collection}`);
      console.log("─".repeat(50));

      try {
        const coll = db.collection(collection);
        const existingIndexes = await coll.indexes();
        const existingIndexNames = existingIndexes.map((idx) => idx.name);

        for (const indexDef of indexList) {
          const { keys, name } = indexDef;

          if (existingIndexNames.includes(name)) {
            console.log(`  ⏭️  Index "${name}" already exists - skipping`);
            totalSkipped++;
          } else {
            console.log(`  🔨 Creating index "${name}"...`);
            await coll.createIndex(keys, { name, background: true });
            console.log(`  ✓  Index "${name}" created successfully`);
            totalCreated++;
          }
        }
      } catch (error) {
        console.error(
          `  ❌ Error processing collection ${collection}:`,
          error.message
        );
      }
    }

    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║                    Summary                         ║");
    console.log("╚════════════════════════════════════════════════════╝\n");
    console.log(`  Total indexes created:  ${totalCreated}`);
    console.log(`  Total indexes skipped:  ${totalSkipped}`);
    console.log(`  Total indexes checked:  ${totalCreated + totalSkipped}\n`);

    if (totalCreated > 0) {
      console.log(
        "✅ Index setup complete! Analytics queries will now be faster.\n"
      );
    } else {
      console.log("✅ All indexes already exist. No changes needed.\n");
    }
  } catch (error) {
    console.error("\n❌ Failed to set up indexes:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("Disconnected from MongoDB\n");
  }
}

// Verify indexes after creation
async function verifyIndexes() {
  console.log("🔍 Verifying indexes...\n");

  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = mongoose.connection.db;

    for (const collectionDef of indexes) {
      const { collection, indexes: indexList } = collectionDef;
      const coll = db.collection(collection);
      const actualIndexes = await coll.indexes();

      console.log(`\n${collection}:`);
      actualIndexes.forEach((idx) => {
        if (idx.name !== "_id_") {
          // Skip default _id index
          const keysStr = Object.entries(idx.key)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
          console.log(`  ✓ ${idx.name} (${keysStr})`);
        }
      });
    }

    console.log("\n✅ Index verification complete!\n");
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
  } finally {
    await mongoose.connection.close();
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--verify")) {
    verifyIndexes().then(() => process.exit(0));
  } else if (args.includes("--help")) {
    console.log(`
MongoDB Index Setup Script

Usage:
  node setup-indexes.js           Create indexes
  node setup-indexes.js --verify  Verify existing indexes
  node setup-indexes.js --help    Show this help

Environment Variables:
  MONGODB_URI   MongoDB connection string (default: mongodb://localhost:27017/truckar)

Example:
  MONGODB_URI="mongodb://user:pass@host:27017/truckar" node setup-indexes.js
`);
  } else {
    createIndexes().then(() => process.exit(0));
  }
}

module.exports = { createIndexes, verifyIndexes };
