# Mobile-first UI

The app is designed for a phone first (375 px wide) and enhanced upward. Below `lg` (1024 px) the shell is the phone layout, including on tablets; at `lg` and above the existing desktop tabs return. Desktop layouts were not changed.

## What was audited
Every screen for every role (patient, practitioner, pharmacy, admin, signed-out) was loaded at 375 x 812 with demo data and checked for: horizontal overflow, controls under 36 px, text under 11 px, and (by eye) thumb reach and clutter. **No screen overflowed horizontally** before or after; the problems were ergonomics.

## What changed
### App shell (`src/App.tsx`)
- **SOS and notifications are always one tap away.** Before, below `lg` the header showed only a hamburger, so the patient's emergency button was hidden inside the menu. SOS (patients), the notification bell and the menu now sit in the phone header.
- **Bottom tab bar** with the four places each role uses most (patient: Home, Consult, Pharmacy, Mailbox; practitioner: Portal, On Call, Shifts, Mailbox; admin: Admin, Doctors, Tourism, SEO; pharmacy: Workspace, Help) plus **More**. The tab bar respects the iPhone home-indicator area, shows the active tab (`aria-current`), and the page leaves room for it.
- **Menu is a scrollable sheet** below the header, not a panel that pushes the page down; it stops above the tab bar so "Close" stays reachable.
- Tighter page padding on phones; the toast avoids the notch.

### Dialogs
Every full-screen overlay (`fixed inset-0 … flex items-center`) becomes a **bottom sheet** on phones: full width, rounded top corners, up to 92% of the visible height, scrollable, slide-up animation. One CSS rule covers all dialogs (SOS, payment, privacy centre, enquiries, job and library readers, …). SOS and notification dialogs open above the tab bar.

### Touch and text (`src/index.css`)
- On touch screens form fields are at least 44 px tall and full-width buttons get a 44 px minimum; small controls get an invisible 6 px hit-area halo without changing how they look.
- Text never renders below 11 px on phones; long words and codes wrap instead of pushing the layout. Inputs stay at 16 px so iOS does not zoom on focus (already present).
- `viewport` meta adds `interactive-widget=resizes-content` so the on-screen keyboard shrinks the page instead of covering the composer; plus mobile web-app and no-auto-phone-link hints.
- Keyboards and password managers: email fields use the email keyboard, no auto-capitalisation, and proper `autocomplete` values on sign-in and registration.

### Screens
- **Landing:** compact one-row header, a sticky **Sign in / Create account** bar that hides while the form is on screen, the promo strip hidden on phones.
- **Footer:** compact on phones (brand, legal links, copyright); the link columns return from tablet width. The invented "100% operational / 14 ms latency / 256-bit" status widget was removed: none of it was measured.
- **Page banners:** tighter, with the description clamped to three lines.
- **Doctors and nurses directory:** filters start **closed** behind a Show button so practitioners come first; the city filter now lists the cities that exist in the data.
- **Practitioner profile:** a sticky **fee + Book** bar jumps to the booking panel, which was previously below the reviews, three screens down.
- **Secure mailbox:** list first, then one conversation full-screen with a back arrow, and the message box pinned above the keyboard.
- **On call (practitioners):** the four status numbers are a 2 x 2 grid with a full-width Go online button; the 7 x 24 roster grid, which needed sideways scrolling with 24 px cells, becomes a day picker with large hour buttons (the full grid stays from tablet width up).

## Checking it again
Resize the browser pane to 375 x 812, sign in as each demo role (`npm run seed:demo` creates them), and for each nav item report `document.documentElement.scrollWidth - innerWidth`, elements whose `getBoundingClientRect().right > innerWidth` (not inside an `overflow-x` container), controls under 36 px, and text under 11 px. Nothing should overflow, and no screen should need a second thumb stretch to reach its main action.

## Not done / next
- Pages not reviewed one by one beyond the audit and the key flows: admin dashboards, the clinical workspace, pharmacy workspace, tourism desk and job board were audited for overflow and size but not redesigned. Dense tables there scroll sideways rather than reflowing into cards.
- The landing page is still very long on a phone (about 17 screens; the corporate section is gone, so a little shorter). The invented badges and metrics were removed or reworded (see the task list, section 9).
- The "Syncing Clinical Registry…" loading screen renders the whole footer under it.
- No offline support or install prompt: a web app manifest with PNG icons and a service worker would make it installable.
- No real-device testing yet: emulation does not reproduce iOS keyboard behaviour, safe areas or scroll chaining. Test on an iPhone and a mid-range Android before launch.
- Chinese, Arabic and long Malay strings were not stress-tested in the narrow tab bar labels (they are truncated, not wrapped).
