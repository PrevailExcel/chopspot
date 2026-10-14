# Aba Chop Spot

*From Faulks Road to the top.* A casual tycoon game set in Aba. Create your own character (guy or girl, skin tone, outfit, hairstyle, name), start a puff-puff and zobo spot on Faulks Road with Mama Ada showing you the ropes, open a sit-down buka at Ariaria Market, hire staff, and keep climbing the fame ladder. Your name goes on the signs, and the challenge never runs out.

Built with **Phaser 3 + Vite + Capacitor**. There are no image or audio files: every sprite is painted with Canvas 2D at runtime (`src/art.js`), and all sound and music is synthesised with WebAudio (`src/audio.js`). The APK stays small and the art is easy to restyle.

## Run it

```bash
npm install
npm run dev            # open the printed URL on your phone (same Wi-Fi) or desktop
npm run build          # production build in dist/ (used by Capacitor)
npm run build:single   # one self-contained playable file: dist-single/index.html
```

## Put it online (Vercel)

The repo is ready for Vercel (`vercel.json` is included):
1. Push this folder to a GitHub repo.
2. On vercel.com: **Add New → Project**, import the repo, and press **Deploy**. Vercel reads the settings from `vercel.json` (Vite, `npm run build`, output `dist`).
3. Optional: add your own domain under **Settings → Domains**.

Or from your computer: `npx vercel` (preview) and `npx vercel --prod`.

Link previews on WhatsApp and X use `public/og.png`. On Vercel its full address is filled in automatically. If you add a custom domain, set an environment variable `SITE_URL=https://yourdomain` in the Vercel project and redeploy.

## Getting players to install it

The web build is an installable app (manifest + offline service worker via `vite-plugin-pwa`). Once installed it plays without data. The logic is in **`src/install.js`**:

| Where the player is | What the game does |
|---|---|
| Android Chrome / Edge / Samsung Internet | Holds back the browser's install banner and shows its own "Get the app" card at a good moment, then the real install sheet. |
| iPhone / iPad Safari | Shows the 3 taps: Share → Add to Home Screen → open it. |
| Inside WhatsApp, Instagram, Facebook, X, TikTok… | Asks right after character creation to open the game in Chrome (one tap on Android) or Safari, because installing is impossible there and saves don't move over later. |
| Opened from the home screen | Pays a one-time **₦1,000 install bonus** (`INSTALL_BONUS`). |

When it asks: after the 3rd unlock, a claimed goal, a fame level-up, or closing the welcome-back screen, never in the first 40 seconds, once per session, at least 20 hours apart, at most 4 times. A small phone button with a "+₦1k" tag sits under the map button until the game is installed. Funnel events (`install_ask`, `install_choice`, `install`, `install_bonus`, …) go to `TRACK_URL` with the ad events.

Nothing shows inside the Android app (Capacitor) or when the game is embedded in another page.

## Android (Capacitor)

The `android/` project is already generated, set to portrait, and includes the haptics plugin.

```bash
npm run cap:sync       # build + copy web assets into android/
npx cap open android   # open in Android Studio, then Run or Build > Generate Signed Bundle
```

App id: `com.reevatech.puffzobo` (change it in `capacitor.config.json` and `android/app/build.gradle` before publishing).

## The two branches

**Faulks Road Spot** (counter service): fry puff-puff, pour zobo, stock the counter, check customers out at the till, load the green-and-brown shuttle buses.
12 unlocks, including staff: Chioma (cashier), Tunde and Emeka (runners), **Bayo (shuttle loader)** and **Uju (manager)**. The Neon Sign shows *YOURNAME'S CHOP SPOT*.

**Ariaria Buka** (table service, opens for ₦3,000 after the Neon Sign): customers sit down and order jollof rice, noodles, akara, bread and malt. Carry the food to their table. When they leave, collect the money and dirty plates, and wash the plates at the sink before the table can be used again.
16 unlocks: noodle pot, akara fryer, bread oven, drinks fridge, tables 3 to 6, keke orders, Ngozi and Kemi (waiters), Musa (cleaner), Sule (keke loader), Obi (manager), and a generator with festoon lights.

**GRA Lounge (Level 3, full 3D)**: opens for ₦25,000 after the Generator & Lights at Ariaria. A high-end continental restaurant with its own street: guests arrive in parties and wait at the door, you seat them at the host stand, carry dishes from the kitchen pass (steak, seafood pasta, Caesar salad, pizza, chocolate cake, mocktails), collect the bill plus tip, and clear plates to the dish return. Parties of 1 to 4, VIP tables that tip big, birthday-party bookings at the event table with a timer, and decor that raises prices (chandelier, live band, gallery wall, terrace, fountain).
24 unlocks, staff: Ifeoma (host), Chidi and Adaeze (waiters), Emeka (busser), Tobi (event planner), Mrs. Eze (manager), plus chefs, a bartender, a band and a security guard. The player's name is on the facade, the gate pylon and the kitchen sign. Controls: drag (joystick) or tap where to go; pinch to zoom, twist two fingers to turn, two-finger drag up/down to tilt; the eye button opens Explore mode (drag to pan around the whole site); the camera button switches overview/close-up and resets the view. On desktop: click to walk, mouse wheel to zoom, right-drag to turn. A one-time "How to play here" card and floating labels (SEAT GUESTS, PICK UP, SERVE, CLEAR, RETURN PLATES, COLLECT) guide new players.

Travel between branches with the **map** button. You can change your character any time from **Settings → Change character**.

## Billboards (real ad space)

In the GRA Lounge, ads run on two screens instead: one on the facade facing the street and one above the bar (`SCREENS` in `src/ads.js`). Each 2D branch has three roadside billboards: a **main board** on the street edge of the lot (in view whenever you're at the counter) and **two boards across the street**. Vezio is on both main boards. The street boards rotate between Vezio and a "Your brand here" board.

Everything is in **`src/ads.js`**:
- `CREATIVES`: each advertiser's link, plus either a board painted in code or an image you drop into `public/ads/` (1200×560 px).
- `SLOTS`: which ads go on which board. A board with several ads flips between them every `ROTATE_EVERY` seconds.
- `BOOKING_URL`: where "Your brand here" sends people (for example a WhatsApp link).
- Tapping a board opens the advertiser's link with `utm_source=abachopspot` so they can see the visits in their own analytics.
- Views and taps are counted per ad on each device (`abaAds.stats()` in the browser console). Set `TRACK_URL` to a small endpoint (for example on your Laravel API) to collect them from all players.

## Money while you're away

Every branch keeps earning while you're at the other one, or while the app is closed. How much depends on how many staff you've hired there.
- The money waits in that branch's **cash box**. The box has a limit, and the **Bigger Cash Box** upgrade raises it.
- If that branch has a **manager**, you can collect from the map without travelling. Otherwise it waits at the till for your next visit.

## Why it never ends

| System | What it does |
|---|---|
| Fame levels (no cap) | Every served customer earns XP. Each level brings more customers, bigger orders and less patience, but higher prices. |
| Patience | Customers walk out if you're too slow. Walkouts break your streak and cost fame XP. |
| Timed vehicles | Shuttles and kekes leave if not loaded in time, paying only half for what was loaded. |
| Rush hours | Random 40-second rushes with double the customers and 1.5x pay. |
| Endless goals | There are always 3 goals per branch. Finish one and a harder, better-paying one replaces it. |
| Long upgrade tracks | Up to 40 levels with steeply rising costs, including Shade & Fans (patience), Staff Training and Bigger Cash Box. |

Unattended, a fully staffed branch levels up until demand outgrows the staff, so you're pushed back to the upgrade desk to keep climbing.

## Try Level 3 without playing up to it

Open the game with **`?demo=gra`** (for example `https://chopspot.vercel.app/?demo=gra`). It starts in the GRA Lounge with ₦20,000 and saves nothing, so the real progress on that phone is untouched. The single-file preview build (`npm run build:single`) opens in this demo by default; `?demo=off` turns it off.

## The 3D restaurant (how it is built)

`src/lounge/` holds Level 3. Three.js and this code download only when a player first goes there (~170 KB compressed), so Faulks Road and Ariaria stay light. The 3D canvas sits under the Phaser canvas, so the HUD, joystick and pop-ups are shared; the GRA scene (`src/scenes/LoungeScene.js`) extends the same branch engine as the 2D branches.

- **No model files.** People, furniture and the street are built in code. Each person is one skinned mesh (one draw call) on an 18-bone skeleton with code animation (walk, sit, eat, talk, carry a tray, cook, mix drinks, play bass/keys/drums, cheer). Outfits: suits, senator wear, shirts and chinos, jeans and tops, blazers, gowns (knee and floor length), skirts, jumpsuits, and staff uniforms.
- **The premium look:** warm painted light pools and soft contact shadows (cheap "baked" lighting), emissive lamps, PBR materials with studio reflections, ACES tone mapping, a day-to-night clock (a game hour is 40 seconds; the restaurant opens at dusk).
- **Performance:** furniture is merged per material, all dishes and cash are instanced, people share one material. Quality tiers: **High** (live shadows, bloom, 4 lights), **Medium** (no live shadows, 2 lights), **Low** (no extra lights, 1x resolution). The game picks one from the phone and steps down if frames drop; players can override it in **Settings → Graphics**. A full restaurant on Medium is about 135 draw calls and 225k triangles.
- `lounge-test.html` + `src/lounge/devtest.js` is a dev-only viewer (`npm run dev`, then `/lounge-test.html?t=world&gfx=high&h=20`). It is not part of the game build.

| File | What it does |
|---|---|
| `lounge/view.js` | renderer, quality tiers, camera, post-processing |
| `lounge/kit.js` | shared materials, procedural textures, part merging |
| `lounge/person.js` | 3D people: outfits, hair, skeleton, animation |
| `lounge/props.js` | furniture, kitchen, bar, stage, cars, palms, villas |
| `lounge/world.js` | the whole site, lights, signs, ad screens, traffic, day/night |
| `lounge/objects3d.js` | zones, unlock pads with holograms, dish & cash piles, bubbles |
| `lounge/actors.js` | the player, walkers, guests, staff with trays |
| `lounge/nav.js` | A* pathfinding for guests and staff |

## Where to tune things

Everything numeric lives in **`src/config.js`**: layouts, prices, unlock lists and costs, upgrade curves, fame curves (`FAME`), rush hours (`RUSH`), how much each branch earns while you're away (`BRANCHES`).

```
src/
  main.js               boot, DPR-aware sizing, font loading
  config.js             all balance and layout numbers
  install.js            home-screen install prompts, install bonus
  lounge/               Level 3: the 3D GRA Lounge (loaded on demand)
  ads.js                billboards: advertisers, board slots, view/tap counting
  state.js              save format (v2, migrates v1 saves), away-earnings maths
  profile.js            player character: guy/girl, skin, outfit, hair, name on the signs
  art.js                every texture, painted in code
  audio.js              synth SFX + afro-pop music loop
  platform.js           haptics (Capacitor/vibrate) + storage
  scenes/
    BootScene.js        builds textures, loads the save
    BranchScene.js      shared engine: player, pads, cash, vehicles, fame, rush, goals, travel, saving
    StandScene.js       branch 1: counter + queue + till + seating
    BukaScene.js        branch 2: table service, dirty plates, sink
    LoungeScene.js      branch 3: 3D restaurant flow (parties, host, VIPs, bookings, staff)
    UIScene.js          HUD, joystick, goals, branch map, upgrades, character creator, modals, title
  entities/             Rig (characters), Customer, Vehicle, staff AI (Runner, Cashier, Loader, Waiter, Cleaner, Manager)
  objects/              Producer, Pile, CashPile, Pad, Zone, Bubble, fly animation
```

Adding a third branch means writing one more `BranchScene` subclass plus its entry in `BRANCHES`.
