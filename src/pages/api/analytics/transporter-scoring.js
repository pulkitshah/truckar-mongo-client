import mongoose from 'mongoose';
import dbConnect from '../../../lib/dbConnect';
import Order from '../../../models/Order';
import auth from '../../../auth';
import { getFinancialGroupFields } from '../../../helper';

/**
 * Transporter Partnership Scoring API
 * Calculates comprehensive partnership scores for each transporter
 * 
 * Scoring Components (0-100):
 * - Volume Score (40%): Order count percentile
 * - Reliability Score (30%): Document completion + cost consistency
 * - Cost Competitiveness (20%): Comparison against market average
 * - Tenure Score (10%): Months since first order (loyalty bonus)
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

      if (organisation) {
        matchFilter.organisation = new mongoose.Types.ObjectId(organisation);
      }

      // Get transporter metrics
      const transporterData = await Order.aggregate([
        {
          $match: matchFilter,
        },
        // Group by transporter with financial calculations
        {
          $group: {
            _id: '$transporter',
            orderCount: { $sum: 1 },
            ...getFinancialGroupFields(),
            firstOrderDate: { $min: '$saleDate' },
            lastOrderDate: { $max: '$saleDate' },
            // Document completion tracking
            ordersWithDeliveries: {
              $sum: {
                $cond: [{ $gt: [{ $size: { $ifNull: ['$deliveries', []] } }, 0] }, 1, 0],
              },
            },
            ordersWithInvoice: {
              $sum: {
                $cond: [{ $ne: ['$invoice', null] }, 1, 0],
              },
            },
            costs: { $push: { $add: ['$purchase', '$expenses'] } },
          },
        },
        // Calculate profit and derived metrics
        {
          $addFields: {
            totalProfit: {
              $subtract: ['$sales', { $add: ['$purchase', '$expenses'] }],
            },
            totalCost: { $add: ['$purchase', '$expenses'] },
            avgCost: {
              $avg: {
                $map: {
                  input: '$costs',
                  as: 'cost',
                  in: '$$cost',
                },
              },
            },
            costVariance: {
              $stdDevPop: {
                $map: {
                  input: '$costs',
                  as: 'cost',
                  in: '$$cost',
                },
              },
            },
          },
        },
        // Lookup transporter details
        {
          $lookup: {
            from: 'parties',
            localField: '_id',
            foreignField: '_id',
            as: 'transporterData',
          },
        },
        {
          $unwind: {
            path: '$transporterData',
            preserveNullAndEmptyArrays: true,
          },
        },
        // Calculate derived metrics
        {
          $project: {
            transporterId: '$_id',
            transporterName: {
              $ifNull: ['$transporterData.name', 'Unknown Transporter'],
            },
            transporterCity: { $ifNull: ['$transporterData.city', ''] },
            orderCount: 1,
            totalSales: '$sales',
            totalCost: 1,
            totalProfit: 1,
            avgCost: 1,
            costVariance: 1,
            profitMargin: {
              $cond: [
                { $eq: ['$sales', 0] },
                0,
                {
                  $multiply: [{ $divide: ['$totalProfit', '$sales'] }, 100],
                },
              ],
            },
            // Document completion rates
            lrCompletionRate: {
              $cond: [
                { $eq: ['$orderCount', 0] },
                0,
                {
                  $multiply: [{ $divide: ['$ordersWithDeliveries', '$orderCount'] }, 100],
                },
              ],
            },
            invoiceCompletionRate: {
              $cond: [
                { $eq: ['$orderCount', 0] },
                0,
                {
                  $multiply: [
                    { $divide: ['$ordersWithInvoice', '$orderCount'] },
                    100,
                  ],
                },
              ],
            },
            // Tenure calculation
            monthsActive: {
              $divide: [
                { $subtract: [new Date(), '$firstOrderDate'] },
                1000 * 60 * 60 * 24 * 30,
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
        {
          $sort: { orderCount: -1 },
        },
      ]).exec();

      // TENURE FIX: Get ALL-TIME first order dates (not filtered by date)
      const allTimeFirstOrders = await Order.aggregate([
        {
          $match: {
            account: new mongoose.Types.ObjectId(account),
            ...(organisation && { organisation: new mongoose.Types.ObjectId(organisation) }),
          },
        },
        {
          $group: {
            _id: '$transporter',
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

      // Update tenure with all-time data
      const transporterDataCorrected = transporterData.map(t => {
        const transporterId = t.transporterId?.toString();  // Safe navigation
        const firstOrder = transporterId ? firstOrderMap.get(transporterId) : null;
        return {
          ...t,
          monthsActive: firstOrder
            ? (new Date() - new Date(firstOrder)) / (1000 * 60 * 60 * 24 * 30)
            : t.monthsActive,
        };
      });

      // Calculate market average cost
      const marketAvgCost =
        transporterDataCorrected.length > 0
          ? transporterDataCorrected.reduce((sum, t) => sum + t.avgCost, 0) /
            transporterDataCorrected.length
          : 0;

      // Calculate scores
      const maxOrderCount = Math.max(
        ...transporterDataCorrected.map((t) => t.orderCount),
        1
      );

      const scoredTransporters = transporterDataCorrected.map((transporter) => {
        // Volume Score (40%)
        const volumeScore = (transporter.orderCount / maxOrderCount) * 40;

        // Reliability Score (30%)
        const docCompletionRate =
          (transporter.lrCompletionRate + transporter.invoiceCompletionRate) / 2;
        const costConsistency =
          100 -
          Math.min(
            (transporter.costVariance / (transporter.avgCost || 1)) * 100,
            100
          );
        const reliabilityScore = (docCompletionRate * 0.5 + costConsistency * 0.5) * 0.3;

        // Cost Competitiveness (20%)
        let costCompetitivenessScore = 0;
        if (marketAvgCost > 0) {
          const costDifference =
            ((marketAvgCost - transporter.avgCost) / marketAvgCost) * 100;
          // Lower cost gets higher score, but capped at 20
          costCompetitivenessScore = Math.min(Math.max(costDifference, -20), 20);
        }

        // Tenure Score (10%)
        const tenureScore = Math.min((transporter.monthsActive / 24) * 10, 10);

        const partnershipScore =
          volumeScore + reliabilityScore + costCompetitivenessScore + tenureScore;

        // Determine tier
        let partnershipTier;
        if (partnershipScore >= 90) partnershipTier = 'strategic';
        else if (partnershipScore >= 75) partnershipTier = 'reliable';
        else if (partnershipScore >= 60) partnershipTier = 'growing';
        else if (partnershipScore >= 40) partnershipTier = 'conditional';
        else partnershipTier = 'at-risk';

        // Risk flags
        const riskFlags = [];
        if (transporter.lrCompletionRate < 70) riskFlags.push('poor_documentation');
        if (transporter.costVariance > transporter.avgCost * 0.3)
          riskFlags.push('inconsistent_pricing');
        if (transporter.profitMargin < 5) riskFlags.push('low_profitability');
        if (transporter.daysSinceLastOrder > 60) riskFlags.push('inactive');

        return {
          ...transporter,
          partnershipScore: Math.round(partnershipScore),
          scoreBreakdown: {
            volumeScore: Math.round(volumeScore),
            reliabilityScore: Math.round(reliabilityScore),
            costCompetitivenessScore: Math.round(costCompetitivenessScore),
            tenureScore: Math.round(tenureScore),
          },
          partnershipTier,
          docCompletionRate: Math.round(docCompletionRate),
          costConsistency: Math.round(costConsistency),
          riskFlags,
        };
      });

      // Sort by partnership score
      scoredTransporters.sort((a, b) => b.partnershipScore - a.partnershipScore);

      // Calculate summary
      const summary = {
        strategicCount: scoredTransporters.filter(
          (t) => t.partnershipTier === 'strategic'
        ).length,
        reliableCount: scoredTransporters.filter(
          (t) => t.partnershipTier === 'reliable'
        ).length,
        growingCount: scoredTransporters.filter(
          (t) => t.partnershipTier === 'growing'
        ).length,
        conditionalCount: scoredTransporters.filter(
          (t) => t.partnershipTier === 'conditional'
        ).length,
        atRiskCount: scoredTransporters.filter(
          (t) => t.partnershipTier === 'at-risk'
        ).length,
        avgPartnershipScore:
          scoredTransporters.length > 0
            ? Math.round(
                scoredTransporters.reduce((sum, t) => sum + t.partnershipScore, 0) /
                  scoredTransporters.length
              )
            : 0,
        marketAvgCost: Math.round(marketAvgCost),
      };

      return res.status(200).json({
        transporters: scoredTransporters,
        summary,
      });
    } catch (error) {
      console.error('[Analytics API - Transporter Scoring Error]:', error);
      return res.status(500).json({
        message: 'Failed to fetch transporter scoring',
        error: error.message,
      });
    }
  });
}
