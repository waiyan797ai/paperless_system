import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'

import MainLayout from './components/layout/MainLayout'
import AuthLayout from './components/layout/AuthLayout'
import { ProtectedRoute, PublicRoute, DashboardRedirect } from './components/layout/ProtectedRoute'

import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ChangePassword from './pages/auth/ChangePassword'
import Profile from './pages/auth/Profile'

import EmployeeDashboard from './pages/dashboard/EmployeeDashboard'
import ApproverDashboard from './pages/dashboard/ApproverDashboard'
import DepartmentDashboard from './pages/dashboard/DepartmentDashboard'
import AdminDashboard from './pages/dashboard/AdminDashboard'

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
import DocumentForm from './pages/documents/DocumentForm'
import DocumentDistribution from './pages/documents/DocumentDistribution'

import Notifications from './pages/notifications/Notifications'
import AuditLogs from './pages/audit/AuditLogs'
import Reports from './pages/reports/Reports'
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
          <Route path="/dashboard/employee" element={<ProtectedRoute roles={['employee', 'admin']}><EmployeeDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/approver" element={<ProtectedRoute roles={['section', 'admin']}><DepartmentDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/department" element={<ProtectedRoute roles={['department', 'section', 'admin']}><DepartmentDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />

          <Route path="/departments" element={<ProtectedRoute roles={['admin', 'department']}><Departments /></ProtectedRoute>} />
          <Route path="/sections" element={<ProtectedRoute roles={['admin', 'department']}><Sections /></ProtectedRoute>} />

          <Route path="/users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
          <Route path="/users/new" element={<ProtectedRoute roles={['admin']}><UserForm /></ProtectedRoute>} />
          <Route path="/users/:id/edit" element={<ProtectedRoute roles={['admin']}><UserForm /></ProtectedRoute>} />

          <Route path="/policies" element={<Policies />} />
          <Route path="/policy-types" element={<ProtectedRoute roles={['admin']}><PolicyTypes /></ProtectedRoute>} />
          <Route path="/policies/new" element={<ProtectedRoute roles={['admin']}><PolicyForm /></ProtectedRoute>} />
          <Route path="/policies/:id/edit" element={<ProtectedRoute roles={['admin']}><PolicyForm /></ProtectedRoute>} />
          <Route path="/policies/:id" element={<PolicyDetail />} />

          <Route path="/requests" element={<Requests />} />
          <Route path="/form-templates" element={<ProtectedRoute roles={['admin']}><FormTemplates /></ProtectedRoute>} />
          <Route path="/requests/new" element={<RequestForm />} />
          <Route path="/requests/:id/edit" element={<RequestForm />} />
          <Route path="/requests/:id" element={<RequestDetail />} />

          <Route path="/inter-requests" element={<ProtectedRoute roles={['admin', 'department', 'section']}><InterRequests /></ProtectedRoute>} />
          <Route path="/inter-requests/new" element={<ProtectedRoute roles={['admin', 'department', 'section']}><InterRequestForm /></ProtectedRoute>} />
          <Route path="/inter-requests/:id" element={<ProtectedRoute roles={['admin', 'department', 'section']}><InterRequestDetail /></ProtectedRoute>} />

          <Route path="/documents" element={<Documents />} />
          <Route path="/documents/new" element={<DocumentForm />} />
          <Route path="/documents/distribution" element={<ProtectedRoute roles={['admin', 'department']}><DocumentDistribution /></ProtectedRoute>} />

          <Route path="/notifications" element={<Notifications />} />
          <Route path="/audit-logs" element={<ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute roles={['admin', 'department']}><Reports /></ProtectedRoute>} />
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
