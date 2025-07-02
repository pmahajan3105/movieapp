# 🚀 Movie App - Production Deployment Guide

## 📋 **Pre-Deployment Checklist**

✅ **Build Status**: Production build successful  
✅ **Tests**: All 86 tests passing  
✅ **Linting**: No linting errors  
✅ **TypeScript**: All type issues resolved

## 🌟 **Recommended Deployment Options**

### **Option 1: Vercel (Recommended)**

_Best for: Seamless Next.js deployment with zero configuration_

**Pros:**

- Built specifically for Next.js applications
- Automatic deployments from Git
- Built-in serverless functions
- Global CDN
- Free tier available
- Environment variables management

**Steps:**

1. Visit [vercel.com](https://vercel.com)
2. Connect your GitHub account
3. Import your repository
4. Add environment variables
5. Deploy automatically

**Required Environment Variables:**

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Services
ANTHROPIC_API_KEY=your_anthropic_api_key
GROQ_API_KEY=your_groq_api_key (optional)

# External APIs
TMDB_API_KEY=your_tmdb_api_key

# Application
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
NODE_ENV=production

# Optional: Advanced Features
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
SENTRY_DSN=your_sentry_dsn
```

### **Option 2: Netlify**

_Best for: Simple deployment with great CI/CD_

**Steps:**

1. Visit [netlify.com](https://netlify.com)
2. Connect your Git repository
3. Set build command: `npm run build`
4. Set publish directory: `.next`
5. Add environment variables
6. Deploy

### **Option 3: Railway**

_Best for: Full-stack applications with databases_

**Steps:**

1. Visit [railway.app](https://railway.app)
2. Connect GitHub repository
3. Configure environment variables
4. Deploy with automatic scaling

### **Option 4: Digital Ocean App Platform**

_Best for: More control over infrastructure_

**Steps:**

1. Create account on Digital Ocean
2. Use App Platform
3. Connect repository
4. Configure build settings
5. Set environment variables

## 🔧 **Environment Setup**

### **1. Supabase Configuration**

Ensure your Supabase project is configured:

- Database tables created
- RLS policies set up
- API keys generated
- Authentication enabled

### **2. External API Keys**

- **OMDB API**: Get free key from [omdbapi.com](http://www.omdbapi.com/apikey.aspx)
- **Groq API**: Get key from [groq.com](https://groq.com)

### **3. Database Setup & Migrations**

**Initial Setup:**

1. Create a new Supabase project
2. Enable Row Level Security (RLS)
3. Run migrations in order:

```bash
# Run these SQL files in your Supabase SQL editor:
supabase/migrations/20240123000000_initial_schema.sql
supabase/migrations/20240124000000_transform_to_ratings_system.sql
supabase/migrations/20250127000000_fix_simple_schema.sql
supabase/migrations/20250127100000_fix_existing_schema.sql
supabase/migrations/20250127200000_targeted_fix.sql
supabase/migrations/20250127220000_add_user_interactions.sql
supabase/migrations/20250127221000_add_conversational_memory.sql
supabase/migrations/20250127230000_add_explanation_system.sql
supabase/migrations/20250128000000_compute_preference_insights.sql
supabase/migrations/20250130000000_add_user_behavior_signals.sql
supabase/migrations/20250701000000_add_memory_key_column.sql
```

**Database Functions & Triggers:**

4. Verify all RLS policies are active
5. Test database functions
6. Confirm triggers are working

**Database Seeding (Optional):**

```bash
# Seed popular movies
npm run db:seed
```

## 🚀 **Quick Deploy to Vercel**

**One-Click Setup:**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from your project directory
vercel --prod
```

## 📊 **Performance Optimizations**

### **Already Implemented:**

- ✅ Next.js Image optimization
- ✅ Code splitting and lazy loading
- ✅ Optimized bundle size
- ✅ API route caching strategies
- ✅ TypeScript for better tree shaking

### **Production Monitoring:**

- Set up error tracking (Sentry recommended)
- Monitor Core Web Vitals
- Set up uptime monitoring
- Configure analytics

## 🛡️ **Security Checklist**

- ✅ Environment variables secured
- ✅ API routes protected
- ✅ Supabase RLS enabled
- ✅ Input validation implemented
- ✅ CORS configured properly

## 🎯 **Post-Deployment Steps**

1. **Test Core Features:**

   - User authentication
   - Movie search functionality
   - AI recommendations
   - Watchlist management

2. **Performance Testing:**

   - Page load speeds
   - API response times
   - Search functionality
   - Image loading

3. **SEO Setup:**
   - Submit sitemap to Google
   - Configure meta tags
   - Set up social media previews

## 🔄 **Continuous Deployment**

### **GitHub Actions Workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:ci
      - run: npm run test:e2e
      - run: npm run test:performance

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

**Automatic Deployments:**

- Main branch → Production
- Feature branches → Preview deployments
- Automatic builds on commit
- Environment-specific configurations
- Automated testing pipeline
- Performance monitoring

## 📞 **Support & Monitoring**

### **Logging:**

- Application logs in deployment platform
- Supabase logs for database operations
- API performance monitoring

### **Error Handling:**

- Comprehensive error boundaries
- Graceful fallbacks for external APIs
- User-friendly error messages

## 🌟 **Advanced Features**

### **Edge Functions:**

- Geolocation-based recommendations
- Real-time notifications
- Custom analytics

### **Performance:**

- Image optimization
- Code splitting
- Lazy loading
- CDN distribution

## 🔧 **Troubleshooting**

### **Common Deployment Issues**

#### **Build Failures**

```bash
# Clear cache and rebuild
rm -rf .next node_modules/.cache
npm ci
npm run build
```

#### **Environment Variable Issues**

```bash
# Verify variables are set
npm run env:check

# Test database connection
npm run db:test
```

#### **API Failures**

```bash
# Test external services
curl https://api.themoviedb.org/3/movie/popular?api_key=YOUR_KEY
curl -H "Authorization: Bearer YOUR_KEY" https://api.anthropic.com/v1/messages
```

#### **Performance Issues**

```bash
# Run performance tests
npm run test:performance

# Analyze bundle size
npm run build:analyze
```

### **Health Checks**

```bash
# Application health
curl https://your-app.vercel.app/api/healthz

# Database status
curl https://your-app.vercel.app/api/healthz | jq '.data.database'
```

### **Monitoring Commands**

```bash
# View logs
vercel logs your-deployment-url

# Monitor performance
npm run performance:monitor

# Check error rates
npm run errors:check
```

## 📊 **Production Checklist**

### **Pre-Launch**

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificate active
- [ ] Custom domain configured
- [ ] Analytics setup complete
- [ ] Error tracking enabled
- [ ] Performance monitoring active

### **Post-Launch**

- [ ] Health checks passing
- [ ] Performance metrics within targets
- [ ] Error rates under 1%
- [ ] User flows tested
- [ ] Search functionality verified
- [ ] AI recommendations working
- [ ] Voice features operational

### **Ongoing Maintenance**

- [ ] Weekly performance reviews
- [ ] Monthly dependency updates
- [ ] Quarterly security audits
- [ ] Database optimization
- [ ] AI model retraining
- [ ] User feedback integration

---

## 🚀 **Ready to Deploy!**

Your CineAI app is production-ready with:

- ✅ Advanced AI-powered movie recommendations
- ✅ Voice conversation capabilities
- ✅ Real-time search and discovery
- ✅ Comprehensive performance monitoring
- ✅ Automated testing pipeline
- ✅ Type-safe codebase
- ✅ Modern responsive UI/UX
- ✅ Production-grade security

Choose your preferred deployment option above and go live! 🎬✨

### **Quick Start Commands**

```bash
# 1. Deploy to Vercel (Recommended)
npx vercel --prod

# 2. Or deploy to Netlify
npm run build && netlify deploy --prod

# 3. Monitor deployment
npm run deploy:check
```

**Need help?** Check our [API Documentation](./API_DOCUMENTATION.md) and [Troubleshooting Guide](./TROUBLESHOOTING.md) for additional support.
