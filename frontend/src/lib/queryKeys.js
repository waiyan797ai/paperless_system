export const queryKeys = {
  notifications: (params = {}) => ['notifications', params],
  notificationCount: ['notifications', 'unread-count'],
  formRequestCounts: ['form-requests', 'counts'],
  formRequests: (params = {}) => ['form-requests', 'list', params],
  formRequest: (id) => ['form-requests', 'detail', id],
  documents: (params = {}) => ['documents', 'list', params],
  documentDistributions: (params = {}) => ['documents', 'distributions', params],
  documentVersion: ['documents', 'version'],
}
