import { axiosClient } from './axiosClient'

export interface SalesRecord {
  OU_NAME: string
  YR: string
  SALE_VAL: number
  PEND_ORD_VAL: number
}

export interface SalesQuery {
  fromDate?: string
  toDate?: string
  region?: string
  limit?: number
  offset?: number
}

export interface SalesResponse {
  success: boolean
  data: SalesRecord[]
}

export async function getSales(query?: SalesQuery): Promise<SalesResponse> {
  const response = await axiosClient.get<SalesResponse>('/sales', {
    params: query,
  })

  return response.data
}
