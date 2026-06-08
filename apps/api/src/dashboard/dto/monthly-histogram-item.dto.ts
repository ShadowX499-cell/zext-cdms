export class MonthlyHistogramItemDto {
  month: string;        // display label e.g. "Jun '25"
  year: number;
  monthNum: number;     // 1–12
  revenue: number;
  soldCount: number;
  registeredCount: number;
}
