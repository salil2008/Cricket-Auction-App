# BWPL CSV & Photo Integration Guide

This guide explains how to prepare your player data CSV and photos for import into the BWPL Auction System.

---

## Table of Contents

1. [CSV Format](#csv-format)
2. [Tier Auto-Assignment](#tier-auto-assignment)
3. [Photo Naming & Upload](#photo-naming--upload)
4. [Config JSON Import](#config-json-import)
5. [Troubleshooting](#troubleshooting)

---

## CSV Format

### Required Columns

| Column | Description | Example |
|--------|-------------|---------|
| `id` | Unique player ID (used for photo matching) | `00057` |
| `Full Name` | Player's display name | `Sakeel Hassan` |
| `Role` | Playing role | `All-Rounder` |

### Optional Columns

| Column | Description | Example |
|--------|-------------|---------|
| `Batting Style` | Batting hand | `Right-hand bat` |
| `Bowling Style` | Bowling type | `Right-arm medium` |
| `Matches` | Total matches | `45` |
| `Innings` | Batting innings | `42` |
| `Runs` | Total runs | `856` |
| `Highest Score` | Best score | `89` |
| `Average` | Batting average | `23.78` |
| `Strike Rate` | Batting SR | `128.5` |
| `50s` | Half-centuries | `4` |
| `30s` | 30+ scores | `8` |
| `100s` | Centuries | `0` |
| `Wickets` | Total wickets | `32` |
| `Bowling Avg` | Bowling average | `22.5` |
| `Economy` | Economy rate | `7.2` |
| `Bowling SR` | Bowling strike rate | `18.8` |
| `Best Bowling` | Best figures | `4/25` |
| `Dismissals` | Catches + Stumpings | `12` |
| `Previous Team` | For RTM eligibility | `Chennai Kings` |

### Role Values

The system recognizes these role values:

- `Batsman` / `Batter`
- `Bowler`
- `All-Rounder` (or `All Rounder`, `Allrounder`)
- `Batting All-Rounder`
- `Bowling All-Rounder`
- `Wicketkeeper` / `Wicket Keeper` / `WK`
- `WK-Batsman` / `Keeper-Batsman`

### Sample CSV

```csv
id,Full Name,Role,Batting Style,Bowling Style,Matches,Innings,Runs,Average,Strike Rate,50s,Wickets,Bowling Avg,Economy
00001,Rajesh Kumar,Batsman,Right-hand bat,-,42,40,1245,32.76,138.5,8,0,0,0
00002,Amit Sharma,Bowler,Right-hand bat,Right-arm fast,38,15,89,8.9,95.2,0,56,18.2,7.8
00003,Vikram Singh,All-Rounder,Left-hand bat,Left-arm orthodox,45,42,856,23.78,128.5,4,32,22.5,7.2
```

---

## Tier Auto-Assignment

Players are automatically assigned to tiers based on their stats during CSV import.

### Tier Criteria

| Tier | Batting Criteria | Bowling Criteria | All-Rounder |
|------|------------------|------------------|-------------|
| **S-Class** | Avg ≥40 AND SR ≥140 | Wkts ≥50 AND Avg ≤18 | Top in both |
| **A-Class** | Avg ≥30 OR SR ≥130 | Wkts ≥35 AND Avg ≤22 | Strong both |
| **B-Class** | Avg ≥20 AND matches ≥20 | Wkts ≥20 | Solid contributors |
| **C-Class** | Some experience | Developing bowlers | Learning phase |
| **D-Class** | New players | New bowlers | Fresh talent |

### Manual Override

After import, you can manually change any player's tier:

1. Go to `Admin → Players`
2. Click on a player to edit
3. Select new tier from dropdown
4. Save changes

---

## Photo Naming & Upload

### Step 1: Rename Photos

Photos must be named by player ID to match correctly.

**Original filename:** `20251220_175113_-_Swaraj_Nambiar.jpg`  
**Renamed to:** `00067.jpg`

#### Using the Python Script

```bash
# 1. Place in same folder:
#    - rename_photos_bwpl.py
#    - players.csv (your player CSV)
#    - All player photos

# 2. Run the script:
python rename_photos_bwpl.py

# 3. Review matches and confirm

# 4. Get renamed photos in: photos_renamed/
```

The script:
- Extracts player names from filenames (pattern: `{anything}_-_{player_name}.ext`)
- Fuzzy-matches names to CSV
- Renames to player ID
- Shows preview before renaming

#### Manual Rename

If photos don't follow the `_-_` pattern:
1. Open your CSV
2. Find the player's `id` column value
3. Rename photo to match (e.g., `00057.jpg`)

### Step 2: Upload to App

1. Go to `Admin → Players`
2. Click **"Upload Photos"** button
3. Select all renamed photos
4. Review the matching preview
5. Click **"Apply Photos"**

### Matching Logic

The app matches photos in this order:
1. **externalId** (from CSV `id` column) - Primary
2. **Internal database ID** - Fallback

Example: `00057.jpg` → matches player with `externalId = "00057"`

---

## Config JSON Import

### Quick Setup

Instead of manually configuring teams and tiers, import a JSON config:

1. Go to `Admin → Config`
2. Scroll to "Auction Setup Config" section
3. Click **"Import Config"**
4. Select your `auction-config.json`
5. Review preview and confirm

### Config Structure

```json
{
  "tournament": {
    "name": "BWPL",
    "season": "6.0",
    "year": 2026
  },
  "purseSettings": {
    "defaultPurse": 10000000,
    "minPlayersPerTeam": 11,
    "maxPlayersPerTeam": 15
  },
  "tiers": [
    { "id": "s-class", "name": "S-Class", "basePrice": 1000000 },
    { "id": "a-class", "name": "A-Class", "basePrice": 750000 }
  ],
  "teams": [
    { "name": "Chennai Kings", "shortName": "CK", "primaryColor": "#FFCB05" }
  ],
  "auctionRules": {
    "autoIncrementRules": [
      { "upTo": 400000, "increment": 10000 }
    ]
  }
}
```

See `samples/auction-config.json` for a complete example.

### Export Current Config

To backup or share your config:
1. Go to `Admin → Config`
2. Click **"Export Config"**
3. Save the downloaded JSON file

---

## Troubleshooting

### CSV Import Issues

| Problem | Solution |
|---------|----------|
| "No players imported" | Check CSV has required columns (`id`, `Full Name`, `Role`) |
| Wrong tier assignment | Manually edit player after import |
| Special characters broken | Ensure CSV is UTF-8 encoded |
| Numbers as text | Check numeric columns don't have quotes |

### Photo Upload Issues

| Problem | Solution |
|---------|----------|
| "No matching player ID" | Ensure filename matches `id` column from CSV |
| Photos not showing | Check file extension is `.jpg`, `.jpeg`, or `.png` |
| Wrong photo matched | Verify player IDs are unique |
| Large file error | Resize photos to under 2MB each |

### Config Import Issues

| Problem | Solution |
|---------|----------|
| "Invalid config" | Check JSON syntax (use a validator) |
| Missing teams | Ensure `teams` array exists with required fields |
| Tiers not updating | Verify `tiers` array has `id`, `name`, `basePrice` |

---

## Complete Workflow

```
1. PREPARE CONFIG
   └── Edit samples/auction-config.json with your teams
   └── Import via Admin → Config

2. PREPARE PLAYERS CSV
   └── Create CSV with id, Full Name, Role, stats
   └── Import via Admin → Players → Import CSV

3. PREPARE PHOTOS
   └── Collect player photos
   └── Run: python tools/rename_photos_bwpl.py
   └── Upload via Admin → Players → Upload Photos

4. VERIFY
   └── Check all players have photos
   └── Verify tier assignments
   └── Review team configurations

5. START AUCTION!
   └── Open presenter view on projector
   └── Control from admin panel
```

---

## Need Help?

- Check [README.md](../README.md) for general usage
- Open an issue on GitHub for bugs
- See sample files in `/samples` directory
