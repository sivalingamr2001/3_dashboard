import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  accessRequestApi,
  type AccessRequest,
  type CreateAccessRequestDto,
  type ApproveAccessItemRequestDto,
} from "@/core/api/services";

const ACCESS_REQUESTS_QUERY_KEY = ["accessRequests"] as const;

/**
 * Hook to fetch all access requests for current user
 */
export const useAccessRequests = () => {
  return useQuery({
    queryKey: ACCESS_REQUESTS_QUERY_KEY,
    queryFn: () => accessRequestApi.getAccessRequests(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};

/**
 * Hook to fetch a single access request
 */
export const useAccessRequest = (id: number | null) => {
  return useQuery({
    queryKey: [...ACCESS_REQUESTS_QUERY_KEY, id],
    queryFn: () => accessRequestApi.getAccessRequestById(id!),
    enabled: id !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to create a new access request
 */
export const useCreateAccessRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateAccessRequestDto) =>
      accessRequestApi.createAccessRequest(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ACCESS_REQUESTS_QUERY_KEY,
      });
    },
  });
};

/**
 * Hook to update an access request
 */
export const useUpdateAccessRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: CreateAccessRequestDto }) =>
      accessRequestApi.updateAccessRequest(id, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ACCESS_REQUESTS_QUERY_KEY,
      });
      queryClient.setQueryData([...ACCESS_REQUESTS_QUERY_KEY, data.accessReqId], data);
    },
  });
};

/**
 * Hook to approve an access item
 */
export const useApproveAccessItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      itemId,
      approval,
    }: {
      requestId: number;
      itemId: number;
      approval: ApproveAccessItemRequestDto;
    }) => accessRequestApi.approveAccessItem(requestId, itemId, approval),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ACCESS_REQUESTS_QUERY_KEY,
      });
    },
  });
};

/**
 * Hook to reject an access item
 */
export const useRejectAccessItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      itemId,
      rejection,
    }: {
      requestId: number;
      itemId: number;
      rejection: ApproveAccessItemRequestDto;
    }) => accessRequestApi.rejectAccessItem(requestId, itemId, rejection),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ACCESS_REQUESTS_QUERY_KEY,
      });
    },
  });
};

/**
 * Hook to delete an access request
 */
export const useDeleteAccessRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => accessRequestApi.deleteAccessRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ACCESS_REQUESTS_QUERY_KEY,
      });
    },
  });
};
