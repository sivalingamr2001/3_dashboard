import oracledb from 'oracledb';
import { getConnection } from '../db/pool';
import { SALES_DATA_SQL, SALES_SUMMARY_SQL } from '../db/queries';

export interface SalesFilter {
  fromDate?: string;
  region?:   string;
}

export interface SaleRecord {
  OU_NAME:   string;
  YR:        string;
  SALE_VAL:  number;
}

export interface SummaryRecord {
  OU_NAME:      string;
  YR:           string;
  PEND_ORD_VAL: number;
}

export interface SalesResult {
  sales:   SaleRecord[];
  summary: SummaryRecord[];
}

const FETCH_ARRAY_SIZE = 200;
const PREFETCH_ROWS    = 201;

export async function fetchSales(filter: SalesFilter): Promise<SalesResult> {
  const conn = await getConnection();

  try {
    const targetDate = filter.fromDate ?? '2025-04-01';
    const targetRegion = filter.region ?? null;

    const dataBinds = {
      fromDate1: targetDate,
      region1:   targetRegion,
      region2:   targetRegion,
    };

    const summaryBinds = {
      fromDate2: targetDate,
      region3:   targetRegion,
      region4:   targetRegion,
    };

    const [dataResult, summaryResult] = await Promise.all([
      conn.execute<SaleRecord>(SALES_DATA_SQL, dataBinds, {
        outFormat:      oracledb.OUT_FORMAT_OBJECT,
        fetchArraySize: FETCH_ARRAY_SIZE,
        prefetchRows:   PREFETCH_ROWS,
      }),
      conn.execute<SummaryRecord>(SALES_SUMMARY_SQL, summaryBinds, { 
        outFormat: oracledb.OUT_FORMAT_OBJECT 
      }),
    ]);

    console.log('Data Query Binds:', dataResult.rows);
    console.log('Summary Query Binds:', summaryResult.rows);

    // Fallback safely to empty arrays if no rows returned
    return {
      sales:   dataResult.rows || [],      
      summary: summaryResult.rows || [],
    };
  } finally {
    await conn.close();
  }
}
