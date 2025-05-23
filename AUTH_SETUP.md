# 🔐 CineAI Authentication System Setup

Complete authentication system with email + OTP, protected routes, and user management.

## 🚀 Quick Start

### 1. Environment Variables

Create `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional: for development
NEXT_PUBLIC_SUPABASE_DEBUG=true
```

### 2. Database Setup

Run the SQL schema from `src/lib/supabase/config.ts` in your Supabase SQL editor.

### 3. Test the System

```bash
npm run dev
# Visit http://localhost:3000/auth/login
```

## 📋 Features Implemented

### ✅ **Complete Authentication Flow**
- **Email + OTP Login** - No passwords required
- **Automatic user profile creation** on sign up
- **Session management** with refresh tokens
- **Auth state persistence** across page reloads

### ✅ **UI Components**
- **LoginForm** - Email input with validation
- **OtpForm** - 6-digit OTP verification with auto-submit
- **Resend functionality** with 60-second cooldown
- **Loading states** and error handling
- **Responsive design** for mobile and desktop

### ✅ **API Routes**
- **`/api/auth/request-otp`** - Send OTP to email
- **`/api/auth/verify-otp`** - Verify OTP and complete login
- **Comprehensive error handling** with user-friendly messages
- **Rate limiting protection**

### ✅ **Auth Context & Hooks**
- **useAuth hook** for accessing user state
- **Automatic session refresh**
- **Onboarding status tracking**
- **Sign out functionality**

### ✅ **Protected Routes**
- **ProtectedRoute wrapper** for auth-required pages
- **Onboarding flow management**
- **Automatic redirects** based on auth state
- **Loading states** during auth checks

## 🎯 How It Works

### **1. Login Flow**
```
User enters email → OTP sent → User enters OTP → Profile created → Dashboard
```

### **2. Auth State Management**
```
AuthProvider → useAuth hook → Components get user state
```

### **3. Route Protection**
```
ProtectedRoute → Check auth → Redirect or render content
```

## 📱 Components Overview

### **LoginForm**
- Email validation with Zod schema
- React Hook Form for form management
- Error handling and loading states
- Calls `/api/auth/request-otp`

### **OtpForm**
- 6-digit OTP input with auto-formatting
- Auto-submit when 6 digits entered
- Resend functionality with countdown
- Calls `/api/auth/verify-otp`

### **AuthProvider**
- Manages global auth state
- Listens to Supabase auth events
- Handles session refresh
- Provides user data to components

### **ProtectedRoute**
- Wraps protected pages
- Checks authentication status
- Handles onboarding flow
- Shows loading states

## 🔧 API Routes Details

### **POST /api/auth/request-otp**
```json
// Request
{
  "email": "user@example.com"
}

// Response
{
  "success": true,
  "message": "Verification code sent successfully",
  "email": "user@example.com"
}
```

### **POST /api/auth/verify-otp**
```json
// Request
{
  "email": "user@example.com",
  "token": "123456"
}

// Response
{
  "success": true,
  "message": "Authentication successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "onboarding_completed": false
  }
}
```

## 🎨 Styling & UI

### **Shadcn/ui Components Used**
- `Button` - All interactive elements
- `Input` - Form inputs
- `Label` - Form labels

### **Tailwind Classes**
- Responsive design (`sm:`, `md:`, `lg:`)
- Loading spinners with animations
- Error states with red colors
- Modern gradients and shadows

## 🔒 Security Features

### **Built-in Protection**
- **Email validation** - Zod schema validation
- **Rate limiting** - Supabase built-in protection
- **Session management** - Automatic token refresh
- **CSRF protection** - Supabase handles security

### **Row Level Security**
- User data isolation in database
- Automatic user profile creation
- Secure API endpoints

## 🚦 Usage Examples

### **Basic Auth Check**
```tsx
import { useAuth } from '@/contexts/AuthContext'

function MyComponent() {
  const { user, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  if (!user) return <div>Please log in</div>
  
  return <div>Welcome {user.email}!</div>
}
```

### **Protected Page**
```tsx
import { RequireAuth } from '@/components/auth/ProtectedRoute'

export default function DashboardPage() {
  return (
    <RequireAuth>
      <div>Protected content here</div>
    </RequireAuth>
  )
}
```

### **Onboarding Flow**
```tsx
import { RequireOnboarding } from '@/components/auth/ProtectedRoute'

export default function MainDashboard() {
  return (
    <RequireOnboarding>
      <div>Only shown after onboarding complete</div>
    </RequireOnboarding>
  )
}
```

## 🔄 Authentication Flow States

### **State Transitions**
1. **Unauthenticated** → Login page
2. **Email sent** → OTP verification page  
3. **Authenticated + No onboarding** → Preferences page
4. **Authenticated + Onboarded** → Dashboard
5. **Session expired** → Back to login

### **Automatic Redirects**
- `/auth/login` → `/dashboard` (if authenticated & onboarded)
- `/dashboard/*` → `/auth/login` (if not authenticated)
- `/dashboard/*` → `/dashboard/preferences` (if not onboarded)

## 🎉 Ready to Use!

Your authentication system is now complete and production-ready. Users can sign up and sign in seamlessly with just their email address, no passwords required!

## 🔄 Next Steps

1. **Test the flow** - Try signing up with your email
2. **Customize styling** - Update colors and branding
3. **Add user preferences** - Build the onboarding form
4. **Connect to features** - Use `useAuth()` in your components

---

**The authentication system is fully functional and ready for your movie recommendation app!** 🎬✨ 