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

Travel between branches with the **map** button. You can change your character any time from **Settings → Change character**.

## Billboards (real ad space)

Each branch has three roadside billboards: a **main board** on the street edge of the lot (in view whenever you're at the counter) and **two boards across the street**. Vezio is on both main boards. The street boards rotate between Vezio and a "Your brand here" board.

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

## Where to tune things

Everything numeric lives in **`src/config.js`**: layouts, prices, unlock lists and costs, upgrade curves, fame curves (`FAME`), rush hours (`RUSH`), how much each branch earns while you're away (`BRANCHES`).

```
src/
  main.js               boot, DPR-aware sizing, font loading
  config.js             all balance and layout numbers
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
    UIScene.js          HUD, joystick, goals, branch map, upgrades, character creator, modals, title
  entities/             Rig (characters), Customer, Vehicle, staff AI (Runner, Cashier, Loader, Waiter, Cleaner, Manager)
  objects/              Producer, Pile, CashPile, Pad, Zone, Bubble, fly animation
```

Adding a third branch means writing one more `BranchScene` subclass plus its entry in `BRANCHES`.
