<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1aVWiBbL6TQ9n6JZJU2Q6VreqsQH3fzwM

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
# Android APK Build Workflow

The project includes a GitHub Actions workflow that automatically builds an Android APK on every push to the main branch.

## Features
- ✅ Automatic APK generation
- ✅ Firebase integration (Auth, Firestore)
- ✅ PWA capabilities
- ✅ Offline support

## Getting the APK

1. Go to the **Actions** tab in your GitHub repository
2. Click on the latest workflow run
3. Download the `app-debug.apk` from the **Artifacts** section
4. Install on your Android device

## Local Development

For local Android development:
```bash
# Install dependencies
npm install

# Build web app
npm run build

# Add Android platform
npx cap add android

# Sync and run on device/emulator
npx cap run android
```
