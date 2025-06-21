# Supabase Authentication Setup for Production

This guide explains how to properly configure Supabase authentication redirects to work correctly in all environments (development, preview, and production).

## Overview

CineAI uses Supabase magic link authentication. For this to work properly in production, you need to configure:

1. **Supabase URL Configuration** in your Supabase dashboard
2. **Environment Variables** in your deployment platform
3. **Application Code** (already implemented via URL helper utilities)

## 1. Supabase Dashboard Configuration

### Navigate to Authentication Settings

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication → Settings → URL Configuration**

### Configure URLs

#### Site URL

Set your **Site URL** to your primary production domain:

```
https://your-app.vercel.app
```

Or if you have a custom domain:

```
https://yourdomain.com
```

#### Additional Redirect URLs

Add all possible redirect URLs to handle different environments:

```
# Production
https://your-app.vercel.app/**

# Custom domain (if applicable)
https://yourdomain.com/**

# Vercel preview deployments (wildcard)
https://*.vercel.app/**

# Development (localhost)
http://localhost:3000/**
http://localhost:3001/**
```

**Important**: Use `/**` at the end to allow all paths under each domain.

## 2. Environment Variables Configuration

### In Vercel Dashboard

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add the following variables:

#### Production Environment Variables

```bash
# Required: Your production domain
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app

# Supabase (copy from Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Other required variables
TMDB_API_KEY=your_tmdb_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

#### For Preview Deployments

Vercel automatically sets `NEXT_PUBLIC_VERCEL_URL` for each deployment, so preview deployments will work automatically without additional configuration.

### In Local Development

Create `.env.local` from the `env.example` file:

```bash
cp env.example .env.local
```

Update the values in `.env.local`:

```bash
# Local development (optional - defaults to localhost:3000)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Other APIs
TMDB_API_KEY=your_tmdb_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## 3. How It Works (Technical Details)

### URL Helper Utility

The application uses a smart URL helper (`src/lib/utils/url-helper.ts`) that automatically determines the correct callback URL:

1. **Production**: Uses `NEXT_PUBLIC_SITE_URL`
2. **Vercel Previews**: Uses `NEXT_PUBLIC_VERCEL_URL` (auto-set by Vercel)
3. **Development**: Defaults to `http://localhost:3000`

### Authentication Flow

```typescript
// Magic link request automatically uses correct callback URL
await supabase.auth.signInWithOtp({
  email: userEmail,
  options: {
    emailRedirectTo: getAuthCallbackURL(), // Smart URL detection
  },
})
```

### URL Priority Order

The system checks environment variables in this order:

1. `NEXT_PUBLIC_SITE_URL` (manually set for production)
2. `NEXT_PUBLIC_VERCEL_URL` (auto-set by Vercel)
3. `VERCEL_URL` (fallback for Vercel)
4. `http://localhost:3000` (development fallback)

## 4. Testing Your Setup

### Test in Development

1. Start your local server: `npm run dev`
2. Try to log in with magic link
3. Check that the email link redirects to `http://localhost:3000/auth/callback`

### Test in Production

1. Deploy to Vercel
2. Try to log in with magic link
3. Check that the email link redirects to your production domain

### Debug URL Configuration

The application logs URL configuration in development mode. Check your console for:

```
🔍 URL Configuration Debug:
- NEXT_PUBLIC_SITE_URL: SET
- NEXT_PUBLIC_VERCEL_URL: NOT SET
- VERCEL_URL: NOT SET
- Computed Site URL: https://your-app.vercel.app
- Auth Callback URL: https://your-app.vercel.app/auth/callback
```

## 5. Troubleshooting

### Magic Links Still Point to localhost

**Problem**: Magic links in production emails still contain `localhost:3000`

**Solutions**:

1. Verify `NEXT_PUBLIC_SITE_URL` is set in Vercel environment variables
2. Check that your Supabase redirect URLs include your production domain
3. Redeploy your application after setting environment variables

### Authentication Callback Errors

**Problem**: Users get "Invalid redirect URL" errors

**Solutions**:

1. Ensure your callback URL is in Supabase's allowed redirect URLs
2. Use the exact format: `https://yourdomain.com/**`
3. Include both your main domain and Vercel preview domains

### Preview Deployments Don't Work

**Problem**: Magic links don't work in Vercel preview deployments

**Solutions**:

1. Add the wildcard `https://*.vercel.app/**` to Supabase redirect URLs
2. Ensure preview deployments have access to required environment variables

## 6. Security Considerations

### URL Validation

The application includes URL validation to prevent redirect attacks:

- Only allows same-origin redirects
- Allows localhost in development
- Allows Vercel preview URLs
- Rejects external redirects

### Environment Variables

**Never commit** actual API keys or URLs to your repository. Always use:

- `.env.local` for local development (gitignored)
- Vercel environment variables for production
- The provided `env.example` as a template

## 7. Quick Setup Checklist

- [ ] Configure Supabase redirect URLs in dashboard
- [ ] Set `NEXT_PUBLIC_SITE_URL` in Vercel environment variables
- [ ] Add all required API keys to Vercel
- [ ] Test magic link authentication in production
- [ ] Verify preview deployments work correctly
- [ ] Check console logs for URL configuration debugging

## Need Help?

If you're still having issues:

1. Check the console logs for URL configuration debug info
2. Verify all environment variables are set correctly
3. Test the authentication flow in an incognito browser
4. Check your Supabase project logs for authentication errors
