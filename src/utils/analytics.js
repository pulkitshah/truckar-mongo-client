/**
 * Utility functions for analytics dashboard formatting and calculations
 */

/**
 * Format currency amount in Indian Rupees
 * @param {number} amount - Amount to format
 * @param {boolean} inLakhs - Format in Lakhs for large amounts (default: true)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, inLakhs = true) => {
  if (!amount || amount === 0) return "₹0";

  // Format in Lakhs for amounts >= 100,000
  if (inLakhs && Math.abs(amount) >= 100000) {
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(2)}L`;
  }

  // Format in standard Indian format with commas
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Calculate percentage change between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {string} Formatted percentage change with sign
 */
export const calculateChange = (current, previous) => {
  if (!previous || previous === 0) {
    return current > 0 ? "+100%" : "0%";
  }

  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
};

/**
 * Calculate numeric percentage change (without formatting)
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Percentage change as number
 */
export const calculateChangeNumeric = (current, previous) => {
  if (!previous || previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
};

/**
 * Determine trend direction
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {string} 'up', 'down', or 'stable'
 */
export const getTrend = (current, previous) => {
  if (!previous || !current) return "stable";

  const diff = current - previous;
  const threshold = previous * 0.01; // 1% threshold for "stable"

  if (Math.abs(diff) < threshold) return "stable";
  return current >= previous ? "up" : "down";
};

/**
 * Format number with Indian locale
 * @param {number} number - Number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number
 */
export const formatNumber = (number, decimals = 0) => {
  if (!number && number !== 0) return "0";

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(number);
};

/**
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (!value && value !== 0) return "0%";
  return `${value.toFixed(decimals)}%`;
};

/**
 * Calculate date range for given period
 * @param {string} period - Period type ('today', 'wtd', 'mtd', 'qtd', 'ytd')
 * @returns {object} Object with startDate and endDate
 */
export const calculateDateRange = (period) => {
  const now = new Date();
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  );
  let startDate;

  switch (period) {
    case "today":
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0
      );
      break;

    case "wtd": {
      // Week to date (Monday to today)
      const dayOfWeek = now.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0
      startDate = new Date(now);
      startDate.setDate(now.getDate() - daysFromMonday);
      startDate.setHours(0, 0, 0, 0);
      break;
    }

    case "mtd": // Month to date
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      break;

    case "qtd": {
      // Quarter to date (Indian fiscal year: Apr-Mar)
      const currentMonth = now.getMonth() + 1; // 1-12
      let quarterStartMonth;

      if (currentMonth >= 4 && currentMonth <= 6) {
        quarterStartMonth = 3; // Apr-Jun (Q1)
      } else if (currentMonth >= 7 && currentMonth <= 9) {
        quarterStartMonth = 6; // Jul-Sep (Q2)
      } else if (currentMonth >= 10 && currentMonth <= 12) {
        quarterStartMonth = 9; // Oct-Dec (Q3)
      } else {
        quarterStartMonth = 0; // Jan-Mar (Q4)
      }

      startDate = new Date(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0);
      break;
    }

    case "ytd": {
      // Year to date (Indian fiscal year: Apr-Mar)
      const fiscalYearStart =
        now.getMonth() >= 3
          ? new Date(now.getFullYear(), 3, 1, 0, 0, 0) // Apr 1 of current year
          : new Date(now.getFullYear() - 1, 3, 1, 0, 0, 0); // Apr 1 of previous year
      startDate = fiscalYearStart;
      break;
    }

    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  }

  return {
    startDate,
    endDate,
  };
};

/**
 * Calculate previous period date range for comparison
 * @param {Date} startDate - Start date of current period
 * @param {Date} endDate - End date of current period
 * @returns {object} Object with previousStartDate and previousEndDate
 */
export const getPreviousPeriod = (startDate, endDate) => {
  const periodDays =
    Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  const previousEndDate = new Date(startDate);
  previousEndDate.setDate(previousEndDate.getDate() - 1);
  previousEndDate.setHours(23, 59, 59, 999);

  const previousStartDate = new Date(previousEndDate);
  previousStartDate.setDate(previousStartDate.getDate() - periodDays + 1);
  previousStartDate.setHours(0, 0, 0, 0);

  return {
    previousStartDate,
    previousEndDate,
  };
};

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @param {boolean} includeTime - Include time in format (default: false)
 * @returns {string} Formatted date string
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return "-";

  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }

  return new Date(date).toLocaleDateString("en-IN", options);
};

/**
 * Calculate days between two dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date (default: today)
 * @returns {number} Number of days
 */
export const daysBetween = (date1, date2 = new Date()) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((new Date(date1) - new Date(date2)) / oneDay));
};

/**
 * Get color for metric based on trend
 * @param {string} trend - Trend direction ('up', 'down', 'stable')
 * @param {boolean} inverseGood - Whether down is good (e.g., expenses) (default: false)
 * @returns {string} Color code
 */
export const getTrendColor = (trend, inverseGood = false) => {
  if (trend === "stable") return "text.secondary";

  if (inverseGood) {
    return trend === "down" ? "success.main" : "error.main";
  }

  return trend === "up" ? "success.main" : "error.main";
};

/**
 * Get status color based on value and thresholds
 * @param {number} value - Value to check
 * @param {object} thresholds - Object with good/warning/critical thresholds
 * @returns {string} Color status ('success', 'warning', 'error', 'default')
 */
export const getStatusColor = (value, thresholds = {}) => {
  const { good, warning, critical } = thresholds;

  if (good !== undefined && value >= good) return "success";
  if (critical !== undefined && value <= critical) return "error";
  if (warning !== undefined && value <= warning) return "warning";

  return "default";
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length (default: 30)
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 30) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};
