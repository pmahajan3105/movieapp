# 📋 Account Section - Product Requirements Document (PRD)

## 🎯 **Overview**
Create a focused Account section where users can view their basic profile information and manage AI-learned preferences for movie recommendations.

---

## 🚀 **Core Features**

### 1. **Basic User Profile**
- **User Name**: Display and edit user's full name
- **Email Address**: Display user's email (read-only from auth)
- **Account Created**: Show when account was created
- **Last Active**: Show last login/activity date

### 2. **AI-Learned Preferences**
Central section showing all attributes the AI has learned about the user for personalization:

#### **Movie Preferences**
- **Favorite Genres**: Action, Comedy, Drama, etc.
- **Favorite Actors**: List of preferred actors
- **Favorite Directors**: Preferred directors
- **Favorite Franchises**: Marvel, DC, Star Wars, etc.
- **Era Preferences**: Classic films, modern movies, specific decades
- **Mood Preferences**: Feel-good movies, intense thrillers, etc.

#### **Viewing Preferences**
- **Movie Length**: Short films, standard, epic films
- **Rating Preferences**: G, PG, PG-13, R ratings
- **Language Preferences**: English, subtitled, foreign films
- **Series vs Movies**: Preference for TV series or movies

#### **Content Preferences**
- **Themes**: Romance, action, mystery, sci-fi themes
- **Tone**: Light-hearted, serious, dark, uplifting
- **Complexity**: Simple plots vs complex narratives
- **Visual Style**: Animation, live-action, documentary

#### **Social Preferences**
- **Watch Context**: Solo viewing, family movies, date night films
- **Recommendation Style**: Surprise me vs similar to favorites

### 3. **Preference Management**
- **View All**: See complete list of learned preferences
- **Individual Delete**: Remove specific preferences with confirmation
- **Category Delete**: Clear entire categories (e.g., all genre preferences)
- **Reset All**: Complete preference reset with strong confirmation
- **Preference Source**: Show which conversations led to each preference
- **Last Updated**: When each preference was learned/updated

---

## 🎨 **UI/UX Requirements**

### **Layout Structure**
```
┌─────────────────────────────────────┐
│ Account Settings                     │
├─────────────────────────────────────┤
│ 👤 Profile Information              │
│   Name: [Editable Field]            │
│   Email: user@example.com           │
│   Member Since: Jan 2024            │
│   Last Active: 2 hours ago          │
├─────────────────────────────────────┤
│ 🧠 AI-Learned Preferences          │
│                                     │
│ 🎭 Movie Preferences (5)           │
│   • Action Movies ✕                │
│   • Marvel Universe ✕              │
│   • Christopher Nolan ✕            │
│                                     │
│ 🎯 Viewing Preferences (3)         │
│   • 2+ hour movies ✕               │
│   • R-rated content ✕              │
│                                     │
│ 🎨 Content Preferences (4)         │
│   • Complex narratives ✕           │
│   • Dark themes ✕                  │
│                                     │
│ [Clear All Preferences]             │
└─────────────────────────────────────┘
```

### **Visual Design**
- **Clean Cards**: Each preference category in its own card
- **Deletion Controls**: X buttons next to each preference
- **Confirmation Modals**: For deletions, especially bulk operations
- **Empty States**: Helpful message when no preferences exist
- **Loading States**: Show when preferences are being updated

---

## 🔧 **Technical Requirements**

### **Database Schema Updates**
- Extend user profiles table with editable fields
- Create preferences tracking system
- Link preferences to conversation sessions
- Add timestamps for preference learning

### **API Endpoints Needed**
- `GET /api/user/profile` - Get user profile info
- `PUT /api/user/profile` - Update user name
- `GET /api/user/preferences` - Get all learned preferences
- `DELETE /api/user/preferences/:id` - Delete specific preference
- `DELETE /api/user/preferences/category/:category` - Delete category
- `DELETE /api/user/preferences/all` - Reset all preferences

### **Frontend Components**
- `AccountPage` - Main account page component
- `ProfileSection` - User info display/edit
- `PreferencesSection` - AI preferences management
- `PreferenceCard` - Individual preference display
- `DeleteConfirmModal` - Confirmation dialogs

---

## 📱 **User Flow**

1. **Access Account**
   - User clicks "Account" in dashboard navigation
   - Navigates to `/dashboard/account`

2. **View Profile**
   - See basic profile information
   - Edit name if needed

3. **View Preferences**
   - Browse all AI-learned preferences by category
   - See how many preferences in each category
   - View when preferences were learned

4. **Manage Preferences**
   - Delete individual preferences
   - Clear entire categories
   - Reset all preferences with confirmation

5. **Immediate Feedback**
   - Preferences update immediately
   - Success/error messages
   - Recommendations reflect changes

---

## ✅ **Success Criteria**

- Users can easily view all AI-learned preferences
- Users can granularly control their preference data
- Interface is intuitive and non-overwhelming
- Changes reflect immediately in recommendations
- No accidental data loss through confirmations

---

## 🔄 **Future Considerations**

- **Manual Preference Addition**: Let users add preferences manually
- **Preference Weights**: Show importance/confidence levels
- **Preference History**: Timeline of how preferences evolved
- **Import/Export**: Backup and restore preferences 