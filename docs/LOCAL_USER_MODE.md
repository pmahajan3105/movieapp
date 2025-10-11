# 🏠 Local User Mode - Frictionless Personal Usage

CineAI now supports **Local Mode** - a frictionless way to use the app locally without any authentication or sign-up process. Perfect for self-hosting and personal use!

## ✨ Features

- **No Authentication Required**: No sign-up, no passwords, no OAuth
- **Just Your Name**: Enter your name and start using the app
- **Full Functionality**: Access all features (recommendations, watchlist, AI chat, etc.)
- **Privacy First**: All data stored locally in your browser
- **Persistent**: Your data persists across sessions

## 🚀 How to Enable

### Option 1: Environment Variable (Recommended)

Add to your `.env.local` file:

```bash
NEXT_PUBLIC_SINGLE_USER_MODE=true
```

### Option 2: Already Enabled by Default

Local mode is **enabled by default** for new installations, making self-hosting as simple as possible.

## 🎯 How It Works

### First Time User Flow

1. **Open the App**: Navigate to `http://localhost:3000`
2. **Welcome Screen**: You'll see a beautiful welcome screen
3. **Enter Your Name**: Just type your name (e.g., "John")
4. **Start Exploring**: That's it! You're ready to use CineAI

### Returning User Flow

1. **Open the App**: Navigate to `http://localhost:3000`
2. **Auto-Login**: You're automatically logged in
3. **All Your Data**: Your watchlist, preferences, and history are preserved

## 📦 What Gets Stored

All data is stored in your browser's `localStorage`:

- **User Profile**: Your name and unique local ID
- **Preferences**: Movie genres, moods, and AI settings
- **Watchlist**: Movies you've added to watch later
- **Watch History**: Movies you've marked as watched with ratings
- **AI Conversations**: Your chat history with the AI assistant

## 🔧 Technical Details

### User ID Format

Local users get a unique ID in the format:
```
local_1704067200000_abc123xyz
```

This ID is:
- **Unique**: Based on timestamp + random string
- **Persistent**: Stored in localStorage
- **Compatible**: Works with all API endpoints

### Email Format

Local users get a generated email:
```
local_1704067200000_abc123xyz@local.cineai
```

This is only used internally and never sent anywhere.

### API Integration

All API routes support local mode through the `getUserContext()` utility:

```typescript
import { getUserContext } from '@/lib/utils/single-user-mode'

// In your API route
const userContext = getUserContext(authUser?.id)
// Returns either authenticated user or local user
```

## 🔐 Privacy & Security

### What's Tracked

- ✅ Your name (stored locally)
- ✅ Movie preferences (stored locally)
- ✅ Watchlist and ratings (stored locally)
- ✅ AI conversation history (stored locally)

### What's NOT Tracked

- ❌ No analytics
- ❌ No telemetry
- ❌ No external authentication
- ❌ No cloud sync (unless you configure it)

## 🎨 User Experience

### Welcome Screen

The welcome screen features:
- Clean, modern design with DaisyUI styling
- Large name input field
- Feature highlights
- Privacy reassurance
- One-click setup

### Seamless Integration

- **No Auth Barriers**: Skip all login screens
- **Instant Access**: Start using features immediately
- **No Interruptions**: Never asked to sign up or log in

## 🛠️ Developer Guide

### Components

1. **LocalWelcomeScreen** (`src/components/auth/LocalWelcomeScreen.tsx`)
   - Beautiful welcome UI
   - Name input form
   - Feature highlights

2. **LocalUserGate** (`src/components/auth/LocalUserGate.tsx`)
   - Gate component that shows welcome screen when needed
   - Handles loading states
   - Automatically renders app once user is set up

3. **Local User Utils** (`src/lib/utils/local-user.ts`)
   - User management functions
   - localStorage operations
   - Type-safe interfaces

### Key Functions

```typescript
// Check if local mode is enabled
isLocalMode(): boolean

// Get current local user
getLocalUser(): LocalUser | null

// Create new local user
createLocalUser(name: string): LocalUser

// Update local user
updateLocalUser(updates: Partial<LocalUser>): LocalUser | null

// Clear local user (logout)
clearLocalUser(): void

// Check if local user exists
hasLocalUser(): boolean
```

### AuthContext Integration

The `AuthContext` now includes:

```typescript
interface AuthContextType {
  // ... existing fields
  isLocalMode: boolean
  needsLocalSetup: boolean
  createLocalUserAccount: (name: string) => Promise<void>
}
```

## 🔄 Migration from Cloud Auth

To switch from cloud authentication to local mode:

1. **Enable Local Mode**:
   ```bash
   NEXT_PUBLIC_SINGLE_USER_MODE=true
   ```

2. **Clear Browser Data** (optional):
   - Clear localStorage to start fresh
   - Or keep existing data and it will be preserved

3. **Restart the App**:
   - Restart your development server
   - You'll see the welcome screen

## 🚨 Limitations

- **Single Browser**: Data is tied to one browser
- **No Sync**: Data doesn't sync across devices
- **No Backup**: Clear browser data = lose everything
- **No Collaboration**: Designed for single-user use

## 💡 Best Practices

1. **Export Your Data**: Use the backup features to export your data
2. **Browser Extensions**: Consider using browser sync extensions
3. **Regular Backups**: Periodically backup your localStorage data
4. **Self-Host**: Run on your own server for better reliability

## 🎯 Use Cases

### Perfect For:

- ✅ Self-hosting at home
- ✅ Personal media server
- ✅ Offline-first usage
- ✅ Privacy-conscious users
- ✅ Testing and development
- ✅ Demo and showcase

### Not Ideal For:

- ❌ Multi-user setups
- ❌ Team collaboration
- ❌ Cross-device sync
- ❌ Production SaaS

## 🔮 Future Enhancements

Planned improvements:

- [ ] Export/Import user data
- [ ] Optional cloud backup
- [ ] Multi-profile support
- [ ] Data encryption
- [ ] Browser sync integration

## 📝 Example Flow

```typescript
// User opens app
1. AuthContext checks isLocalMode() → true
2. AuthContext checks getLocalUser() → null
3. LocalUserGate shows LocalWelcomeScreen
4. User enters name: "Sarah"
5. createLocalUserAccount("Sarah") is called
6. Local user created with ID: local_1704067200000_xyz789
7. User is "logged in" automatically
8. App renders normally with full access
9. All API calls use local user ID
10. Data persists in localStorage
```

## 🎉 That's It!

Local mode makes CineAI incredibly easy to use for personal, self-hosted setups. No barriers, no friction, just great movie recommendations!

---

**Need Help?** Check the [Troubleshooting Guide](./TROUBLESHOOTING.md) or [Self-Hosting Guide](./SELF_HOSTING.md)

