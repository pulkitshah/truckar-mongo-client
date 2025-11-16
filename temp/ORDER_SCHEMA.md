# Order Schema Documentation

## Order Model Structure

### Main Order Fields
- `orderNo`: Number
- `saleDate`: Date
- `customer`: ObjectId (ref: party)
- `vehicle`: ObjectId (ref: vehicle)
- `transporter`: ObjectId (ref: party)

### Financial Fields
- `saleRate`: Number
- `purchaseRate`: Number
- `orderExpenses`: Array of expense objects

### Deliveries Array
Each order has a `deliveries` array with the following structure:

```javascript
deliveries: [
  {
    _id: String,
    billQuantity: Number,
    unloadingQuantity: Number,
    loading: Object,
    unloading: Object,
    status: String,
    
    // INVOICES - Array of invoice objects (embedded)
    invoices: Array,
    
    // LR - Embedded object (not a separate collection)
    lr: {
      lrFormat: String,
      lrNo: Number,          // ← KEY FIELD for LR completion
      lrDate: Date,
      organisation: ObjectId,
      consignor: ObjectId,
      consignee: ObjectId,
      descriptionOfGoods: Object,
      lrCharges: Object,
      // ... other LR fields
    }
  }
]
```

## Document Completion Logic

### LR Completion
An order has LR if ANY delivery has `lr.lrNo` present:
```javascript
deliveries.some(delivery => delivery.lr && delivery.lr.lrNo)
```

### Invoice Completion  
An order has invoices if ANY delivery has non-empty `invoices` array:
```javascript
deliveries.some(delivery => delivery.invoices && delivery.invoices.length > 0)
```

## Important Notes

1. **LRs are EMBEDDED** in the deliveries array, not in a separate `lrs` collection
2. **Invoices are EMBEDDED** as arrays in each delivery, not in a separate collection linked by order
3. There IS a standalone `invoices` collection in the database, but it does NOT have an `order` field to link back
4. The standalone `lrs` collection is EMPTY (0 documents)

## Aggregation Pattern for Document Completion

```javascript
{
  $addFields: {
    hasLR: {
      $gt: [{
        $size: {
          $filter: {
            input: { $ifNull: ["$deliveries", []] },
            as: "delivery",
            cond: { $ifNull: ["$$delivery.lr.lrNo", false] }
          }
        }
      }, 0]
    },
    hasInvoice: {
      $gt: [{
        $size: {
          $filter: {
            input: { $ifNull: ["$deliveries", []] },
            as: "delivery",
            cond: {
              $gt: [{ $size: { $ifNull: ["$$delivery.invoices", []] } }, 0]
            }
          }
        }
      }, 0]
    }
  }
}
```
