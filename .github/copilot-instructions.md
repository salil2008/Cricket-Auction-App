# BWPL Auction App - Copilot Instructions

## Architecture Overview

This is a **React + Vite** auction system for IPL-style cricket player auctions. It has two distinct UIs:
- **Admin UI** (`/admin/*`) - Controls auction flow, manages data
- **Presentation UI** (`/present/*`) - TV-ready display for audience

Communication between Admin and Presentation windows uses **BroadcastChannel API** for real-time sync.

## State Management Pattern

All state lives in Zustand stores (`src/stores/`):
- `auctionStore.js` - Auction lifecycle, current bid, active view, events (persisted via zustand/persist)
- `dataStores.js` - Teams, Players, Config stores (backed by IndexedDB via Dexie.js)

**Critical pattern**: Data flows from Admin → Stores → IndexedDB → BroadcastChannel → Presentation. Always update stores, not local state, for auction-critical data.

```javascript
// Pattern: Import stores from the barrel export
import { useAuctionStore, usePlayerStore, useTeamStore, useConfigStore } from '../../stores';
```

## Key Files by Feature

| Feature | Admin Control | Presentation Display | Data Store |
|---------|---------------|---------------------|------------|
| Auction | `pages/admin/AuctionControl.jsx` | `pages/presentation/AuctionView.jsx` | `stores/auctionStore.js` |
| Teams | `pages/admin/Teams.jsx` | `pages/presentation/TeamsView.jsx` | `stores/dataStores.js` |
| Players | `pages/admin/Players.jsx` | `pages/presentation/PoolView.jsx` | `stores/dataStores.js` |

## Database Layer (Dexie.js)

Database schema in `src/db/index.js`. Key collections:
- `teams` - Team purse, colors, retained players
- `players` - Stats, tier, sold status, photos as base64
- `config` - Tournament settings, tier definitions

**Never import Dexie directly in components**. Use operations from `src/db/index.js`:
```javascript
import { teamOperations, playerOperations, configOperations } from '../db';
```

## Cross-Window Communication

`src/hooks/useBroadcast.js` handles Admin ↔ Presentation sync:
- Admin calls `broadcastState()` after state changes
- Presentation listens and applies state via `useAuctionStore.setState()`
- Uses unique `eventId` to prevent duplicate event processing

## Styling Conventions

- **Tailwind CSS 4** with custom design tokens in `src/index.css`
- Brand colors: `--bwpl-primary` (red), `--bwpl-secondary` (navy)
- Tier-based styling: Each tier (S/A/B/C/D) has defined colors, glows, gradients
- Animations: Use `framer-motion` for all transitions

## Utility Functions

All helpers in `src/utils/index.js`:
- `formatCurrency(amount, { compact: true })` - Indian format (₹10L, ₹1Cr)
- `getTierInfo(tierId, config)` - Get tier colors/icons from config
- `canTeamAffordBid(team, bid, config)` - Purse validation
- `parseCSV()` - Player import with role mapping

## Development Commands

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # ESLint check
```

## Testing Workflow

1. Open `/admin` for control panel
2. Open `/present/auction` in separate window/monitor for TV display
3. Changes in admin auto-sync to presentation via BroadcastChannel

## Common Patterns

### Adding a new auction event
1. Add event type to `AUCTION_EVENTS` in `auctionStore.js`
2. Create handler action in the store
3. Use `_dispatchEvent()` to generate unique event ID
4. Handle in `useSound.js` if sound needed

### Adding player statistics
1. Update CSV parser in `src/utils/index.js` (`parseCSV` function)
2. Add field to player schema in `src/db/index.js`
3. Display in `AuctionView.jsx` player card section

## File Organization Rules

- Components: `src/components/common/` (reusable), `src/pages/` (route-specific)
- Barrel exports: Each folder has `index.js` for clean imports
- Icons: Use `lucide-react` exclusively
