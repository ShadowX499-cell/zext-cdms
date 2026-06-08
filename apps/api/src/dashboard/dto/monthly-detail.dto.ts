export class MonthlyDetailDto {
  label: string;
  yearMonth: string;

  metrics: {
    totalRevenue: number;
    grossProfit: number;
    totalSold: number;
    totalRegistered: number;
  };

  dailySales: Array<{
    day: number;
    revenue: number;
    count: number;
  }>;

  byCategory: Array<{
    category: string;
    soldCount: number;
    registeredCount: number;
    revenue: number;
  }>;

  byModeOfSale: Array<{
    mode: string;
    count: number;
    revenue: number;
  }>;

  topSales: Array<{
    id: string;
    vehicleName: string;
    buyerName: string;
    sellingPrice: number;
    dateSold: string;
    receiptId: string;
  }>;
}
