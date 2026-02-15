# 🏏 Cricket Auction App

A modern, feature-rich cricket auction application built with React. Perfect for conducting IPL-style player auctions for your cricket league or club.

![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

### 🎯 Core Auction Features
- **Live Auction Control** - Real-time bidding with team selection and bid tracking
- **Multi-tier Player System** - S/A/B/C/D class players with configurable base prices
- **Smart Auto-increment** - Automatic bid increments based on current bid amount
- **Right to Match (RTM)** - Previous team can match the winning bid
- **Player Retention** - Pre-assign players to teams before auction
- **Undo/Redo Support** - Full auction history with ability to reverse actions

### 📺 Presentation Mode
- **TV-Ready Display** - Full-screen auction view optimized for projectors/TVs
- **Animated Player Cards** - Smooth transitions with tier-based styling
- **Live Bid Updates** - Real-time display of current bid and bidding team
- **Team Purse Tracker** - Visual display of remaining purse for all teams
- **Splash Screen** - Professional intro screen with league branding

### 👥 Player Management
- **CSV Import** - Bulk import players with stats from spreadsheet
- **Photo Bulk Upload** - Match photos to players by ID
- **Extended Statistics** - Batting/bowling stats, thirties, dismissals, strike rates
- **Auto Tier Assignment** - Automatically assign tiers based on player performance
- **Role Detection** - Smart detection of All-rounder types (Batting/Bowling)

### ⚙️ Configuration
- **JSON Config Import/Export** - One-click setup of tournament, tiers, teams, and rules
- **Customizable Tiers** - Set base prices, colors, and icons for each tier
- **Team Management** - Add teams with colors, logos, and initial purse
- **Flexible Rules** - Configure min/max players, retention limits, bid increments

### 💾 Data Management
- **Local Storage** - All data persisted in browser (IndexedDB via Dexie.js)
- **Full Backup/Restore** - Export and import complete auction state
- **Reset Options** - Clear auction data while preserving player pool

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/bwpl-auction.git
cd bwpl-auction

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📖 Usage Guide

### Step 1: Configure Tournament

1. Go to **Admin → Config**
2. Either manually configure or **Import Config JSON**:

```json
{
  "tournament": {
    "name": "BWPL",
    "season": "6.0",
    "year": 2026
  },
  "tiers": [
    { "id": "s-class", "name": "S Class", "basePrice": 500000, "color": "#FFD700" }
  ],
  "teams": [
    { "name": "Chennai Kings", "shortName": "CK", "primaryColor": "#FFCB05" }
  ]
}
```

See [`samples/auction-config-template.json`](samples/auction-config-template.json) for complete example.

### Step 2: Import Players

1. Go to **Admin → Players**
2. Click **Import CSV**
3. Upload your player data CSV

**Required CSV columns:**
| Column | Description | Example |
|--------|-------------|---------|
| `id` | Unique player ID | `00001` |
| `Full Name` | Player name | `Virat Kohli` |
| `Role` | Player role | `Batsman`, `Bowler`, `All-Rounder` |

**Optional columns:** `Batting Style`, `Bowling Style`, `Matches`, `Innings`, `Runs`, `Average`, `Strike Rate`, `50s`, `100s`, `Wickets`, `Economy`, `Bowling Average`, `tier`, etc.

See [`samples/players-template.csv`](samples/players-template.csv) for complete example.

### Step 3: Upload Player Photos

1. Rename photos to match player IDs (e.g., `00001.jpg` for player with ID `00001`)
2. Go to **Admin → Players → Upload Photos**
3. Select folder containing renamed photos

**Use the included Python script for bulk renaming:**
```bash
python scripts/rename_photos_bwpl.py
```

### Step 4: Configure Retentions (Optional)

1. Go to **Admin → Teams**
2. Click on a team
3. Use **Retain Player** to pre-assign players

### Step 5: Run the Auction

1. Go to **Auction → Control Panel** (admin view)
2. Open **Auction → Presentation** in a new window for TV display
3. Select a player to auction
4. Teams bid by clicking their cards
5. Use **Sold** to complete sale or **Unsold** to return to pool

---

## 📁 Project Structure

```
bwpl-auction/
├── public/
│   └── logos/              # Team and league logos
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # Base components (Button, Card, Modal)
│   │   └── auction/       # Auction-specific components
│   ├── pages/
│   │   ├── admin/         # Admin pages (Players, Teams, Config)
│   │   └── presentation/  # Display pages (AuctionView, SplashView)
│   ├── stores/            # Zustand state management
│   ├── db/                # Dexie.js database layer
│   └── utils/             # Helper functions
├── samples/               # Sample data files
└── scripts/               # Utility scripts
```

---

## 🎨 Customization

### Tier Colors & Icons

Edit in Config page or via JSON import:

```json
{
  "id": "s-class",
  "name": "S Class",
  "basePrice": 500000,
  "color": "#FFD700",
  "accentColor": "#FFA500",
  "icon": "crown"
}
```

Available icons: `crown`, `star`, `shield`, `zap`, `user`

### Auto-Increment Rules

Configure bid increments based on current amount:

```json
{
  "autoIncrementRules": [
    { "upTo": 400000, "increment": 10000 },
    { "upTo": 750000, "increment": 25000 },
    { "upTo": 1500000, "increment": 50000 },
    { "upTo": null, "increment": 100000 }
  ]
}
```

### Team Colors

Each team has primary and secondary colors used throughout the UI:

```json
{
  "name": "Chennai Kings",
  "shortName": "CK",
  "primaryColor": "#FFCB05",
  "secondaryColor": "#004BA0"
}
```

---

## 📊 CSV Format Reference

### Player CSV Columns

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | String | ✅ | Unique identifier (used for photo matching) |
| `Full Name` | String | ✅ | Player display name |
| `Role` | String | ✅ | `Batsman`, `Bowler`, `All-Rounder`, `Wicket Keeper` |
| `Batting Style` | String | ❌ | `Right-hand bat`, `Left-hand bat` |
| `Bowling Style` | String | ❌ | `Right-arm fast`, `Left-arm spin`, etc. |
| `Matches` | Number | ❌ | Career matches |
| `Innings` | Number | ❌ | Batting innings |
| `Runs` | Number | ❌ | Total runs |
| `Average` | Number | ❌ | Batting average |
| `Strike Rate` | Number | ❌ | Batting strike rate |
| `50s` | Number | ❌ | Half-centuries |
| `100s` | Number | ❌ | Centuries |
| `30s` | Number | ❌ | 30+ scores |
| `Wickets` | Number | ❌ | Total wickets |
| `Economy` | Number | ❌ | Bowling economy |
| `Bowling Average` | Number | ❌ | Bowling average |
| `Bowling SR` | Number | ❌ | Bowling strike rate |
| `Best Bowling` | String | ❌ | Best figures (e.g., `5/23`) |
| `Catches` | Number | ❌ | Catches/dismissals |
| `tier` | String | ❌ | `s-class`, `a-class`, `b-class`, `c-class`, `d-class` |
| `Previous Team` | String | ❌ | Team name for RTM eligibility |

---

## 🛠️ Scripts

### Photo Renaming Script

Convert photos from `{original}_-_{player_name}.jpg` to `{player_id}.jpg`:

```bash
cd scripts
python rename_photos_bwpl.py
```

**Features:**
- Extracts player name from filename
- Fuzzy matching for spelling variations
- Preview before renaming
- Generates mapping report

---

## 🔧 Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Zustand** - State management
- **Dexie.js** - IndexedDB wrapper
- **Lucide React** - Icons
- **Framer Motion** - Animations

---

## 📝 License

MIT License - feel free to use for your cricket league!

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

- Built for **Bangalore Willows Premier League (BWPL)**
- Inspired by IPL auction format
- Icons by [Lucide](https://lucide.dev/)

---

## 📞 Support

- Create an [Issue](https://github.com/salil2008/Cricket-Auction-App/issues) for bugs
- Start a [Discussion](https://github.com/salil2008/Cricket-Auction-App/discussions) for questions

---

**Made with ❤️ for cricket lovers**
