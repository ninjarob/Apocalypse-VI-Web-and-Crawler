# Apocalypse VI MUD - Game Mechanics Guide

## Table of Contents
1. [Movement and Navigation](#movement-and-navigation)
2. [Rooms and Geography](#rooms-and-geography)
3. [Character System](#character-system)
4. [Items and Equipment](#items-and-equipment)
5. [Combat System](#combat-system)
6. [Magic and Spells](#magic-and-spells)
7. [Social and Economic Systems](#social-and-economic-systems)
8. [Time and Environment](#time-and-environment)

---

## Movement and Navigation

### Basic Movement Commands
- **north/n**, **south/s**, **east/e**, **west/w**: Cardinal directions
- **up/u**, **down/d**: Vertical movement
- **northeast/ne**, **northwest/nw**, **southeast/se**, **southwest/sw**: Diagonal directions
- **enter/exit**: Enter/exit buildings or portals
- **portal**: Use magical portals (requires Portal Magic skill)

### Advanced Movement
- **scan**: See entities in adjacent rooms (shows direction, distance, and brief descriptions)
- **look <direction>**: Examine exits and see what's visible in that direction
- **exits**: List all available exits from current room
- **time**: Check current game time and date
- **recall**: Return to bind point (requires Word of Recall spell)
- **track**: Follow creature tracks (Ranger skill)

### Movement Points (Moves)
- **Regeneration**: 5-21 moves per tick depending on class
- **Cost**: Most rooms cost 1 move, some terrain costs more
- **Airwalk/Waterwalk**: Reduces movement costs to 1 per room
- **Haste**: Increases movement speed but raises food consumption

### Portal Magic System
- **Portal Scanning**: Advanced scanning reveals portal destinations
- **Portal Keys**: Unique identifiers for portal locations
- **Zone Exits**: Special exits that lead to different zones
- **Binding Keys**: Portal binding mechanics for fast travel

---

## Rooms and Geography

### Room Structure
Each room contains:
- **Name**: Brief title (e.g., "Town Square", "Dark Forest Path")
- **Description**: Detailed environment description
- **Exits**: Available movement directions
- **Entities**: NPCs, items, and other players present
- **Terrain**: Affects movement and certain abilities
- **Zone**: Area classification (1-5 difficulty rating)
- **Coordinates**: X,Y position for mapping

### Terrain Types
- **Inside**: Buildings, caves, dungeons
- **City**: Urban areas with shops and NPCs
- **Field**: Open grasslands
- **Forest**: Wooded areas
- **Hills**: Elevated terrain
- **Mountain**: High altitude, difficult terrain
- **Water**: Requires boat or swimming ability
- **Air**: Requires flight ability
- **Desert**: Harsh environment
- **Swamp**: Muddy, disease-prone areas
- **Underwater**: Requires water breathing

### Zone System
- **74 Zones** total, difficulty rated 1-5
- **Zone Visibility**: Players can only see others in same zone (unless grouped)
- **Zone Exits**: Special transitions between areas
- **Zone Chat**: Communication limited to zone members

### Geographic Features
- **Doors**: Can be open/closed/locked
- **Keys**: Required for locked doors/containers
- **Traps**: Hidden dangers (detectable by Thieves)
- **Portals**: Magical transportation devices
- **Bridges/Roads**: Connect different terrain types

---

## Character System

### Races (24 Available)

#### Common Races
- **Human**: Balanced, +1 STR, +2 CHA, adaptable
- **Dwarf**: Mountain dwellers, +2 STR/+2 CON, -1 DEX, poison/magic resistant
- **Elf**: Forest beings, +3 INT, +1 WIS, -1 CON, charm/sleep resistant
- **Halfling**: Small folk, +3 DEX, -1 STR, stealth bonuses
- **Gnome**: Tinkers, +2 INT/+2 WIS, -1 CON
- **Half-Elf**: Mixed heritage, +2 INT, -1 DEX, +1 CHA

#### Exotic Races
- **Pixie**: Tiny flyers, -2 STR, +1 WIS, +3 CHA, can see invisible
- **Minotaur**: Bull warriors, +2 STR/+1 INT, -3 CHA, excellent trackers
- **Troll**: Dark creatures, +2 STR, -1 WIS, +2 DEX, -1 CHA
- **Dragonborn**: Dragon heritage, +2 STR, +1 WIS, -1 DEX, +1 CON
- **Wemic**: Lion-folk, +2 STR, -1 WIS, +1 DEX, +1 CHA
- **Tiefling**: Infernal blood, +1 STR, +2 INT, +1 DEX, -1 CHA, fire resistant
- **Planewalker**: Dimensional travelers, +1 INT, +3 WIS, -1 CON
- **Lizardkind**: Swamp dwellers, +1 STR, +3 CON, -1 CHA
- **Uldra**: Tundra cousins, +2 STR, +2 INT, +1 WIS, -2 CHA
- **Half-Giant**: Massive beings, +3 STR, -1 INT, +1 CON, -1 CHA
- **Triton**: Sea folk, +1 STR, -1 INT, +2 DEX, +1 CON
- **Centaur**: Horse-human hybrids, natural charges in combat

### Classes (14 Available)

#### Warriors (Group 1)
- **Fighter**: Well-rounded physical combatant
- **Paladin**: Holy warrior (GOOD alignment required)
- **Anti-Paladin**: Dark warrior (EVIL alignment required)
- **Ranger**: Nature warrior with tracking and dual-wield
- **Samurai**: Honor-bound warrior (GOOD alignment, cannot flee/rescue)
- **Berserker**: Rage-fueled warrior (innate dual-wield 1h + magical)

#### Rogues (Group 4)
- **Thief**: Master of stealth, locks, and backstab

#### Spellcasters (Group 3)
- **Magic User**: Arcane spellcaster with vast spell knowledge
- **Cleric**: Divine spellcaster with healing and protection
- **Necromancer**: Master of death magic and undead
- **Warlock**: Channeling specialist (EVIL, no initial mana cost, drains per hit)

#### Hybrids (Group 2)
- **Monk**: Martial artist with ki powers
- **Bard**: Jack-of-all-trades with music magic
- **Druid**: Nature magic and shapeshifting

### Character Statistics

#### Primary Attributes (STR, INT, WIS, DEX, CON, CHA)
- **Base Range**: 3-18 (modified by race)
- **Training**: Can be increased beyond racial limits via quests
- **Maximum**: 16 base, higher with training

#### Combat Statistics
- **Hit Points**: 3-14 per level depending on class
- **Mana Points**: 6-9 per level for spellcasters
- **Movement Points**: 5-21 regeneration per tick
- **Armor Class**: -200 (best) to 100 (worst)
- **Hitroll/Damroll**: To-hit and damage bonuses

#### Saving Throws (5 Types)
- **Para**: Paralysis, Poison, Death magic
- **Rod**: Rod/Staff/Wand effects
- **Petr**: Petrification/Polymorph
- **Breath**: Breath weapon attacks
- **Spell**: General spell resistance

### Perks System (Universal Specializations)

#### Weapon Proficiency Perks (Choose ONE)
- **Lumberjack**: +1 damage/10 levels with slash weapons
- **Pugilist**: +1 damage/10 levels with blunt weapons
- **Tentmaker**: +1 damage/10 levels with piercing weapons
- **Fletcher**: +1 damage/10 levels with special weapons (bows/whips)

#### Elemental Damage Perks (Unlimited)
- **Pyromaniac**: +25 Fire damage
- **Boreal Native**: +25 Frost damage
- **Conduit**: +25 Electricity damage
- **Musician**: +25 Sonic damage
- **Favor**: +25 Divine damage
- **Haunted**: +25 Shadow damage
- **Snake Handler**: +25 Poison damage
- **Alchemist**: +25 Acid damage
- **Prism Maker**: +25 Light damage

#### Utility Perks (Unlimited)
- **Tinkerer**: +7% Spell Crit Chance
- **Spiritualist**: 5% increased mana return on kill
- **Seer**: 25% increased mana return total
- **Glass Cannon**: +40 All-Spell damage, HP halved
- **Astrologist**: Wands/Staves high chance to cast free
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

---

## Items and Equipment

### Item Types
- **Weapons**: Slash, Pierce, Blunt, Special (bows, whips)
- **Armor**: Body armor, shields, helmets, gloves, boots, etc.
- **Containers**: Bags, chests, backpacks
- **Light Sources**: Torches, lanterns, magical lights
- **Consumables**: Food, drinks, potions
- **Spell Items**: Scrolls, wands, staves
- **Keys**: For locked doors/containers
- **Treasure**: Valuable but unusable items

### Item Properties
- **Materials**: Gold, silver, iron, steel, leather, cloth, wood, stone, bone, glass, paper, organic, magical, adamantite, mithril, dragonscale
- **Sizes**: Special, tiny, small, normal, medium, large, huge, gigantic
- **Wear Locations**: Finger, neck, body, head, legs, feet, hands, arms, shield, about, waist, wrist, wield, hold, face, ear, back
- **Bindings**: Non-binding, bind on pickup, bind on equip, bound
- **Flags**: Magic, unique, unbreakable, !donate, !sell, !drop, cursed, invisible, glow, hum
- **Restrictions**: Class/race limitations

### Weapon System
- **Damage Dice**: Variable damage ranges (e.g., 2D4)
- **Damage Types**: Slash, pierce, bludgeon
- **Hand Requirements**: One-hand, two-hand, main-hand, off-hand
- **Weapon Skills**: Required proficiencies for optimal use

### Armor System
- **Armor Points**: -1000 (best) to 100 (worst)
- **Armor Class**: Calculated from armor points
- **Types**: Light, medium, heavy armor
- **Coverage**: Different body parts provide different protection

### Magical Items
- **Stat Modifiers**: Bonuses to STR, DEX, CON, etc.
- **Spell Effects**: Cast spells when used
- **Granted Abilities**: Infravision, detect magic, fly, etc.
- **Charges**: Limited uses for wands/staves

---

## Combat System

### Basic Combat
- **Attack**: Automatic melee attacks
- **Flee**: Attempt to escape combat (not available to Samurai)
- **Rescue**: Protect group members (not available to Samurai)

### Advanced Combat
- **Backstab**: Thief sneak attack (2x-5x damage)
- **Bash**: Knock opponent down
- **Kick**: Basic combat maneuver
- **Disarm**: Remove opponent's weapon
- **Trip**: Knock opponent prone
- **Circle**: Thief flanking attack

### Special Attacks
- **Rage**: Berserker temporary power boost
- **Berserk**: Berserker ultimate fury
- **Blitz**: Berserker rapid attack
- **Hamstring**: Reduce opponent movement
- **Death Strike**: Samurai lethal attack
- **Whirlwind Attack**: Samurai area attack

### Combat States
- **Position**: Standing, fighting, sitting, resting, sleeping
- **Wimpy**: Auto-flee when HP drops below threshold
- **Stunned**: Temporary incapacitation
- **Paralyzed**: Unable to act
- **Sleeping**: Vulnerable state

### Damage Types & Resistances
13 elemental types: Fire, Electricity, Sonic, Poison, Cold/Frost, Acid, Gas, Light, Summoning, Life, Fear, Shadow, Divine

---

## Magic and Spells

### Mana System
- **Regeneration**: 5-21 mana per tick depending on class
- **Channeling**: Warlock spells (no initial cost, drains per hit)
- **Vitalize Mana**: Restore mana spells
- **Mana Shield**: Use mana to absorb damage

### Spell Schools

#### Cleric Spells (Divine)
- **Healing**: Cure Light, Cure Serious, Cure Critic, Heal
- **Protection**: Shield Evil/Good, Protection Evil/Good, Sanctuary
- **Offensive**: Flamestrike, Harm, Holy/Unholy Word
- **Utility**: Turn Undead, Remove Curse, Word of Recall

#### Magic User Spells (Arcane)
- **Combat**: Magic Missile, Lightning Bolt, Fireball, Chain Lightning
- **Control**: Hold Person/Monster, Sleep, Charm Person/Monster
- **Utility**: Invisibility, Teleport, Dimension Door, Identify
- **Enhancement**: Haste, Strength, Armor

#### Druid Spells (Nature)
- **Elemental**: Call Lightning, Flamestrike, Earthquake
- **Healing**: Cure spells, Heal Light/Serious/Critic
- **Control**: Hold Animal/Beast/Plant, Charm Beast
- **Utility**: Waterwalk, Barkskin, Pass Without Trace

#### Necromancer Spells (Death)
- **Necromancy**: Animate Dead, Summon Skeleton/Phantasmal
- **Curses**: Curse, Poison, Chill Touch
- **Control**: Control Undead, Hold Undead
- **Enhancement**: Shadow Armor, Vampiric Gaze

#### Bard Spells (Music)
- **Enchantment**: Sleep, Charm Person, Lullaby
- **Enhancement**: Strength, Haste, Invisibility
- **Utility**: Knock, Teleport Minor/Major, Legend Lore
- **Combat**: Color Spray, Sonic Blast, Wail of the Banshee

#### Monk Spells (Ki)
- **Healing**: Lay Hands, Cure Blind, Remove Paralysis
- **Enhancement**: Endurance, Free Action, Waterwalk
- **Combat**: Palm Strike, Phoenix Fist, Exploding Palm
- **Utility**: Teleview, Phase Door, Dreamsight

#### Warlock Spells (Infernal)
- **Channeling**: Agony, Torment, Madness, Mind Implosion
- **Enhancement**: Transfuse, Life Leech, Thaumaturgy
- **Combat**: Burning Hands, Firebolt, Hellfire
- **Utility**: Cloak of Shadows, Shadow Walk, Demonic Clarity

### Spell Mechanics
- **Level Requirements**: Spells unlock at specific levels
- **Prerequisites**: Some spells require others first
- **Mana Costs**: Vary by spell and caster level
- **Duration**: Temporary or permanent effects
- **Components**: Verbal, somatic, material requirements

---

## Social and Economic Systems

### Communication
- **Say**: Local room communication
- **Tell/Whisper**: Private messages
- **Shout**: Zone-wide communication
- **Gossip**: Global chat channel
- **Group Tell (gt)**: Group communication
- **Quest Channel**: Quest-related discussion

### Social Commands
- **Actions**: 100+ social emotes (wave, bow, dance, etc.)
- **Emote**: Custom roleplay actions
- **Echo**: Echo messages to room
- **Echoall**: Echo to all players

### Economic System
- **Currency**: Gold coins
- **Shops**: Buy/sell equipment and supplies
- **Banks**: Store gold safely
- **Bartering**: Trade with NPCs
- **Value**: Items have base gold values
- **Rent**: Store items at inn (prevents loss on death)

### Grouping
- **Group**: Form adventuring parties
- **Follow**: Follow other players
- **Order**: Command charmed creatures
- **Split**: Divide gold among group members

### Player Killing (PK)
- **PK Flag**: Enable/disable player killing
- **Alignment Effects**: Killing affects alignment
- **Consequences**: Death penalties, reputation changes
- **Safe Zones**: Protected areas

---

## NPC Interactions

### Limited Dialogue System
Apocalypse VI features a primarily action-based gameplay model with limited NPC dialogue:

#### NPC Types
- **Merchants/Shopkeepers**: Functional NPCs for buying/selling (use `list`, `buy`, `sell`, `value`)
- **Quest Givers**: Some NPCs offer quests, but dialogue is typically automatic/scripted
- **Mob Enemies**: Combat-focused, no dialogue interaction
- **Ambient NPCs**: Scenery/flavor characters with minimal or no interaction

#### Interaction Commands
- **ask <npc> <message>**: Limited functionality; few NPCs respond meaningfully
- **say <message>**: General communication in room, rarely triggers NPC responses
- **tell <npc> <message>**: Private communication, not commonly supported by NPCs
- **give <item> to <npc>**: Functional for quest items and trading
- **examine <npc>**: View NPC description

#### Important Notes
- Most gameplay focuses on exploration, combat, and environmental interaction
- NPCs typically serve functional roles (shops, quest markers) rather than conversational partners
- Lore and story are discovered through:
  - Room descriptions and environmental text
  - Readable items (books, signs, scrolls)
  - Quest text and objectives
  - Zone descriptions and area names

---

## Time and Environment

### Game Time
- **Tick System**: ~60 second intervals
- **Day/Night Cycle**: Affects visibility and NPC behavior
- **Calendar**: Year 1173+ in game world
- **Seasons**: Spring, Summer, Autumn, Winter

### Environmental Effects
- **Light Levels**: Darkness requires light sources
- **Weather**: Rain, snow, storms affect movement
- **Temperature**: Cold/frost damage in extreme conditions
- **Terrain Hazards**: Poison swamps, lava fields, etc.

### Real-time Systems
- **NPC Movement**: Mobs wander and behave dynamically
- **Regeneration**: HP/Mana/Moves recover over time
- **Shop Restocking**: Merchants replenish inventory
- **Weather Changes**: Dynamic environmental conditions

### Special Times
- **Full Moon**: Enhanced lycanthrope activity
- **Solar/Lunar Eclipses**: Rare magical events
- **Festivals**: Special in-game events
- **Siege Times**: Increased monster difficulty

---

*This guide covers the core mechanics of Apocalypse VI MUD. For detailed spell lists, zone guides, and advanced strategies, see the other documentation files.*