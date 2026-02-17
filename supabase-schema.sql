-- PCC Election Voting System - Supabase Schema
-- Run this in the Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Candidates table (the 16 nominees)
CREATE TABLE candidates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    photo_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voters table (pre-loaded phone numbers)
CREATE TABLE voters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    has_voted BOOLEAN DEFAULT FALSE,
    voted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votes table (anonymous vote records)
CREATE TABLE votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Election settings
CREATE TABLE election_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    election_name TEXT DEFAULT 'PCC Election 2024',
    max_selections INTEGER DEFAULT 9,
    is_voting_open BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO election_settings (election_name, max_selections, is_voting_open)
VALUES ('PCC Election 2024', 9, FALSE);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_voters_phone ON voters(phone_number);
CREATE INDEX idx_voters_has_voted ON voters(has_voted);
CREATE INDEX idx_votes_candidate ON votes(candidate_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to cast votes
CREATE OR REPLACE FUNCTION cast_vote(
    p_phone_number TEXT,
    p_candidate_ids UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_voter_id UUID;
    v_has_voted BOOLEAN;
    v_is_open BOOLEAN;
    v_max_selections INTEGER;
    v_candidate_id UUID;
BEGIN
    SELECT is_voting_open, max_selections INTO v_is_open, v_max_selections
    FROM election_settings WHERE id = 1;
    
    IF NOT v_is_open THEN
        RETURN json_build_object('success', false, 'error', 'Voting is not currently open');
    END IF;
    
    IF array_length(p_candidate_ids, 1) > v_max_selections THEN
        RETURN json_build_object('success', false, 'error', 'Too many selections');
    END IF;
    
    IF array_length(p_candidate_ids, 1) < 1 THEN
        RETURN json_build_object('success', false, 'error', 'Please select at least one candidate');
    END IF;
    
    SELECT id, has_voted INTO v_voter_id, v_has_voted
    FROM voters
    WHERE phone_number = p_phone_number;
    
    IF v_voter_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Phone number not registered');
    END IF;
    
    IF v_has_voted THEN
        RETURN json_build_object('success', false, 'error', 'You have already voted');
    END IF;
    
    FOREACH v_candidate_id IN ARRAY p_candidate_ids
    LOOP
        INSERT INTO votes (candidate_id) VALUES (v_candidate_id);
    END LOOP;
    
    UPDATE voters
    SET has_voted = TRUE, voted_at = NOW()
    WHERE id = v_voter_id;
    
    RETURN json_build_object('success', true, 'message', 'Vote recorded successfully');
END;
$$;

-- Function to get results
CREATE OR REPLACE FUNCTION get_results()
RETURNS TABLE (
    candidate_id UUID,
    candidate_name TEXT,
    vote_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        c.id as candidate_id,
        c.name as candidate_name,
        COUNT(v.id) as vote_count
    FROM candidates c
    LEFT JOIN votes v ON c.id = v.candidate_id
    GROUP BY c.id, c.name
    ORDER BY vote_count DESC, c.name ASC;
$$;

-- Function to get election stats
CREATE OR REPLACE FUNCTION get_election_stats()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT json_build_object(
        'total_voters', (SELECT COUNT(*) FROM voters),
        'votes_cast', (SELECT COUNT(*) FROM voters WHERE has_voted = TRUE),
        'participation_rate', (
            SELECT ROUND(
                (COUNT(*) FILTER (WHERE has_voted = TRUE)::NUMERIC / 
                 NULLIF(COUNT(*), 0)::NUMERIC) * 100, 1
            )
            FROM voters
        ),
        'is_voting_open', (SELECT is_voting_open FROM election_settings WHERE id = 1),
        'election_name', (SELECT election_name FROM election_settings WHERE id = 1),
        'max_selections', (SELECT max_selections FROM election_settings WHERE id = 1)
    );
$$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates viewable by everyone" ON candidates FOR SELECT USING (true);
CREATE POLICY "Voters can check status" ON voters FOR SELECT USING (true);
CREATE POLICY "Votes not directly accessible" ON votes FOR SELECT USING (false);
CREATE POLICY "Election settings viewable" ON election_settings FOR SELECT USING (true);

-- Allow updates to election_settings (for admin toggle)
CREATE POLICY "Election settings updatable" ON election_settings FOR UPDATE USING (true);

-- ============================================
-- REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE voters;
ALTER PUBLICATION supabase_realtime ADD TABLE election_settings;
