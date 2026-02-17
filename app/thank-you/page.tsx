'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Cross, Loader2 } from 'lucide-react'

interface ElectionStats {
  votes_cast: number
  participation_rate: number
  election_name: string
}

export default function ThankYouPage() {
  const [stats, setStats] = useState<ElectionStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
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
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Thank You!</CardTitle>
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
                  <div className="text-3xl font-semibold">{stats.votes_cast}</div>
                  <div className="text-xs text-muted-foreground">Total Votes</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-semibold">{stats.participation_rate}%</div>
                  <div className="text-xs text-muted-foreground">Participation</div>
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