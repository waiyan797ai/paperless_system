const TOKEN_KEY = 'oms_token'
const USER_KEY = 'oms_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(normalizeUser(user)))
}

export function clearStoredUser() {
  localStorage.removeItem(USER_KEY)
}

export function clearAuth() {
  clearToken()
  clearStoredUser()
}

/** Map backend role names to frontend route roles */
export function normalizeRole(role) {
  if (!role) return 'employee'
  const name = typeof role === 'string' ? role : role.name
  const map = {
    super_admin: 'admin',
    system_admin: 'admin',
    admin: 'admin',
    manager: 'department',
    department_admin: 'department',
    department_head: 'department',
    department: 'department',
    section_admin: 'section',
    section: 'section',
    approver: 'section',
    user: 'employee',
    employee: 'employee',
  }
  return map[name] || 'employee'
}

function extractPermissionSlugs(user) {
  if (Array.isArray(user?.permissions) && user.permissions.length > 0) {
    return user.permissions.filter((p) => typeof p === 'string')
  }

  const rolePermissions = user?.role?.permissions
  if (Array.isArray(rolePermissions) && rolePermissions.length > 0) {
    return rolePermissions.map((p) => (typeof p === 'string' ? p : p.slug)).filter(Boolean)
  }

  return []
}

export function avatarUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  if (path.startsWith('/')) {
    return path
  }
  // If path is like 'avatars/filename.png', prepend /storage/
  return `/storage/${path}`
}

export function normalizeUser(user) {
  if (!user) return null
  const backendRoleName =
    user.roleName ||
    (typeof user.role === 'object' ? user.role?.name : null)
  let normalized = normalizeRole(backendRoleName || user.role)

  if (['manager', 'section_admin'].includes(backendRoleName) && (user.section_id || user.section?.id)) {
    normalized = 'section'
  } else if (['manager', 'department_admin', 'department_head'].includes(backendRoleName)) {
    normalized = 'department'
  } else if (['user', 'employee'].includes(backendRoleName)) {
    normalized = 'employee'
  }

  return {
    ...user,
    role: normalized,
    roleName: backendRoleName || normalizeRole(user.role),
    departmentName: user.department?.name || user.department_name,
    sectionName: user.section?.name || user.section_name,
    avatarUrl: avatarUrl(user.avatar),
    permissions: extractPermissionSlugs(user),
  }
}

export function getDashboardPath(role) {
  const normalized = normalizeRole(role)
  const map = {
    admin: '/dashboard/admin',
    department: '/dashboard/department',
    section: '/dashboard/department',
    employee: '/dashboard/employee',
  }
  return map[normalized] || '/dashboard/employee'
}

export const ROLES = {
  ADMIN: 'admin',
  DEPARTMENT: 'department',
  SECTION: 'section',
  EMPLOYEE: 'employee',
}

export function hasRole(user, ...roles) {
  if (!user) return false
  const normalized = normalizeRole(user.roleName || user.role)
  return roles.includes(normalized)
}

export function hasPermission(user, permission) {
  if (!user) return false
  if (hasRole(user, 'admin')) return true

  const permissions = extractPermissionSlugs(user)
  if (permissions.includes(permission)) return true

  // Standard employee request workflow
  if (hasRole(user, 'employee')) {
    if (permission === 'form_requests.create' || permission === 'form_requests.process') {
      return true
    }
  }

  return false
}

export function isAdminLevel(user) {
  if (!user) return false
  const roleName = user.roleName || (typeof user.role === 'object' ? user.role?.name : user.role)
  return roleName === 'super_admin' || roleName === 'admin'
}

export function isDepartmentAdmin(user) {
  if (!user) return false
  const roleName = user.roleName || (typeof user.role === 'object' ? user.role?.name : user.role)
  return ['manager', 'department_admin', 'department_head'].includes(roleName) && user.department_id
}

export function isSectionAdmin(user) {
  if (!user) return false
  const roleName = user.roleName || (typeof user.role === 'object' ? user.role?.name : user.role)
  return ['manager', 'section_admin'].includes(roleName) && user.section_id
}

export function canAccessRoute(user, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true
  return hasRole(user, ...allowedRoles)
}
