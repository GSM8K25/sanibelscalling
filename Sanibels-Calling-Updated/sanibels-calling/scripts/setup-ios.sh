#!/usr/bin/env bash
# Builds the iOS (Xcode) project for Sanibel's Calling. Run on a Mac, or let the GitHub workflow run it.
#   bash scripts/setup-ios.sh
# Safe to run again after changing anything in www/ (it re-copies the app into the iOS project).
set -euo pipefail
cd "$(dirname "$0")/.."

[[ "$(uname)" == "Darwin" ]] || { echo "This step needs macOS with Xcode. (No Mac? Use the GitHub route in the README.)"; exit 1; }
command -v xcodebuild >/dev/null || { echo "Install Xcode from the Mac App Store first, open it once, then re-run."; exit 1; }
node -e 'process.exit(+process.versions.node.split(".")[0] >= 22 ? 0 : 1)' || { echo "Node 22 or newer is required (https://nodejs.org)."; exit 1; }

echo "› Installing packages"
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi

echo "› Downloading shell and place photos for offline use"
node scripts/fetch-photos.mjs || echo "  (photo download had problems; the app will load photos online instead)"

if [[ ! -d ios ]]; then
  echo "› Creating the Xcode project"
  npx cap add ios
fi

APP=ios/App/App
PLIST=$APP/Info.plist
PBX=ios/App/App.xcodeproj/project.pbxproj

echo "› App icon and launch screen"
cp ios-resources/AppIcon-1024.png "$APP/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
for f in splash-2732x2732.png splash-2732x2732-1.png splash-2732x2732-2.png; do
  cp ios-resources/splash-2732.png "$APP/Assets.xcassets/Splash.imageset/$f"
done

echo "› iPhone settings (permissions, Files app access, portrait only)"
p() { plutil -replace "$1" "$2" "$3" "$PLIST"; }
p CFBundleDisplayName -string "Sanibel’s Calling"
p NSLocationWhenInUseUsageDescription -string "Sanibel’s Calling uses your location to show distances, tag your shell walks with the beach you’re on, mark shell piles and record your walking route while the app is open."
p NSCameraUsageDescription -string "Sanibel’s Calling uses the camera so you can photograph your shell finds for your shell log."
p NSPhotoLibraryUsageDescription -string "Sanibel’s Calling lets you add photos from your library to your shell log."
p UIFileSharingEnabled -bool YES
p LSSupportsOpeningDocumentsInPlace -bool YES
p ITSAppUsesNonExemptEncryption -bool NO
p UIStatusBarStyle -string UIStatusBarStyleLightContent
p UISupportedInterfaceOrientations -json '["UIInterfaceOrientationPortrait"]'
plutil -remove "UISupportedInterfaceOrientations~ipad" "$PLIST" 2>/dev/null || true

# iPhone only (an iPad version would need its own set of iPad screenshots)
sed -i '' 's/TARGETED_DEVICE_FAMILY = "1,2";/TARGETED_DEVICE_FAMILY = 1;/g' "$PBX"

echo "› Copying the app into the Xcode project"
npx cap sync ios
# the content editor is for your website only, not the App Store app
rm -f ios/App/App/public/editor.html ios/App/App/public/editor.js

echo
echo "Done. Open it in Xcode with:  npx cap open ios"
