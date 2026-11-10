# CREMA - The Daily Coffee Ritual

A camera-first, minimalist social coffee app that transforms daily coffee moments into shareable "Digital Polaroids" with AI-powered "Vibe Scores."

## 🎨 Features

- **Zero-Loading Camera**: Opens directly to camera viewfinder (<200ms startup)
- **AI Vibe Scoring**: GPT-4o-mini Vision API analyzes coffee photos (1-10 scale)
- **Digital Polaroids**: Automatically generated Instagram-ready frames
- **The Cupping Room**: Social feed of coffee moments from followed users
- **Bean Ratings**: Discover and rate coffee beans (1-5 stars)
- **Daily Streaks**: Track your coffee ritual consistency
- **Crema Gold**: Premium subscription ($2.99/mo) for unlimited snaps

## 🏗️ Tech Stack

- **Platform**: Native iOS (Swift 5.9+, SwiftUI, iOS 16+)
- **Architecture**: MVVM + Repository Pattern
- **Camera**: AVFoundation
- **AI**: OpenAI GPT-4o-mini Vision API
- **Database**: Supabase (PostgreSQL + Real-time)
- **Storage**: Cloudinary (Image hosting + Polaroid generation)
- **Subscriptions**: RevenueCat
- **Haptics**: UIKit Feedback Generators

## 📁 Project Structure

```
Crema/
├── App/                    # App entry point
│   └── CremaApp.swift
├── Core/                   # Core business logic
│   ├── Models/             # Data models
│   ├── Services/           # Service layer (Camera, OpenAI, Supabase, etc.)
│   ├── Repositories/       # Data access layer
│   └── Utilities/          # Helpers and extensions
├── Features/               # Feature modules
│   ├── Camera/             # Camera capture
│   ├── Scoring/            # AI vibe scoring
│   ├── Polaroid/           # Polaroid generation
│   ├── Feed/               # Social feed
│   ├── Profile/            # User profiles
│   ├── Beans/              # Bean ratings
│   └── Auth/               # Authentication
├── UI/                     # UI components
│   ├── Theme/              # Colors and fonts
│   └── Components/         # Reusable components
└── Resources/              # Assets and configuration
    ├── Fonts/              # Playfair Display
    ├── Assets.xcassets/    # Images and icons
    └── Info.plist          # App configuration
```

## 🚀 Getting Started

### Prerequisites

- macOS 13.0+ (Ventura or later)
- Xcode 15.0+
- iOS 16.0+ device or simulator (camera requires physical device)
- Apple Developer Account (for device testing)

### Create Xcode Project

Since the Swift files are already created, you need to create an Xcode project to build the app:

1. **Open Xcode**
2. **Create New Project**: File → New → Project
3. **Select Template**: iOS → App → Next
4. **Configure Project**:
   - Product Name: `Crema`
   - Team: (Select your team)
   - Organization Identifier: `com.yourdomain`
   - Interface: `SwiftUI`
   - Language: `Swift`
   - Storage: `None` (we're using Supabase)
   - Include Tests: `Yes` (optional)
5. **Save Location**: `/Users/willmorrison/Documents/coffee/Crema`
   - **IMPORTANT**: Uncheck "Create Git repository" (already initialized)
6. **Add Existing Files**:
   - Delete the default `ContentView.swift` and `CremaApp.swift` that Xcode created
   - In Xcode's Project Navigator, right-click the `Crema` folder
   - Select "Add Files to Crema..."
   - Navigate to `/Users/willmorrison/Documents/coffee/Crema`
   - Select all folders (App, Core, Features, UI, Resources)
   - Check "Copy items if needed" and "Create groups"
   - Click "Add"

### Install Dependencies

Add the following Swift Package dependencies in Xcode:

1. **File → Add Package Dependencies...**

2. **Supabase Swift**:
   - URL: `https://github.com/supabase-community/supabase-swift`
   - Dependency Rule: Up to Next Major Version (2.0.0)
   - Add to Target: Crema

3. **RevenueCat SDK**:
   - URL: `https://github.com/RevenueCat/purchases-ios`
   - Dependency Rule: Up to Next Major Version (5.0.0)
   - Add to Target: Crema

4. **Kingfisher** (Image Caching):
   - URL: `https://github.com/onevcat/Kingfisher`
   - Dependency Rule: Up to Next Major Version (8.0.0)
   - Add to Target: Crema

### Add Playfair Display Font

1. Download Playfair Display from [Google Fonts](https://fonts.google.com/specimen/Playfair+Display)
2. Extract and copy these files to `Crema/Resources/Fonts/PlayfairDisplay/`:
   - `PlayfairDisplay-Regular.ttf`
   - `PlayfairDisplay-Bold.ttf`
   - `PlayfairDisplay-SemiBold.ttf`
   - `PlayfairDisplay-Italic.ttf`
3. In Xcode, add fonts to target:
   - Select `Info.plist`
   - Add key: `Fonts provided by application` (array)
   - Add items:
     - `PlayfairDisplay-Regular.ttf`
     - `PlayfairDisplay-Bold.ttf`
     - `PlayfairDisplay-SemiBold.ttf`
     - `PlayfairDisplay-Italic.ttf`

### Configure Environment Variables

The `.env` file already contains most credentials. Add the missing ones:

```bash
# Add to .env
OPENAI_API_KEY=sk-...  # Get from https://platform.openai.com/api-keys
CLOUDINARY_CLOUD_NAME=xxx  # Get from https://cloudinary.com/console
CLOUDINARY_API_KEY=xxx
CLOUDINARY_UPLOAD_PRESET=crema_pours
```

### Set up Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/vabmhosgnzbqwimdpxe)
2. Navigate to SQL Editor
3. Run the database schema (see `docs/supabase-schema.sql` - to be created)

### Build and Run

1. **Select Target Device**: iPhone 14 Pro or later (physical device recommended for camera/haptics)
2. **Product → Run** (⌘R)
3. **Grant Permissions**: Allow camera access when prompted

## 📱 Testing

### On Physical Device

- Camera and haptics require a physical iOS device
- Connect via USB or wireless debugging
- Ensure device is running iOS 16.0+

### Key Test Flows

1. **Camera Capture**: Launch app → Tap shutter → Verify haptic feedback
2. **AI Scoring** (requires OpenAI API key): Capture photo → Wait for score animation
3. **Polaroid Generation** (requires Cloudinary): View framed Polaroid with metadata
4. **Social Feed** (requires Supabase): Navigate to feed → View pours from followed users

## 🎯 Development Roadmap

### ✅ Week 1: Camera UI + Haptic Shutter (CURRENT)
- [x] Folder structure
- [x] Core models (User, CoffeePour, Bean, VibeScore)
- [x] Theme files (Colors, Fonts)
- [x] HapticsService
- [x] CameraService
- [x] ShutterButton component
- [x] CameraView with preview
- [x] App entry point
- [x] Info.plist configuration
- [ ] Add Playfair Display font
- [ ] Test on physical device

### 🔄 Week 2: GPT-4o-mini Vision Integration
- [ ] OpenAIService implementation
- [ ] ScoringView with slot machine animation
- [ ] Score counter animation with haptics
- [ ] Roast text display
- [ ] Error handling for API failures

### 🔄 Week 3: Cloudinary Polaroid Generation
- [ ] CloudinaryService implementation
- [ ] Polaroid frame generation
- [ ] Instagram Stories export (9:16)
- [ ] Share sheet integration
- [ ] Watermark overlay

### 🔄 Week 4: Supabase Auth + Social Feed
- [ ] SupabaseService implementation
- [ ] LoginView and AuthViewModel
- [ ] CuppingRoomView (social feed)
- [ ] Follow/unfollow functionality
- [ ] Steam (like) interactions
- [ ] ProfileView with stats
- [ ] Streak tracking

### 🔄 Week 5: Bean Rating System
- [ ] Bean database tables
- [ ] BeanListView with search
- [ ] BeanDetailView with ratings
- [ ] Star rating component
- [ ] Bean linking to pours

### 🔄 Week 6: RevenueCat + Polish
- [ ] RevenueCatService implementation
- [ ] Subscription paywall
- [ ] Daily quota enforcement
- [ ] Instagram Stories integration
- [ ] Onboarding flow
- [ ] Bug fixes and polish
- [ ] App Store submission

## 📝 License

Proprietary - All rights reserved

## 👥 Team

Built with ❤️ for coffee lovers everywhere

---

**Current Status**: Week 1 in progress - Core camera functionality implemented

For detailed implementation plan, see [Implementation Plan](/.claude/plans/pure-sparking-crayon.md)
