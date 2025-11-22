# Character Creation Guide

## Overview

Character creation in Apocalypse VI MUD is a deep and strategic process that determines your playstyle, strengths, and progression path. This guide covers all aspects of creating and developing your character.

## Core Abilities

Your character has 6 core abilities that define their fundamental capabilities. Each ability ranges from 0-25 and provides specific bonuses.

### Strength (STR)
Controls physical power and carrying capacity.

| Score | Weight Capacity | Damage Bonus | Wield Weight | HP Regen |
|-------|----------------|--------------|--------------|----------|
| 0-9   | 0-150         | -10 to -1   | 0-9         | 0       |
| 10-14 | 170-325       | 0           | 10-14       | 0       |
| 15-20 | 375-500       | 1-2         | 15-32       | 0-6     |
| 21-25 | 525-650       | 3-6         | 34-42       | 7-12    |

**Key Effects:**
- **Weight Capacity**: Maximum weight you can carry
- **Damage Bonus**: Added to weapon damage rolls
- **Wield Weight**: Maximum weight of weapons you can wield
- **HP Regen**: Hit points regenerated per tick

### Intelligence (INT)
Affects spell learning and mana capacity.

| Score | Practice % | Mana Bonus | Exp Bonus |
|-------|------------|------------|-----------|
| 0-15  | 1-15      | 0          | 0        |
| 16-20 | 16-23     | 2-3        | 2-10     |
| 21-25 | 25-35     | 3-5        | 12-25    |

**Key Effects:**
- **Practice %**: Chance to learn spells/skills per practice session
- **Mana Bonus**: Additional mana points
- **Exp Bonus**: Experience point multiplier

### Wisdom (WIS)
Controls skill learning and mana regeneration.

| Score | Skill Learn % | Mana Bonus | Mana Regen |
|-------|----------------|------------|------------|
| 0-15  | 1-5           | 0          | 0         |
| 16-20 | 6-8           | 1-2        | 2-6       |
| 21-25 | 8-12          | 2-4        | 7-12      |

**Key Effects:**
- **Skill Learn %**: Chance to learn skills per practice session
- **Mana Bonus**: Additional mana points
- **Mana Regen**: Mana points regenerated per tick

### Dexterity (DEX)
Affects combat accuracy, armor effectiveness, and mobility.

| Score | Items Carried | Move Bonus | Armor Bonus | Hit Bonus |
|-------|---------------|------------|-------------|-----------|
| 0-6   | 5-15         | -4 to 0   | 70 to 10  | -10 to -4|
| 7-14  | 15-17        | 0         | 0          | -3 to 0  |
| 15-20 | 17-24        | 0-3       | -10 to -60| 0-2      |
| 21-25 | 26-40        | 4-5       | -70 to -100| 2-4     |

**Key Effects:**
- **Items Carried**: Maximum number of items you can carry
- **Move Bonus**: Movement points per tick
- **Armor Bonus**: AC penalty (negative is better)
- **Hit Bonus**: Added to attack rolls

### Constitution (CON)
Determines health and survivability.

| Score | HP Bonus | Critical Resist | Move Regen |
|-------|----------|----------------|------------|
| 0-15  | -4 to 0 | 0             | 0         |
| 16-20 | 1-3     | 10-30         | 2-6       |
| 21-25 | 3-6     | 35-75         | 7-12      |

**Key Effects:**
- **HP Bonus**: Additional hit points per level
- **Critical Resist**: Resistance to critical hits (%)
- **Move Regen**: Movement points regenerated per tick

### Charisma (CHA)
Affects social interactions and experience gain.

| Score | Total Levels Bonus | Mob Aggro |
|-------|-------------------|-----------|
| 0-11  | -12 to -1        | 90 to 0  |
| 12-15 | 0-5              | 0        |
| 16-25 | 6-15             | -5 to -85|

**Key Effects:**
- **Total Levels Bonus**: Experience modifier based on total character levels
- **Mob Aggro**: Likelihood of monsters attacking you

**Special Notes:**
- Necromancers get +10 CHA bonus and invert the total levels bonus (negative becomes positive)
- Mages get +5 CHA bonus

## Races

Choose from 17 distinct races, each with unique characteristics and playstyles.

### Physical Races
- **Human**: Adaptable to all conditions, quick learners
- **Dwarf**: Short, stocky, muscular. Love beards, beer, and gold
- **Elf**: Slender, great love for nature, magic, and art
- **Gnome**: Kin to Dwarves but less powerful. Lively and playful
- **Half-Elf**: Union of human and elf, often despised by both races
- **Half-Giant**: Union of Humans and Giants, taller and more muscular
- **Halfling**: Small plump people, agile and known for lock picking
- **Minotaur**: Large creatures desiring flesh, known for strength
- **Troll**: Fearless darkness creatures, strength rivaling half-giants

### Mystical Races
- **Pixie**: Small winged kin of Elves, love nature and practical jokes
- **Planewalker**: From another dimension, especially proficient with magic
- **Tiefling**: Infernal creatures from hell fires, fire resistant, frost vulnerable

### Elemental Races
- **Triton**: Aquatic humanoids, excel in water environments
- **Uldra**: Cousins to Dwarves/Gnomes living in tundra, empathic with animals
- **Dragonborn**: Trace lineage to dragons, natural battle ability
- **Wemic**: Half-lion, half-man from plains, renowned for strength and speed
- **Lizardkind**: At home in swamps, hardy creatures

## Classes

14 distinct classes organized into 4 groups, each with unique abilities and playstyles.

### Warrior Group
Focus on physical combat and martial prowess.

#### Fighter
- **Description**: Brute strength is their forte, no magical abilities
- **HP Regen**: 5, **Mana Regen**: 11, **Move Regen**: 21
- **Key Skills**: Parry, Rescue, Bash, Disarm, Track, Rage

#### Paladin
- **Description**: Holy warriors pursuing highest ideals, gain magic at high levels
- **Alignment**: Good
- **HP Regen**: 5, **Mana Regen**: 21, **Move Regen**: 11
- **Key Skills**: Layhands, Turn Undead, Shield Against Evil, Dispel Evil

#### Ranger
- **Description**: Hunters and trackers, gain nature magic at high levels
- **HP Regen**: 5, **Mana Regen**: 21, **Move Regen**: 5
- **Key Skills**: Track, Animal Friendship, Charm Beast, Waterwalk

#### Samurai
- **Description**: Honorable warriors following bushido code
- **Alignment**: Good
- **HP Regen**: 5, **Mana Regen**: 21, **Move Regen**: 11
- **Key Skills**: Parry, Accuracy, Disarm, Meditate, Iaijutsu

#### Berserker
- **Description**: Fearless warriors fueled by rage
- **HP Regen**: 21, **Mana Regen**: 11, **Move Regen**: 5
- **Key Skills**: Dual-Wield 1h, Rage, Bash, Sweep, Bloodlust

### Priest Group
Divine spellcasters drawing power from gods.

#### Cleric
- **Description**: Healers and blessing givers, can learn violent spells
- **HP Regen**: 5, **Mana Regen**: 5, **Move Regen**: 5
- **Key Skills**: Cure Light, Bless, Aid, Heal Light, Sanctuary

#### Druid
- **Description**: Nature priests controlling elements and animals
- **HP Regen**: 11, **Mana Regen**: 21, **Move Regen**: 5 (Battle Druid)
- **HP Regen**: 11, **Mana Regen**: 5, **Move Regen**: 5 (Restoration Druid)
- **Key Skills**: Create Water, Elemental Shard, Barkskin, Sunray

#### Monk
- **Description**: Martial holy warriors seeking enlightenment
- **HP Regen**: 5, **Mana Regen**: 11, **Move Regen**: 11
- **Key Skills**: Lay Hands, Meditate, Palm Strike, Phoenix Fist

### Wizard Group
Arcane spellcasters mastering magical arts.

#### Magic User
- **Description**: General spellcasters mastering all magic
- **HP Regen**: 11, **Mana Regen**: 21, **Move Regen**: 5
- **Key Skills**: Magic Missile, Armor, Invisibility, Lightning Bolt

#### Necromancer
- **Description**: Pervert life forces for personal ends
- **Alignment**: Evil
- **HP Regen**: 5, **Mana Regen**: 21, **Move Regen**: 11
- **Key Skills**: Spook, Turn Undead, Curse, Animate Dead

#### Warlock
- **Description**: Draw upon darkness power, evil alignment required
- **Alignment**: Evil
- **HP Regen**: 11, **Mana Regen**: 21, **Move Regen**: 5
- **Key Skills**: Agony, Torment, Life Steal, Hellfire

### Rogue Group
Masters of stealth, deception, and survival.

#### Thief
- **Description**: Cunning, nimble, and stealthy
- **HP Regen**: 5, **Mana Regen**: 11, **Move Regen**: 21
- **Key Skills**: Hide, Pick Lock, Steal, Backstab, Disable Trap

#### Anti-Paladin
- **Description**: Everything mean and despicable, nemesis to Paladins
- **HP Regen**: 5, **Mana Regen**: 21, **Move Regen**: 11
- **Key Skills**: Detect Alignment, Kick, Backstab, Poison, Harm

#### Bard
- **Description**: Woo audiences with charisma and magical entertainment
- **HP Regen**: 5, **Mana Regen**: 21, **Move Regen**: 11
- **Key Skills**: Hide, Detect Magic, Invisibility, Haste, Sleep

## Class Proficiencies

Each class has unique skills and spells learned at specific levels. See `data/class-proficiencies.json` for complete lists.

### Proficiency Categories
- **Skills**: Physical abilities and combat techniques
- **Spells**: Magical abilities requiring mana
- **Prerequisites**: Some proficiencies require others to be learned first

### Learning System
- Practice at guild trainers to learn new proficiencies
- Intelligence/Wisdom affect learning success rates
- Higher level proficiencies become available as you level

## Class Perks

Special abilities chosen during character creation, providing unique bonuses.

### Weapon Proficiencies (Choose One)
- **Lumberjack**: +1 damage per 10 levels with slash weapons
- **Pugilist**: +1 damage per 10 levels with blunt weapons/unarmed
- **Tentmaker**: +1 damage per 10 levels with piercing weapons
- **Fletcher**: +1 damage per 10 levels with special weapons

### Universal Perks (Multiple Allowed)
- **Pyromaniac**: +25 Fire Damage
- **Boreal Native**: +25 Frost Damage
- **Conduit**: +25 Electricity Damage
- **Musician**: +25 Sonic Damage
- **Favor**: +25 Divine Damage
- **Haunted**: +25 Shadow Damage
- **Snake Handler**: +25 Poison Damage
- **Alchemist**: +25 Acid Damage
- **Prism Maker**: +25 Light Damage
- **Tinkerer**: +7% Spell Crit Chance
- **Spiritualist**: 5% increased mana return on kill
- **Seer**: 25% increased mana return total
- **Glass Cannon**: +40 All-Spell damage, -50% HP
- **Astrologist**: High chance for free wand/staff casts
- **Empowered**: Strength spell gives +3 STR instead of +1
- **Fame/Infamy**: +15 ticks to charm duration
- **Metabolic Boost**: Single bite fills hunger
- **Guardian Spirit**: +4 hours to protection spell duration
- **Treasure Hunter**: +1 rent slot
- **Jeweler**: Increased enchanting material drops
- **Perfectionist**: +4 Hitroll
- **Hoarder**: +15 inventory slots
- **Giant Slayer**: Ignore STR weapon weight requirements
- **Bountiful Wonder**: Sustain duration +10 then x2
- **Nomad**: Haste doesn't increase hunger
- **Siege Captain**: +50% resistance buff duration
- **Pack Mule**: +50% carrying capacity

### Class-Specific Perks
Each class has unique perks enhancing their playstyle (see seed data for details).

## Character Progression

### Level Advancement
- Gain experience through combat, quests, and exploration
- Level up to increase HP, mana, and learn new proficiencies
- Multi-classing available (limited combinations)

### Ability Score Progression
- Start with base scores assigned during creation
- Some abilities can be enhanced through magical means
- Racial and class modifiers apply

### Equipment and Development
- Find better equipment as you explore
- Customize gear through enchanting and crafting
- Bind items to prevent loss

## Strategic Considerations

### Class Selection
- Consider your preferred playstyle (combat, magic, stealth)
- Think about group composition and party roles
- Some classes have alignment restrictions

### Ability Score Planning
- Prioritize abilities important to your class
- Consider racial bonuses and penalties
- Plan for long-term character development

### Perk Selection
- Choose weapon proficiencies based on intended combat style
- Select universal perks that enhance your build
- Consider class-specific perks for unique advantages

## Advanced Topics

### Multi-Classing
- Combine abilities from different classes
- Limited combinations available
- Requires careful planning and resource management

### Prestige Classes
- Advanced class options unlocked at high levels
- Require specific achievements and prerequisites
- Provide unique abilities and playstyles

### Equipment Optimization
- Match gear to your character's strengths
- Consider set bonuses and item interactions
- Balance offense, defense, and utility

This guide provides the foundation for creating a powerful character in Apocalypse VI MUD. Experiment with different combinations and find the playstyle that suits you best!</content>
<parameter name="filePath">c:\work\other\Apocalypse VI MUD\docs\game\character-creation.md