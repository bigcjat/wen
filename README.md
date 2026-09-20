# wen — XRPL Consensus & Amendment Radar

> **Live retro 8-bit consensus tracker for upcoming XRP Ledger (XRPL) features, amendments, xrpld validator upgrade status, and activation countdowns.**

Built with **TypeScript**, **Vite**, and authentic pixel-arcade styling inspired by the classic "wen mint?" tracker.

---

## Features

- 👾 **Authentic Retro 8-bit Aesthetic**: Pixel fonts (`Press Start 2P`, `Silkscreen`), glowing white retro frames, and arcade status banners (`wen batch?`, `wen delegate?`, `wen vault?`).
- 📊 **3-Tier Validator & Upgrade Tracking**:
  1. **Xrpld Validators**: Tracks network-wide validator upgrade progress to the amendment's required software version.
  2. **UNL Validators**: Tracks consensus UNL nodes updated to the required version with the 80% consensus target line.
  3. **Segmented Votes & Amendment Blocking**: Visual breakdown of `YES`, `NO`, and `OUTDATED` validators at risk of being amendment-blocked upon activation.
- ⏳ **Live Countdown Clocks**: Real-time ticker for amendments in the 14-day lock period (e.g. `BatchV1_1`).
- 🎯 **All Active Amendments Overview**: Track all amendments currently in voting side-by-side with quick-switcher pills and comparison cards.
- 🛡️ **Validator Breakdown**: Full list of UNL validators voting Yea vs. Nay, with recursive parent-domain favicon resolution and automatic image fallbacks.
- 🎊 **48-Hour Post-Activation Retention**: Newly activated amendments remain featured for 48 hours with a full-screen canvas confetti shower!
- 🚀 **Zero-Config GitHub Pages**: Built with relative asset paths (`./`) and an automatic GitHub Actions deployment workflow.

---

## Getting Started Locally

```bash
# Clone the repository
git clone https://github.com/bigcjat/wen.git
cd wen

# Install dependencies
npm install

# Start local development server
npm run dev

# Build production bundle
npm run build
```

---

## Deployment to GitHub Pages

This repository is already configured with `.github/workflows/deploy.yml` for automated GitHub Actions deployment.

1. Go to your repository **Settings** on GitHub.
2. Under **Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` — GitHub Actions will build and deploy automatically to `https://bigcjat.github.io/wen/`.
