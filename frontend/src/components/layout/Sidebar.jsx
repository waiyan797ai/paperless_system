import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Building2, Users, FileText, ClipboardList,
  ArrowLeftRight, FolderOpen, Bell, Shield, BarChart3,
  ChevronLeft, ChevronRight, Layers, Send, Tag, FileSpreadsheet,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { hasRole } from '../../lib/auth'
import { useAuth } from '../../hooks/useAuth'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'department', 'section', 'employee'] },
    ],
  },
  {
    label: 'Organization',
    items: [
      { to: '/departments', icon: Building2, label: 'Departments', roles: ['admin', 'department'] },
      { to: '/sections', icon: Layers, label: 'Sections', roles: ['admin', 'department'] },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/users', icon: Users, label: 'Users', roles: ['admin'] },
      { to: '/policies', icon: FileText, label: 'Policies', roles: ['admin', 'department', 'section', 'employee'] },
      { to: '/policy-types', icon: Tag, label: 'Policy Types', roles: ['admin'] },
    ],
  },
  {
    label: 'Workflows',
    items: [
      { to: '/requests', icon: ClipboardList, label: 'Requests', roles: ['admin', 'department', 'section', 'employee'] },
      { to: '/form-templates', icon: FileSpreadsheet, label: 'Form Templates', roles: ['admin'] },
      { to: '/inter-requests', icon: ArrowLeftRight, label: 'Inter-Requests', roles: ['admin', 'department', 'section'] },
    ],
  },
  {
    label: 'Documents',
    items: [
      { to: '/documents', icon: FolderOpen, label: 'Documents', roles: ['admin', 'department', 'section', 'employee'] },
      { to: '/documents/distribution', icon: Send, label: 'Distribution', roles: ['admin', 'department'] },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/notifications', icon: Bell, label: 'Notifications', roles: ['admin', 'department', 'section', 'employee'] },
      { to: '/audit-logs', icon: Shield, label: 'Audit Logs', roles: ['admin'] },
      { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['admin', 'department'] },
      { to: '/role-permissions', icon: Shield, label: 'Role Permissions', roles: ['admin'] },
    ],
  },
]

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user } = useAuth()
  const location = useLocation()

  const filteredGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasRole(user, ...item.roles)),
  })).filter((group) => group.items.length > 0)

  const sidebarContent = (
    <aside
      className={cn(
        'flex flex-col h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-color)]',
        'transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      <div className={cn('flex items-center gap-3 p-4 border-b border-[var(--border-color)]', collapsed && 'justify-center')}>
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gold-600 to-gold-500 flex items-center justify-center shrink-0 shadow-lg shadow-gold-600/20">
          <span className="text-primary-950 font-bold text-sm">29</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h2 className="font-display text-sm font-bold text-white leading-tight">Office Management</h2>
            <p className="text-[10px] text-gold-400/80 uppercase tracking-wider">Paperless System</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {group.label}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onMobileClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        collapsed && 'justify-center px-2',
                        isActive
                          ? 'bg-gold-600/15 text-gold-400 border border-gold-600/25'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-gold-400')} />
                      {!collapsed && <span>{item.label}</span>}
                      {isActive && !collapsed && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="ml-auto h-1.5 w-1.5 rounded-full bg-gold-400"
                        />
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--border-color)]">
        <button
          onClick={onToggle}
          className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors text-sm"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /> Collapse</>}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      <div className="hidden lg:block shrink-0">{sidebarContent}</div>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-primary-950/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={onMobileClose}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
