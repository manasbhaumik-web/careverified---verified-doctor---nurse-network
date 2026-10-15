# Accessibility

What the platform does for accessibility, how it was checked, and what has not been done. The public wording is in
[PatientAccess.tsx](../src/components/PatientAccess.tsx) (English, Bahasa Malaysia and Chinese). If you change a claim there,
re-run the checks below and update this file.

## What was checked (15 October 2026)
Automated: axe-core 4.10.2, rule sets WCAG 2.0 A/AA and WCAG 2.1 A/AA, run in the browser against the running app.

| Screen | Theme | Result |
|---|---|---|
| Landing page (signed out), English, Malay, Chinese | Sky Blue | 0 failures |
| Landing page, English | Bright Cyan, Crimson Red | 0 failures |
| Landing page, English | Dark Navy Blue | 43 failures (contrast), **not fixed** |
| Patient screens: Member Hub, Consult Now, Pharmacies, Medical Tourism, Help, Doctors & Nurses, Medical Library, Secure Mailbox | Sky Blue | 0 failures |

Before the fixes below the landing page had 50 contrast failures and the patient screens had 5 other failures.

## Fixed in this pass
- Sky Blue brand colour `#0284C7` (4.09:1 on white) became `#0270A9` (about 5.4:1). Crimson `#DC2626` became `#C81E1E`.
  Bright Cyan already used a dark enough text colour (`#0E7490`).
- Footer link labels were slate-400/500 on a dark band (as low as 1.98:1). They now use the light footer colour.
- "Cancel" and "Valid until" on the member hub were slate-400 on white (2.56:1). Now slate-600.
- Directory and tourism tabs pointed `aria-controls` at panels that do not exist. The attribute is removed.

## Already in place
- "Skip to content" link, labelled fields, text alternatives for images (axe finds no failures for these).
- On touch screens, fields and full-width buttons are at least 44 px tall; small buttons get a larger invisible hit area.
- Text is never below 11 px on phones. Inputs are 16 px so iOS does not zoom. See [MOBILE_FIRST.md](MOBILE_FIRST.md).

## Not done
- **No screen-reader testing** (NVDA, VoiceOver, TalkBack). Automated tools find only some problems.
- **No human keyboard or zoom/reflow testing.**
- **Dark Navy Blue theme fails contrast**: many light cards sit inside a dark theme override. Needs a pass over every card colour.
- **13 contrast checks axe could not decide** on the landing page (text over photos in the hero). Check by eye.
- **Not scanned:** doctor, pharmacy and admin screens; pop-up windows and dialogs; states with errors showing.
- **No text-size or high-contrast control.** Themes only change colour.
- **Video consultations** have no captions or sign-language option.
- **No way to report a barrier before signing in.** The statement points to Help & support after sign-in.
- Indonesian and Arabic are not available (Arabic would also need right-to-left layout checks).
- Malay and Chinese wording is a developer draft: have a native reader check it.

## How to run the check again
1. Start the app and open the page. Open the browser console (or use the browser tool's script runner).
2. Load axe-core (cdnjs `axe-core/4.10.2/axe.min.js`) by adding a script element, then run
   `axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })`.
3. Open any `<details>` first, since axe skips hidden content. Repeat for each theme (set `data-theme` on `<html>`) and language.
