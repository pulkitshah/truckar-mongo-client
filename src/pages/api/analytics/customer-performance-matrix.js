import mongoose from 'mongoose';
import dbConnect from '../../../lib/dbConnect';
import Order from '../../../models/Order';
import auth from '../../../auth';
import { getFinancialGroupFields } from '../../../helper';

/**
 * Customer Performance Matrix API
 * Returns customer data for scatter plot visualization
 * X-axis: Order count (frequency)
 * Y-axis: Total profit (monetary value)
 * Bubble size: Average order value
 * Color: Profit margin
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  auth(req, res, async () => {
    try {
      const { account, organisation, startDate, endDate } = req.query;

      if (!account || !startDate || !endDate) {
        return res.status(400).json({
          message: 'Missing required parameters: account, startDate, endDate',
        });
      }

      await dbConnect();

      // Build match filter
      const matchFilter = {
        account: new mongoose.Types.ObjectId(account),
        saleDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };

      // Add organization filter if provided
      if (organisation) {
        matchFilter.organisation = new mongoose.Types.ObjectId(organisation);
      }

      // Aggregation pipeline
      const customerData = await Order.aggregate([
        {
          $match: matchFilter,
        },
        // Group by customer with financial calculations
        {
          $group: {
            _id: '$customer',
            orderCount: { $sum: 1 },
            ...getFinancialGroupFields(),
            lastOrderDate: { $max: '$saleDate' },
            firstOrderDate: { $min: '$saleDate' },
          },
        },
        // Calculate profit
        {
          $addFields: {
            totalProfit: {
              $subtract: ['$sales', { $add: ['$purchase', '$expenses'] }],
            },
          },
        },
        // Lookup customer details
        {
          $lookup: {
            from: 'parties',
            localField: '_id',
            foreignField: '_id',
            as: 'customerData',
          },
        },
        {
          $unwind: {
            path: '$customerData',
            preserveNullAndEmptyArrays: true,
          },
        },
        // Calculate derived metrics
        {
          $project: {
            customerId: '$_id',
            customerName: {
              $ifNull: ['$customerData.name', 'Unknown Customer'],
            },
            customerCity: {
              $ifNull: ['$customerData.city', ''],
            },
            orderCount: 1,
            totalProfit: 1,
            totalSales: '$sales',
            averageOrderValue: { $divide: ['$sales', '$orderCount'] },
            profitMargin: {
              $cond: [
                { $eq: ['$sales', 0] },
                0,
                {
                  $multiply: [{ $divide: ['$totalProfit', '$sales'] }, 100],
                },
              ],
            },
            lastOrderDate: 1,
            daysSinceLastOrder: {
              $divide: [
                { $subtract: [new Date(), '$lastOrderDate'] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
        // Sort by total profit descending
        {
          $sort: { totalProfit: -1 },
        },
      ]).exec();

      // Calculate summary statistics
      const summary = {
        totalCustomers: customerData.length,
        avgOrdersPerCustomer:
          customerData.length > 0
            ? customerData.reduce((sum, c) => sum + c.orderCount, 0) /
              customerData.length
            : 0,
        avgProfitPerCustomer:
          customerData.length > 0
            ? customerData.reduce((sum, c) => sum + c.totalProfit, 0) /
              customerData.length
            : 0,
        topCustomerProfit: customerData[0]?.totalProfit || 0,
        topCustomerOrders: Math.max(
          ...customerData.map((c) => c.orderCount),
          0
        ),
      };

      return res.status(200).json({
        customers: customerData,
        summary,
      });
    } catch (error) {
      console.error(
        '[Analytics API - Customer Performance Matrix Error]:',
        error
      );
      return res.status(500).json({
        message: 'Failed to fetch customer performance matrix',
        error: error.message,
      });
    }
  });
}
