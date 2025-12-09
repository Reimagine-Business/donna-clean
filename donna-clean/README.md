# Donna - Financial Management App

Modern financial tracking and analytics platform for small businesses.

---

## 🚀 Development Workflow

This project uses **Vercel-only development** - all builds happen in the cloud.

### Why Vercel-Only?
- ✅ No local environment variables needed
- ✅ More secure (credentials never on local machine)
- ✅ Consistent builds across team
- ✅ Automatic preview deployments
- ✅ Environment parity (dev/staging/prod)

### Development Process

**1. Make Code Changes**
```bash
# Edit your code locally
git add .
git commit -m "feat: your changes"
git push origin your-branch
```

**2. Vercel Auto-Builds**
- Every push triggers automatic deployment
- Check GitHub PR for Vercel preview link
- Build logs available in Vercel dashboard

**3. Test on Preview URL**
- Vercel provides unique URL for each PR
- Test all features on live preview
- Share with team for review

**4. Merge to Main**
- Merge PR when preview looks good
- Automatic production deployment
- Live at: https://donna-clean.vercel.app

### Local Development

For local development (optional):
```bash
npm run dev
```

**Note:** Local builds (`npm run build`) may show errors about missing Supabase env vars. This is expected and safe to ignore. Production builds on Vercel will succeed.

### Environment Variables

All environment variables are managed in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SENTRY_DSN`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

**⚠️ Never commit `.env` files to Git!**

---

## 🏗️ Tech Stack

- **Next.js 16** - App Router with Server Actions
- **React 19** - Latest React features
- **TypeScript** - Type-safe development
- **Supabase** - Authentication + PostgreSQL Database
- **Vercel** - Hosting + Edge Functions + KV Storage
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful UI components
- **Recharts** - Data visualization
- **Sentry** - Error monitoring

---

## ✨ Key Features

### Financial Management
- ✅ **Entry Management** - Cash IN/OUT, Credit, Advance tracking
- ✅ **Parties** - Customer & Vendor management
- ✅ **Settlement System** - Partial payments and credit tracking
- ✅ **Categories** - Sales, COGS, Opex, Assets

### Analytics & Reporting
- ✅ **Cash Pulse** - Real-time cash flow visualization
- ✅ **Profit Lens** - Monthly profitability analysis
- ✅ **Business Snapshot** - Quick financial overview
- ✅ **Export** - CSV export functionality

### User Experience
- ✅ **Mobile-First** - Responsive design with bottom navigation
- ✅ **Real-time Updates** - Supabase Realtime integration
- ✅ **Image Uploads** - Receipt/document attachment
- ✅ **Toast Notifications** - User feedback system
- ✅ **Loading States** - Skeleton screens for better UX

### Security & Performance
- ✅ **Row-Level Security** - Database-level access control
- ✅ **Rate Limiting** - Vercel KV-based protection
- ✅ **Input Validation** - Comprehensive data sanitization
- ✅ **Error Tracking** - Sentry integration
- ✅ **Optimized Images** - Next.js Image optimization

---

## 📁 Project Structure

```
donna-clean/
├── app/                      # Next.js App Router
│   ├── entries/             # Entry management (main feature)
│   ├── parties/             # Customer/Vendor management
│   ├── analytics/           # Cash Pulse & Profit Lens
│   ├── settlements/         # Payment settlement actions
│   ├── auth/                # Authentication pages
│   └── profile/             # User profile
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── daily-entries/       # Entry management components
│   ├── navigation/          # Nav components
│   ├── analytics/           # Chart components
│   └── settlements/         # Settlement dialogs
├── lib/                     # Utilities & helpers
│   ├── supabase/           # Supabase client setup
│   ├── entries.ts          # Entry types & utilities
│   ├── validation.ts       # Input validation
│   ├── sanitization.ts     # XSS protection
│   └── rate-limit.ts       # Rate limiting logic
├── utils/                   # Shared utilities
└── supabase/               # Database schema & migrations
```

---

## 🗄️ Database Setup

### Tables
- `entries` - Financial transactions
- `parties` - Customers & vendors
- `profiles` - User profiles
- `alerts` - User notifications
- `reminders` - Payment reminders
- `settlement_history` - Settlement tracking

### Setup Instructions

1. Create Supabase project at [database.new](https://database.new)

2. Run SQL migrations in `supabase/` folder:
```sql
-- Run these in Supabase SQL Editor
supabase/entries-table.sql
supabase/parties-table.sql
supabase/profiles-table.sql
```

3. Create Storage bucket:
   - Name: `receipts`
   - Public: No
   - Allowed MIME types: `image/*`
   - RLS Policy: Allow authenticated users read/write

4. Enable Realtime on `entries` table:
   - Supabase Dashboard → Database → Publications
   - Enable Realtime for `entries` table

---

## 🚦 Route Structure

### Public Routes
- `/` - Landing page (redirects to /home)
- `/auth/login` - Login page
- `/auth/sign-up` - Registration
- `/auth/forgot-password` - Password reset

### Protected Routes
- `/home` - Dashboard/Home
- `/entries` - Entry management (was /daily-entries)
- `/parties` - Customer/Vendor list
- `/analytics/cashpulse` - Cash flow analytics
- `/analytics/profitlens` - Profitability analytics
- `/settlements` - Settlement management
- `/alerts` - Notifications
- `/profile` - User profile

### Admin Routes
- `/admin/diagnostics` - System diagnostics
- `/admin/users` - User management

---

## 🔐 Security Features

### Authentication
- **Supabase Auth** with SSR (Server-Side Rendering)
- **Email/Password** authentication
- **Session management** with cookies
- **Protected routes** via middleware

### Database Security
- **Row-Level Security (RLS)** on all tables
- **User-scoped queries** (users only see their data)
- **Prepared statements** (SQL injection protection)

### Application Security
- **Rate limiting** via Vercel KV (Redis)
- **Input validation** on all forms
- **XSS protection** via sanitization
- **CSRF protection** via Next.js
- **Security headers** (CSP, HSTS, X-Frame-Options)

---

## 🧪 Testing

### Local Testing
```bash
npm run dev
# Visit http://localhost:3000
```

### Preview Testing
- Push to any branch
- Get Vercel preview URL from GitHub PR
- Test on live preview environment

### Production Testing
- Merge to `main` branch
- Automatic deployment to production
- Visit https://donna-clean.vercel.app

---

## 📝 Recent Updates

### Latest Changes (Dec 2025)
- ✅ Consolidated `/daily-entries` → `/entries` route
- ✅ Added mobile navigation to dashboard
- ✅ Improved loading states across app
- ✅ Enhanced Vercel-only workflow
- ✅ Updated to Next.js 16.0.3

### Previous Updates
- Security features integration (rate limiting, validation)
- Settlement system with partial payments
- Party/Vendor management
- Cash Pulse analytics
- Profit Lens analytics

---

## 🐛 Known Issues & Notes

### Build-Time Warnings
- `/profile` page may show Supabase SSR error during local builds
- **This is expected** - only occurs without Supabase env vars
- Production builds (Vercel) succeed normally

### Environment Requirements
- Node.js 18+ recommended
- Vercel account for deployment
- Supabase project for database

---

## 👥 Contributing

1. Create feature branch from `main`
2. Make changes and test locally
3. Push to GitHub
4. Review Vercel preview
5. Create PR with description
6. Await review and merge

---

## 📧 Support

For questions or issues:
- Check GitHub Issues
- Contact development team
- Review Vercel deployment logs
- Check Supabase dashboard logs

---

## 📜 License

Proprietary - All rights reserved

---

**Built with ❤️ for small business financial management**
