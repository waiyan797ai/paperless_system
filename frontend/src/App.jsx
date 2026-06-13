import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

function InterRequestRedirect() {
  const { id } = useParams()
  return <Navigate to={`/inter-memos/${id}`} replace />
}

import MainLayout from './components/layout/MainLayout'
import AuthLayout from './components/layout/AuthLayout'
import { ProtectedRoute, PublicRoute, DashboardRedirect } from './components/layout/ProtectedRoute'

import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ChangePassword from './pages/auth/ChangePassword'
import Profile from './pages/auth/Profile'

import Dashboard from './pages/dashboard/Dashboard'

import Departments from './pages/organization/Departments'
import Sections from './pages/organization/Sections'

import Users from './pages/users/Users'
import UserForm from './pages/users/UserForm'

import Policies from './pages/policies/Policies'
import PolicyDetail from './pages/policies/PolicyDetail'
import PolicyForm from './pages/policies/PolicyForm'
import PolicyTypes from './pages/policies/PolicyTypes'

import Requests from './pages/requests/Requests'
import FormTemplates from './pages/requests/FormTemplates'
import RequestForm from './pages/requests/RequestForm'
import RequestDetail from './pages/requests/RequestDetail'

import InterRequests from './pages/inter-requests/InterRequests'
import InterRequestForm from './pages/inter-requests/InterRequestForm'
import InterRequestDetail from './pages/inter-requests/InterRequestDetail'

import Documents from './pages/documents/Documents'
import DocumentDetail from './pages/documents/DocumentDetail'
import DocumentDistribution from './pages/documents/DocumentDistribution'
import DocumentTypes from './pages/documents/DocumentTypes'

import Notifications from './pages/notifications/Notifications'
import AuditLogs from './pages/audit/AuditLogs'
import Reports from './pages/reports/Reports'
import ReportDetail from './pages/reports/ReportDetail'
import RolePermissions from './pages/admin/RolePermissions'

function AppRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Auth routes */}
        <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route path="/dashboard/employee" element={<Dashboard />} />
          <Route path="/dashboard/approver" element={<Dashboard />} />
          <Route path="/dashboard/department" element={<Dashboard />} />
          <Route path="/dashboard/admin" element={<Dashboard />} />

          <Route path="/departments" element={<ProtectedRoute roles={['admin', 'department']}><Departments /></ProtectedRoute>} />
          <Route path="/sections" element={<ProtectedRoute roles={['admin', 'department']}><Sections /></ProtectedRoute>} />

          <Route path="/users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
          <Route path="/users/new" element={<ProtectedRoute roles={['admin']}><UserForm /></ProtectedRoute>} />
          <Route path="/users/:id/edit" element={<ProtectedRoute roles={['admin']}><UserForm /></ProtectedRoute>} />

          <Route path="/policies" element={<Policies />} />
          <Route path="/policy-types" element={<ProtectedRoute roles={['admin']}><PolicyTypes /></ProtectedRoute>} />
          <Route path="/policies/new" element={<ProtectedRoute permission="policies.manage"><PolicyForm /></ProtectedRoute>} />
          <Route path="/policies/:id/edit" element={<ProtectedRoute permission="policies.manage"><PolicyForm /></ProtectedRoute>} />
          <Route path="/policies/:id" element={<PolicyDetail />} />

          <Route path="/requests" element={<Requests />} />
          <Route path="/form-templates" element={<ProtectedRoute roles={['admin']}><FormTemplates /></ProtectedRoute>} />
          <Route path="/requests/new" element={<RequestForm />} />
          <Route path="/requests/:id/edit" element={<RequestForm />} />
          <Route path="/requests/:id" element={<RequestDetail />} />

          <Route path="/inter-memos" element={<InterRequests />} />
          <Route path="/inter-memos/new" element={<InterRequestForm />} />
          <Route path="/inter-memos/:id" element={<InterRequestDetail />} />
          <Route path="/inter-requests" element={<Navigate to="/inter-memos" replace />} />
          <Route path="/inter-requests/new" element={<Navigate to="/inter-memos/new" replace />} />
          <Route path="/inter-requests/:id" element={<InterRequestRedirect />} />

          <Route path="/documents/incoming" element={<Documents direction="incoming" />} />
          <Route path="/documents/outgoing" element={<ProtectedRoute roles={['admin', 'department']}><Documents direction="outgoing" /></ProtectedRoute>} />
          <Route path="/documents/outgoing/new" element={<ProtectedRoute roles={['admin', 'department']}><DocumentDistribution /></ProtectedRoute>} />
          <Route path="/documents" element={<Navigate to="/documents/incoming" replace />} />
          <Route path="/documents/distribution" element={<Navigate to="/documents/outgoing/new" replace />} />
          <Route path="/document-types" element={<ProtectedRoute roles={['admin', 'department']}><DocumentTypes /></ProtectedRoute>} />
          <Route path="/documents/:id" element={<DocumentDetail />} />

          <Route path="/notifications" element={<Notifications />} />
          <Route path="/audit-logs" element={<ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute roles={['admin', 'department']}><Reports /></ProtectedRoute>} />
          <Route path="/reports/:type" element={<ProtectedRoute roles={['admin', 'department']}><ReportDetail /></ProtectedRoute>} />
          <Route path="/role-permissions" element={<ProtectedRoute roles={['admin']}><RolePermissions /></ProtectedRoute>} />

          <Route path="/profile" element={<Profile />} />
          <Route path="/change-password" element={<ChangePassword />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return <AppRoutes />
}
