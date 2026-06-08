import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    setSent(true)
    addToast('Reset link sent to your email', 'success')
    setLoading(false)
  }

  return (
    <div>
      <Link to="/login" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-gold-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to login
      </Link>
      <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Forgot Password</h2>
      <p className="text-[var(--text-muted)] mt-1 mb-8">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {sent ? (
        <div className="text-center py-8">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="text-[var(--text-primary)] font-medium">Check your inbox</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">We sent a reset link to {email}</p>
        </div>
      ) : (
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
          <Button type="submit" variant="gold" size="lg" className="w-full" loading={loading}>
            Send Reset Link
          </Button>
        </form>
      )}
    </div>
  )
}
