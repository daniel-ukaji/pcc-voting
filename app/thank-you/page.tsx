'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Cross, Loader2 } from 'lucide-react'

interface ElectionStats {
  votes_cast: number
  participation_rate: number
  election_name: string
}

// Confetti component
function Confetti() {
  const [particles, setParticles] = useState<Array<{
    id: number
    x: number
    delay: number
    duration: number
    color: string
  }>>([])

  useEffect(() => {
    const colors = ['#0F2A46', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)]
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: `${particle.x}%`,
            top: '-20px',
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0%',
            transform: `rotate(${Math.random() * 360}deg)`
          }}
        />
      ))}
    </div>
  )
}

export default function ThankYouPage() {
  const [stats, setStats] = useState<ElectionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    fetchStats()
    
    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  async function fetchStats() {
    try {
      const { data } = await supabase.rpc('get_election_stats')
      if (data) {
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative">
      {showConfetti && <Confetti />}
      
      <Card className="w-full max-w-md text-center relative z-10">
        <CardHeader>
          <div className="mx-auto mb-4">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce-slow">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-3xl">Thank You!</CardTitle>
          <CardDescription className="text-base">
            Your vote has been recorded successfully.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-t pt-6">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : stats ? (
              <div className="flex justify-center gap-12 mb-6">
                <div className="text-center">
                  <div className="text-4xl font-bold" style={{ color: '#0F2A46' }}>
                    {stats.votes_cast}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Votes</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold" style={{ color: '#0F2A46' }}>
                    {stats.participation_rate}%
                  </div>
                  <div className="text-sm text-muted-foreground">Participation</div>
                </div>
              </div>
            ) : null}

            <div className="p-4 bg-muted rounded-md mb-6">
              <p className="text-sm text-muted-foreground">
                Results will be announced when voting closes. You may now close this page.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Cross className="h-4 w-4" />
              <span className="italic">God bless you</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}