'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2, RefreshCw, AlertCircle, Users, Vote, Percent, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CandidateResult {
  candidate_id: string
  candidate_name: string
  vote_count: number
}

interface ElectionStats {
  total_voters: number
  votes_cast: number
  participation_rate: number
  is_voting_open: boolean
  election_name: string
  max_selections: number
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [results, setResults] = useState<CandidateResult[]>([])
  const [stats, setStats] = useState<ElectionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [votingOpen, setVotingOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [connectionError, setConnectionError] = useState(false)

  const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'pcc2024'

  useEffect(() => {
    const isAuth = sessionStorage.getItem('adminAuth') === 'true'
    if (isAuth) {
      setAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (authenticated) {
      fetchData()
      const cleanup = setupRealtimeSubscription()
      const interval = setInterval(fetchData, 30000)
      
      return () => {
        cleanup()
        clearInterval(interval)
      }
    }
  }, [authenticated])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (password === adminPassword) {
      sessionStorage.setItem('adminAuth', 'true')
      setAuthenticated(true)
      setError('')
    } else {
      setError('Incorrect password')
    }
  }

  const fetchData = useCallback(async () => {
    setConnectionError(false)
    
    try {
      const { data: resultsData, error: resultsError } = await supabase.rpc('get_results')
      
      if (resultsError) {
        setConnectionError(true)
      } else if (resultsData) {
        setResults(resultsData)
      }

      const { data: statsData, error: statsError } = await supabase.rpc('get_election_stats')
      
      if (statsError) {
        setConnectionError(true)
      } else if (statsData) {
        setStats(statsData)
        setVotingOpen(statsData.is_voting_open)
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      setConnectionError(true)
    }

    setLoading(false)
  }, [])

  function setupRealtimeSubscription() {
    const votesChannel = supabase
      .channel('admin-votes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => fetchData())
      .subscribe()

    const votersChannel = supabase
      .channel('admin-voters')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'voters' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(votesChannel)
      supabase.removeChannel(votersChannel)
    }
  }

  async function toggleVoting() {
    setUpdating(true)
    setError('')

    try {
      const { error } = await supabase
        .from('election_settings')
        .update({ is_voting_open: !votingOpen, updated_at: new Date().toISOString() })
        .eq('id', 1)

      if (error) {
        setError('Failed to update voting status.')
      } else {
        setVotingOpen(!votingOpen)
      }
    } catch (err) {
      setError('Connection error.')
    }

    setUpdating(false)
  }

  function handleLogout() {
    sessionStorage.removeItem('adminAuth')
    setAuthenticated(false)
    setPassword('')
  }

  const maxVotes = results.length > 0 ? Math.max(...results.map(r => Number(r.vote_count))) : 0
  const totalSelections = results.reduce((sum, r) => sum + Number(r.vote_count), 0)

  if (!authenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Admin Dashboard</CardTitle>
            <CardDescription>Enter password to access results</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
              />
              {error && <div className="text-sm text-destructive">{error}</div>}
              <Button type="submit" className="w-full">Access Dashboard</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Loading results...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{stats?.election_name || 'PCC Election'}</h1>
            <span className="flex items-center gap-1.5 bg-destructive text-destructive-foreground text-xs font-medium px-2 py-1 rounded-full">
              <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
          </div>
        </header>

        {connectionError && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Connection issue. Results may not be up to date.
          </div>
        )}

        <Card className={cn("mb-6", votingOpen ? "border-l-4 border-l-green-600" : "border-l-4 border-l-muted")}>
          <CardContent className="flex items-center justify-between py-4 flex-wrap gap-4">
            <div>
              <span className="text-sm">Voting is <strong>{votingOpen ? 'OPEN' : 'CLOSED'}</strong></span>
              {lastUpdated && <p className="text-xs text-muted-foreground">Last updated: {lastUpdated.toLocaleTimeString()}</p>}
            </div>
            <Button size="sm" variant={votingOpen ? "destructive" : "default"} onClick={toggleVoting} disabled={updating}>
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : votingOpen ? 'Close Voting' : 'Open Voting'}
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground mb-1"><Users className="h-4 w-4" /><span className="text-xs">Registered</span></div><div className="text-2xl font-semibold">{stats?.total_voters || 0}</div></CardContent></Card>
          <Card className="bg-foreground text-background"><CardContent className="pt-4"><div className="flex items-center gap-2 opacity-70 mb-1"><Vote className="h-4 w-4" /><span className="text-xs">Voted</span></div><div className="text-2xl font-semibold">{stats?.votes_cast || 0}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground mb-1"><Percent className="h-4 w-4" /><span className="text-xs">Turnout</span></div><div className="text-2xl font-semibold">{stats?.participation_rate || 0}%</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground mb-1"><CheckSquare className="h-4 w-4" /><span className="text-xs">Selections</span></div><div className="text-2xl font-semibold">{totalSelections}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Results</CardTitle>
            <CardDescription>Top {stats?.max_selections || 9} candidates will be elected</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No candidates found.</p>
            ) : (
              results.map((candidate, index) => {
                const voteCount = Number(candidate.vote_count)
                const percentage = maxVotes > 0 ? (voteCount / maxVotes) * 100 : 0
                const isWinning = index < (stats?.max_selections || 9) && voteCount > 0

                return (
                  <div key={candidate.candidate_id} className={cn("flex items-center gap-3 p-3 rounded-md", isWinning ? "bg-green-50" : "bg-muted")}>
                    <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium", isWinning ? "bg-green-600 text-white" : "bg-background border")}>{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-sm font-medium truncate">{candidate.candidate_name}</span>
                        <span className="text-xs text-muted-foreground">{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
                      </div>
                      <Progress value={percentage} className={cn("h-1.5", isWinning && "[&>div]:bg-green-600")} />
                    </div>
                    {isWinning && <span className="text-[10px] font-medium uppercase bg-green-600 text-white px-2 py-0.5 rounded-full">Elected</span>}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">Results update automatically</p>
      </div>
    </main>
  )
}