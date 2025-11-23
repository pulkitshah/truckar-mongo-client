import mongoose from 'mongoose';
import dbConnect from '../../../lib/dbConnect';
import Order from '../../../models/Order';
import auth from '../../../auth';
import { getFinancialGroupFields } from '../../../helper';

/**
 * Customer Scoring & Ranking API
 * Calculates comprehensive health scores for each customer
 * 
 * Scoring Components (0-100):
 * - Frequency Score (30%): Percentile rank by order count
 * - Profitability Score (25%): Percentile rank by total profit
 * - Growth Score (20%): Period-over-period order growth
 * - Recency Score (15%): Inverse of days since last order
 * - Payment Score (10%): Based on outstanding invoices
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

      // Calculate previous period dates
      const currentStart = new Date(startDate);
      const currentEnd = new Date(endDate);
      const periodDays = Math.ceil(
        (currentEnd - currentStart) / (1000 * 60 * 60 * 24)
      );
      const previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - periodDays);
      const previousEnd = new Date(currentStart);
      previousEnd.setDate(previousEnd.getDate() - 1);

      // Build match filter
      const matchFilter = {
        account: new mongoose.Types.ObjectId(account),
      };
      if (organisation) {
        matchFilter.organisation = new mongoose.Types.ObjectId(organisation);
      }

      // Get current period customer metrics
      const currentPeriodData = await getCustomerMetrics(
        matchFilter,
        currentStart,
        currentEnd
      );

      // Get previous period customer metrics for growth calculation
      const previousPeriodData = await getCustomerMetrics(
        matchFilter,
        previousStart,
        previousEnd
      );

      // Get outstanding invoices per customer (if invoices collection exists)
      let outstandingMap = new Map();
      try {
        const Invoice = require('../../../models/Invoice').default;
        const outstandingData = await Invoice.aggregate([
          {
            $match: {
              account: new mongoose.Types.ObjectId(account),
              paymentStatus: { $in: ['unpaid', 'partial'] },
            },
          },
          {
            $group: {
              _id: '$customer',
              totalOutstanding: {
                $sum: { $subtract: ['$subtotal', { $ifNull: ['$paidAmount', 0] }] },
              },
              invoiceCount: { $sum: 1 },
            },
          },
        ]).exec();

        outstandingMap = new Map(
          outstandingData.map((item) => [item._id.toString(), item])
        );
      } catch (err) {
        // Invoice model might not exist, continue without payment scoring
        console.log('Payment scoring skipped:', err.message);
      }

      // TENURE FIX: Get ALL-TIME first order dates (not filtered by period)
      const allTimeFirstOrders = await Order.aggregate([
        {
          $match: matchFilter,  // Match account/org but no date filter
        },
        {
          $group: {
            _id: '$customer',
            firstOrderEver: { $min: '$saleDate' },
          },
        },
      ]).exec();

      // Map for quick lookup
      const firstOrderMap = new Map();
      allTimeFirstOrders.forEach(item => {
        if (item._id) {  // Safety check
          firstOrderMap.set(item._id.toString(), item.firstOrderEver);
        }
      });

      // Calculate scores
      const maxOrderCount = Math.max(
        ...currentPeriodData.map((c) => c.orderCount),
        1
      );
      const maxProfit = Math.max(
        ...currentPeriodData.map((c) => c.totalProfit),
        1
      );

      const scoredCustomers = currentPeriodData.map((customer) => {
        const customerId = customer.customerId?.toString();  // Safe navigation
        const previousCustomer = previousPeriodData.find(
          (p) => p.customerId?.toString() === customerId
        );

        const outstanding = customerId ? outstandingMap.get(customerId) : null;
        const outstandingData = outstanding || {
          totalOutstanding: 0,
          invoiceCount: 0,
        };

        // Calculate score components
        const frequencyScore = (customer.orderCount / maxOrderCount) * 30;
        const profitabilityScore = (customer.totalProfit / maxProfit) * 25;

        const orderGrowth = previousCustomer
          ? ((customer.orderCount - previousCustomer.orderCount) /
              previousCustomer.orderCount) *
            100
          : 0;
        const growthScore = Math.min(Math.max(orderGrowth, 0), 100) / 5; // Cap at 20

        const recencyScore = Math.max(15 - customer.daysSinceLastOrder / 3, 0);

        const outstandingRatio =
          customer.totalSales > 0
            ? (outstandingData.totalOutstanding / customer.totalSales) * 100
            : 0;
        const paymentScore = 10 - Math.min(outstandingRatio, 10);

        const healthScore =
          frequencyScore +
          profitabilityScore +
          growthScore +
          recencyScore +
          paymentScore;

        // Determine tier
        let scoreTier;
        if (healthScore >= 90) scoreTier = 'champion';
        else if (healthScore >= 75) scoreTier = 'valuable';
        else if (healthScore >= 60) scoreTier = 'growing';
        else if (healthScore >= 40) scoreTier = 'average';
        else scoreTier = 'at-risk';

        // Recency status
        let recencyStatus;
        if (customer.daysSinceLastOrder <= 7) recencyStatus = 'active';
        else if (customer.daysSinceLastOrder <= 30) recencyStatus = 'recent';
        else recencyStatus = 'dormant';

        // Risk flags
        const riskFlags = [];
        if (orderGrowth < -20) riskFlags.push('declining_orders');
        if (outstandingData.totalOutstanding > customer.totalSales * 0.3)
          riskFlags.push('late_payments');
        if (customer.profitMargin < 10) riskFlags.push('low_margin');
        if (customer.daysSinceLastOrder > 60) riskFlags.push('inactive');

        return {
          ...customer,
          healthScore: Math.round(healthScore),
          scoreBreakdown: {
            frequencyScore: Math.round(frequencyScore),
            profitabilityScore: Math.round(profitabilityScore),
            growthScore: Math.round(growthScore),
            recencyScore: Math.round(recencyScore),
            paymentScore: Math.round(paymentScore),
          },
          scoreTier,
          recencyStatus,
          orderGrowth: Math.round(orderGrowth * 10) / 10,
          totalOutstanding: outstandingData.totalOutstanding,
          outstandingInvoiceCount: outstandingData.invoiceCount,
          riskFlags,
        };
      });

      // Sort by health score
      scoredCustomers.sort((a, b) => b.healthScore - a.healthScore);

      // Calculate summary
      const summary = {
        championCount: scoredCustomers.filter((c) => c.scoreTier === 'champion')
          .length,
        valuableCount: scoredCustomers.filter((c) => c.scoreTier === 'valuable')
          .length,
        growingCount: scoredCustomers.filter((c) => c.scoreTier === 'growing')
          .length,
        averageCount: scoredCustomers.filter((c) => c.scoreTier === 'average')
          .length,
        atRiskCount: scoredCustomers.filter((c) => c.scoreTier === 'at-risk')
          .length,
        avgHealthScore:
          scoredCustomers.length > 0
            ? Math.round(
                scoredCustomers.reduce((sum, c) => sum + c.healthScore, 0) /
                  scoredCustomers.length
              )
            : 0,
      };

      return res.status(200).json({
        customers: scoredCustomers,
        summary,
      });
    } catch (error) {
      console.error('[Analytics API - Customer Scoring Error]:', error);
      return res.status(500).json({
        message: 'Failed to fetch customer scoring',
        error: error.message,
      });
    }
  });
}

/**
 * Helper function to get customer metrics for a period
 */
async function getCustomerMetrics(matchFilter, startDate, endDate) {
  return await Order.aggregate([
    {
      $match: {
        ...matchFilter,
        saleDate: { $gte: startDate, $lte: endDate },
      },
    },
    // Group by customer with financial calculations
    {
      $group: {
        _id: '$customer',
        orderCount: { $sum: 1 },
        ...getFinancialGroupFields(),
        lastOrderDate: { $max: '$saleDate' },
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
        customerName: { $ifNull: ['$customerData.name', 'Unknown Customer'] },
        customerCity: { $ifNull: ['$customerData.city', ''] },
        orderCount: 1,
        totalSales: '$sales',
        totalProfit: 1,
        averageProfitPerOrder: { $divide: ['$totalProfit', '$orderCount'] },
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
  ]).exec();
}
