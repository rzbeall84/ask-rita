# Rita Recruit AI

A modern SAAS platform for AI-powered recruitment and document management.

## Features

- **Multi-tenant Architecture**: Secure organization-based data isolation
- **AI-Powered Chat**: Intelligent document search and recruitment assistance
- **Document Management**: Upload, categorize, and search through recruitment documents
- **User Management**: Role-based access control (Admin/User)
- **Subscription Management**: Stripe-integrated billing and subscription tiers
- **Responsive Design**: Modern UI built with React and Tailwind CSS

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Radix UI, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Payments**: Stripe
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Stripe account (for payments)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rita-recruit-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Fill in your Supabase and Stripe credentials in the `.env` file.

4. Start the development server:
```bash
npm run dev
```

### Environment Variables

Create a `.env` file with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_APP_URL=http://localhost:5173
VITE_APP_NAME="Rita Recruit AI"
RESEND_API_KEY=your_resend_api_key
NODE_ENV=development
```

## Database Setup

The project includes Supabase migrations in the `supabase/migrations/` directory. Run these migrations on your Supabase project to set up the database schema.

Key tables:
- `organizations` - Multi-tenant organization data
- `profiles` - User profiles with role-based access
- `document_files` - Document storage and metadata
- `document_content` - Extracted document content for AI search
- `subscriptions` - Stripe subscription management
- `queries` - AI chat history and analytics

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Supabase Edge Functions

Deploy the included edge functions for:
- Email notifications
- Stripe webhook handling
- User invitation system

## Security Features

- **Row Level Security (RLS)**: Database-level data isolation
- **Organization-based Access**: Users can only access their organization's data
- **Role-based Permissions**: Admin and User roles with different access levels
- **Secure Authentication**: Supabase Auth with email verification
- **Environment Variable Protection**: No hardcoded secrets in code

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.
