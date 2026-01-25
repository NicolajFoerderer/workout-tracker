# Workout App

A workout tracking application built with React and Supabase.

## Features

- Magic link authentication via Supabase
- Create and manage workout templates
- Log workouts with sets, reps, and weight
- View workout history
- Track progress with E1RM charts

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (auth + PostgreSQL database)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js
- Supabase account and project

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── pages/        # Route components
├── contexts/     # Auth context
├── utils/        # API and Supabase client
└── components/   # Shared components
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
