import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import Logo from '../ui/Logo'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary-950">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-950 via-primary-800 to-primary-900" />
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gold-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-gold-500/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <Logo size="lg" className="mb-8 ring-white/20" />
          <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
            Office Management
            <span className="block gold-gradient-text mt-1">& Paperless System</span>
          </h1>
          <p className="text-white/70 mt-6 text-lg max-w-md leading-relaxed">
            Streamline workflows, manage documents, and empower your organization with enterprise-grade digital transformation.
          </p>
          <div className="flex gap-8 mt-12">
            {[
              { label: 'Departments', value: '12+' },
              { label: 'Active Users', value: '500+' },
              { label: 'Documents', value: '10K+' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-gold-400 tracking-tight">{stat.value}</p>
                <p className="text-xs text-white/60 mt-1 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--bg-base)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  )
}
