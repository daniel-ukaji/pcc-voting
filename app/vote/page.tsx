'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface Candidate {
  id: string
  name: string
  bio?: string
  election_type: string
}

interface ElectionStats {
  max_selections: number
  max_warden_selections: number
  election_name: string
  is_voting_open: boolean
}

export default function VotePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedPCC, setSelectedPCC] = useState<string[]>([])
  const [selectedWarden, setSelectedWarden] = useState<string | null>(null)
  const [electionInfo, setElectionInfo] = useState<ElectionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [voterName, setVoterName] = useState<string | null>(null)
  const router = useRouter()

  const voterPhone = typeof window !== 'undefined' ? sessionStorage.getItem('voterPhone') : null
  const maxPCCSelections = electionInfo?.max_selections || 9
  const maxWardenSelections = electionInfo?.max_warden_selections || 1

  const pccCandidates = candidates.filter(c => c.election_type === 'pcc')
  const wardenCandidates = candidates.filter(c => c.election_type === 'warden')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const phone = sessionStorage.getItem('voterPhone')
      const name = sessionStorage.getItem('voterName')
      
      if (!phone) {
        router.push('/')
        return
      }
      
      if (name) {
        setVoterName(name)
      }
      
      fetchData()
    }
  }, [])

  async function fetchData() {
    setLoading(true)
    setError('')

    try {
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidates')
        .select('*')
        .order('name')

      if (candidatesError) {
        setError('Failed to load candidates. Please refresh the page.')
        setLoading(false)
        return
      }

      if (!candidatesData || candidatesData.length === 0) {
        setError('No candidates found. Please contact the election coordinator.')
        setLoading(false)
        return
      }

      setCandidates(candidatesData)

      const { data: statsData, error: statsError } = await supabase.rpc('get_election_stats')
      
      if (statsError) {
        setError('Failed to load election settings. Please refresh the page.')
        setLoading(false)
        return
      }

      if (statsData) {
        setElectionInfo(statsData)
        
        if (!statsData.is_voting_open) {
          setError('Voting has been closed. Please contact the election coordinator.')
        }
      }
    } catch (err) {
      setError('Connection error. Please check your internet and try again.')
    }

    setLoading(false)
  }

  function togglePCCCandidate(candidateId: string) {
    if (submitting) return
    
    setSelectedPCC(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId)
      } else if (prev.length < maxPCCSelections) {
        return [...prev, candidateId]
      } else {
        setError(`You can only select up to ${maxPCCSelections} PCC candidates.`)
        setTimeout(() => setError(''), 4000)
        return prev
      }
    })
  }

  function selectWardenCandidate(candidateId: string) {
    if (submitting) return
    setSelectedWarden(prev => prev === candidateId ? null : candidateId)
  }

  async function handleSubmitVote() {
    setSubmitting(true)
    setError('')

    try {
      const { data: currentStats } = await supabase.rpc('get_election_stats')
      
      if (!currentStats?.is_voting_open) {
        setError('Voting has been closed. Your vote was not submitted.')
        setShowConfirm(false)
        setSubmitting(false)
        return
      }

      const { data: voterCheck } = await supabase
        .from('voters')
        .select('has_voted')
        .eq('phone_number', voterPhone)
        .single()

      if (voterCheck?.has_voted) {
        setError('This phone number has already voted.')
        setShowConfirm(false)
        setSubmitting(false)
        sessionStorage.clear()
        setTimeout(() => router.push('/'), 3000)
        return
      }

      const { data, error: voteError } = await supabase.rpc('cast_vote', {
        p_phone_number: voterPhone,
        p_candidate_ids: selectedPCC,
        p_warden_candidate_id: selectedWarden
      })

      if (voteError) {
        console.error('Vote error:', voteError)
        setError('Failed to submit vote. Please try again.')
        setSubmitting(false)
        return
      }

      if (data && !data.success) {
        setError(data.error || 'Failed to submit vote.')
        setSubmitting(false)
        return
      }

      sessionStorage.clear()
      router.push('/thank-you')
      
    } catch (err) {
      console.error('Submit error:', err)
      setError('Connection error. Please check your internet and try again.')
      setSubmitting(false)
    }
  }

  function handleGoBack() {
    sessionStorage.clear()
    router.push('/')
  }

  const canSubmit = selectedPCC.length > 0 && (wardenCandidates.length === 0 || selectedWarden !== null)

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Loading ballot...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen pb-24">
      <div className="max-w-2xl mx-auto p-6">
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleGoBack}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
              title="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold tracking-tight">
              {electionInfo?.election_name || 'PCC Election'}
            </h1>
          </div>
        </header>

        {voterName && (
          <p className="text-sm text-muted-foreground mb-4">
            Voting as: <strong>{voterName}</strong>
          </p>
        )}

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PCC Election Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">PCC Members</h2>
            <div className="flex items-baseline gap-1 bg-muted px-3 py-1.5 rounded-md text-sm">
              <span className={cn(
                "text-lg font-semibold",
                selectedPCC.length === maxPCCSelections && "text-green-600"
              )}>
                {selectedPCC.length}
              </span>
              <span className="text-muted-foreground">/ {maxPCCSelections}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Select up to <strong>{maxPCCSelections}</strong> candidates for PCC.
          </p>

          <div className="space-y-2">
            {pccCandidates.map(candidate => (
              <button
                key={candidate.id}
                onClick={() => togglePCCCandidate(candidate.id)}
                disabled={submitting}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-md border text-left transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  selectedPCC.includes(candidate.id)
                    ? "border-foreground bg-muted"
                    : "border-border hover:bg-accent"
                )}
              >
                <div className={cn(
                  "h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                  selectedPCC.includes(candidate.id)
                    ? "bg-foreground border-foreground"
                    : "border-border"
                )}>
                  {selectedPCC.includes(candidate.id) && (
                    <Check className="h-3.5 w-3.5 text-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{candidate.name}</span>
                  {candidate.bio && (
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {candidate.bio}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* People's Warden Section */}
        {wardenCandidates.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">People's Warden</h2>
              <div className="flex items-baseline gap-1 bg-muted px-3 py-1.5 rounded-md text-sm">
                <span className={cn(
                  "text-lg font-semibold",
                  selectedWarden && "text-green-600"
                )}>
                  {selectedWarden ? 1 : 0}
                </span>
                <span className="text-muted-foreground">/ {maxWardenSelections}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Select <strong>1</strong> candidate for People's Warden.
            </p>

            <div className="space-y-2">
              {wardenCandidates.map(candidate => (
                <button
                  key={candidate.id}
                  onClick={() => selectWardenCandidate(candidate.id)}
                  disabled={submitting}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-md border text-left transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    selectedWarden === candidate.id
                      ? "border-foreground bg-muted"
                      : "border-border hover:bg-accent"
                  )}
                >
                  <div className={cn(
                    "h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors",
                    selectedWarden === candidate.id
                      ? "bg-foreground border-foreground"
                      : "border-border"
                  )}>
                    {selectedWarden === candidate.id && (
                      <div className="h-2 w-2 rounded-full bg-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{candidate.name}</span>
                    {candidate.bio && (
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {candidate.bio}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="max-w-md mx-auto">
          <Button
            className="w-full"
            size="lg"
            onClick={() => setShowConfirm(true)}
            disabled={!canSubmit || submitting || !electionInfo?.is_voting_open}
          >
            {!canSubmit
              ? wardenCandidates.length > 0 
                ? 'Select PCC candidates and Warden'
                : 'Select at least 1 candidate'
              : `Review & Submit Vote`}
          </Button>
        </div>
      </div>

      <Dialog open={showConfirm} onOpenChange={(open) => !submitting && setShowConfirm(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Your Vote</DialogTitle>
            <DialogDescription>
              Please review your selections:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* PCC Selections */}
            <div>
              <h3 className="text-sm font-semibold mb-2">PCC Members ({selectedPCC.length})</h3>
              <div className="p-3 bg-muted rounded-md max-h-40 overflow-y-auto">
                {selectedPCC.map((id, index) => {
                  const candidate = candidates.find(c => c.id === id)
                  return (
                    <div key={id} className="text-sm font-medium py-1.5 border-b border-border last:border-0 flex items-center gap-2">
                      <span className="text-muted-foreground">{index + 1}.</span>
                      {candidate?.name}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Warden Selection */}
            {selectedWarden && (
              <div>
                <h3 className="text-sm font-semibold mb-2">People's Warden</h3>
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium">
                    {candidates.find(c => c.id === selectedWarden)?.name}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ This action cannot be undone
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Once submitted, you cannot change your vote.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={submitting}
            >
              Go Back & Edit
            </Button>
            <Button
              onClick={handleSubmitVote}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Confirm & Submit Vote'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}