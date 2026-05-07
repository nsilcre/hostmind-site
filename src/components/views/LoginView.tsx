'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Lock, Eye, EyeOff, Loader2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/lib/store'
import { API } from '@/components/shared/helpers'
import { useToasts } from '@/components/shared/ToastProvider'

export default function LoginView() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedCred, setCopiedCred] = useState<string | null>(null)
  const { setAuth, navigate } = useAppStore()
  const { addToast } = useToasts()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    setError('')
    try {
      const res = await API('/api/auth', '', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión')
        return
      }
      setAuth(data.token, { username: data.username, name: data.name })
      addToast(`¡Bienvenido, ${data.name}!`, 'success')
      navigate('dashboard')
      API('/api/seed', data.token, { method: 'POST' })
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const copyCredentials = async (user: string, pass: string, key: string) => {
    try {
      await navigator.clipboard.writeText(`${user} / ${pass}`)
      setCopiedCred(key)
      addToast('Credenciales copiadas al portapapeles', 'info')
      setTimeout(() => setCopiedCred(null), 2000)
    } catch {
      addToast('No se pudo copiar', 'error')
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-zinc-950">
      {/* ── Animated gradient mesh background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-30 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(245,158,11,0.35) 0%, transparent 70%)',
            animation: 'meshFloat1 12s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, rgba(217,119,6,0.3) 0%, transparent 70%)',
            animation: 'meshFloat2 15s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-10 blur-[140px]"
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.25) 0%, transparent 60%)',
            animation: 'meshFloat3 18s ease-in-out infinite',
          }}
        />
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Keyframe styles injected ── */}
      <style jsx global>{`
        @keyframes meshFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(80px, 60px) scale(1.1); }
          66% { transform: translate(-40px, 80px) scale(0.95); }
        }
        @keyframes meshFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-60px, -40px) scale(1.05); }
          66% { transform: translate(50px, -70px) scale(0.9); }
        }
        @keyframes meshFloat3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes borderGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* ── Glass card ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md z-10"
      >
        {/* Animated gradient border wrapper */}
        <div className="relative p-[1px] rounded-2xl overflow-hidden">
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'conic-gradient(from 0deg, rgba(245,158,11,0.3), rgba(217,119,6,0.1), rgba(251,191,36,0.3), rgba(217,119,6,0.1), rgba(245,158,11,0.3))',
              animation: 'borderGlow 4s ease-in-out infinite',
            }}
          />
          {/* Inner glow */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'radial-gradient(ellipse at top center, rgba(245,158,11,0.08) 0%, transparent 60%)',
            }}
          />

          {/* Main card content */}
          <div className="relative rounded-2xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] p-8 shadow-2xl">
            {/* ── Logo section ── */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex flex-col items-center mb-8"
            >
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-amber-500/30 relative z-10">
                  H
                </div>
                <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-amber-500/30 blur-xl" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                HostMind
              </h1>
              <p className="text-sm text-zinc-400 mt-1.5 tracking-wide">
                Gestión inteligente de alquileres
              </p>
            </motion.div>

            {/* ── Login form ── */}
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              onSubmit={handleLogin}
              className="space-y-5"
            >
              {/* Username field */}
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-sm font-medium text-zinc-300 block">
                  Usuario
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 group-focus-within:text-amber-400 transition-colors duration-200" />
                  <Input
                    id="username"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="pl-10 h-12 bg-white/[0.04] border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 focus:bg-white/[0.06] transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-zinc-300 block">
                  Contraseña
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 group-focus-within:text-amber-400 transition-colors duration-200" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pl-10 pr-10 h-12 bg-white/[0.04] border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 focus:bg-white/[0.06] transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors duration-200"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded border border-white/20 bg-white/[0.04] peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-all duration-200 flex items-center justify-center">
                      {rememberMe && (
                        <Check className="size-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    Recordarme
                  </span>
                </label>
                <button type="button" className="text-sm text-amber-500/70 hover:text-amber-400 transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                >
                  <p className="text-sm text-red-400 text-center">{error}</p>
                </motion.div>
              )}

              {/* Login button */}
              <motion.div whileTap={{ scale: 0.98 }} className="pt-1">
                <Button
                  type="submit"
                  disabled={loading}
                  className="relative w-full h-12 rounded-xl font-semibold text-base text-white overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 disabled:opacity-70 cursor-pointer"
                  style={{
                    background: loading ? undefined : 'linear-gradient(135deg, #f59e0b, #d97706, #b45309)',
                  }}
                >
                  {/* Shimmer effect on button */}
                  <div
                    className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite',
                    }}
                  />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        Iniciando sesión...
                      </>
                    ) : (
                      'Iniciar sesión'
                    )}
                  </span>
                </Button>
              </motion.div>
            </motion.form>

            {/* ── Demo credentials ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-6 space-y-2"
            >
              <p className="text-xs text-zinc-500 text-center mb-3">Credenciales de demostración</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { label: 'Administrador', user: 'admin', pass: 'admin123', key: 'admin' },
                  { label: 'Propietario', user: 'owner', pass: 'owner123', key: 'owner' },
                ] as const).map((cred) => (
                  <button
                    key={cred.key}
                    type="button"
                    onClick={() => copyCredentials(cred.user, cred.pass, cred.key)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-amber-500/20 transition-all duration-200 group cursor-pointer"
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 group-hover:text-amber-400/70 transition-colors">
                      {cred.label}
                    </span>
                    <span className="text-xs font-mono text-zinc-300 group-hover:text-zinc-200 transition-colors">
                      {cred.user} / {cred.pass}
                    </span>
                    <div className="flex items-center gap-1 text-zinc-600 group-hover:text-amber-400/60 transition-colors">
                      {copiedCred === cred.key ? (
                        <>
                          <Check className="size-3" />
                          <span className="text-[10px]">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span className="text-[10px]">Copiar</span>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Footer ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="text-center text-xs text-zinc-600 mt-6"
        >
          HostMind v2.0
        </motion.p>
      </motion.div>
    </div>
  )
}
