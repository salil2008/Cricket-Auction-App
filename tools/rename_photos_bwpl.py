#!/usr/bin/env python3
"""
BWPL Photo Renamer - Name to ID

This script renames player photos from the format:
    {original_filename}_-_{player_name}.{ext}
To:
    {player_id}.{ext}

It matches player names from filenames to the CSV and renames to the player ID.

Usage:
1. Place this script in a folder
2. Place your CSV file in the same folder (update CSV_PATH below)
3. Place all player photos in PHOTOS_FOLDER (or current directory)
4. Run: python rename_photos_bwpl.py
5. Review the preview, then confirm to rename
"""

import os
import csv
import re
import shutil
from pathlib import Path

# ============================================
# CONFIGURATION - Update these paths
# ============================================

# Path to your player CSV file
CSV_PATH = "bwpl-players-with-tiers.csv"  # Update this to your CSV filename

# Folder containing photos (current directory by default)
PHOTOS_FOLDER = "."

# Output folder for renamed photos
OUTPUT_FOLDER = "photos_renamed"

# Supported image extensions
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}

# ============================================
# NAME EXTRACTION & MATCHING
# ============================================

def extract_player_name_from_filename(filename):
    """
    Extract player name from filename format:
    {anything}_-_{player_name}.{ext}
    
    Examples:
    - "09EFBC4D_-_sakeel_hassan_-_sakeel_hassan.jpeg" -> "sakeel hassan"
    - "20251220_175113_-_Swaraj_Nambiar.jpg" -> "Swaraj Nambiar"
    - "cropped_circle_image_-_Anant_Gupta.png" -> "Anant Gupta"
    """
    # Remove extension
    name_without_ext = Path(filename).stem
    
    # Split by "_-_" separator and get the last part (player name)
    parts = name_without_ext.split('_-_')
    
    if len(parts) < 2:
        # No separator found, can't extract name
        return None
    
    # Get the last part (player name) - handles cases like "name_-_name_-_name"
    player_name_raw = parts[-1]
    
    # Replace underscores with spaces and clean up
    player_name = player_name_raw.replace('_', ' ').strip()
    
    # Handle double spaces (from double underscores like V__Balu)
    player_name = ' '.join(player_name.split())
    
    return player_name

def normalize_name(name):
    """Normalize a name for fuzzy matching"""
    if not name:
        return ""
    # Lowercase, remove extra spaces, remove special chars
    name = name.lower().strip()
    name = re.sub(r'[^a-z0-9\s]', '', name)
    name = ' '.join(name.split())
    return name

def get_name_variants(name):
    """Generate possible name variants for matching"""
    if not name:
        return set()
    
    normalized = normalize_name(name)
    parts = normalized.split()
    
    variants = set()
    variants.add(normalized)
    
    # First name only
    if parts:
        variants.add(parts[0])
    
    # Last name only
    if len(parts) >= 2:
        variants.add(parts[-1])
    
    # First + Last only (skip middle names)
    if len(parts) > 2:
        variants.add(f"{parts[0]} {parts[-1]}")
    
    return variants

def levenshtein(s1, s2):
    """Calculate Levenshtein (edit) distance between two strings"""
    if len(s1) < len(s2):
        return levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)
    
    prev_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        curr_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = prev_row[j + 1] + 1
            deletions = curr_row[j] + 1
            substitutions = prev_row[j] + (c1 != c2)
            curr_row.append(min(insertions, deletions, substitutions))
        prev_row = curr_row
    
    return prev_row[-1]

def find_best_match(photo_name, players):
    """
    Find the best matching player for a photo name.
    Returns (player_id, player_name, match_quality) or (None, None, None)
    
    Matching priority:
    1. Exact match (normalized)
    2. Photo name is contained in CSV name (e.g., "Jino Mathew" in "Jino Mathew M J")
    3. First + Last name exact match
    4. Fuzzy full name match (75%+ similarity)
    5. First name exact + fuzzy last name (60%+ similarity)
    """
    photo_normalized = normalize_name(photo_name)
    photo_parts = photo_normalized.split()
    
    if not photo_parts:
        return (None, None, None)
    
    candidates = []
    
    for player in players:
        csv_name = player['name']
        csv_normalized = normalize_name(csv_name)
        csv_parts = csv_normalized.split()
        
        # Priority 1: Exact match
        if photo_normalized == csv_normalized:
            return (player['id'], csv_name, 'exact')
        
        # Priority 2: Photo name contained in CSV (handles "Jino Mathew" → "Jino Mathew M J")
        if photo_normalized in csv_normalized:
            coverage = len(photo_normalized) / len(csv_normalized)
            candidates.append((player, 'contained', 1.0 + coverage))
            continue
        
        # Priority 3: CSV name contained in photo
        if csv_normalized in photo_normalized:
            coverage = len(csv_normalized) / len(photo_normalized)
            candidates.append((player, 'contains', 0.9 + coverage))
            continue
        
        # Priority 4: First+Last name exact match
        if len(photo_parts) >= 2 and len(csv_parts) >= 2:
            pf, pl = photo_parts[0], photo_parts[-1]
            cf, cl = csv_parts[0], csv_parts[-1]
            
            if pf == cf and pl == cl:
                candidates.append((player, 'first+last', 0.95))
                continue
        
        # Priority 5: Fuzzy full name match (75%+ similarity)
        dist = levenshtein(photo_normalized, csv_normalized)
        max_len = max(len(photo_normalized), len(csv_normalized))
        similarity = 1 - (dist / max_len)
        if similarity >= 0.75:
            candidates.append((player, f'fuzzy({similarity:.0%})', 0.6 + similarity * 0.35))
            continue
        
        # Priority 6: First name exact + fuzzy last name
        if len(photo_parts) >= 2 and len(csv_parts) >= 2:
            pf, pl = photo_parts[0], photo_parts[-1]
            cf, cl = csv_parts[0], csv_parts[-1]
            
            if pf == cf:  # First name matches exactly
                last_dist = levenshtein(pl, cl)
                last_max = max(len(pl), len(cl))
                last_sim = 1 - (last_dist / last_max) if last_max > 0 else 0
                
                if last_sim >= 0.5:  # 50% last name similarity when first name matches
                    candidates.append((player, f'first+fuzzy-last({last_sim:.0%})', 0.5 + last_sim * 0.4))
    
    # Sort candidates by score and return best
    if candidates:
        candidates.sort(key=lambda x: x[2], reverse=True)
        best = candidates[0]
        if best[2] >= 0.5:  # Minimum threshold
            return (best[0]['id'], best[0]['name'], best[1])
    
    return (None, None, None)

# ============================================
# MAIN SCRIPT
# ============================================

def main():
    print("=" * 60)
    print("BWPL Photo Renamer - Name to ID")
    print("=" * 60)
    
    # Check if CSV exists
    if not os.path.exists(CSV_PATH):
        print(f"\n❌ CSV file not found: {CSV_PATH}")
        print("Please update CSV_PATH in this script.")
        return
    
    # Read players from CSV
    print(f"\n📋 Reading players from: {CSV_PATH}")
    players = []
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Try different column names
            name = row.get('Full Name') or row.get('name') or row.get('Name') or ''
            player_id = row.get('id') or row.get('ID') or row.get('player_id') or ''
            
            if name and player_id:
                players.append({
                    'name': name.strip(),
                    'id': player_id.strip()
                })
    
    print(f"   Found {len(players)} players in CSV")
    
    # Find all photo files
    print(f"\n📸 Scanning for photos in: {os.path.abspath(PHOTOS_FOLDER)}")
    photo_files = []
    for f in os.listdir(PHOTOS_FOLDER):
        ext = Path(f).suffix.lower()
        if ext in IMAGE_EXTENSIONS:
            photo_files.append(f)
    
    print(f"   Found {len(photo_files)} image files")
    
    if not photo_files:
        print("\n❌ No image files found!")
        return
    
    # Match photos to players
    print("\n🔍 Matching photos to players...")
    print("-" * 60)
    
    matches = []
    unmatched_photos = []
    
    for photo in photo_files:
        extracted_name = extract_player_name_from_filename(photo)
        
        if not extracted_name:
            print(f"   ⚠️  Could not extract name from: {photo}")
            unmatched_photos.append((photo, "No name pattern found"))
            continue
        
        player_id, csv_name, match_type = find_best_match(extracted_name, players)
        
        if player_id:
            ext = Path(photo).suffix
            new_name = f"{player_id}{ext}"
            matches.append({
                'original': photo,
                'extracted_name': extracted_name,
                'csv_name': csv_name,
                'player_id': player_id,
                'new_name': new_name,
                'match_type': match_type
            })
            print(f"   ✅ {extracted_name} → {csv_name} (ID: {player_id}) [{match_type}]")
        else:
            unmatched_photos.append((photo, f"No match for: {extracted_name}"))
            print(f"   ❌ {extracted_name} → NO MATCH FOUND")
    
    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    print(f"\n✅ Matched: {len(matches)} photos")
    print(f"❌ Unmatched: {len(unmatched_photos)} photos")
    
    # Show unmatched details
    if unmatched_photos:
        print("\n⚠️  Unmatched photos:")
        for photo, reason in unmatched_photos[:15]:
            print(f"   - {photo}")
            print(f"     Reason: {reason}")
        if len(unmatched_photos) > 15:
            print(f"   ... and {len(unmatched_photos) - 15} more")
    
    if not matches:
        print("\n❌ No matches found. Please check:")
        print("   1. CSV has 'Full Name' and 'id' columns")
        print("   2. Photo filenames follow pattern: {anything}_-_{player_name}.{ext}")
        return
    
    # Confirm and rename
    print("\n" + "=" * 60)
    print(f"Ready to rename {len(matches)} photos.")
    print(f"Output folder: {OUTPUT_FOLDER}/")
    print("=" * 60)
    
    confirm = input("\nProceed with renaming? (yes/no): ").strip().lower()
    
    if confirm != 'yes':
        print("Cancelled.")
        return
    
    # Create output folder
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    
    # Copy and rename files
    print(f"\n📦 Copying files to {OUTPUT_FOLDER}/...")
    
    for m in matches:
        src = os.path.join(PHOTOS_FOLDER, m['original'])
        dst = os.path.join(OUTPUT_FOLDER, m['new_name'])
        shutil.copy2(src, dst)
    
    print(f"\n✅ Done! {len(matches)} photos renamed and saved to: {OUTPUT_FOLDER}/")
    print("\nYou can now upload this folder to the BWPL Auction app.")
    
    # Save mapping report
    report_file = "photo_rename_report.csv"
    with open(report_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Original Filename', 'Extracted Name', 'Matched CSV Name', 'Player ID', 'New Filename', 'Match Type'])
        for m in matches:
            writer.writerow([
                m['original'],
                m['extracted_name'],
                m['csv_name'],
                m['player_id'],
                m['new_name'],
                m['match_type']
            ])
    print(f"📝 Mapping report saved to: {report_file}")
    
    # Save unmatched list
    if unmatched_photos:
        unmatched_file = "unmatched_photos.txt"
        with open(unmatched_file, 'w', encoding='utf-8') as f:
            f.write("Unmatched Photos\n")
            f.write("=" * 40 + "\n\n")
            for photo, reason in unmatched_photos:
                f.write(f"File: {photo}\n")
                f.write(f"Reason: {reason}\n\n")
        print(f"📝 Unmatched list saved to: {unmatched_file}")

if __name__ == "__main__":
    main()
