# CineAI Personal Project TODO

> **Focus:** Essential fixes only - no over-engineering

## 🚨 **CRITICAL FIXES (Do This Weekend)**

### 1. Fix Failing Tests (2-3 hours)
**Why:** Your app features are broken without these fixes

**Current Issues:**
- 4 test suites failing (12 tests total)
- Integration tests have network/mock issues
- Some hook tests have timing problems

**Action Items:**
- [ ] Fix `watchlist-unwatch.test.ts` - Network request failed
- [ ] Fix `movies-page.test.tsx` - React rendering issues
- [ ] Fix `dashboard.test.tsx` - Missing test data attributes
- [ ] Fix `useAISettings.test.ts` - API mock issues

**Commands to run:**
```bash
# Run specific failing tests
npm test -- --testPathPattern="watchlist-unwatch.test.ts" --verbose
npm test -- --testPathPattern="movies-page.test.tsx" --verbose
npm test -- --testPathPattern="dashboard.test.tsx" --verbose
npm test -- --testPathPattern="useAISettings.test.ts" --verbose
```

### 2. Basic Error Handling (1 hour)
**Why:** Prevents crashes when things go wrong

**Action Items:**
- [ ] Standardize 5-6 remaining API routes to use `APIErrorHandler.handle()`
- [ ] Add basic try-catch to components that can crash

**Files to update:**
- `src/app/api/user/preferences/route.ts`
- `src/app/api/user/profile/route.ts`
- `src/app/api/watchlist/[id]/route.ts`

---

## 🎯 **NICE TO HAVE (When Bored)**

### 3. Input Validation (30 minutes)
**Why:** Prevent bad data from breaking things

**Action Items:**
- [ ] Add Zod validation to user preferences API
- [ ] Add basic form validation to settings page

### 4. Performance Tweaks (1 hour)
**Why:** Only if you notice your app is slow

**Action Items:**
- [ ] Add lazy loading to dashboard components
- [ ] Optimize movie grid rendering

---

## 🚫 **EXPLICITLY SKIP (Over-Engineering)**

**Don't Do These:**
- ~~100% test coverage~~
- ~~Advanced security auditing~~
- ~~Complex performance monitoring~~
- ~~Enterprise logging systems~~
- ~~Advanced TypeScript perfectionism~~
- ~~Bundle size micro-optimizations~~

---

## 📋 **EXECUTION PLAN**

### **This Weekend (Saturday Morning - 3 hours max)**

**Hour 1: Fix Critical Tests**
```bash
# Start with the easiest fix
npm test -- --testPathPattern="dashboard.test.tsx" --verbose
# Add missing test data attributes to components
```

**Hour 2: Fix Integration Tests**
```bash
# Fix network mocking issues
npm test -- --testPathPattern="watchlist-unwatch.test.ts" --verbose
npm test -- --testPathPattern="movies-page.test.tsx" --verbose
```

**Hour 3: Quick Error Handling**
```bash
# Standardize remaining API routes
# Focus on user-facing endpoints that can crash
```

### **Next Week (Optional - 1 hour)**
- Add basic input validation
- Test your app end-to-end manually

---

## 🎉 **DONE CRITERIA**

**You're done when:**
- [ ] All tests pass: `npm test`
- [ ] App doesn't crash during normal use
- [ ] You can add movies to watchlist without errors
- [ ] Settings page works without breaking

**Then:** Use and enjoy your personal movie app! 🎬

---

## 🔍 **QUICK HEALTH CHECK**

**Before starting, run:**
```bash
npm test -- --passWithNoTests
npm run build
npm run dev
```

**After fixing, run:**
```bash
npm test
npm run build
npm run dev
# Test major features manually
```

---

*Remember: This is a personal project. Good enough is perfect. Focus on making it work reliably for you, not enterprise-perfect.* 