export const mockUsers = [
  { id: 1, name: 'Admin User', email: 'admin@office29.gov', role: 'admin', department: 'Administration', status: 'active' },
  { id: 2, name: 'Sarah Chen', email: 'sarah.chen@office29.gov', role: 'department', department: 'Finance', status: 'active' },
  { id: 3, name: 'James Wilson', email: 'james.w@office29.gov', role: 'approver', department: 'Operations', status: 'active' },
  { id: 4, name: 'Emily Davis', email: 'emily.d@office29.gov', role: 'employee', department: 'HR', status: 'active' },
]

export const mockDepartments = [
  { id: 1, name: 'Administration', code: 'ADM', head: 'Admin User', sections: 4, employees: 28, status: 'active' },
  { id: 2, name: 'Finance', code: 'FIN', head: 'Sarah Chen', sections: 3, employees: 45, status: 'active' },
  { id: 3, name: 'Operations', code: 'OPS', head: 'James Wilson', sections: 5, employees: 62, status: 'active' },
  { id: 4, name: 'Human Resources', code: 'HR', head: 'Emily Davis', sections: 2, employees: 18, status: 'active' },
]

export const mockSections = [
  { id: 1, name: 'Budget Planning', department: 'Finance', code: 'FIN-BP', head: 'Michael Lee', employees: 12, status: 'active' },
  { id: 2, name: 'Accounts Payable', department: 'Finance', code: 'FIN-AP', head: 'Lisa Park', employees: 8, status: 'active' },
  { id: 3, name: 'Logistics', department: 'Operations', code: 'OPS-LG', head: 'David Kim', employees: 20, status: 'active' },
]

export const mockPolicies = [
  { id: 1, title: 'Document Retention Policy', category: 'Compliance', version: '2.1', status: 'published', updatedAt: '2026-05-15' },
  { id: 2, title: 'Remote Work Guidelines', category: 'HR', version: '1.3', status: 'published', updatedAt: '2026-04-20' },
  { id: 3, title: 'Expense Approval Workflow', category: 'Finance', version: '3.0', status: 'draft', updatedAt: '2026-06-01' },
]

export const mockRequests = [
  { id: 'REQ-2026-001', title: 'Annual Leave Request', type: 'Leave', requester: 'Emily Davis', department: 'HR', status: 'pending', priority: 'normal', createdAt: '2026-06-05' },
  { id: 'REQ-2026-002', title: 'Equipment Purchase', type: 'Procurement', requester: 'David Kim', department: 'Operations', status: 'approved', priority: 'high', createdAt: '2026-06-03' },
  { id: 'REQ-2026-003', title: 'Budget Reallocation', type: 'Finance', requester: 'Sarah Chen', department: 'Finance', status: 'processing', priority: 'high', createdAt: '2026-06-01' },
]

export const mockInterRequests = [
  { id: 'INT-2026-001', title: 'Cross-dept Resource Sharing', fromDept: 'Operations', toDept: 'Finance', requester: 'James Wilson', status: 'pending', createdAt: '2026-06-04' },
  { id: 'INT-2026-002', title: 'Personnel Transfer Request', fromDept: 'HR', toDept: 'Administration', requester: 'Emily Davis', status: 'approved', createdAt: '2026-05-28' },
]

export const mockDocuments = [
  { id: 1, title: 'Q2 Financial Report', type: 'Report', department: 'Finance', author: 'Sarah Chen', status: 'published', size: '2.4 MB', updatedAt: '2026-06-02' },
  { id: 2, title: 'Safety Protocol Manual', type: 'Manual', department: 'Operations', author: 'James Wilson', status: 'published', size: '5.1 MB', updatedAt: '2026-05-20' },
  { id: 3, title: 'Employee Handbook 2026', type: 'Policy', department: 'HR', author: 'Emily Davis', status: 'draft', size: '1.8 MB', updatedAt: '2026-06-06' },
]

export const mockNotifications = [
  { id: 1, title: 'Request Approved', message: 'Your leave request REQ-2026-001 has been approved.', type: 'success', read: false, createdAt: '2026-06-06T10:30:00' },
  { id: 2, title: 'New Policy Published', message: 'Document Retention Policy v2.1 is now effective.', type: 'info', read: false, createdAt: '2026-06-05T14:00:00' },
  { id: 3, title: 'Pending Approval', message: '3 requests awaiting your review.', type: 'warning', read: true, createdAt: '2026-06-04T09:15:00' },
]

export const mockAuditLogs = [
  { id: 1, user: 'Admin User', action: 'CREATE', resource: 'User', details: 'Created user john.d@office29.gov', ip: '192.168.1.10', timestamp: '2026-06-06T11:00:00' },
  { id: 2, user: 'Sarah Chen', action: 'UPDATE', resource: 'Policy', details: 'Updated Expense Approval Workflow', ip: '192.168.1.25', timestamp: '2026-06-06T09:30:00' },
  { id: 3, user: 'James Wilson', action: 'APPROVE', resource: 'Request', details: 'Approved REQ-2026-002', ip: '192.168.1.18', timestamp: '2026-06-05T16:45:00' },
]

export const chartData = {
  requests: [
    { month: 'Jan', submitted: 45, approved: 38 },
    { month: 'Feb', submitted: 52, approved: 44 },
    { month: 'Mar', submitted: 48, approved: 41 },
    { month: 'Apr', submitted: 61, approved: 55 },
    { month: 'May', submitted: 55, approved: 48 },
    { month: 'Jun', submitted: 38, approved: 22 },
  ],
  departments: [
    { name: 'Finance', value: 45 },
    { name: 'Operations', value: 62 },
    { name: 'HR', value: 18 },
    { name: 'Administration', value: 28 },
  ],
}
