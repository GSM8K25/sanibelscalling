# Sanibel’s Calling

Your Sanibel visitor guide and shell app, merged into one and set up for the App Store. The same `www/` folder is also the website version, and it hosts the editor you use to keep the content fresh.

**What’s inside**
| Path | What it is |
|---|---|
| `www/` | The app. Upload this folder to your website (Netlify). |
| `www/content.json` | **All the guide content**: places, must-sees, shells, strategy, tips, hotspots, sunrise/sunset spots, favorites, notes, booking link. Edit it with the editor, not by hand. |
| `www/editor.html` | Your content editor (on your website only; it’s removed from the App Store app) |
| `www/native.js` | iPhone features: native GPS, haptics, share sheet, Files backup. **Has your website address at the top.** |
| `www/privacy.html`, `www/support.html` | Privacy policy and support pages Apple requires |
| `scripts/setup-ios.sh` | Creates the Xcode project, downloads shell photos for offline use, applies iPhone settings |
| `scripts/fetch-photos.mjs` | Downloads the shell and place photos with photographer credits (setup runs it) |
| `.github/workflows/testflight.yml` | Builds and uploads the app from GitHub’s Macs if you don’t have one |
| `app-store/listing.md` | Everything to paste into App Store Connect |
| `app-store/screenshots/` | Five 6.9-inch iPhone screenshots |

---

## Step 1. Fill in three things
1. **Website address:** pick your Netlify name (e.g. `sanibels-calling.netlify.app`) and put it in `webUrl` at the top of `www/native.js`. The iPhone app downloads your content updates from there.
2. **Support email:** replace every `SUPPORT_EMAIL` in `www/privacy.html` and `www/support.html` (2 in each).
3. **Bundle ID:** `com.gregmifflin.sanibelscalling` in `capacitor.config.json`. It’s permanent after the first upload, so change it now if you want something else.

## Step 2. Put the website up
Drag the `www` folder onto https://app.netlify.com/drop (or onto your existing guide site’s **Deploys** page to replace the old guide). Set the site name to match Step 1. Check that these open:
- `https://<your-site>/` (the app)
- `https://<your-site>/editor.html` (your editor)
- `https://<your-site>/privacy.html` and `/support.html`

## Step 3. Make it yours with the editor
Open `https://<your-site>/editor.html` on your phone or computer.
- **Island notes:** quick updates on the Explore page (“Shell line is huge after Tuesday’s front!”). Pin the important ones.
- **Shell strategy:** the numbered steps on the strategy page. Add, edit and reorder them.
- **Shell hotspots:** standing on the spot? Open the hotspot, tap **Use my location** and you’ve dropped an exact pin. Or use **Pick on map** (satellite view).
- **Sunrise & sunset, Local favorites, Island tips, Places:** same idea. Places with a must-see number appear in the Must-sees row.
- **Shells:** add **Our tip** to any shell. **Photo check** shows every shell’s photo on one page; if one is wrong or weak, open that shell and upload your own picture.
- **Booking & settings:** booking link, button label and the “listings checked” date.

Your edits save in that browser as you go. **Preview in app** shows them in the app with a yellow PREVIEW bar.

**To publish:** tap **Download content.json**, replace `www/content.json` with it, and re-upload the `www` folder to Netlify. The website updates right away. The iPhone app checks your site for newer content each time it opens, so App Store users get it with no app update. (An App Store update is only needed for new features.)

## Step 4. Join the Apple Developer Program
https://developer.apple.com/programs/enroll/ costs $99/year. Enroll as an Individual (two-factor must be on). Approval takes a day or two. (If you already did this for Flyway Journal, one membership covers both apps.)

## Step 5. Build the app (pick one)
**Route A, with a Mac (lets you test on your phone first):**
1. Install **Xcode 26+** (Mac App Store) and **Node 22+** (nodejs.org).
2. In Terminal, in this folder: `bash scripts/setup-ios.sh`, then `npx cap open ios`.
3. Xcode › App › **Signing & Capabilities** › Team: pick your account.
4. Plug in your iPhone and press ▶ to run it. Test with the Step 6 list.
5. Upload: choose **Any iOS Device (arm64)**, then **Product › Archive › Distribute App › App Store Connect**.

**Route B, no Mac (GitHub builds it):**
1. Make a **private** GitHub repository and upload this whole folder, including the hidden `.github` folder.
2. App Store Connect › Users and Access › Integrations › App Store Connect API: create a key with the **Admin** role and download the `.p8` file (you can only download it once).
3. GitHub repo › Settings › Secrets and variables › Actions: add `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID` and `ASC_KEY_P8` (the whole text of the .p8 file).
4. Actions tab › **Build & upload to TestFlight** › Run workflow (~20 min). Then test on your phone with the TestFlight app.

## Step 6. Test on your iPhone
- [ ] Explore shows your logo, sunrise/sunset, **next low tide** and the booking card; **Check dates & book** opens your Guesty site
- [ ] Shells tab: the shelling outlook shows tide times and wind; shell photos appear; open a few shells
- [ ] Shell log: start a walk (location prompt), count shells (little haptic taps), add a photo, Mark here, Track route, End walk
- [ ] Map: places, shell hotspots, sunrise/sunset spots, your marked spots
- [ ] Tips › Save backup appears in **Files › On My iPhone › Sanibel’s Calling**
- [ ] Edit a note in the editor, publish it, reopen the app: the note appears

## Step 7. App Store Connect, then submit
Create the app (**Apps › + › New App**, iOS, name **Sanibel’s Calling**, your bundle ID, SKU `sanibels-calling-ios`). Fill everything in from `app-store/listing.md`: subtitle, categories, age rating, pricing (Free), App Privacy (“Data Not Collected”), privacy and support URLs, screenshots, description, keywords and review notes. Pick the build, then **Add for Review › Submit**. Review usually takes 1–3 days.

After approval, paste your App Store link into `appStoreUrl` in `www/native.js` so **Share this app** points to the App Store, and include that in your next update.

---

## What changed from the old guide
- **One app:** Explore (your guide), **Shells** (outlook, hotspots, guide), **Shell log**, **Map**, **Tips**.
- **Shell guide:** 39 species. Names checked against the Shell Museum’s Southwest Florida guide and the Jacksonville Shell Club. Four names were updated to current science:
  - Lace Murex is now *Chicoreus florifer*.
  - Florida Lion’s Paw is now *Nodipecten fragosus*.
  - Calico Clam is now *Megapitaria maculata*.
  - Rose Petal Tellin is now *Eurytellina lineata*.
- **Shell pages:** each has ID points, look-alikes, where and when to find it, a fun fact, a “How often found” rating and a link to its reference page.
- **Photos:** each shell uses the lead photo from its Wikipedia article (Creative Commons, credited in the app). The iPhone build downloads them for offline use. I couldn’t see these photos from where I built the app, so go through **Photo check** in the editor and replace any that are wrong or weak.
- **Tides:** NOAA predictions for the nearest station, falling back to a weather model if NOAA can’t be reached.
- **Live-shell rule:** updated to Florida Fish and Wildlife’s Lee County wording, including the exceptions for oysters, hard clams, sunray venus and coquinas.
- **Starter content to make your own:**
  - Shell hotspots link to beach listings. Add exact pins with Use my location on your next beach walk.
  - The sunrise/sunset spots and local favorites are starter picks; edit them freely.
- **Your logo** is the header, the app icon (lighthouse and sunset crop) and the launch screen.
- **Offline:** fonts are bundled and the app works offline. The website version also installs to the home screen like before.

## Good to know
- **Not yet tested against the real services.** Tides, the NOAA station lookup, weather and the Wikipedia photo lookups were only tested with sample data, because my build environment couldn’t reach those services. Check them on a real phone (Step 6). If tide times show “approximate”, NOAA couldn’t be reached and the weather-model fallback was used. You can set a specific NOAA station ID in the editor (Booking & settings).
- **Free data terms.** Esri maps and Open-Meteo weather are free for non-commercial use, and NOAA data is public. The app is free, but it links to your rental. If you ever charge for the app or add ads, look at their paid plans.
- **Home screen name.** iOS shortens long names under the icon, so you may see “Sanibel’s Calli…”. To change the label under the icon only, change `CFBundleDisplayName` in `scripts/setup-ios.sh`, e.g. to “Sanibel”.
- **Don’t change after release:** the bundle ID, or Capacitor’s app address. Users’ shell logs live under that address.
