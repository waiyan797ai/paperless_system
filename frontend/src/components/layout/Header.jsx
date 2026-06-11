import { useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, Sun, Moon, LogOut, User, Settings } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { useNotifications } from '../../hooks/useNotifications'
import Button from '../ui/Button'
import Avatar from '../ui/Avatar'
import Dropdown, { DropdownItem, DropdownDivider } from '../ui/Dropdown'
import SearchInput from '../ui/SearchInput'
import { useState } from 'react'
import { cn } from '../../lib/utils'
import { formatRelativeTime } from '../../lib/utils'

export default function Header({ onMenuClick, sidebarCollapsed }) {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 glass border-b border-[var(--border-color)]">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>

          <div className={cn(
            'transition-all duration-300',
            searchOpen ? 'w-full max-w-md' : 'w-auto max-w-xs hidden sm:block',
            sidebarCollapsed ? 'lg:ml-0' : ''
          )}>
            {searchOpen ? (
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search documents, requests, users..."
                onClear={() => { setSearch(''); setSearchOpen(false) }}
              />
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-sm text-[var(--text-muted)] hover:border-gold-600/30 transition-colors w-64"
              >
                <Search className="h-4 w-4" />
                Search...
                <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-color)]">⌘K</kbd>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {isDark ? <Sun className="h-5 w-5 text-gold-400" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Dropdown
            align="right"
            trigger={
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-gold-600 text-[10px] font-bold text-primary-950 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            }
          >
            <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
              <span className="font-semibold text-sm text-[var(--text-primary)]">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-gold-600 dark:text-gold-400 hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.slice(0, 5).map((n) => (
                <button
                  key={n.id}
                  onClick={() => { markAsRead(n.id); navigate('/notifications') }}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors border-b border-[var(--border-color)] last:border-0',
                    !n.read && 'bg-gold-600/5'
                  )}
                >
                  <p className="text-sm font-medium text-[var(--text-primary)]">{n.title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{n.message}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">{formatRelativeTime(n.createdAt)}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('/notifications')}
              className="w-full px-4 py-2.5 text-sm text-gold-600 dark:text-gold-400 hover:bg-[var(--bg-surface)] text-center font-medium"
            >
              View all
            </button>
          </Dropdown>

          <Dropdown
            align="right"
            trigger={
              <button className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl hover:bg-[var(--bg-surface)] transition-colors">
                <Avatar name={user?.name} src={user?.avatarUrl} size="sm" />
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-[var(--text-primary)] leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)] capitalize">{user?.role}</p>
                </div>
              </button>
            }
          >
            <div className="px-4 py-3 border-b border-[var(--border-color)]">
              <p className="text-sm font-medium text-[var(--text-primary)]">{user?.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
            </div>
            <DropdownItem icon={User} onClick={() => navigate('/profile')}>Profile</DropdownItem>
            <DropdownItem icon={Settings} onClick={() => navigate('/change-password')}>Change Password</DropdownItem>
            <DropdownDivider />
            <DropdownItem icon={LogOut} onClick={handleLogout} danger>Sign Out</DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  )
}
