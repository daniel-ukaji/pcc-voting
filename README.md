# PCC Election Voting System

A real-time, mobile-friendly voting platform built with **Next.js 14**, **Tailwind CSS**, **shadcn/ui**, and **Supabase**.

## Features

- ✅ Phone number authentication (pre-loaded voter list)
- ✅ Real-time results with live updates
- ✅ Mobile-first minimalist design
- ✅ Admin dashboard with voting controls
- ✅ One vote per phone number (database enforced)
- ✅ Anonymous voting

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel (free tier)

## Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and run the contents of `supabase-schema.sql`

### 2. Add Your Data

In Supabase Table Editor:

**Candidates** - Add your 16 nominees:
```
| name           | bio (optional)     |
|----------------|-------------------|
| John Smith     | Warden            |
| Mary Johnson   | Choir Director    |
```

**Voters** - Import phone numbers (CSV supported):
```
| phone_number  |
|---------------|
| 07700900001   |
| 07700900002   |
```

### 3. Get API Keys

Go to **Settings → API** and copy:
- Project URL
- `anon` public key

### 4. Deploy to Vercel

1. Push this code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_PASSWORD`
5. Deploy

### 5. Election Day

1. Open `/admin` and log in
2. Click "Open Voting"
3. Share the main URL with your congregation
4. Watch real-time results on the admin dashboard

## Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Add your Supabase credentials to .env.local

# Run development server
npm run dev
```

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Login page
│   ├── globals.css         # Tailwind + shadcn styles
│   ├── vote/
│   │   └── page.tsx        # Voting booth
│   ├── thank-you/
│   │   └── page.tsx        # Confirmation
│   └── admin/
│       └── page.tsx        # Admin dashboard
├── components/
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── supabase.ts         # Supabase client
│   └── utils.ts            # Utilities
└── supabase-schema.sql     # Database setup
```

## Security

- Phone numbers validated against pre-loaded list
- One vote per phone enforced at database level
- Votes are anonymous (no voter-vote link stored)
- Admin dashboard password protected
- Row Level Security (RLS) enabled
