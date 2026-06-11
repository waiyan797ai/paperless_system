import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

const POLL_MS = 8000

export function useFormRequestCounts(options = {}) {
  return useQuery({
    queryKey: queryKeys.formRequestCounts,
    queryFn: async () => {
      const { data } = await api.get('/form-requests/counts')
      return data.data || {}
    },
    refetchInterval: options.refetchInterval ?? POLL_MS,
    staleTime: 1000,
    ...options,
  })
}

export function useFormRequestsList({
  folder,
  page,
  search,
  formTemplateId,
  departmentId,
  sectionId,
  dateFrom,
  dateTo,
  pageSize = 10,
  enabled = true,
}) {
  return useQuery({
    queryKey: queryKeys.formRequests({
      folder,
      page,
      search,
      formTemplateId,
      departmentId,
      sectionId,
      dateFrom,
      dateTo,
      pageSize,
    }),
    queryFn: async () => {
      const { data } = await api.get('/form-requests', {
        params: {
          folder,
          page,
          per_page: pageSize,
          search: search || undefined,
          form_template_id: formTemplateId || undefined,
          target_department_id: departmentId || undefined,
          target_section_id: sectionId || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      })
      return {
        items: data.data?.data || [],
        totalPages: data.data?.last_page || 1,
        totalItems: data.data?.total || 0,
      }
    },
    enabled,
    refetchInterval: POLL_MS,
    staleTime: 1000,
    placeholderData: (prev) => prev,
  })
}

export function useFormRequestDetail(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.formRequest(id),
    queryFn: async () => {
      const { data } = await api.get(`/form-requests/${id}`)
      return data.data
    },
    enabled: Boolean(id),
    refetchInterval: options.refetchInterval ?? 8000,
    staleTime: 500,
    ...options,
  })
}

export function useInvalidateFormRequests() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['form-requests'] })
  }
}
