# MUD Log Parser

A tool to parse MUD session logs and automatically import rooms, exits, NPCs, and items into the database.

## Why Use This?

Instead of having the crawler explore the MUD (which can be slow and error-prone), you can:

1. **Manually explore** the MUD and save a complete session log
2. **Run the parser** on the log file to extract all rooms and connections
3. **Iterate quickly** - if the parser needs tweaking, just re-run it on the same log file

This approach is much faster and more reliable for mapping large areas.

## How to Use

### Step 1: Capture Your Session

Manually explore the MUD and save everything to a text file. You can do this by:

- Using a MUD client with logging (like TinTin++, MUSHclient, etc.)
- Copy-pasting from your terminal
- Using script/tee on Unix systems
- Using PowerShell transcription on Windows

Example exploring Midgaard:
```
# In PowerShell
Start-Transcript -Path midgaard-session.txt
# Connect to MUD, login, and explore
# When done:
Stop-Transcript
```

### Training Annotations (For AI Model Training)

When creating logs for AI training, use the `say` command to add inline annotations explaining your strategy and decision-making:

**Annotation Format:**
```
say [TRAINING] <category>: <explanation>
```

**Recommended Categories:**
- `STRATEGY` - High-level decision making
- `TIMING` - Waiting for cooldowns, regen, ticks
- `DANGER` - Risk assessment and safety
- `RESOURCE` - HP/mana/movement management  
- `EXPLORATION` - Navigation and mapping strategy
- `COMBAT` - Fighting tactics
- `OPTIMIZATION` - Efficient gameplay patterns
- `MISTAKE` - What NOT to do (anti-patterns)

**Examples:**
```
say [TRAINING] TIMING: Waiting 3 ticks for HP to regenerate before next fight
say [TRAINING] STRATEGY: Exploring north first because it's unexplored
say [TRAINING] DANGER: This mob is too high level, fleeing to safety
say [TRAINING] RESOURCE: HP below 50%, need to rest before continuing
say [TRAINING] COMBAT: Using bash to stun before big damage
say [TRAINING] OPTIMIZATION: Recall to town is faster than walking back
say [TRAINING] MISTAKE: Should have checked exits before entering combat
```

**Benefits:**
- Annotations appear in logs with full game context
- AI can learn cause-and-effect relationships
- Captures expert decision-making process
- Easy to filter/extract during training data preparation
- Human-readable for manual review

### Step 2: Run the Parser

```bash
# Basic usage - parse and save to database
npm run parse-logs midgaard-session.txt --zone-id 1

# Dry run - see what would be parsed without saving
npm run parse-logs midgaard-session.txt --dry-run

# Export to JSON for review
npm run parse-logs midgaard-session.txt --export midgaard-rooms.json --dry-run

# Parse, save, and export
npm run parse-logs midgaard-session.txt --zone-id 1 --export midgaard-rooms.json
```

### Step 3: Review and Refine

After the first run:

1. Check the JSON export to see what was parsed
2. Look at the console output for parsing stats
3. If needed, adjust the parser logic and re-run
4. No need to re-explore - just re-parse the same log file!

## What Gets Parsed

The parser extracts:

- **Room names** - The title of each room
- **Room descriptions** - The full text description
- **Exits** - All available exits from each room
- **Exit connections** - Which rooms connect to which based on your movement
- **NPCs** - Any NPCs mentioned in rooms (basic detection)
- **Items** - Any items lying in rooms (basic detection)
- **Zone information** - Tracks which zone you're in

## Log File Format

Your log file should contain the raw MUD output, including:

```
[Current Zone: Midgaard: City]

Market Square
   The market square is a busy place. Merchants hawk their wares and
travelers pass through on their way to other parts of the city.
Exits: north, south, east, west

> north

City Gates
   The massive gates of the city stand open, welcoming travelers from
all lands. Guards stand watch on either side.
Exits: north, south

> look north
The road leads towards the city center.

> south

Market Square
   The market square is a busy place. Merchants hawk their wares and
travelers pass through on their way to other parts of the city.
Exits: north, south, east, west
```

## Parser Logic

The parser identifies rooms by:

1. **Room titles** - Lines that look like titles (capitalized, not indented)
2. **Descriptions** - Indented text following the title
3. **Exit lines** - Lines starting with "Exits:" or "Obvious exits:"
4. **Movement** - Commands like "north", "south", etc.
5. **Zone changes** - Lines like "[Current Zone: ...]"

## Tips for Best Results

### 1. Explore Systematically

Move through the area in an organized way:
```
> n
> e
> s
> w
> n
> n
...
```

### 2. Revisit Rooms

It's okay to visit the same room multiple times - the parser handles duplicates.

### 3. Include Zone Information

Make sure your log shows zone changes (usually automatic in most MUDs).

### 4. Use 'look' for Exit Details

If you want to capture "look <direction>" information:
```
> look north
The passage leads into darkness.
```

### 5. Clean Logs (Optional)

The parser strips ANSI color codes automatically, but you can pre-clean logs if needed:
```bash
# Remove color codes on Unix
sed 's/\x1b\[[0-9;]*m//g' raw-log.txt > clean-log.txt
```

## Troubleshooting

### No Rooms Found

Check that your log file contains:
- Room titles (capitalized lines)
- Room descriptions (indented text)
- Exit information

### Wrong Room Boundaries

If rooms are being split incorrectly, you may need to adjust the `isRoomTitle()` and `isDescriptionLine()` methods in `mudLogParser.ts`.

### Duplicate Rooms

The parser creates unique rooms based on name + description. If you have identical rooms that should be separate, they might get merged. This is usually fine for actual duplicates.

### Zone IDs

You must provide a `--zone-id` when saving to the database. Get zone IDs from:
```bash
curl http://localhost:3002/api/zones
```

## Advanced Usage

### Custom API URL

Edit `mudLogParser.ts` and change the `apiBaseUrl` in the constructor:
```typescript
const parser = new MudLogParser('http://your-server:3002/api');
```

### Modify Parsing Rules

The parser has several configurable methods:
- `isRoomTitle()` - Detects room titles
- `isDescriptionLine()` - Detects description text
- `parseExits()` - Extracts exit directions
- `parseNpcs()` - Finds NPCs
- `parseItems()` - Finds items

Adjust these in `mudLogParser.ts` to match your MUD's format.

## Example Workflow

Complete workflow for mapping a new zone:

```bash
# 1. Explore the zone manually and save the session
Start-Transcript -Path training-grounds.txt
# ... explore the MUD ...
Stop-Transcript

# 2. First, do a dry run to see what gets parsed
npm run parse-logs training-grounds.txt --dry-run --export training-grounds.json

# 3. Review the JSON output
cat training-grounds.json

# 4. If it looks good, save to database
npm run parse-logs training-grounds.txt --zone-id 5

# 5. View in the web interface
# Open http://localhost:5173 and check the Zone Map
```

## Future Enhancements

Potential improvements:
- [ ] Better NPC/item detection
- [ ] Door detection (locked, closed, etc.)
- [ ] Portal key extraction
- [ ] Terrain detection from room descriptions
- [ ] Multiple zone handling in one session
- [ ] Exit relationship validation
- [ ] Duplicate room detection and merging options
