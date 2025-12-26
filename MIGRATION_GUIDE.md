# 🚀 Quick Migration Guide

## ✅ Easiest Way: SQL Editor (Recommended)

### Step 1: Open SQL Editor
Go to: https://supabase.com/dashboard/project/lemmmkjxsidfjexzwxtb/sql

### Step 2: Run Combined Migration
1. Click **"New Query"**
2. Open the file: `supabase/COMBINED_MIGRATION.sql` in your code editor
3. Copy **ALL** the content (2856 lines)
4. Paste into Supabase SQL Editor
5. Click **"Run"** (or press `Cmd+Enter`)

**✅ All fixes applied:**
- Fixed INDEX syntax errors
- Fixed table dependency issues
- Removed references to non-existent tables

### Step 3: Restart Dev Server
```bash
# Stop the current server (Ctrl+C if running)
npm run dev
```

### Step 4: Test
Go to: http://localhost:3003/dashboard/watchlist

You should see:
- ✅ No more "Failed to load" errors
- ✅ Watchlist loads properly
- ✅ Add to watchlist works
- ✅ Mark as watched works

---

## 🔍 What This Does

The migration creates:
- ✅ `user_profiles` - User data and preferences
- ✅ `movies` - Movie database
- ✅ `watchlist` - User watchlist and watched movies
- ✅ `ratings` - Movie ratings system
- ✅ `user_interactions` - Track user activity
- ✅ `conversational_memory` - AI chat memory
- ✅ `user_preference_insights` - AI learning from ratings
- ✅ `recommendation_queue` - AI recommendations
- ✅ All necessary indexes, triggers, and RLS policies

---

## ⚠️ Troubleshooting

### If you see errors about tables already existing:
This is OK! It means some tables were already created. The migration will skip them.

### If you see permission errors:
Make sure you're logged into your Supabase account in the browser.

### Still getting "Failed to load" errors?
1. Check browser console for specific errors
2. Verify `.env.local` has correct keys
3. Try restarting the dev server

---

## 📝 Alternative: Run Migrations One by One

If the combined migration is too large, you can run them individually:

1. Go to `supabase/migrations/` folder
2. Open each `.sql` file in order (by date)
3. Copy and paste into SQL Editor
4. Run each one

Start with these critical ones:
- `20240123000000_initial_schema.sql` ← Most important!
- `20240124000000_transform_to_ratings_system.sql`
- `20250127220000_add_user_interactions.sql`
- `20250128000000_compute_preference_insights.sql`
