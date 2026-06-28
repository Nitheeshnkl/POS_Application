import api from './client';

export type ReportType = 'bills' | 'cashout' | 'investment' | 'purchases' | 'expenses' | 'profit-loss' | 'stock';

export const fetchExportData = async (
  reportType: ReportType,
  startDate?: string,
  endDate?: string,
  page: number = 1,
  limit: number = 1000
): Promise<any[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const { data } = await api.get(`/export/${reportType}?${params.toString()}`);
  return data;
};

// Utility to fetch all pages for a given report
export const fetchAllExportData = async (
  reportType: ReportType,
  startDate?: string,
  endDate?: string,
  onProgress?: (fetchedCount: number) => void
): Promise<any[]> => {
  let allData: any[] = [];
  let page = 1;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchExportData(reportType, startDate, endDate, page, limit);
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      if (onProgress) onProgress(allData.length);
      
      if (data.length < limit) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  return allData;
};
