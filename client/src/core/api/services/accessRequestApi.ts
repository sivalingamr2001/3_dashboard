import { axiosInstance } from "@/core/api";

/**
 * Access Request API Service
 * Provides methods for access request operations
 */

export interface AccessItem {
  accessItemId: number;
  folderPath: string;
  accessType: string;
  confirmAccessType: string;
  reason: string;
  status: string;
  expiresOn: string;
  createdBy: string;
  createdOn: string;
}

export interface AccessRequest {
  accessReqId: number;
  ticketNumber: string;
  reqTo: string;
  requestedBy: number;
  requesterEmail: string;
  department: string;
  isAgreed: boolean;
  itsrNo: string;
  status: string;
  accessItems: AccessItem[];
  createdBy: string;
  createdOn: string;
  modifiedBy?: string;
  modifiedOn?: string;
}

export interface CreateAccessRequestDto {
  reqTo: string;
  department: string;
  isAgreed: boolean;
  itsrNo: string;
  accessItems: Array<{
    folderPath: string;
    accessType: string;
    confirmAccessType: string;
    reason: string;
  }>;
}

export interface ApproveAccessItemRequestDto {
  approvalStatus: string;
  approvedBy?: string;
  approverComments?: string;
}

export const accessRequestApi = {
  /**
   * Get all access requests for current user
   */
  getAccessRequests: async () => {
    const response = await axiosInstance.get<AccessRequest[]>("/api/accessrequests");
    return response.data;
  },

  /**
   * Get access request by ID
   */
  getAccessRequestById: async (id: number) => {
    const response = await axiosInstance.get<AccessRequest>(`/api/accessrequests/${id}`);
    return response.data;
  },

  /**
   * Create a new access request
   */
  createAccessRequest: async (request: CreateAccessRequestDto) => {
    const response = await axiosInstance.post<AccessRequest>(
      "/api/accessrequests",
      request,
    );
    return response.data;
  },

  /**
   * Update access request
   */
  updateAccessRequest: async (id: number, request: CreateAccessRequestDto) => {
    const response = await axiosInstance.put<AccessRequest>(
      `/api/accessrequests/${id}`,
      request,
    );
    return response.data;
  },

  /**
   * Approve access item
   */
  approveAccessItem: async (
    requestId: number,
    itemId: number,
    approval: ApproveAccessItemRequestDto,
  ) => {
    const response = await axiosInstance.put(
      `/api/accessrequests/${requestId}/items/${itemId}/approve`,
      approval,
    );
    return response.data;
  },

  /**
   * Reject access item
   */
  rejectAccessItem: async (
    requestId: number,
    itemId: number,
    rejection: ApproveAccessItemRequestDto,
  ) => {
    const response = await axiosInstance.put(
      `/api/accessrequests/${requestId}/items/${itemId}/reject`,
      rejection,
    );
    return response.data;
  },

  /**
   * Delete access request (soft delete)
   */
  deleteAccessRequest: async (id: number) => {
    const response = await axiosInstance.delete(`/api/accessrequests/${id}`);
    return response.data;
  },
};
