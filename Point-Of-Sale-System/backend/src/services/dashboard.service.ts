import pool from '../config/db.js';

export class DashboardService {
  static async getTargetMetrics() {
    // 1. Get monthly target from settings
    const settingsRes = await pool.query("SELECT value FROM settings WHERE key = 'monthly_sales_target'");
    const monthlyTarget = (settingsRes.rowCount && settingsRes.rowCount > 0) ? Number(settingsRes.rows[0].value) : 150000;

    // 2. Determine dates
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const currentDay = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 3. Get total sales for the month up to today
    const currentMonthSalesRes = await pool.query(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM bills WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) AND payment_status != 'cancelled'"
    );
    const currentMonthSales = Number(currentMonthSalesRes.rows[0].total);

    // Get today's sales
    const todaySalesRes = await pool.query(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM bills WHERE DATE(created_at) = CURRENT_DATE AND payment_status != 'cancelled'"
    );
    const todaySales = Number(todaySalesRes.rows[0].total);

    // Get yesterday's sales
    const yesterdaySalesRes = await pool.query(
      "SELECT COALESCE(SUM(grand_total), 0) as total FROM bills WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day' AND payment_status != 'cancelled'"
    );
    const yesterdaySales = Number(yesterdaySalesRes.rows[0].total);

    // 4. Calculate daily cumulative sales using DB grouping
    const dailySumsRes = await pool.query(
      "SELECT EXTRACT(DAY FROM created_at) as day, SUM(grand_total) as total FROM bills WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) AND payment_status != 'cancelled' GROUP BY day"
    );
    const dailySalesMap: Record<number, number> = {};
    for (const row of dailySumsRes.rows) {
      dailySalesMap[Number(row.day)] = Number(row.total);
    }

    const getCumulativeSalesUpToDay = (targetDay: number) => {
      let sum = 0;
      for (let i = 1; i <= targetDay; i++) {
        sum += (dailySalesMap[i] || 0);
      }
      return sum;
    };

    // Calculate dynamic targets
    
    // Yesterday
    let yesterdayTarget = 0;
    let yesterdayStatus = 'N/A';
    let yesterdayActual = yesterdaySales; 
    
    if (currentDay > 1) {
      const priorToYesterday = getCumulativeSalesUpToDay(currentDay - 2);
      yesterdayTarget = (monthlyTarget - priorToYesterday) / (daysInMonth - (currentDay - 1) + 1);
      yesterdayStatus = yesterdayActual >= yesterdayTarget ? '✅' : '❌';
    } else {
      const lastMonth = new Date(year, month, 0);
      const lastMonthSalesRes = await pool.query(
        "SELECT COALESCE(SUM(grand_total), 0) as total FROM bills WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND created_at < DATE_TRUNC('month', CURRENT_DATE) AND payment_status != 'cancelled'"
      );
      const lastMonthSales = Number(lastMonthSalesRes.rows[0].total);
      const priorToLastDay = lastMonthSales - yesterdayActual;
      yesterdayTarget = (monthlyTarget - priorToLastDay) / 1;
      yesterdayStatus = yesterdayActual >= yesterdayTarget ? '✅' : '❌';
    }

    // Today
    const priorToToday = currentDay === 1 ? 0 : getCumulativeSalesUpToDay(currentDay - 1);
    const todayTarget = (monthlyTarget - priorToToday) / (daysInMonth - currentDay + 1);
    const todayStatus = todaySales >= todayTarget ? '✅' : 'In Progress';

    // Tomorrow
    let tomorrowTarget = 0;
    let tomorrowStatus = 'Upcoming';
    if (currentDay < daysInMonth) {
      const priorToTomorrow = currentMonthSales; 
      tomorrowTarget = (monthlyTarget - priorToTomorrow) / (daysInMonth - currentDay);
    } else {
      const daysInNextMonth = new Date(year, month + 2, 0).getDate();
      tomorrowTarget = monthlyTarget / daysInNextMonth;
    }

    const remainingSales = Math.max(0, monthlyTarget - currentMonthSales);
    const daysRemaining = daysInMonth - currentDay; 
    
    let requiredDailySales = 0;
    if (daysRemaining > 0) {
      requiredDailySales = remainingSales / daysRemaining;
    } else {
      requiredDailySales = remainingSales;
    }

    const progressPercentage = Math.min(100, (currentMonthSales / monthlyTarget) * 100);
    const estimatedMonthEndSales = currentDay === 0 ? 0 : (currentMonthSales / currentDay) * daysInMonth;
    let targetStatus = 'Behind';
    if (currentMonthSales >= monthlyTarget) {
      targetStatus = 'Achieved';
    } else if (estimatedMonthEndSales >= monthlyTarget) {
      targetStatus = 'On Track';
    }

    return {
      monthlyTarget,
      currentMonthSales,
      remainingSales,
      daysRemaining,
      requiredDailySales,
      progressPercentage,
      estimatedMonthEndSales,
      targetStatus,
      todaySales,
      todayTarget,
      projection: {
        yesterday: { target: yesterdayTarget, actual: yesterdayActual, status: yesterdayStatus },
        today: { target: todayTarget, actual: todaySales, status: todayStatus },
        tomorrow: { target: tomorrowTarget, actual: null, status: tomorrowStatus }
      }
    };
  }
}
