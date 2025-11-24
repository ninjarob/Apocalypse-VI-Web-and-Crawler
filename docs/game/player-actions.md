# Player Actions Guide

This guide documents all available player commands and abilities in Apocalypse VI MUD, organized by category. Each command includes its syntax, description, and usage examples where available.

## Table of Contents

- [Clans](#clans)
- [Combat](#combat)
- [Information](#information)
- [Interaction](#interaction)
- [Magic](#magic)
- [Movement](#movement)
- [Objects](#objects)
- [Social](#social)
- [Spells](#spells)

---

## Clans

### claninfo
**Syntax:** `claninfo`  
**Description:** Displays information about your clan affiliation and status.

### clanlist
**Syntax:** `clanlist`  
**Description:** Shows a list of all available clans in the game.

### clanwho
**Syntax:** `clanwho [clan name]`  
**Description:** Lists members of a specific clan who are currently online.

---

## Combat

### accuracy
**Syntax:** `cast 'accuracy'`  
**Description:** Ki power that increases attack accuracy for 1 round of combat. Requires 25 mana minimum. Grants immunity to misses but applies -100 AP penalty.

### assassinate
**Syntax:** `assassinate <victim>`  
**Level:** 39th Thief  
**Description:** Attempts to immediately dispatch a marked target. Success rate influenced by dexterity. 45 tick cooldown on success, 25 tick on failure. One attempt per mob iteration.

### backstab
**Syntax:** `backstab <victim>`  
**Description:** Sneak attack from behind dealing bonus damage. Enhanced by dexterity and dual-wield capabilities.

### bash
**Syntax:** `bash <victim>`  
**Description:** Powerful strike that can knock opponents down. Requires kick proficiency as prerequisite.

### berserk
**Syntax:** `berserk`  
**Description:** Enters a rage state increasing damage output but preventing flee attempts.

### blitz
**Syntax:** `blitz <victim>`  
**Description:** Rapid series of attacks. Damage increases with berserker level.

### bloodlust
**Syntax:** `bloodlust`  
**Description:** Enters a bloodthirsty rage that heals on critical hits. Critical heal multiplier increases with perks.

### counterstrike
**Syntax:** `counterstrike`  
**Level:** 33rd Thief  
**Description:** Automatic counterattack when successfully dodging. Requires 6 movement points per use.

### disarm
**Syntax:** `disarm <victim>`  
**Description:** Attempts to knock weapon from opponent's hand.

### evade
**Syntax:** `evade`  
**Description:** Defensive maneuver to avoid attacks.

### fury
**Syntax:** `fury`  
**Description:** Ultimate berserker rage with maximum damage output.

### hamstring
**Syntax:** `hamstring <victim>`  
**Description:** Attack that reduces victim's movement speed.

### kick
**Syntax:** `kick <victim>`  
**Description:** Basic kicking attack, prerequisite for advanced combat skills.

### overpower
**Syntax:** `overpower <victim>`  
**Description:** Overwhelming attack that can break through defenses.

### parry
**Syntax:** `parry`  
**Description:** Defensive sword technique to deflect attacks.

### rampage
**Syntax:** `rampage`  
**Description:** Uncontrolled berserker assault with high damage potential.

### rescue
**Syntax:** `rescue <victim>`  
**Description:** Pulls an ally out of combat.

### rush
**Syntax:** `rush`  
**Description:** Sudden burst of speed to gain combat advantage.

### sweep
**Syntax:** `sweep`  
**Description:** Wide-area attack hitting multiple opponents.

### taunt
**Syntax:** `taunt <victim>`  
**Description:** Provokes opponent, forcing them to attack you.

### trip
**Syntax:** `trip <victim>`  
**Description:** Attempts to trip opponent to the ground.

---

## Information

### affected
**Syntax:** `affected`  
**Description:** Shows all magical effects currently active on you.

### areas
**Syntax:** `area`  
**Description:** Displays information about the current zone/area.

### attributes
**Syntax:** `attributes` or `score`  
**Description:** Shows detailed character statistics and abilities.

### claninfo
**Syntax:** `claninfo`  
**Description:** Displays clan affiliation and status information.

### commands
**Syntax:** `commands`  
**Description:** Lists all available commands in the game.

### consider
**Syntax:** `consider <target>`  
**Description:** Evaluates the relative strength of a target.

### equipment
**Syntax:** `equipment` or `eq`  
**Description:** Shows all items currently equipped.

### examine
**Syntax:** `examine <object>`  
**Description:** Provides detailed information about an object.

### exits
**Syntax:** `exits`  
**Description:** Shows available exits from current room.

### group
**Syntax:** `group`  
**Description:** Shows current group composition and status.

### help
**Syntax:** `help <topic>`  
**Description:** Accesses the help system for specific topics.

### identify
**Syntax:** `cast 'identify' <item>`  
**Description:** Reveals detailed properties of magical items.

### inventory
**Syntax:** `inventory` or `i`  
**Description:** Lists all items in your inventory.

### level
**Syntax:** `level`  
**Description:** Shows current experience and level progression.

### look
**Syntax:** `look` or `l`  
**Description:** Describes the current room and its contents.

### prompt
**Syntax:** `prompt <format>`  
**Description:** Customizes the display prompt.

### scan
**Syntax:** `scan`  
**Description:** Looks in all directions for nearby creatures.

### score
**Syntax:** `score`  
**Description:** Shows character statistics and status.

### skills
**Syntax:** `skills`  
**Description:** Lists all learned skills and proficiencies.

### spells
**Syntax:** `spells`  
**Description:** Lists all known spells.

### status
**Syntax:** `status`  
**Description:** Shows current hit points, mana, and movement.

### time
**Syntax:** `time`  
**Description:** Shows current game time and date.

### weather
**Syntax:** `weather`  
**Description:** Shows current weather conditions.

### where
**Syntax:** `where <player>`  
**Description:** Shows location of specified player.

### who
**Syntax:** `who`  
**Description:** Lists all players currently online.

### whoami
**Syntax:** `whoami`  
**Description:** Shows your own character information.

---

## Interaction

### ask
**Syntax:** `ask <person> <message>`  
**Description:** Asks a question to another player or NPC.

**Note:** Very few NPCs respond to the `ask` command. Most NPCs in Apocalypse VI are functional (merchants, enemies) rather than conversational. For interactive NPCs that do respond, their responses are typically limited to specific keywords or quest-related topics.

### barter
**Syntax:** `barter <item> for <item>`  
**Description:** Trade items with NPCs or players.

### buy
**Syntax:** `buy <item>`  
**Description:** Purchase items from shops.

### donate
**Syntax:** `donate <item>`  
**Description:** Donate items to temples or causes.

### drop
**Syntax:** `drop <item>`  
**Description:** Drop an item on the ground.

### get
**Syntax:** `get <item>`  
**Description:** Pick up an item from the ground.

### give
**Syntax:** `give <item> to <person>`  
**Description:** Give an item to another player or NPC.

### junk
**Syntax:** `junk <item>`  
**Description:** Destroy an item permanently.

### list
**Syntax:** `list`  
**Description:** Shows items available for purchase in shops.

### order
**Syntax:** `order <charmie> <command>`  
**Description:** Command your charmed creatures.

### put
**Syntax:** `put <item> in <container>`  
**Description:** Place an item into a container.

### remove
**Syntax:** `remove <item>`  
**Description:** Remove an equipped item.

### rent
**Syntax:** `rent`  
**Description:** Store equipment and exit the game safely.

### repair
**Syntax:** `repair <item>`  
**Description:** Repair damaged equipment.

### sacrifice
**Syntax:** `sacrifice <item>`  
**Description:** Offer items to gods for favor.

### sell
**Syntax:** `sell <item>`  
**Description:** Sell items to shopkeepers.

### take
**Syntax:** `take <item> from <container>`  
**Description:** Remove an item from a container.

### value
**Syntax:** `value <item>`  
**Description:** Check the value of an item.

### wear
**Syntax:** `wear <item>`  
**Description:** Equip an item.

### wield
**Syntax:** `wield <weapon>`  
**Description:** Equip a weapon.

---

## Magic

### cast
**Syntax:** `cast '<spell>' <target>`  
**Description:** Cast a magical spell. See individual spell entries for details.

### chant
**Syntax:** `chant`  
**Description:** Bardic music ability for various magical effects.

### meditate
**Syntax:** `meditate`  
**Description:** Regenerate mana through meditation.

### pray
**Syntax:** `pray`  
**Description:** Request divine intervention or blessings.

### recite
**Syntax:** `recite <scroll>`  
**Description:** Use a magical scroll.

### scribe
**Syntax:** `scribe <spell> on <scroll>`  
**Description:** Create magical scrolls.

---

## Movement

### close
**Syntax:** `close <door>`  
**Description:** Close a door or container.

### down
**Syntax:** `down`  
**Description:** Move downward (stairs, holes, etc.).

### east
**Syntax:** `east` or `e`  
**Description:** Move east.

### enter
**Syntax:** `enter <portal>`  
**Description:** Enter a portal or doorway.

### flee
**Syntax:** `flee`  
**Description:** Attempt to escape from combat.

### follow
**Syntax:** `follow <person>`  
**Description:** Follow another player.

### leave
**Syntax:** `leave`  
**Description:** Exit a room or area.

### lock
**Syntax:** `lock <door>`  
**Description:** Lock a door or container.

### north
**Syntax:** `north` or `n`  
**Description:** Move north.

### open
**Syntax:** `open <door>`  
**Description:** Open a door or container.

### pick
**Syntax:** `pick <lock>`  
**Description:** Attempt to pick a lock.

### south
**Syntax:** `south` or `s`  
**Description:** Move south.

### unlock
**Syntax:** `unlock <door>`  
**Description:** Unlock a door or container.

### up
**Syntax:** `up`  
**Description:** Move upward (stairs, ladders, etc.).

### west
**Syntax:** `west` or `w`  
**Description:** Move west.

---

## Objects

### compare
**Syntax:** `compare <item1> <item2>`  
**Description:** Compare two items to see their relative quality.

### drink
**Syntax:** `drink <liquid>`  
**Description:** Drink from a container.

### eat
**Syntax:** `eat <food>`  
**Description:** Consume food items.

### fill
**Syntax:** `fill <container>`  
**Description:** Fill a container with liquid.

### hold
**Syntax:** `hold <item>`  
**Description:** Hold an item in your hands.

### pour
**Syntax:** `pour <liquid>`  
**Description:** Pour liquid from one container to another.

### quaff
**Syntax:** `quaff <potion>`  
**Description:** Drink a potion.

### read
**Syntax:** `read <item>`  
**Description:** Read writing on items or books.

### sip
**Syntax:** `sip <potion>`  
**Description:** Take a small sip from a potion.

### taste
**Syntax:** `taste <food>`  
**Description:** Taste food or drink.

### use
**Syntax:** `use <item>`  
**Description:** Use a magical or special item.

### write
**Syntax:** `write <message> on <item>`  
**Description:** Write messages on items.

---

## Social

### accuse
**Syntax:** `accuse <person>`  
**Description:** Accuse someone of wrongdoing.

### applaud
**Syntax:** `applaud`  
**Description:** Show appreciation through applause.

### beg
**Syntax:** `beg`  
**Description:** Beg for mercy or items.

### bow
**Syntax:** `bow`  
**Description:** Bow respectfully.

### cheer
**Syntax:** `cheer`  
**Description:** Cheer enthusiastically.

### comfort
**Syntax:** `comfort <person>`  
**Description:** Comfort someone in distress.

### congratulate
**Syntax:** `congratulate <person>`  
**Description:** Congratulate someone on their success.

### cry
**Syntax:** `cry`  
**Description:** Cry or weep.

### curse
**Syntax:** `curse`  
**Description:** Curse angrily.

### dance
**Syntax:** `dance`  
**Description:** Dance joyfully.

### embrace
**Syntax:** `embrace <person>`  
**Description:** Embrace someone warmly.

### frown
**Syntax:** `frown`  
**Description:** Frown disapprovingly.

### giggle
**Syntax:** `giggle`  
**Description:** Giggle with amusement.

### glare
**Syntax:** `glare <person>`  
**Description:** Glare angrily at someone.

### grin
**Syntax:** `grin`  
**Description:** Grin broadly.

### groan
**Syntax:** `groan`  
**Description:** Groan in pain or frustration.

### hug
**Syntax:** `hug <person>`  
**Description:** Hug someone affectionately.

### kiss
**Syntax:** `kiss <person>`  
**Description:** Kiss someone.

### laugh
**Syntax:** `laugh`  
**Description:** Laugh heartily.

### nod
**Syntax:** `nod`  
**Description:** Nod in agreement.

### point
**Syntax:** `point <direction>`  
**Description:** Point in a direction.

### poke
**Syntax:** `poke <person>`  
**Description:** Poke someone playfully.

### pray
**Syntax:** `pray`  
**Description:** Pray to the gods.

### salute
**Syntax:** `salute <person>`  
**Description:** Salute respectfully.

### shake
**Syntax:** `shake <person>`  
**Description:** Shake someone's hand.

### shrug
**Syntax:** `shrug`  
**Description:** Shrug indifferently.

### sigh
**Syntax:** `sigh`  
**Description:** Sigh deeply.

### smile
**Syntax:** `smile`  
**Description:** Smile warmly.

### smirk
**Syntax:** `smirk`  
**Description:** Smirk knowingly.

### sneer
**Syntax:** `sneer`  
**Description:** Sneer contemptuously.

### snicker
**Syntax:** `snicker`  
**Description:** Snicker quietly.

### stare
**Syntax:** `stare <person>`  
**Description:** Stare intently.

### thank
**Syntax:** `thank <person>`  
**Description:** Thank someone.

### wave
**Syntax:** `wave`  
**Description:** Wave hello or goodbye.

### wink
**Syntax:** `wink <person>`  
**Description:** Wink playfully.

### yawn
**Syntax:** `yawn`  
**Description:** Yawn sleepily.

---

## Spells

### acid arrow
**Syntax:** `cast 'acid arrow' <victim>`  
**Level:** 7th Magic User  
**Description:** Shoots an acidic arrow that automatically hits. Damage: ((8+2*(level-6)) + Acid Damage) × random 1 or 2.

### aid
**Syntax:** `cast 'aid' <victim>`  
**Level:** 7th Cleric  
**Description:** Grants bless effects plus temporary hitpoints. Duration: caster's level. HP bonus: ((level/2) + random 1-10).

### animate dead
**Syntax:** `cast 'animate dead' <corpse>`  
**Level:** 12th Necromancer  
**Description:** Raises a corpse as a zombie follower. Requires room lighting ≤ -1. Duration until zombie dies or caster leaves.

### armor
**Syntax:** `cast 'armor' <victim>`  
**Level:** 3rd Magic User, 3rd Bard  
**Description:** Improves armor points by (20 + (level × 2)).

### ball lightning
**Syntax:** `cast 'ball lightning' <victim>`  
**Level:** 28th Magic User  
**Description:** Electrical energy ball. Damage: ((56 + ((level-20) × 6)) + Elec Damage) × random 1-2.

### barkskin
**Syntax:** `cast 'barkskin' <victim>`  
**Level:** 3rd Druid, 5th Ranger  
**Description:** Increases armor but reduces dexterity by 1. Cannot combine with armor spell.

### bat sonar
**Syntax:** `cast 'bat sonar'`  
**Level:** 8th Necromancer, 11th Warlock  
**Description:** Provides detect invisible, infravision, and sense life. Negates blindness effects.

### benediction
**Syntax:** `cast 'benediction' <victim>`  
**Level:** 28th Paladin  
**Description:** Provides resistance auras based on alignment: Silver (Divine), Golden (Life), Rainbow (Light), Orange (Sonic).

### bless
**Syntax:** `cast 'bless' <victim>`  
**Level:** 3rd Cleric  
**Description:** +5 saving throw bonus, +2 hitroll. Duration: 6 hours.

### blindness
**Syntax:** `cast 'blindness' <victim>`  
**Level:** 6th Magic User, 6th Cleric  
**Description:** Blinds victim on failed save. -4 hitroll, +40 armor points. Duration varies by level.

### bolt of steel
**Syntax:** `cast 'bolt of steel'`  
**Level:** 8th Ranger  
**Description:** Creates magical bow firing steel bolt. Requires hit roll. Damage: max weapon damage × 2 or 15.

### burning hands
**Syntax:** `cast 'burning hands' <victim>`  
**Level:** 5th Magic User, 7th Warlock  
**Description:** Fan of flame. Damage: (((level/2) × random 1-3) + Fire Damage) × random 2-3 on critical.

### call lightning
**Syntax:** `cast 'call lightning' <victim>`  
**Level:** 11th Druid  
**Description:** Lightning bolt from sky (requires rain/lightning). Damage: ((20 + level × 2) + Elec Damage) × random 0-1 on non-critical, ×1-3 on critical.

### cause major wounds
**Syntax:** `cast 'cause major wounds' <victim>`  
**Level:** 6th Cleric, 9th Anti-Paladin  
**Description:** Touch attack causing damage: random 5d5 + 1.

### cause minor wounds
**Syntax:** `cast 'cause minor wounds' <victim>`  
**Level:** 3rd Cleric, 5th Anti-Paladin  
**Description:** Touch attack causing damage: random 3d5 + 1.

### chakra disruption
**Syntax:** `chakra <victim>`  
**Level:** 25th Monk  
**Description:** Attacks mana pool. Scaling damage affects mobiles and players differently. Requires Hebu stance. Light-based attack.

### champions strength
**Syntax:** `cast 'champions strength' <self>`  
**Level:** 19th Paladin  
**Description:** Increases strength to racial maximum. Expires on combat end or next tick.

### chill touch
**Syntax:** `cast 'chill touch' <victim>`  
**Level:** 3rd Magic User, 3rd Necromancer, 14th Anti-Paladin  
**Description:** Touch spell reducing strength by 1 (cumulative). Damage scales by level.

### cloak of darkness
**Syntax:** `cast 'cloak of darkness'`  
**Level:** 22nd Necromancer  
**Description:** Darkens room by 100 light points. Only necromancers, undead, and bat sonar users can see.

### cloak of shadows
**Syntax:** `cast 'cloak of shadows'`  
**Level:** 10th Necromancer, 13th Anti-Paladin, 19th Warlock  
**Description:** Provides invisibility in shadow conditions. Ineffective in extreme light conditions.

### cloak of the night
**Syntax:** `cast 'cloak of the night'`  
**Level:** 16th Necromancer  
**Description:** Darkens room by 25 light points. Cannot combine with cloak of darkness.

### color spray
**Syntax:** `cast 'color spray' <victim>`  
**Level:** 12th Magic User, 13th Bard  
**Description:** Optical damage. Damage: ((10 + 4×(level-11)) + Light Damage) ×1-1 on non-critical, ×1-3 on critical.

### confusion
**Syntax:** `cast 'confusion' <target>`  
**Level:** 34th Warlock  
**Description:** Reduces spell casting success by 1/3. Cannot be removed except by time.

### consecration
**Syntax:** `cast 'consecration'`  
**Level:** 33rd Paladin  
**Description:** Reduces incoming damage by half, reflects damage back to attackers based on their alignment (40% evil, 25% neutral, 10% good).

### control weather
**Syntax:** `cast 'control weather' <better|worse>`  
**Level:** 10th Druid  
**Description:** Changes weather conditions. Accumulative effects.

### create food
**Syntax:** `cast 'create food'`  
**Level:** 2nd Cleric  
**Description:** Creates waybread filling hunger for (5+level) hours, max 24 hours.

### create water
**Syntax:** `cast 'create water' <container>`  
**Level:** 2nd Cleric  
**Description:** Fills container with water. Double amount if raining.

### crippling wave
**Syntax:** `crippling <victim>`  
**Level:** 22nd Monk  
**Description:** Attacks movement pool. Scaling damage affects mobiles and players differently. Requires Hebu stance. Light-based attack.

### cure blind
**Syntax:** `cast 'cure blind' <victim>`  
**Level:** 4th Cleric, 4th Monk, 7th Paladin  
**Description:** Removes blindness from spells (not cursed items).

### cure critic
**Syntax:** `cast 'cure critic' <victim>`  
**Level:** 9th Cleric, 11th Druid  
**Description:** Heals 12-20 hitpoints. Unaffected by bonuses.

### cure light
**Syntax:** `cast 'cure light' <victim>`  
**Level:** 1st Cleric  
**Description:** Basic healing spell.

### cure serious
**Syntax:** `cast 'cure serious' <victim>`  
**Level:** 5th Cleric  
**Description:** Moderate healing spell.

### detect alignment
**Syntax:** `cast 'detect alignment' <victim>`  
**Level:** 1st Cleric  
**Description:** Reveals target's alignment.

### detect evil
**Syntax:** `cast 'detect evil'`  
**Level:** Various  
**Description:** Detects evil creatures.

### detect good
**Syntax:** `cast 'detect good'`  
**Level:** Various  
**Description:** Detects good creatures.

### detect invisibility
**Syntax:** `cast 'detect invisibility'`  
**Level:** Various  
**Description:** Reveals invisible creatures.

### detect magic
**Syntax:** `cast 'detect magic'`  
**Level:** 2nd Bard  
**Description:** Reveals magical auras.

### detect poison
**Syntax:** `cast 'detect poison' <item>`  
**Level:** 3rd Cleric  
**Description:** Detects poisoned items or creatures.

### dimension door
**Syntax:** `cast 'dimension door'`  
**Level:** Various  
**Description:** Teleports to bind portal major location.

### dispel evil
**Syntax:** `cast 'dispel evil'`  
**Level:** 11th Cleric  
**Description:** Damages evil creatures.

### dispel good
**Syntax:** `cast 'dispel good'`  
**Level:** Various  
**Description:** Damages good creatures.

### dispel magic
**Syntax:** `cast 'dispel magic' <victim>`  
**Level:** 23rd Bard  
**Description:** Removes magical effects.

### earthquake
**Syntax:** `cast 'earthquake'`  
**Level:** 8th Cleric, 7th Druid  
**Description:** Causes earthquake damaging all in area.

### enchants
**Syntax:** `cast 'enchant <type>' <item>`  
**Level:** Various  
**Description:** Adds magical properties to items.

### fireball
**Syntax:** `cast 'fireball' <victim>`  
**Level:** 9th Magic User  
**Description:** Explosive fire damage.

### flamestrike
**Syntax:** `cast 'flamestrike' <victim>`  
**Level:** 9th Cleric  
**Description:** Divine fire damage.

### fly
**Syntax:** `cast 'fly' <victim>`  
**Level:** Various  
**Description:** Grants flight ability.

### greater summon
**Syntax:** `cast 'greater summon'`  
**Level:** 21st Cleric  
**Description:** Summons powerful creatures.

### harm
**Syntax:** `cast 'harm' <victim>`  
**Level:** 15th Cleric  
**Description:** Major damage spell.

### heal
**Syntax:** `cast 'heal' <victim>`  
**Level:** Various  
**Description:** Powerful healing.

### heroes feast
**Syntax:** `cast 'heroes feast'`  
**Level:** 20th Cleric  
**Description:** Creates nourishing feast.

### holy word
**Syntax:** `cast 'holy word'`  
**Level:** 33rd Cleric  
**Description:** Powerful divine damage.

### identify
**Syntax:** `cast 'identify' <item>`  
**Level:** 10th Bard  
**Description:** Reveals item properties.

### improved invisibility
**Syntax:** `cast 'improved invisibility' <victim>`  
**Level:** 9th Bard  
**Description:** Superior invisibility.

### invisibility
**Syntax:** `cast 'invisibility' <victim>`  
**Level:** 2nd Bard  
**Description:** Makes target invisible.

### lesser summon
**Syntax:** `cast 'lesser summon'`  
**Level:** 8th Cleric  
**Description:** Summons lesser creatures.

### lightning bolt
**Syntax:** `cast 'lightning bolt' <victim>`  
**Level:** 10th Magic User  
**Description:** Electrical damage.

### magic missile
**Syntax:** `cast 'magic missile' <victim>`  
**Level:** 1st Magic User  
**Description:** Basic magical attack.

### malign
**Syntax:** `cast 'malign'`  
**Level:** 35th Anti-Paladin  
**Description:** Powerful evil aura.

### sanctuary
**Syntax:** `cast 'sanctuary' <victim>`  
**Level:** 15th Cleric  
**Description:** Protective aura.

### shield
**Syntax:** `cast 'shield' <victim>`  
**Level:** Various  
**Description:** Magical protection.

### silence
**Syntax:** `cast 'silence' <victim>`  
**Level:** 8th Cleric  
**Description:** Prevents spell casting.

### sleep
**Syntax:** `cast 'sleep' <victim>`  
**Level:** 10th Bard  
**Description:** Puts target to sleep.

### strength
**Syntax:** `cast 'strength' <victim>`  
**Level:** 12th Bard  
**Description:** Increases strength.

### summon
**Syntax:** `cast 'summon' <victim>`  
**Level:** Various  
**Description:** Brings target to caster.

### teleport
**Syntax:** `cast 'teleport'`  
**Level:** Various  
**Description:** Random teleportation.

### word of recall
**Syntax:** `cast 'word of recall'`  
**Level:** 12th Cleric  
**Description:** Returns to temple.

---

*This guide covers the major command categories and their most common uses. For detailed spell mechanics, damage calculations, and level requirements, consult the individual help files or experiment in-game. Some commands may have additional options or variations not listed here.*