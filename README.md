# wen — XRPL Consensus & Amendment Radar

> **Live consensus tracker for upcoming XRP Ledger (XRPL) features, amendments, validator votes, and activation countdowns.**

Built with **TypeScript**, **Vite**, and mobile-first dark glassmorphic styling.

---

## Features

- ⚡ **Consensus Progress Bar**: Direct visual indicator line and pin for the **80% + 1 (28/35 votes)** consensus threshold, with dynamic fill and glow depending on majority status.
- ⏳ **Live Countdown Clocks**: Real-time ticker for amendments in the 14-day lock period (e.g. `BatchV1_1` scheduled for activation on September 29, 2026).
- 🎯 **All Active Amendments Overview**: Track all 10 amendments currently in voting side-by-side with quick-switcher pills and comparison cards.
- 🛡️ **Validator Breakdown**: Full list of UNL validators voting Yea vs. Nay, with recursive parent-domain favicon resolution (`shadow.haas.berkeley.edu` → `haas.berkeley.edu` → `berkeley.edu`) and automatic image fallbacks.
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
