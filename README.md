# Opencode Gemini Switcher

A standalone, high-performance authentication and account-switching plugin for OpenCode.

## Features

- **Automated Account Sync**: Automatically synchronizes with `~/.gemini/oauth_creds.json` (managed by external quota-aware switchers).
- **Proactive Token Refresh**: Handles background token rotation and validity checks.
- **Enhanced Mapping**: Maps OpenCode model requests to the Google Cloud Code Assist (v1internal) API.
- **Portable**: Zero-dependency build (`dist/index.js`) makes it easy to install on any device.

## Setup & Credentials

Before building, you must provide your Gemini OAuth credentials:

1. Open `index.ts` (or `src/constants.ts`).
2. Replace `YOUR_GEMINI_CLIENT_ID` and `YOUR_GEMINI_CLIENT_SECRET` with your actual Google Cloud credentials.
3. If you are using the default Gemini CLI credentials, you can find them in the original `opencode-gemini-auth` plugin source.

## Installation

1. Clone this repository.
2. Install dependencies: `bun install`
3. Build the plugin: `bun run build`
4. Link the plugin to OpenCode:
   ```bash
   ln -s $(pwd)/dist/index.js ~/.config/opencode/plugin/opencode-gemini-switcher.js
   ```
5. Restart OpenCode.

## Integration with Auto-Switcher

This plugin is designed to complement a quota-monitoring service (like [gemini-auto-switch.py](https://github.com/salmenkhelifi1/iwilltravelto/blob/master/scripts/gemini-auto-switch.py)). It will automatically detect when the auto-switcher swaps the underlying account.

---
Part of the [iwilltravelto](https://github.com/salmenkhelifi1/iwilltravelto) automation ecosystem.
