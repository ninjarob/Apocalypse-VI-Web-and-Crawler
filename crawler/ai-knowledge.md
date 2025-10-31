# MUD AI Knowledge Base - Apocalypse VI World
Last Updated: 2025-10-30
Total Sessions: 1

## Priority Commands to Try First
- commands: Lists all available game commands (DO THIS FIRST!)
- help: Shows help information
- look: Examine current location
- inventory: Check what you're carrying
- score: View your character stats
- who: See who else is online

## Help System & Pagination
The MUD has a comprehensive help system accessible via "help <topic>" commands.

### Pagination Handling
Many help entries are longer than one screen and will display a pagination prompt:
```
[ Return to continue, (q)uit, (r)efresh, (b)ack, or page number (1/2) ]
```

**IMPORTANT**: When you see this prompt, you MUST send a newline ("\n") to continue reading the full help text. Do NOT send "q" as that will quit the pager and truncate the help information.

**Pagination Detection**: Look for the text "Return to continue" in the response.
**Action**: Send an empty line ("\n") to get the next page.
**Repeat**: Continue sending "\n" until the prompt disappears and you have the complete help text.

### Help Command Usage
- "help" - Shows general help topics
- "help <command>" - Shows detailed help for a specific command
- "help <spell>" - Shows spell information
- "help <skill>" - Shows skill information
- "help <race>" - Shows race information
- "help <class>" - Shows class information

## World Overview
Apocalypse VI is a rich fantasy MUD with 74+ zones spanning multiple difficulty levels (1-5).
The world features diverse regions from beginner areas like Midgaard City to epic raid zones.

## Character Races
The world has 24 playable races, each with unique traits:

### Common Races
- **HUMAN**: Most adaptable race. Easy to learn, hard to master. No special abilities.
- **DWARF**: Hardy folks from ancient mountain kingdoms. Resistant to poison/magic.
- **ELF**: Graceful beings from ancient forests. Highly resistant to charm and sleep.
- **HALFLING**: Small, quick, and often underestimated. Exceptional agility and stealth.
- **GNOME**: Inventive tinkerers with natural magical affinity.
- **HALF-ELF**: Balance of human adaptability and elven grace.
- **HALF-ORC**: Brutal strength, poor intelligence. Natural warriors.

### Exotic Races
- **PIXIE**: Tiny flying creatures who can see invisible. Mischievous nature.
- **CENTAUR**: Half-human, half-horse. Natural charges in combat.
- **MINOTAUR**: Bull-headed warriors. Excellent trackers, feared in close combat.
- **TROLL**: Fearless creatures of darkness. Strength rivaled only by half-giants.
- **DRAGONBORN**: Beings with dragon lineage. Natural battle prowess.
- **WEMIC**: Half-lion, half-man from open plains. Renowned for strength and speed.
- **TIEFLING**: Infernal creatures from hell's fires. Fire resistant, frost vulnerable.
- **PLANEWALKER**: From another dimension. Especially proficient with magic.
- **LIZARDKIND**: Swamp dwellers. Especially hardy, possibly invulnerable.
- **ULDRA**: Tundra-dwelling cousins of dwarves and gnomes. Animal empathy.

## Character Classes
The game has 14 classes organized into 4 groups:

### Warriors (Group 1)
- **Fighter**: Well-rounded physical combatant
- **Paladin**: Holy warrior (GOOD alignment required)
- **Anti-Paladin**: Dark warrior (EVIL alignment required)
- **Ranger**: Nature warrior with tracking and dual-wield abilities
- **Samurai**: Honor-bound warrior (GOOD alignment). Cannot use WIMPY. Cannot be RESCUED. Immune to fear.
- **Berserker**: Rage-fueled warrior. Cannot flee while raging. ONLY class that can dual-wield 1-handed + magical weapons (innate).

### Rogues (Group 4)
- **Thief**: Master of stealth, cunning, and misdirection

### Spellcasters (Group 3)
- **Magic User**: Arcane spellcaster with vast spell knowledge
- **Cleric**: Divine spellcaster with healing and protection
- **Necromancer**: Master of death magic and undead
- **Warlock**: Channeling specialist (EVIL alignment). +1 mana/level. Channeling spells cost no initial mana but drain per hit. Cannot be silenced, but interrupted by physical attacks.

### Hybrids (Group 2)
- **Monk**: Martial artist with ki powers
- **Bard**: Jack-of-all-trades with music magic
- **Druid**: Nature magic and shapeshifting

## Universal Perks System
Players can choose perks to specialize their character:

### Weapon Proficiency Perks (Choose ONE)
- **Lumberjack**: +1 damage per 10 levels with slash weapons
- **Pugilist**: +1 damage per 10 levels with blunt/unarmed
- **Tentmaker**: +1 damage per 10 levels with piercing weapons
- **Fletcher**: +1 damage per 10 levels with special weapons (bows/whips)

### Elemental Damage Perks (Unlimited)
- **Pyromaniac**: +25 Fire Damage
- **Boreal Native**: +25 Frost Damage
- **Conduit**: +25 Electricity Damage
- **Musician**: +25 Sonic Damage
- **Favor**: +25 Divine Damage
- **Haunted**: +25 Shadow Damage
- **Snake Handler**: +25 Poison Damage
- **Alchemist**: +25 Acid Damage
- **Prism Maker**: +25 Light Damage

### Utility Perks (Unlimited)
- **Tinkerer**: +7% Spell Crit Chance
- **Spiritualist**: 5% increased mana return on kill
- **Seer**: 25% increased mana return total
- **Glass Cannon**: +40 All-Spell damage, HP halved when taken
- **Astrologist**: Wands/Staves have high chance to cast for free
- **Empowered**: Strength spell grants +3 STR instead of +1
- **Treasure Hunter**: +1 rent slot
- **Perfectionist**: +4 Hitroll
- **Hoarder**: +15 inventory slots
- **Giant Slayer**: Ignore STR weapon weight requirements
- **Nomad**: Haste doesn't increase food costs
- **Metabolic Boost**: One bite fills hunger
- **Guardian Spirit**: Protection spell duration +4 hours
- **Bountiful Wonder**: Sustain duration: +10 then x2
- **Siege Captain**: Resistance buff duration +50%

## Damage Types & Resistances
The game features 13 elemental damage/resistance types:
- Fire, Electricity (Elec), Sonic (Sonc), Poison (Pois)
- Cold/Frost, Acid, Gas, Light (Lght)
- Summoning (Sumn), Life, Fear, Shadow (Shdw), Divine (Divn)

## Saving Throws
Five types of saves protect against different threats:
- **Para**: Paralyzation, Poison, or Death Magic
- **Rod**: Rod, Staff, or Wand effects
- **Petr**: Petrification or Polymorph
- **Breath**: Breath Weapon attacks
- **Spell**: General spell resistance

## Major Zones & Areas

### Beginner Zones (Levels 1-10)
- **Midgaard City** (Zone 2): Safe starting city
- **Training Grounds** (Zone 5): Level 1-5 tutorial area
- **Midgaard Graveyard** (Zone 3): Levels 2-5, good-aligned characters
- **The Hills of Astyll** (Zone 9): Levels 5-13, grasslands and caves
- **The Shire** (Zone 10): Levels 5-15, includes Bree town

### Mid-Level Zones (Levels 10-30)
- **Midgaard Sewers** (Zone 4): Levels 7-15, tunnels and pools
- **Candlebriar Mountains** (Zone 8): Levels 5-20, forest and gypsies
- **Haunted Forest** (Zone 12): Levels 10-22, woods and treehouse
- **Rome** (Zone 13): Levels 10-28, streets and forum
- **Bonne Terre Village** (Zone 15): Levels 10-25
- **Heliopolis** (Zone 20): Levels 15-28, desert city
- **Great Eastern Desert** (Zone 21): Levels 14-30, includes Fortress of Darkside
- **Forest of Haon-Dor** (Zone 19): Levels 15-30, druid and spider trails
- **Dwarven Kingdom** (Zone 11): Levels 12-32, castle, caverns, Mithril Hall

### Advanced Zones (Levels 20-40)
- **Temple of Opulence** (Zone 17): Levels 20-28
- **The Great Battle** (Zone 18): Levels 20-30, battlefield
- **Sanctuary of the Kris** (Zone 14): Levels 15-28, thief-focused
- **Crypt of Nyarlathotep** (Zone 22): Levels 25-36
- **Outskirts of Bonne Terre** (Zone 16): Levels 20-40, includes ruins

### Legendary/Endgame Zones (Level 40+)
- **The Immortal Realm** (Zone 1): Levels 41-46
- **Quester's Enclave** (Zone 6): Level 40+, includes Arena Trials
- **Mechandar: The Eternal Clock** (Zone 72): Difficulty 5, [Group Raid] Minimum 3-4 damage dealers

### Unique & Special Zones
- **The Great Ocean** (Zone 7): All levels, oceanic exploration
- **Shadow Brotherhood** (Zone 73): Level 20+, assassin catacombs in Darkrime Mountain
- **Duke and Duchess** (Zone 74): Naval combat, pirate hunting
- **Caves of Ice** (Zone 71): Difficulty 3, ancient saviors' remains (Coming Soon)

## Discovered Commands
(Will be populated as you explore)

## Map & Navigation
(Rooms and connections will be documented here as explored)

## NPCs & Character Interactions
(NPCs and their locations/purposes will be documented during exploration)

## Items & Equipment

### Item Properties
Items can have various properties:
- **Bindings**: Bind on Pickup, Bind on Equip, Bind on Use
- **Materials**: Various materials affect item properties
- **Sizes**: Different sizes with size modifiers
- **Wear Locations**: Head, Body, Arms, Hands, Legs, Feet, Neck, Wrists, Fingers, Waist, Back, etc.
- **Stat Effects**: Items can modify attributes and abilities
- **Flags**: Special item properties and restrictions

### Item Types
- Weapons (slash, blunt, piercing, special)
- Armor (various locations)
- Containers
- Light sources
- Consumables (food, potions)
- Spellcasting items (wands, staves)

## Combat & Mechanics

### Alignment System
- Three alignments: GOOD, NEUTRAL, EVIL
- Some classes require specific alignments (Paladin=Good, Anti-Paladin=Evil, Warlock=Evil, Samurai=Good)

### Resource Management
- **HP Regen**: Health regeneration rate (varies by class: 5-21)
- **Mana Regen**: Mana regeneration rate (varies by class: 5-21)
- **Move Regen**: Movement point regeneration (varies by class: 5-21)

### Special Mechanics
- **Channeling Spells** (Warlock): No initial cost, drains mana per hit
- **Wimpy/Rescue**: Samurai cannot use these features (honor code)
- **Dual-Wielding**: Berserkers can dual-wield 1-handed + magical weapons innately
- **Charm Duration**: Extended by Fame/Infamy perk

## Lessons Learned
- Start in Midgaard City (Zone 2) - safe starting location
- Use "commands" first to see available actions
- Check "help <topic>" for detailed information
- Respect class alignment requirements
- Choose perks carefully - weapon prof perks are mutually exclusive
- Different classes excel at different playstyles
- Zone difficulty ratings: 1=Easy, 2=Moderate, 3=Challenging, 4=Hard, 5=Raid/Group
- Raid zones require groups (3-4+ players recommended)

---
*This knowledge base grows as you explore. Continue documenting discoveries!*
