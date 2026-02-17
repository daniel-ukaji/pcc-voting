'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Cross, Loader2, RefreshCw } from 'lucide-react'

interface ElectionStats {
  total_voters: number
  votes_cast: number
  participation_rate: number
  is_voting_open: boolean
  election_name: string
  max_selections: number
}

export default function HomePage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [connectionError, setConnectionError] = useState(false)
  const [electionInfo, setElectionInfo] = useState<ElectionStats | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchElectionInfo()
  }, [])

  async function fetchElectionInfo() {
    setPageLoading(true)
    setConnectionError(false)
    
    try {
      const { data, error } = await supabase.rpc('get_election_stats')
      if (error) {
        console.error('Failed to fetch election info:', error)
        setConnectionError(true)
      } else if (data) {
        setElectionInfo(data)
      }
    } catch (err) {
      console.error('Connection error:', err)
      setConnectionError(true)
    }
    
    setPageLoading(false)
  }

  function formatPhoneNumber(value: string) {
    return value.replace(/\D/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formattedPhone = formatPhoneNumber(phoneNumber.trim())

    if (formattedPhone.length < 10 || formattedPhone.length > 15) {
      setError('Please enter a valid phone number (10-15 digits)')
      setLoading(false)
      return
    }

    try {
      const { data: currentSettings } = await supabase.rpc('get_election_stats')
      
      if (currentSettings && !currentSettings.is_voting_open) {
        setError('Voting is not currently open. Please wait for the coordinator to open voting.')
        setLoading(false)
        return
      }

      const { data: voter, error: voterError } = await supabase
        .from('voters')
        .select('id, has_voted, name')
        .eq('phone_number', formattedPhone)
        .single()

      if (voterError || !voter) {
        setError('This phone number is not registered for this election. Please check the number or speak to the election coordinator.')
        setLoading(false)
        return
      }

      if (voter.has_voted) {
        setError('This phone number has already been used to vote. Each member can only vote once.')
        setLoading(false)
        return
      }

      sessionStorage.setItem('voterPhone', formattedPhone)
      if (voter.name) {
        sessionStorage.setItem('voterName', voter.name)
      }
      
      router.push('/vote')
    } catch (err) {
      console.error('Submit error:', err)
      setError('Unable to connect. Please check your internet connection and try again.')
    }

    setLoading(false)
  }

  if (pageLoading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </main>
    )
  }

  if (connectionError) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-lg">Connection Error</CardTitle>
            <CardDescription>
              Unable to connect to the voting system. Please check your internet connection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchElectionInfo} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-muted-foreground">
            <Cross className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">
            {electionInfo?.election_name || 'PCC Election'}
          </CardTitle>
          <CardDescription>
            Enter your registered phone number to vote
          </CardDescription>
        </CardHeader>
        <CardContent>
          {electionInfo && !electionInfo.is_voting_open && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
              Voting is not currently open. Please wait for the coordinator to begin the election.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 08012345678"
                autoComplete="tel"
                inputMode="numeric"
                disabled={loading || electionInfo?.is_voting_open === false}
              />
              <p className="text-xs text-muted-foreground">
                Enter digits only, no spaces or dashes
              </p>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={loading || electionInfo?.is_voting_open === false || !phoneNumber.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Continue to Vote'
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted rounded-md">
            <p className="text-sm font-medium mb-2">How it works</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Enter your registered phone number</li>
              <li>Select up to {electionInfo?.max_selections || 9} candidates</li>
              <li>Review and confirm your vote</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-3">
              Each phone number can only vote once. Your vote is anonymous and secure.
            </p>
          </div>
        </CardContent>
      </Card>

      {electionInfo && electionInfo.is_voting_open && (
        <div className="fixed bottom-4 right-4 bg-foreground text-background px-3 py-2 rounded-md text-center">
          <div className="text-lg font-semibold">{electionInfo.votes_cast}</div>
          <div className="text-xs opacity-70">votes cast</div>
        </div>
      )}
    </main>
  )
}