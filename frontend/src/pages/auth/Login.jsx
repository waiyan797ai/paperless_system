import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Logo from '../../components/ui/Logo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { login, loading } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { redirectTo } = await login(email, password)
      addToast('Welcome back!', 'success')
      navigate(redirectTo)
    } catch (err) {
      setError(err.message || 'Login failed')
    }
  }

  const demoAccounts = [
    { email: 'admin@29.com', role: 'Admin', password: 'password' },
    { email: 'hr.head@29.com', role: 'Manager', password: 'password' },
    { email: 'approver@29.com', role: 'Manager', password: 'password' },
    { email: 'employee1@29.com', role: 'User', password: 'password' },
  ]

  return (
    <div>
      <div className="lg:hidden mb-8 text-center">
        <Logo size="md" className="mx-auto mb-4 ring-white/20" />
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Sign In</h1>
      </div>

      <div className="hidden lg:block mb-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Welcome back</h2>
        <p className="text-[var(--text-muted)] mt-1">Sign in to your account to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@office29.gov"
          required
        />
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            error={error}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input type="checkbox" className="rounded border-[var(--border-color)] text-gold-600 focus:ring-gold-500/30" />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm text-gold-600 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="gold" size="lg" className="w-full" loading={loading}>
          Sign In
        </Button>
      </form>

      <div className="mt-8 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Demo Accounts</p>
        <div className="space-y-2">
          {demoAccounts.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => { setEmail(acc.email); setPassword(acc.password) }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-elevated)] transition-colors text-left"
            >
              <span className="text-[var(--text-secondary)]">{acc.email}</span>
              <span className="text-xs text-gold-600 font-medium">{acc.role}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-2">Password: password</p>
      </div>
    </div>
  )
}
