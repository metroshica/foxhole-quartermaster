/**
 * Foxhole Hex Regions and Major Locations
 *
 * Data sourced from https://foxhole.wiki.gg/wiki/Regions
 * Each hex contains major locations (towns with Seaports/Storage Depots)
 */

export interface HexRegion {
  name: string;
  locations: string[];
}

export const FOXHOLE_REGIONS: HexRegion[] = [
  {
    name: "Acrithia",
    locations: [
      "The Brinehold",
      "Camp Omicron",
      "Heir Apparent",
      "Legion Ranch",
      "Nereid Keep",
      "Patridia",
      "Swordfort",
      "Thetus Ring",
    ],
  },
  {
    name: "Allod's Bight",
    locations: [
      "Belaying Trace",
      "Homesick",
      "Mercy's Wail",
      "Rumhold",
      "Scurvyshire",
      "The Stone Plank",
      "The Turncoat",
    ],
  },
  {
    name: "Ash Fields",
    locations: [
      "The Ashfort",
      "Ashtown",
      "The Calamity",
      "Camp Omega",
      "Cometa",
      "Electi",
      "Sootflow",
    ],
  },
  {
    name: "Basin Sionnach",
    locations: [
      "Basinhome",
      "Cuttail Station",
      "The Den",
      "Lamplight",
      "Sess",
      "Stoic",
    ],
  },
  {
    name: "Callahan's Passage",
    locations: [
      "Cragstown",
      "The Crumbling Passage",
      "Crumbling Post",
      "The Latch",
      "Lochan Berth",
      "Overlook Hill",
      "The Procession",
      "Scáth Passing",
      "Solas Gorge",
      "White Chapel",
    ],
  },
  {
    name: "Callum's Cape",
    locations: [
      "Callum's Keep",
      "Camp Hollow",
      "Holdout",
      "Ire",
      "Lookout",
      "Naofa",
      "Scouts Jest",
    ],
  },
  {
    name: "Clanshead Valley",
    locations: [
      "Fallen Crown",
      "Fort Ealar",
      "Fort Esterwild",
      "Fort Windham",
      "The King",
      "The Pike",
      "Sweetholt",
    ],
  },
  {
    name: "Deadlands",
    locations: [
      "Abandoned Ward",
      "Brine Glen",
      "Callahan's Boot",
      "Callahan's Gate",
      "Iron's End",
      "Liberation Point",
      "The Pits",
      "The Salt Farms",
      "The Salt March",
      "The Spine",
      "Sun's Hollow",
    ],
  },
  {
    name: "Endless Shore",
    locations: [
      "Brackish Point",
      "Enduring Wake",
      "Iron Junction",
      "The Old Jack Tar",
      "The Overland",
      "Saltbrook Channel",
      "Sídhe Fall",
      "Tuatha Watchpost",
      "Wellchurch",
      "Woodbind",
    ],
  },
  {
    name: "Farranac Coast",
    locations: [
      "The Bone Haft",
      "Huskhollow",
      "The Jade Cove",
      "Macha's Keening",
      "Mara",
      "Pleading Wharf",
      "Scarp of Ambrose",
      "Scythe",
      "Terra",
      "Transient Valley",
      "Victa",
    ],
  },
  {
    name: "Fisherman's Row",
    locations: [
      "Arcadia",
      "Black Well",
      "Dankana Post",
      "Eidolo",
      "Fort Ember",
      "Hangman's Court",
      "Oceanwatch",
      "Peripti Landing",
      "The Satyr Stone",
    ],
  },
  {
    name: "Godcrofts",
    locations: [
      "Argosa",
      "The Axehead",
      "Exile",
      "Fleecewatch",
      "Isawa",
      "Lipsia",
      "Protos",
      "Saegio",
      "Ursa Base",
    ],
  },
  {
    name: "Great March",
    locations: [
      "Camp Senti",
      "Dendró Field",
      "Leto",
      "Lionsfort",
      "Myrmidon's Stay",
      "Remnant Villa",
      "Sitaria",
      "The Swan",
      "Violethome",
    ],
  },
  {
    name: "Howl County",
    locations: [
      "Fort Red",
      "Fort Rider",
      "Great Warden Dam",
      "Hungry Wolf",
      "Little Lamb",
      "Sickleshire",
      "Slipgate Outpost",
      "Teller Farm",
    ],
  },
  {
    name: "Kalokai",
    locations: [
      "Baccae Ridge",
      "Camp Tau",
      "Hallow",
      "Lost Greensward",
      "Night's Regret",
      "Sourtooth",
      "Sweethearth",
    ],
  },
  {
    name: "King's Cage",
    locations: [
      "The Bailie",
      "Den of Knaves",
      "Eastknife",
      "Gibbet Fields",
      "The Manacle",
      "Scarlethold",
      "Slipchain",
      "Southblade",
    ],
  },
  {
    name: "Loch Mór",
    locations: [
      "Feirmor",
      "Market Road",
      "Mercy's Wish",
      "Moon's Copse",
      "The Roilfort",
      "Tomb of the First",
      "Westmarch",
    ],
  },
  {
    name: "Marban Hollow",
    locations: [
      "Checkpoint Bua",
      "Lockheed",
      "Maiden's Veil",
      "Mox",
      "Oster Wall",
      "Sanctum",
      "The Spitrocks",
    ],
  },
  {
    name: "Morgen's Crossing",
    locations: [
      "Allsight",
      "Bastard's Block",
      "Callum's Descent",
      "Eversus",
      "Lividus",
      "Quietus",
    ],
  },
  {
    name: "Nevish Line",
    locations: [
      "Blackcoat Way",
      "Blinding Stones",
      "Grief Mother",
      "Mistle Shrine",
      "Princefal",
      "The Scrying Belt",
      "Tomb Father",
      "Unruly",
    ],
  },
  {
    name: "Origin",
    locations: [
      "Arise",
      "Dormio",
      "Finis",
      "Initium",
      "The Steel Road",
      "Teichotima",
      "World Star",
    ],
  },
  {
    name: "Reaching Trail",
    locations: [
      "The Ark",
      "Brodytown",
      "Dwyerstown",
      "Elksford",
      "Fort Mac Conaill",
      "Harpy",
      "Ice Ranch",
      "Limestone Holdfast",
      "Mousetrap",
      "Nightchurch",
      "Reprieve",
    ],
  },
  {
    name: "Reaver's Pass",
    locations: [
      "The Bilge",
      "Breakwater",
      "Clay Coffer",
      "Fort Rictus",
      "Keelhaul",
      "Scuttletown",
      "Thimble Base",
    ],
  },
  {
    name: "Red River",
    locations: [
      "Camp Upsilon",
      "Cannonsmoke",
      "Climb",
      "Fort Matchwood",
      "Judicium",
      "Minos",
      "Penance",
      "Victoria Hill",
    ],
  },
  {
    name: "Sableport",
    locations: [
      "Barronhome",
      "Cinderwick",
      "Light's End",
      "The Pendant",
      "The Robin's Nest",
      "Talonsfort",
      "The Whetstone",
    ],
  },
  {
    name: "Shackled Chasm",
    locations: [
      "The Bell Toll",
      "Firstmarch",
      "Gorgon Grove",
      "The Grave of Erastos",
      "Limewood Holdfast",
      "Reflection",
      "Savages",
      "Silk Farms",
      "Simo's Run",
      "The Vanguard",
    ],
  },
  {
    name: "Speaking Woods",
    locations: [
      "The Filament",
      "Fort Blather",
      "Hush",
      "Inari Base",
      "Sotto Bank",
      "Stem",
      "Tine",
      "Wound",
    ],
  },
  {
    name: "Stema Landing",
    locations: [
      "Acies Overlook",
      "Alchimio Estate",
      "Base Ferveret",
      "Base Sagitta",
      "The Flair",
      "The Spearhead",
      "Ustio",
      "Verge Wing",
      "The Wane",
    ],
  },
  {
    name: "Stlican Shelf",
    locations: [
      "Breaker Town",
      "Briar",
      "Fort Hoarfrost",
      "The Old Mourn",
      "The Pale House",
      "Port of Rime",
      "The South Wind",
      "Thornhold",
      "Vulpine Watch",
    ],
  },
  {
    name: "Stonecradle",
    locations: [
      "Buckler Sound",
      "The Cord",
      "The Dais",
      "Fading Lights",
      "The Heir's Knife",
      "The Long Fast",
      "The Reach",
      "Trammel Pool",
      "World's End",
    ],
  },
  {
    name: "Tempest Island",
    locations: [
      "Blackwatch",
      "The Gale",
      "The Iris",
      "Isle of Psyche",
      "Liar's Haven",
      "Plana Fada",
      "Reef",
      "The Rush",
      "Surge Gate",
    ],
  },
  {
    name: "Terminus",
    locations: [
      "Bloody Palm Fort",
      "Cerberus Wake",
      "Therizó",
      "Thunderbolt",
      "Warlord's Stead",
      "Winding Bolas",
    ],
  },
  {
    name: "The Clahstra",
    locations: [
      "Bewailing Fort",
      "East Nart",
      "Third Chapter",
      "Transept",
      "The Treasury",
      "The Vault",
      "Watchful Nave",
      "Weephome",
    ],
  },
  {
    name: "The Drowned Vale",
    locations: [
      "The Baths",
      "Bootnap",
      "Coaldrifter Stead",
      "Eastmarch",
      "Loggerhead",
      "The Saltcaps",
      "Singing Serpents",
      "Splinter Pens",
      "Vessel",
      "The Wash",
      "Wisp's Warning",
    ],
  },
  {
    name: "The Fingers",
    locations: [
      "Captain's Dread",
      "Fort Barley",
      "Headsman's Villa",
      "The Old Captain",
      "Plankhouse",
      "Second Man",
      "Tethys Base",
      "Titancall",
      "The Tusk",
    ],
  },
  {
    name: "The Heartlands",
    locations: [
      "Barronswall",
      "Barrony Ranch",
      "The Blemish",
      "The Breach",
      "Deeplaw Post",
      "Fort Providence",
      "Greenfield Orchard",
      "Oleander Homestead",
      "The Plough",
      "Proexí",
    ],
  },
  {
    name: "The Linn of Mercy",
    locations: [
      "The Crimson Gardens",
      "The First Coin",
      "Fort Duncan",
      "Hardline",
      "The Last Grove",
      "Lathair",
      "The Long Whine",
      "Outwich Ranch",
      "The Prairie Bazaar",
      "Rotdust",
      "Ulster Falls",
    ],
  },
  {
    name: "The Moors",
    locations: [
      "Borderlane",
      "The Cut",
      "Gravekeeper's Holdfast",
      "Headstone",
      "Luch's Workshop",
      "MacConmara Barrows",
      "Morrighan's Grave",
      "Ogmaran",
      "Reaching River",
      "The Spade",
      "Wiccwalk",
      "The Wind Hills",
    ],
  },
  {
    name: "The Oarbreaker Isles",
    locations: [
      "The Conclave",
      "The Dirk",
      "Fort Fogwood",
      "Gold",
      "Grisly Refuge",
      "Integrum",
      "Partisan Island",
      "Posterus",
      "Silver",
    ],
  },
  {
    name: "Umbral Wildwood",
    locations: [
      "Amethyst",
      "Atropos' Fate",
      "Clotho's Refuge",
      "The Foundry",
      "Goldenroot Ranch",
      "Hermit's Rest",
      "Lachesis' Tally",
      "Sentry",
      "Stray",
      "Thunderfoot",
      "Vagrant Bastion",
    ],
  },
  {
    name: "Viper Pit",
    locations: [
      "Blackthroat",
      "Earl Crowley",
      "Fleck Crossing",
      "Fort Viper",
      "The Friars",
      "Kirknell",
      "Moltworth",
      "Serenity's Blight",
    ],
  },
  {
    name: "Weathered Expanse",
    locations: [
      "Crow's Nest",
      "Foxcatcher",
      "Frostmarch",
      "Huntsfort",
      "Necropolis",
      "Shattered Advance",
      "Spirit Watch",
      "The Weathering Halls",
      "Wightwalk",
    ],
  },
  {
    name: "Westgate",
    locations: [
      "The Gallows",
      "Holdfast",
      "Kingstone",
      "Longstone",
      "Lord's Mouth",
      "Lost Partition",
      "Rancher's Fast",
      "Westgate Keep",
      "Wyattwick",
      "Zeus' Demise",
    ],
  },
];

/**
 * Get all hex names sorted alphabetically
 */
export function getHexNames(): string[] {
  return FOXHOLE_REGIONS.map((r) => r.name).sort();
}

/**
 * Get locations for a specific hex
 */
export function getLocationsForHex(hexName: string): string[] {
  const region = FOXHOLE_REGIONS.find((r) => r.name === hexName);
  return region ? region.locations.sort() : [];
}

/**
 * Get a flat map of hex -> locations for quick lookup
 */
export function getHexLocationMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const region of FOXHOLE_REGIONS) {
    map[region.name] = region.locations.sort();
  }
  return map;
}
