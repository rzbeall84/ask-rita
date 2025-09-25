# Rita Recruit AI - Replit Project

## Overview
Rita Recruit AI is a modern SAAS platform for AI-powered recruitment and document management. This project has been successfully imported and configured to run in the Replit environment.

## Project Architecture
- **Frontend**: React 18 with TypeScript, using Vite as the build tool
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Routing**: React Router DOM
- **State Management**: React Query for server state, Context API for global state
- **Authentication**: Supabase Auth with role-based access control

## Recent Changes
- **2025-09-25**: Project imported and configured for Replit environment
  - Updated Vite configuration to use host "0.0.0.0" and port 5000
  - Modified Supabase client to handle missing environment variables gracefully
  - Configured deployment settings for autoscale deployment
  - Set up development workflow for frontend server

## Configuration Status
- ✅ Dependencies installed
- ✅ Vite configured for Replit (host: 0.0.0.0, port: 5000)
- ✅ Development workflow configured
- ✅ Deployment settings configured (autoscale)
- ✅ Environment variables configured (Supabase, OpenAI, Stripe)

## Required Environment Variables
The following environment variables need to be set by the user:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_OPENAI_API_KEY`: OpenAI API key for AI features (optional)
- `VITE_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key for payments (optional)
- `VITE_APP_URL`: Your Replit app URL
- `VITE_APP_NAME`: App name (default: "Rita Recruit AI")

## Development
- Run `npm run dev` to start the development server
- The app will be available at the Replit preview URL
- Hot module replacement is enabled for development

## Deployment
- Build command: `npm run build`
- Preview command: `npm run preview`
- Deployment target: autoscale (suitable for stateless frontend applications)

## Notes
- The application will show a warning in the console if Supabase environment variables are not configured
- The app uses placeholder values for missing environment variables to allow it to start
- User authentication and backend features require proper Supabase configuration