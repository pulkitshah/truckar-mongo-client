const mongoose = require("mongoose");

// Utility script to reassign every order to the primary account of a target user.
const DEFAULT_URI = "mongodb://localhost:27017/truckar-dev";
const MONGODB_URI = process.env.MONGODB_URI_DEV || DEFAULT_URI;
const cliArgs = process.argv.slice(2);

const emailFlag = cliArgs.find((arg) => arg.startsWith("--email="));
const positionalEmail = cliArgs.find((arg) => !arg.startsWith("--"));
let targetEmail = process.env.TARGET_EMAIL || "test@gmail.com";
if (emailFlag) {
  targetEmail = emailFlag.split("=")[1];
} else if (positionalEmail) {
  targetEmail = positionalEmail;
}
targetEmail = targetEmail.toLowerCase();

const dryRun = cliArgs.includes("--dry-run");
const accountFlag = cliArgs.find((arg) => arg.startsWith("--account="));
let accountOverride = null;
if (accountFlag) {
  accountOverride = accountFlag.split("=")[1];
}

function normalizeObjectId(value, context) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error(`Invalid ObjectId for ${context}: ${value}`);
    }
    return new mongoose.Types.ObjectId(value);
  }

  if (typeof value === "object" && value.toString) {
    const str = value.toString();
    if (!mongoose.Types.ObjectId.isValid(str)) {
      throw new Error(`Invalid ObjectId for ${context}: ${str}`);
    }
    return new mongoose.Types.ObjectId(str);
  }

  throw new Error(`Unable to normalize ${context} identifier.`);
}

function logBreakdown(breakdown, heading) {
  console.log(heading);
  if (!breakdown.length) {
    console.log("   (no orders found)");
    return;
  }

  breakdown.forEach((entry) => {
    const key = entry._id ? entry._id.toString() : "unset";
    console.log(`   ${key} -> ${entry.count}`);
  });
}

async function shiftOrders() {
  console.log("\n🚚 Shifting orders to target user account");
  console.log("------------------------------------------------------------");
  console.log(`Mongo URI      : ${MONGODB_URI}`);
  console.log(`Target email   : ${targetEmail}`);
  console.log(`Dry run        : ${dryRun ? "yes" : "no"}`);

  try {
    if (accountOverride && !mongoose.Types.ObjectId.isValid(accountOverride)) {
      throw new Error(`Invalid account override id: ${accountOverride}`);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    const db = mongoose.connection.db;
    const users = db.collection("users");
    const orders = db.collection("orders");
    const accounts = db.collection("accounts");

    const user = await users.findOne({ email: targetEmail });
    if (!user) {
      console.log("❌ Target user not found. Aborting.");
      return;
    }

    console.log(`User _id       : ${user._id}`);

    let targetAccountId = null;
    if (accountOverride) {
      targetAccountId = normalizeObjectId(accountOverride, "account override");
      console.log(`Using override account id: ${targetAccountId.toString()}`);
    } else if (Array.isArray(user.accounts) && user.accounts.length > 0) {
      const preferred =
        user.accounts.find((acc) => acc.role === "owner") || user.accounts[0];
      targetAccountId = normalizeObjectId(preferred.account, "user.accounts");
      console.log(
        `Resolved account from user.accounts (role: ${
          preferred.role || "unset"
        }) -> ${targetAccountId.toString()}`
      );
    } else if (user.account) {
      targetAccountId = normalizeObjectId(user.account, "user.account");
      console.log("Target user uses legacy user.account field.");
      console.log(`Resolved account id -> ${targetAccountId.toString()}`);
    } else {
      console.log(
        "❌ Target user has no linked account information. Aborting."
      );
      return;
    }

    const accountDoc = await accounts.findOne({ _id: targetAccountId });
    if (accountDoc) {
      console.log(
        `Account name    : ${accountDoc.name || "(unnamed account)"}`
      );
    } else {
      console.log(
        "⚠️  Warning: account document not found. Proceeding with id only."
      );
    }

    const totalOrders = await orders.countDocuments();
    console.log(`Total orders    : ${totalOrders}`);

    const beforeBreakdown = await orders
      .aggregate([
        {
          $group: {
            _id: "$account",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();
    logBreakdown(beforeBreakdown, "\nCurrent distribution by account:");

    const migrationFilter = {
      $or: [
        { account: { $exists: false } },
        { account: null },
        { account: { $ne: targetAccountId } },
      ],
    };

    const pending = await orders.countDocuments(migrationFilter);
    console.log(`\nOrders needing reassignment: ${pending}`);

    if (pending === 0) {
      console.log(
        "Nothing to do. All orders already reference the target account."
      );
      return;
    }

    if (dryRun) {
      console.log("\nDry run enabled. No changes were applied.");
    } else {
      const result = await orders.updateMany(migrationFilter, {
        $set: { account: targetAccountId },
      });
      console.log("\nUpdate summary:");
      console.log(`   Matched documents : ${result.matchedCount}`);
      console.log(`   Modified documents: ${result.modifiedCount}`);
    }

    const afterBreakdown = await orders
      .aggregate([
        {
          $group: {
            _id: "$account",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();
    logBreakdown(afterBreakdown, "\nUpdated distribution by account:");

    if (dryRun) {
      console.log(
        "\n✅ Dry run complete. Re-run without --dry-run to apply changes."
      );
    } else {
      console.log("\n✅ Orders now point to the target account.");
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log("Disconnected from MongoDB");
  }
}

shiftOrders();
