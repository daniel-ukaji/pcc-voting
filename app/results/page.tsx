'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2, Users, Vote, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CandidateResult {
  candidate_id: string
  candidate_name: string
  vote_count: number
  election_type: string
}

interface ElectionStats {
  total_voters: number
  votes_cast: number
  participation_rate: number
  is_voting_open: boolean
  election_name: string
  max_selections: number
  max_warden_selections: number
}

export default function ResultsPage() {
  const [results, setResults] = useState<CandidateResult[]>([])
  const [stats, setStats] = useState<ElectionStats | null>(null)
  const [loading, setLoading] = useState(true)

  const pccResults = results.filter(r => r.election_type === 'pcc')
  const wardenResults = results.filter(r => r.election_type === 'warden')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const { data: resultsData } = await supabase.rpc('get_results')
      if (resultsData) {
        setResults(resultsData)
      }

      const { data: statsData } = await supabase.rpc('get_election_stats')
      if (statsData) {
        setStats(statsData)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    }
    setLoading(false)
  }

  const maxPCCVotes = pccResults.length > 0 ? Math.max(...pccResults.map(r => Number(r.vote_count))) : 0
  const maxWardenVotes = wardenResults.length > 0 ? Math.max(...wardenResults.map(r => Number(r.vote_count))) : 0

  const electedPCC = pccResults.slice(0, stats?.max_selections || 9).filter(c => Number(c.vote_count) > 0)
  const electedWarden = wardenResults.slice(0, stats?.max_warden_selections || 1).filter(c => Number(c.vote_count) > 0)

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Loading results...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-6 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="mx-auto mb-4 w-full max-w-[120px]">
            <Image 
              src="/logo_.png" 
              alt="Church of Redemption, Lekki" 
              width={120}
              height={120}
              className="w-full h-auto"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold mb-2">{stats?.election_name || 'PCC Election'}</h1>
          <p className="text-muted-foreground">Official Election Results</p>
        </header>

        {/* Voting Status Banner */}
        {stats?.is_voting_open ? (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
            <p className="text-yellow-800 font-medium">
              ⏳ Voting is still in progress. Results are not final.
            </p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-green-800 font-medium">
              ✅ Voting has ended. These are the final results.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-3xl font-bold">{stats?.votes_cast || 0}</div>
              <div className="text-sm text-muted-foreground">Total Votes Cast</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Vote className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-3xl font-bold">{stats?.participation_rate || 0}%</div>
              <div className="text-sm text-muted-foreground">Participation Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Elected Members Summary */}
        <Card className="mb-8 border-2" style={{ borderColor: '#0F2A46' }}>
          <CardHeader className="text-center" style={{ backgroundColor: '#0F2A46', color: 'white' }}>
            <Trophy className="h-8 w-8 mx-auto mb-2" />
            <CardTitle className="text-xl">Elected Members</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Elected PCC Members */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">PCC Members ({electedPCC.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {electedPCC.map((candidate, index) => (
                  <div 
                    key={candidate.candidate_id}
                    className="flex items-center gap-2 p-3 bg-green-50 rounded-lg"
                  >
                    <div className="h-6 w-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium text-sm">{candidate.candidate_name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Elected Warden */}
            {electedWarden.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3">People's Warden</h3>
                <div className="inline-flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <div className="h-6 w-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-medium">
                    ✓
                  </div>
                  <span className="font-medium">{electedWarden[0].candidate_name}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed PCC Results */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>PCC Members - Full Results</CardTitle>
            <CardDescription>Top {stats?.max_selections || 9} candidates elected</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pccResults.map((candidate, index) => {
              const voteCount = Number(candidate.vote_count)
              const percentage = maxPCCVotes > 0 ? (voteCount / maxPCCVotes) * 100 : 0
              const isWinning = index < (stats?.max_selections || 9) && voteCount > 0

              return (
                <div
                  key={candidate.candidate_id}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-md",
                    isWinning ? "bg-green-50" : "bg-muted"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0",
                    isWinning ? "bg-green-600 text-white" : "bg-background border"
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1.5 flex-wrap gap-1">
                      <span className="text-base font-medium">{candidate.candidate_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {voteCount} vote{voteCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      className={cn("h-2", isWinning && "[&>div]:bg-green-600")}
                    />
                  </div>
                  {isWinning && (
                    <span className="text-xs font-medium uppercase bg-green-600 text-white px-2.5 py-1 rounded-full flex-shrink-0">
                      Elected
                    </span>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Detailed Warden Results */}
        {wardenResults.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>People's Warden - Full Results</CardTitle>
              <CardDescription>Top 1 candidate elected</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {wardenResults.map((candidate, index) => {
                const voteCount = Number(candidate.vote_count)
                const percentage = maxWardenVotes > 0 ? (voteCount / maxWardenVotes) * 100 : 0
                const isWinning = index < (stats?.max_warden_selections || 1) && voteCount > 0

                return (
                  <div
                    key={candidate.candidate_id}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-md",
                      isWinning ? "bg-green-50" : "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0",
                      isWinning ? "bg-green-600 text-white" : "bg-background border"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1.5 flex-wrap gap-1">
                        <span className="text-base font-medium">{candidate.candidate_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {voteCount} vote{voteCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Progress
                        value={percentage}
                        className={cn("h-2", isWinning && "[&>div]:bg-green-600")}
                      />
                    </div>
                    {isWinning && (
                      <span className="text-xs font-medium uppercase bg-green-600 text-white px-2.5 py-1 rounded-full flex-shrink-0">
                        Elected
                      </span>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Church of Redemption, Lekki • {new Date().getFullYear()}
        </p>
      </div>
    </main>
  )
}