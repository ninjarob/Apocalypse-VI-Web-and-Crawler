# Apocalypse VI MUD - Combat System Guide

## Table of Contents
1. [Basic Combat](#basic-combat)
2. [Combat Commands](#combat-commands)
3. [Advanced Combat Techniques](#advanced-combat-techniques)
4. [Special Attacks](#special-attacks)
5. [Combat States and Positions](#combat-states-and-positions)
6. [Damage Types and Resistances](#damage-types-and-resistances)
7. [Combat Strategy](#combat-strategy)
8. [Class-Specific Combat](#class-specific-combat)

---

## Basic Combat

### Starting Combat
- **kill/hit <target>**: Initiate combat with a monster or player
- Combat continues automatically with melee attacks until one side is defeated
- Players can only attack one target at a time

### Combat Flow
- Combat occurs in rounds (approximately 3 seconds each)
- Each round, characters perform attacks based on their weapon speed and class
- Damage is calculated and applied simultaneously
- Combat continues until one side flees, dies, or the fight is otherwise ended

### Auto-Combat
- Once combat begins, characters automatically attack their target each round
- Players can use special combat commands during battle
- Combat ends when HP reaches 0 or through flee/rescue commands

---

## Combat Commands

### Basic Commands
- **kill <victim>**: Start fighting a target (also works as "hit")
- **flee**: Attempt to escape combat (not available to Samurai)
- **rescue <character>**: Draw aggro from a group member (not available to enraged characters)

### Offensive Maneuvers
- **bash <victim>**: Knock opponent down, causing them to lose attacks
  - Level/Class: 3rd Fighter, 3rd Anti-paladin, 5th Paladin, 7th Berserker
  - Success based on strength vs constitution rolls
  - Can also bash down doors
- **kick <victim>**: Powerful kick attack with 3-round lag
  - Level/Class: 1st Fighter, 1st Anti-paladin, 1st Paladin, 2nd Ranger, 6th Berserker, 8th Monk
  - Damage: (Level + Total Damage Bonus)
  - Monks must be in Xubu or Hebu stance
- **disarm <victim>**: Attempt to remove opponent's weapon
  - Level/Class: 5th Fighter, 3rd Paladin, 3rd Samurai
  - Requires both combatants to be wielding weapons

### Defensive Actions
- **parry**: Automatically attempt to block incoming attacks
  - Reduces chance of being hit
  - Cannot be used with certain other defensive skills
- **dodge**: Avoid incoming attacks through acrobatics
  - Level/Class: 21st Thief
  - Requires 3 movement points per successful dodge
  - Dexterity-based success rate

---

## Advanced Combat Techniques

### Backstab and Sneak Attacks
- **backstab <victim>**: Sneak attack for massive damage
  - Level/Class: 3rd Thief, 5th Anti-paladin
  - Requires sneak to be active
  - Damage multipliers: x1-x9 based on level
  - 35% base failure rate, reduced by dexterity
  - 2-round lag after use
- **circle <victim>**: Half-strength backstab on engaged targets
  - Level/Class: 10th Thief
  - 3-round lag, 45% base failure rate
- **double <victim>**: Two backstab attempts
  - Requires 7 movement points per successful stab
  - Higher failure rate for second stab

### Area and Special Attacks
- **trip <victim>**: Knock opponent prone
  - Reduces their combat effectiveness
- **hamstring <victim>**: Reduce opponent's movement speed
- **circle**: Thief flanking maneuver
- **sweep**: Area attack affecting multiple targets

### Combat Enhancements
- **rage**: Berserker temporary power boost
- **berserk**: Berserker ultimate fury (33% damage bonus)
  - Cannot flee or be rescued while berserk
- **blitz**: Berserker rapid attack sequence
  - 22nd Berserker, 33rd Fighter
  - 2-5 bonus attacks over 2 rounds
- **bloodlust <victim>**: Berserker devastating attack
  - 17th Berserker
  - Immediate + lingering damage
  - Restores HP equal to damage dealt

---

## Special Attacks

### Class-Specific Abilities

#### Warrior Classes
- **Death Strike**: Samurai lethal finishing move
- **Whirlwind Attack**: Samurai area attack
- **Holy Lance**: Paladin holy attack
- **Blitz**: Fighter/Berserker rapid strikes

#### Rogue Classes
- **Backstab/Circle**: Thief sneak attacks
- **Envenom**: Apply poison to weapons (13th Thief)
- **Double Backstab**: Enhanced sneak attack

#### Spellcaster Classes
- **Agony**: Warlock channeled damage (1st Warlock)
- **Chakra Disruption**: Monk mana drain (25th Monk)
- **Crippling Wave**: Monk movement drain (22nd Monk)
- **Exploding Palm**: Monk delayed damage (32nd Monk)

#### Hybrid Classes
- **Palm Strike**: Monk ki attack
- **Phoenix Fist**: Monk fire-based attack
- **Battle Ballad**: Bard group damage enhancement (18th Bard)
- **Lamentation**: Bard enemy debuff (12th Bard)

### Monk Stances
Monks must be in specific stances to use certain attacks:
- **Hebu**: Required for Chakra Disruption and Crippling Wave
- **Xubu**: Required for kick attacks
- **Mabu**: Required for Exploding Palm
- **Gongbu**: Required for Exploding Palm

---

## Combat States and Positions

### Character Positions
- **Standing**: Normal combat position
- **Fighting**: Actively engaged in combat
- **Sitting**: Cannot attack or be attacked
- **Resting**: Reduced regeneration
- **Sleeping**: Vulnerable state, cannot act

### Combat Status Effects
- **Stunned**: Temporary incapacitation
- **Paralyzed**: Unable to act
- **Prone**: Knocked down (from bash/trip)
- **Staggered**: Reduced combat effectiveness

### Wimpy System
- **wimpy <number>**: Auto-flee when HP drops below threshold
- Prevents death from unexpected damage
- Can be set to 0 to disable

---

## Damage Types and Resistances

### Elemental Damage Types (13 total)
1. **Fire**: Burning and heat damage
2. **Frost**: Cold and ice damage
3. **Electricity**: Lightning and energy damage
4. **Sonic**: Sound-based damage
5. **Poison**: Toxic damage over time
6. **Acid**: Corrosive damage
7. **Gas**: Suffocation damage
8. **Light**: Holy/radiant damage
9. **Shadow**: Dark/negative energy damage
10. **Divine**: Holy damage
11. **Summoning**: Magical creature damage
12. **Life**: Positive energy damage
13. **Fear**: Mental/psychological damage

### Resistance System
- Characters can have innate resistances based on race
- Equipment can provide resistance bonuses
- Spells can grant temporary resistances
- Some damage types bypass certain resistances

### Saving Throws (5 Types)
- **Para**: Paralysis, Poison, Death magic
- **Rod**: Rod/Staff/Wand effects
- **Petr**: Petrification/Polymorph
- **Breath**: Breath weapon attacks
- **Spell**: General spell resistance

---

## Combat Strategy

### Basic Tactics
1. **Assess the Enemy**: Use `consider` to evaluate target difficulty
2. **Positioning**: Use room layout to your advantage
3. **Timing**: Use special attacks at optimal moments
4. **Resource Management**: Monitor HP, mana, and movement points

### Group Combat
- **Grouping**: Form parties for coordinated attacks
- **Rescue**: Protect vulnerable group members
- **Tanking**: Dedicated damage absorbers
- **Healing**: Keep group healthy during fights

### Advanced Strategies
- **Kiting**: Lure enemies while maintaining distance
- **Crowd Control**: Use area effects to manage multiple enemies
- **Interruption**: Prevent enemy spellcasting with bash/stun
- **Resource Denial**: Drain enemy mana/movement with special attacks

### Environmental Factors
- **Light Levels**: Darkness affects combat accuracy
- **Terrain**: Different areas provide combat bonuses/penalties
- **Weather**: Can affect movement and certain abilities
- **Room Size**: Affects area attacks and positioning

---

## Class-Specific Combat

### Warriors (High HP, Multiple Attacks)
- **Fighter**: Well-rounded physical combatant
- **Paladin**: Holy warrior with healing abilities
- **Anti-Paladin**: Dark warrior with fear effects
- **Samurai**: Honor-bound warrior (cannot flee/rescue)
- **Berserker**: Rage-fueled warrior with bonus damage

### Rogues (Sneak Attacks, Stealth)
- **Thief**: Master of backstab and stealth
- **Ranger**: Nature warrior with dual-wield capability

### Spellcasters (Magical Damage)
- **Magic User**: Arcane damage spells
- **Cleric**: Healing and protection spells
- **Necromancer**: Death magic and undead control
- **Warlock**: Channeled damage (no initial mana cost)

### Hybrids (Mixed Combat Styles)
- **Monk**: Martial artist with ki powers and stances
- **Bard**: Musical enhancement and control spells
- **Druid**: Nature magic with shapeshifting

### Combat Statistics
- **Hit Points**: Health pool (3-14 per level by class)
- **Armor Class**: Defensive rating (-200 best, 100 worst)
- **Hitroll/Damroll**: To-hit and damage bonuses
- **Attack Speed**: How often you attack per round

---

## Combat Tips and Best Practices

### Preparation
- Always check equipment condition before major fights
- Ensure adequate food/water for regeneration
- Group with complementary classes
- Study enemy patterns and weaknesses

### During Combat
- Monitor your HP and use healing when needed
- Position yourself advantageously
- Use special attacks strategically (they often have cooldowns)
- Be aware of your surroundings and escape routes

### Recovery
- Rest after combat to regain resources
- Use healing spells/potions as needed
- Repair damaged equipment
- Learn from each encounter

### Advanced Techniques
- **Dual Wielding**: Attack twice per round (requires skill)
- **Weapon Specialization**: Bonus damage with specific weapon types
- **Spell Disruption**: Interrupt enemy casting
- **Environmental Combat**: Use terrain features strategically

---

*This combat guide covers the core mechanics of fighting in Apocalypse VI MUD. Combat is a complex system with many strategic elements. Practice and experience are key to mastering different combat styles and tactics.*