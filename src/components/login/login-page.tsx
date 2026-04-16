import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '~/hooks/use-auth'
import { Button } from '~/components/ui/button'

export function LoginPage() {
  const { user, loading, refetch } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      navigate({ to: '/', replace: true })
    }
  }, [user, navigate])

  const handleLogin = async () => {
    setSubmitting(true)
    try {
      const u = await refetch({ soft: true })
      if (u) {
        navigate({ to: '/', replace: true })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Redirection…</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-950 flex-col justify-between p-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="text-white/80 font-medium tracking-wide">Holis pointage</span>
        </div>

        <div className="relative z-10">
          <p className="text-white/40 leading-relaxed">
            Votre espace de gestion du temps et des absences.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} — Usage interne uniquement</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <h1 className="app-page-title">Connexion</h1>
            <p className="text-muted-foreground">
              Utilisez votre compte Microsoft professionnel pour accéder à l&apos;application.
            </p>
          </div>

          <Button
            onClick={handleLogin}
            variant="outline"
            className="w-full h-11 gap-3"
            disabled={submitting}
          >
            {submitting ? 'Connexion…' : 'Continuer avec OAuth'}
          </Button>
        </div>
      </div>
    </div>
  )
}
