# Phase 8: Executive Summary & Automated Reporting (Part 3 of 4)

## 8.3 Scheduled Reports & Automated Delivery

### Purpose
Automate report generation and delivery via email with PDF/Excel attachments

### 8.3.1 Report Scheduler Service

**Implementation:** Background job service using cron or scheduled tasks

```javascript
// /lib/reportScheduler.js

import dbConnect from './dbConnect';
import ReportTemplate from '../models/ReportTemplate';
import { executeScheduledReport } from './reportExecutor';
import { sendReportEmail } from './emailService';
import { generatePDF, generateExcel } from './reportGenerator';
import { calculateNextRunDate } from '../helper/reportUtils';

export async function runScheduledReports() {
  await dbConnect();
  
  try {
    // Find all reports due to run
    const now = new Date();
    const dueReports = await ReportTemplate.find({
      'schedule.enabled': true,
      'schedule.nextRun': { $lte: now },
      isActive: true
    }).populate('createdBy');
    
    console.log(`Found ${dueReports.length} reports due to run`);
    
    for (const template of dueReports) {
      try {
        await processScheduledReport(template);
        
        // Update last run and calculate next run
        template.schedule.lastRun = now;
        template.schedule.nextRun = calculateNextRunDate(template.schedule);
        await template.save();
        
        console.log(`Successfully processed report: ${template.name}`);
      } catch (error) {
        console.error(`Failed to process report ${template.name}:`, error);
        // Continue with other reports even if one fails
      }
    }
    
    return { success: true, processed: dueReports.length };
  } catch (error) {
    console.error('Report scheduler error:', error);
    throw error;
  }
}

async function processScheduledReport(template) {
  // Execute the report
  const reportData = await executeScheduledReport(template);
  
  // Generate file based on format
  let attachment;
  if (template.schedule.format === 'pdf') {
    attachment = await generatePDF(template, reportData);
  } else if (template.schedule.format === 'excel') {
    attachment = await generateExcel(template, reportData);
  }
  
  // Send email to all recipients
  for (const recipient of template.schedule.recipients) {
    await sendReportEmail(
      recipient,
      template,
      reportData,
      attachment
    );
  }
}
```

---

### 8.3.2 Report Executor Service

```javascript
// /lib/reportExecutor.js

import Order from '../models/Order';
import { calculateReportDateRange } from '../helper/reportUtils';

export async function executeScheduledReport(template) {
  const dateRange = calculateReportDateRange(template.configuration.dateRange);
  
  // Build filters from template configuration
  const filters = {
    saleDate: { $gte: dateRange.start, $lte: dateRange.end }
  };
  
  if (template.configuration.filters.organisations?.length > 0) {
    filters.$or = [
      { organisation: { $in: template.configuration.filters.organisations } },
      { 'vehicle.organisation': { $in: template.configuration.filters.organisations } }
    ];
  }
  
  if (template.configuration.filters.customers?.length > 0) {
    filters.customer = { $in: template.configuration.filters.customers };
  }
  
  // Execute based on report type
  let data;
  switch (template.reportType) {
    case 'financial':
      data = await executeFinancialReport(filters, template.configuration);
      break;
    case 'operational':
      data = await executeOperationalReport(filters, template.configuration);
      break;
    case 'customer':
      data = await executeCustomerReport(filters, template.configuration);
      break;
    case 'route':
      data = await executeRouteReport(filters, template.configuration);
      break;
    case 'fleet':
      data = await executeFleetReport(filters, template.configuration);
      break;
    default:
      throw new Error(`Unknown report type: ${template.reportType}`);
  }
  
  return {
    template: {
      id: template._id,
      name: template.name,
      description: template.description
    },
    dateRange,
    data,
    generatedAt: new Date()
  };
}

async function executeFinancialReport(filters, config) {
  const pipeline = [
    { $match: filters },
    { $unwind: '$deliveries' },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$deliveries.saleAmount' },
        totalExpense: { $sum: '$deliveries.totalExpense' },
        totalProfit: {
          $sum: { $subtract: ['$deliveries.saleAmount', '$deliveries.totalExpense'] }
        },
        orderCount: { $sum: 1 },
        avgOrderValue: { $avg: '$deliveries.saleAmount' }
      }
    },
    {
      $project: {
        totalRevenue: 1,
        totalExpense: 1,
        totalProfit: 1,
        profitMargin: {
          $multiply: [
            { $divide: ['$totalProfit', '$totalRevenue'] },
            100
          ]
        },
        orderCount: 1,
        avgOrderValue: 1
      }
    }
  ];
  
  const result = await Order.aggregate(pipeline);
  return result[0] || {
    totalRevenue: 0,
    totalExpense: 0,
    totalProfit: 0,
    profitMargin: 0,
    orderCount: 0,
    avgOrderValue: 0
  };
}

async function executeOperationalReport(filters, config) {
  const result = await Order.aggregate([
    { $match: filters },
    {
      $group: {
        _id: null,
        orderCount: { $sum: 1 },
        uniqueVehicles: { $addToSet: '$vehicle' },
        uniqueCustomers: { $addToSet: '$customer' },
        documentsWithLR: {
          $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$lrs', []] } }, 0] }, 1, 0] }
        },
        documentsWithInvoice: {
          $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$invoices', []] } }, 0] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        orderCount: 1,
        vehicleCount: { $size: '$uniqueVehicles' },
        customerCount: { $size: '$uniqueCustomers' },
        documentCompletionRate: {
          $multiply: [
            {
              $divide: [
                { $add: ['$documentsWithLR', '$documentsWithInvoice'] },
                { $multiply: ['$orderCount', 2] }
              ]
            },
            100
          ]
        }
      }
    }
  ]);
  
  return result[0] || {
    orderCount: 0,
    vehicleCount: 0,
    customerCount: 0,
    documentCompletionRate: 0
  };
}

async function executeCustomerReport(filters, config) {
  const customers = await Order.aggregate([
    { $match: filters },
    { $unwind: '$deliveries' },
    {
      $group: {
        _id: '$customer',
        orderCount: { $sum: 1 },
        totalRevenue: { $sum: '$deliveries.saleAmount' },
        lastOrderDate: { $max: '$saleDate' }
      }
    },
    {
      $lookup: {
        from: 'parties',
        localField: '_id',
        foreignField: '_id',
        as: 'customerInfo'
      }
    },
    { $unwind: '$customerInfo' },
    {
      $project: {
        customerName: '$customerInfo.name',
        orderCount: 1,
        totalRevenue: 1,
        avgOrderValue: { $divide: ['$totalRevenue', '$orderCount'] }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 20 }
  ]);
  
  return {
    topCustomers: customers,
    totalCustomers: customers.length,
    totalRevenue: customers.reduce((sum, c) => sum + c.totalRevenue, 0)
  };
}

async function executeRouteReport(filters, config) {
  const routes = await Order.aggregate([
    { $match: filters },
    { $unwind: '$deliveries' },
    {
      $group: {
        _id: {
          loading: '$deliveries.loading.city',
          unloading: '$deliveries.unloading.city'
        },
        orderCount: { $sum: 1 },
        totalRevenue: { $sum: '$deliveries.saleAmount' },
        totalExpense: { $sum: '$deliveries.totalExpense' }
      }
    },
    {
      $project: {
        route: {
          $concat: [
            { $ifNull: ['$_id.loading', 'Unknown'] },
            ' → ',
            { $ifNull: ['$_id.unloading', 'Unknown'] }
          ]
        },
        orderCount: 1,
        totalRevenue: 1,
        totalProfit: { $subtract: ['$totalRevenue', '$totalExpense'] },
        profitMargin: {
          $multiply: [
            { $divide: [{ $subtract: ['$totalRevenue', '$totalExpense'] }, '$totalRevenue'] },
            100
          ]
        }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 20 }
  ]);
  
  return {
    topRoutes: routes,
    totalRoutes: routes.length,
    totalRevenue: routes.reduce((sum, r) => sum + r.totalRevenue, 0)
  };
}

async function executeFleetReport(filters, config) {
  const vehicles = await Order.aggregate([
    { $match: filters },
    {
      $group: {
        _id: '$vehicle',
        orderCount: { $sum: 1 },
        totalRevenue: {
          $sum: {
            $reduce: {
              input: '$deliveries',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.saleAmount'] }
            }
          }
        }
      }
    },
    {
      $lookup: {
        from: 'vehicles',
        localField: '_id',
        foreignField: '_id',
        as: 'vehicleInfo'
      }
    },
    { $unwind: '$vehicleInfo' },
    {
      $project: {
        vehicleNumber: '$vehicleInfo.registrationNumber',
        orderCount: 1,
        totalRevenue: 1,
        avgRevenuePerTrip: { $divide: ['$totalRevenue', '$orderCount'] }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 20 }
  ]);
  
  return {
    topVehicles: vehicles,
    totalVehicles: vehicles.length,
    totalRevenue: vehicles.reduce((sum, v) => sum + v.totalRevenue, 0)
  };
}
```

---

### 8.3.3 PDF Generator

```javascript
// /lib/reportGenerator.js

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { formatMetricValue } from '../helper/reportUtils';

export async function generatePDF(template, reportData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const filename = `report_${template.name.replace(/\s/g, '_')}_${Date.now()}.pdf`;
      const filepath = path.join('/tmp', filename);
      const stream = fs.createWriteStream(filepath);
      
      doc.pipe(stream);
      
      // Header
      doc.fontSize(20).text(template.name, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
      doc.moveDown(1);
      
      // Date Range
      if (reportData.dateRange) {
        doc.fontSize(12).text(
          `Period: ${reportData.dateRange.start.toLocaleDateString('en-IN')} to ${reportData.dateRange.end.toLocaleDateString('en-IN')}`,
          { align: 'center' }
        );
        doc.moveDown(1);
      }
      
      // Draw horizontal line
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);
      
      // Content based on report type
      switch (template.reportType) {
        case 'financial':
          addFinancialContent(doc, reportData.data);
          break;
        case 'operational':
          addOperationalContent(doc, reportData.data);
          break;
        case 'customer':
          addCustomerContent(doc, reportData.data);
          break;
        case 'route':
          addRouteContent(doc, reportData.data);
          break;
        case 'fleet':
          addFleetContent(doc, reportData.data);
          break;
      }
      
      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
          .text(
            `Page ${i + 1} of ${pages.count}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
          );
      }
      
      doc.end();
      
      stream.on('finish', () => {
        resolve({
          filename,
          filepath,
          contentType: 'application/pdf'
        });
      });
      
      stream.on('error', reject);
      
    } catch (error) {
      reject(error);
    }
  });
}

function addFinancialContent(doc, data) {
  doc.fontSize(16).text('Financial Summary', { underline: true });
  doc.moveDown(0.5);
  
  const metrics = [
    { label: 'Total Revenue', value: formatMetricValue(data.totalRevenue, 'currency') },
    { label: 'Total Expense', value: formatMetricValue(data.totalExpense, 'currency') },
    { label: 'Total Profit', value: formatMetricValue(data.totalProfit, 'currency') },
    { label: 'Profit Margin', value: formatMetricValue(data.profitMargin, 'percentage') },
    { label: 'Total Orders', value: formatMetricValue(data.orderCount, 'number') },
    { label: 'Avg Order Value', value: formatMetricValue(data.avgOrderValue, 'currency') }
  ];
  
  metrics.forEach(metric => {
    doc.fontSize(12).text(`${metric.label}:`, { continued: true });
    doc.text(` ${metric.value}`, { align: 'right' });
    doc.moveDown(0.3);
  });
}

function addOperationalContent(doc, data) {
  doc.fontSize(16).text('Operational Summary', { underline: true });
  doc.moveDown(0.5);
  
  const metrics = [
    { label: 'Total Orders', value: data.orderCount },
    { label: 'Active Vehicles', value: data.vehicleCount },
    { label: 'Active Customers', value: data.customerCount },
    { label: 'Document Completion', value: `${data.documentCompletionRate.toFixed(1)}%` }
  ];
  
  metrics.forEach(metric => {
    doc.fontSize(12).text(`${metric.label}:`, { continued: true });
    doc.text(` ${metric.value}`, { align: 'right' });
    doc.moveDown(0.3);
  });
}

function addCustomerContent(doc, data) {
  doc.fontSize(16).text('Customer Report', { underline: true });
  doc.moveDown(0.5);
  
  doc.fontSize(12).text(`Total Customers: ${data.totalCustomers}`);
  doc.text(`Total Revenue: ${formatMetricValue(data.totalRevenue, 'currency')}`);
  doc.moveDown(1);
  
  doc.fontSize(14).text('Top Customers', { underline: true });
  doc.moveDown(0.5);
  
  // Table headers
  const tableTop = doc.y;
  const col1 = 50;
  const col2 = 250;
  const col3 = 350;
  const col4 = 450;
  
  doc.fontSize(10).text('Customer', col1, tableTop);
  doc.text('Orders', col2, tableTop);
  doc.text('Revenue', col3, tableTop);
  doc.text('Avg Order', col4, tableTop);
  
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.3);
  
  // Table rows
  data.topCustomers.slice(0, 15).forEach((customer, i) => {
    if (doc.y > 700) {
      doc.addPage();
      doc.y = 50;
    }
    
    const y = doc.y;
    doc.fontSize(9)
      .text(customer.customerName.substring(0, 30), col1, y)
      .text(customer.orderCount.toString(), col2, y)
      .text(formatMetricValue(customer.totalRevenue, 'currency'), col3, y)
      .text(formatMetricValue(customer.avgOrderValue, 'currency'), col4, y);
    doc.moveDown(0.5);
  });
}

function addRouteContent(doc, data) {
  doc.fontSize(16).text('Route Performance Report', { underline: true });
  doc.moveDown(0.5);
  
  doc.fontSize(12).text(`Total Routes: ${data.totalRoutes}`);
  doc.text(`Total Revenue: ${formatMetricValue(data.totalRevenue, 'currency')}`);
  doc.moveDown(1);
  
  doc.fontSize(14).text('Top Routes', { underline: true });
  doc.moveDown(0.5);
  
  // Table
  const col1 = 50;
  const col2 = 250;
  const col3 = 330;
  const col4 = 420;
  const col5 = 490;
  
  const tableTop = doc.y;
  doc.fontSize(10)
    .text('Route', col1, tableTop)
    .text('Orders', col2, tableTop)
    .text('Revenue', col3, tableTop)
    .text('Profit', col4, tableTop)
    .text('Margin', col5, tableTop);
  
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.3);
  
  data.topRoutes.slice(0, 15).forEach((route, i) => {
    if (doc.y > 700) {
      doc.addPage();
      doc.y = 50;
    }
    
    const y = doc.y;
    doc.fontSize(9)
      .text(route.route.substring(0, 25), col1, y)
      .text(route.orderCount.toString(), col2, y)
      .text(formatMetricValue(route.totalRevenue, 'currency'), col3, y)
      .text(formatMetricValue(route.totalProfit, 'currency'), col4, y)
      .text(`${route.profitMargin.toFixed(1)}%`, col5, y);
    doc.moveDown(0.5);
  });
}

function addFleetContent(doc, data) {
  doc.fontSize(16).text('Fleet Performance Report', { underline: true });
  doc.moveDown(0.5);
  
  doc.fontSize(12).text(`Total Vehicles: ${data.totalVehicles}`);
  doc.text(`Total Revenue: ${formatMetricValue(data.totalRevenue, 'currency')}`);
  doc.moveDown(1);
  
  doc.fontSize(14).text('Top Vehicles', { underline: true });
  doc.moveDown(0.5);
  
  // Table
  const col1 = 50;
  const col2 = 200;
  const col3 = 320;
  const col4 = 450;
  
  const tableTop = doc.y;
  doc.fontSize(10)
    .text('Vehicle', col1, tableTop)
    .text('Orders', col2, tableTop)
    .text('Revenue', col3, tableTop)
    .text('Avg/Trip', col4, tableTop);
  
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.3);
  
  data.topVehicles.slice(0, 15).forEach((vehicle, i) => {
    if (doc.y > 700) {
      doc.addPage();
      doc.y = 50;
    }
    
    const y = doc.y;
    doc.fontSize(9)
      .text(vehicle.vehicleNumber, col1, y)
      .text(vehicle.orderCount.toString(), col2, y)
      .text(formatMetricValue(vehicle.totalRevenue, 'currency'), col3, y)
      .text(formatMetricValue(vehicle.avgRevenuePerTrip, 'currency'), col4, y);
    doc.moveDown(0.5);
  });
}

export async function generateExcel(template, reportData) {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');
  
  // Set column widths
  worksheet.columns = [
    { width: 30 },
    { width: 15 },
    { width: 15 },
    { width: 15 }
  ];
  
  // Title
  worksheet.mergeCells('A1:D1');
  worksheet.getCell('A1').value = template.name;
  worksheet.getCell('A1').font = { size: 16, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };
  
  // Date
  worksheet.mergeCells('A2:D2');
  worksheet.getCell('A2').value = `Generated: ${new Date().toLocaleString('en-IN')}`;
  worksheet.getCell('A2').alignment = { horizontal: 'center' };
  
  // Date range
  if (reportData.dateRange) {
    worksheet.mergeCells('A3:D3');
    worksheet.getCell('A3').value = `Period: ${reportData.dateRange.start.toLocaleDateString('en-IN')} to ${reportData.dateRange.end.toLocaleDateString('en-IN')}`;
    worksheet.getCell('A3').alignment = { horizontal: 'center' };
  }
  
  let currentRow = 5;
  
  // Content based on report type
  switch (template.reportType) {
    case 'financial':
      currentRow = addFinancialExcelContent(worksheet, reportData.data, currentRow);
      break;
    case 'operational':
      currentRow = addOperationalExcelContent(worksheet, reportData.data, currentRow);
      break;
    case 'customer':
      currentRow = addCustomerExcelContent(worksheet, reportData.data, currentRow);
      break;
    case 'route':
      currentRow = addRouteExcelContent(worksheet, reportData.data, currentRow);
      break;
    case 'fleet':
      currentRow = addFleetExcelContent(worksheet, reportData.data, currentRow);
      break;
  }
  
  const filename = `report_${template.name.replace(/\s/g, '_')}_${Date.now()}.xlsx`;
  const filepath = path.join('/tmp', filename);
  
  await workbook.xlsx.writeFile(filepath);
  
  return {
    filename,
    filepath,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
}

function addFinancialExcelContent(worksheet, data, startRow) {
  worksheet.getCell(`A${startRow}`).value = 'Financial Summary';
  worksheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };
  startRow += 2;
  
  const metrics = [
    ['Total Revenue', formatMetricValue(data.totalRevenue, 'currency')],
    ['Total Expense', formatMetricValue(data.totalExpense, 'currency')],
    ['Total Profit', formatMetricValue(data.totalProfit, 'currency')],
    ['Profit Margin', formatMetricValue(data.profitMargin, 'percentage')],
    ['Total Orders', data.orderCount],
    ['Avg Order Value', formatMetricValue(data.avgOrderValue, 'currency')]
  ];
  
  metrics.forEach(([label, value]) => {
    worksheet.getCell(`A${startRow}`).value = label;
    worksheet.getCell(`B${startRow}`).value = value;
    worksheet.getCell(`A${startRow}`).font = { bold: true };
    startRow++;
  });
  
  return startRow;
}

function addOperationalExcelContent(worksheet, data, startRow) {
  worksheet.getCell(`A${startRow}`).value = 'Operational Summary';
  worksheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };
  startRow += 2;
  
  const metrics = [
    ['Total Orders', data.orderCount],
    ['Active Vehicles', data.vehicleCount],
    ['Active Customers', data.customerCount],
    ['Document Completion', `${data.documentCompletionRate.toFixed(1)}%`]
  ];
  
  metrics.forEach(([label, value]) => {
    worksheet.getCell(`A${startRow}`).value = label;
    worksheet.getCell(`B${startRow}`).value = value;
    worksheet.getCell(`A${startRow}`).font = { bold: true };
    startRow++;
  });
  
  return startRow;
}

function addCustomerExcelContent(worksheet, data, startRow) {
  worksheet.getCell(`A${startRow}`).value = 'Customer Report';
  worksheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };
  startRow += 2;
  
  // Headers
  const headers = ['Customer Name', 'Orders', 'Total Revenue', 'Avg Order Value'];
  headers.forEach((header, i) => {
    const cell = worksheet.getCell(startRow, i + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  });
  startRow++;
  
  // Data rows
  data.topCustomers.forEach(customer => {
    worksheet.getCell(`A${startRow}`).value = customer.customerName;
    worksheet.getCell(`B${startRow}`).value = customer.orderCount;
    worksheet.getCell(`C${startRow}`).value = formatMetricValue(customer.totalRevenue, 'currency');
    worksheet.getCell(`D${startRow}`).value = formatMetricValue(customer.avgOrderValue, 'currency');
    startRow++;
  });
  
  return startRow;
}

function addRouteExcelContent(worksheet, data, startRow) {
  worksheet.getCell(`A${startRow}`).value = 'Route Performance';
  worksheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };
  startRow += 2;
  
  // Headers
  const headers = ['Route', 'Orders', 'Revenue', 'Profit', 'Margin %'];
  headers.forEach((header, i) => {
    const cell = worksheet.getCell(startRow, i + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  });
  startRow++;
  
  // Data rows
  data.topRoutes.forEach(route => {
    worksheet.getCell(`A${startRow}`).value = route.route;
    worksheet.getCell(`B${startRow}`).value = route.orderCount;
    worksheet.getCell(`C${startRow}`).value = formatMetricValue(route.totalRevenue, 'currency');
    worksheet.getCell(`D${startRow}`).value = formatMetricValue(route.totalProfit, 'currency');
    worksheet.getCell(`E${startRow}`).value = `${route.profitMargin.toFixed(1)}%`;
    startRow++;
  });
  
  return startRow;
}

function addFleetExcelContent(worksheet, data, startRow) {
  worksheet.getCell(`A${startRow}`).value = 'Fleet Performance';
  worksheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };
  startRow += 2;
  
  // Headers
  const headers = ['Vehicle', 'Orders', 'Total Revenue', 'Avg Per Trip'];
  headers.forEach((header, i) => {
    const cell = worksheet.getCell(startRow, i + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  });
  startRow++;
  
  // Data rows
  data.topVehicles.forEach(vehicle => {
    worksheet.getCell(`A${startRow}`).value = vehicle.vehicleNumber;
    worksheet.getCell(`B${startRow}`).value = vehicle.orderCount;
    worksheet.getCell(`C${startRow}`).value = formatMetricValue(vehicle.totalRevenue, 'currency');
    worksheet.getCell(`D${startRow}`).value = formatMetricValue(vehicle.avgRevenuePerTrip, 'currency');
    startRow++;
  });
  
  return startRow;
}
```

---

### 8.3.4 Email Service

```javascript
// /lib/emailService.js

import nodemailer from 'nodemailer';
import fs from 'fs';

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendReportEmail(recipient, template, reportData, attachment) {
  try {
    const subject = `${template.name} - ${new Date().toLocaleDateString('en-IN')}`;
    const htmlContent = generateEmailHTML(template, reportData);
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'reports@truckar.com',
      to: recipient.email,
      subject,
      html: htmlContent,
      attachments: attachment ? [
        {
          filename: attachment.filename,
          path: attachment.filepath,
          contentType: attachment.contentType
        }
      ] : []
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${recipient.email}: ${info.messageId}`);
    
    // Clean up attachment file
    if (attachment && fs.existsSync(attachment.filepath)) {
      fs.unlinkSync(attachment.filepath);
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

function generateEmailHTML(template, reportData) {
  const dateRangeText = reportData.dateRange
    ? `${reportData.dateRange.start.toLocaleDateString('en-IN')} to ${reportData.dateRange.end.toLocaleDateString('en-IN')}`
    : 'N/A';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .header {
          background-color: #1976d2;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
        }
        .summary-box {
          background-color: #f5f5f5;
          border-left: 4px solid #1976d2;
          padding: 15px;
          margin: 20px 0;
        }
        .metric {
          margin: 10px 0;
        }
        .metric-label {
          font-weight: bold;
          display: inline-block;
          width: 150px;
        }
        .footer {
          background-color: #f5f5f5;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${template.name}</h1>
        <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
      </div>
      
      <div class="content">
        <p>Dear User,</p>
        <p>Please find attached your scheduled report for the period: <strong>${dateRangeText}</strong></p>
        
        ${generateSummaryHTML(template.reportType, reportData.data)}
        
        <p>The complete report is attached to this email.</p>
        
        <p>Best regards,<br>Truckar Analytics Team</p>
      </div>
      
      <div class="footer">
        <p>This is an automated report. Please do not reply to this email.</p>
        <p>&copy; ${new Date().getFullYear()} Truckar. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

function generateSummaryHTML(reportType, data) {
  switch (reportType) {
    case 'financial':
      return `
        <div class="summary-box">
          <h3>Financial Summary</h3>
          <div class="metric">
            <span class="metric-label">Total Revenue:</span>
            ₹${(data.totalRevenue / 100000).toFixed(2)}L
          </div>
          <div class="metric">
            <span class="metric-label">Total Profit:</span>
            ₹${(data.totalProfit / 100000).toFixed(2)}L
          </div>
          <div class="metric">
            <span class="metric-label">Profit Margin:</span>
            ${data.profitMargin.toFixed(1)}%
          </div>
          <div class="metric">
            <span class="metric-label">Total Orders:</span>
            ${data.orderCount}
          </div>
        </div>
      `;
      
    case 'operational':
      return `
        <div class="summary-box">
          <h3>Operational Summary</h3>
          <div class="metric">
            <span class="metric-label">Total Orders:</span>
            ${data.orderCount}
          </div>
          <div class="metric">
            <span class="metric-label">Active Vehicles:</span>
            ${data.vehicleCount}
          </div>
          <div class="metric">
            <span class="metric-label">Active Customers:</span>
            ${data.customerCount}
          </div>
          <div class="metric">
            <span class="metric-label">Doc Completion:</span>
            ${data.documentCompletionRate.toFixed(1)}%
          </div>
        </div>
      `;
      
    case 'customer':
      return `
        <div class="summary-box">
          <h3>Customer Summary</h3>
          <div class="metric">
            <span class="metric-label">Total Customers:</span>
            ${data.totalCustomers}
          </div>
          <div class="metric">
            <span class="metric-label">Total Revenue:</span>
            ₹${(data.totalRevenue / 100000).toFixed(2)}L
          </div>
        </div>
      `;
      
    default:
      return '<div class="summary-box"><p>Report generated successfully.</p></div>';
  }
}
```

---

### 8.3.5 Schedule Management API

```javascript
// /pages/api/reports/schedule.js

import dbConnect from '../../../lib/dbConnect';
import ReportTemplate from '../../../models/ReportTemplate';
import { calculateNextRunDate } from '../../../helper/reportUtils';

export default async function handler(req, res) {
  await dbConnect();
  
  if (req.method === 'PUT') {
    // Update schedule for a template
    try {
      const { templateId, schedule } = req.body;
      
      const template = await ReportTemplate.findById(templateId);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      // Calculate next run if enabled
      if (schedule.enabled) {
        schedule.nextRun = calculateNextRunDate(schedule);
      }
      
      template.schedule = schedule;
      await template.save();
      
      res.status(200).json({
        message: 'Schedule updated successfully',
        schedule: template.schedule
      });
      
    } catch (error) {
      console.error('Update schedule error:', error);
      res.status(500).json({ message: 'Failed to update schedule', error: error.message });
    }
  }
  
  else if (req.method === 'POST') {
    // Trigger manual run of scheduled report
    try {
      const { templateId } = req.body;
      
      const template = await ReportTemplate.findById(templateId);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      // Import and execute
      const { processScheduledReport } = await import('../../../lib/reportScheduler');
      await processScheduledReport(template);
      
      res.status(200).json({ message: 'Report executed and sent successfully' });
      
    } catch (error) {
      console.error('Manual report run error:', error);
      res.status(500).json({ message: 'Failed to run report', error: error.message });
    }
  }
  
  else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
```

---

## End of Part 3

**Covered:**
- Report Scheduler Service with cron job support
- Report Executor Service for all report types
- PDF Generator with pdfkit (formatted reports with tables)
- Excel Generator with ExcelJS (spreadsheet export)
- Email Service with nodemailer
- HTML email templates
- Schedule Management API
- Attachment handling and cleanup

**Next Part:** Frontend Components (Executive Dashboard, Report Builder UI, Alert System)

**Lines:** ~1,460