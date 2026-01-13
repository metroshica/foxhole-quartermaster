// Map abbreviations/slang to item codes
// Based on Foxhole community terminology from https://foxhole.wiki.gg/wiki/Slang

export const ITEM_TAGS: Record<string, string[]> = {
  // === TANKS ===
  "lt": [
    "LightTankC", "LightTankW", "LightTankMobilityC", "LightTankDefensiveW",
    "LightTankFlameC", "LightTankOffensiveC", "LightTank2InfantryC", "LightTankArtilleryW"
  ],
  "bt": [
    "BattleTankC", "BattleTankW", "BattleTankDefensiveW", "BattleTankATC",
    "BattleTankHeavyArtilleryC", "BattleTankHeavyArtilleryW"
  ],
  "td": ["DestroyerTankW", "DestroyerTankFlameW"],
  "htd": ["DestroyerTankW", "DestroyerTankFlameW"],
  "wtd": ["DestroyerTankW", "DestroyerTankFlameW"],
  "std": ["DestroyerTankW", "DestroyerTankFlameW"],
  "st": ["ScoutTankW", "ScoutTankOffensiveW", "ScoutTankMultiW"],
  "mpt": ["MediumTankC"],
  "falchion": ["MediumTankC"],
  "sh": ["MediumTankW", "MediumTankATW", "MediumTankSiegeW"],
  "svh": ["MediumTankW", "MediumTankATW", "MediumTankSiegeW"],
  "silverhand": ["MediumTankW", "MediumTankATW", "MediumTankSiegeW"],
  "hwm": ["MediumTank2MultiW"],
  "highwayman": ["MediumTank2MultiW"],
  "bl": ["MediumTank2IndirectW"],
  "bonelaw": ["MediumTank2IndirectW"],
  "thornfall": ["MediumTank2IndirectW"],
  "cruiser": ["MediumTank2W", "MediumTank2IndirectW", "MediumTank2MultiW", "MediumTank2RangeW"],
  "outlaw": ["MediumTank2RangeW"],
  "supertank": ["SuperTankC", "SuperTankW"],
  "predator": ["SuperTankW"],
  "ares": ["SuperTankC"],

  // === ARMORED VEHICLES ===
  "ac": [
    "ArmoredCarC", "ArmoredCarW", "ArmoredCarATW", "ArmoredCarFlameW",
    "ArmoredCarMobilityW", "ArmoredCarOffensiveC", "ArmoredCarTwinC",
    "ArmoredCar2LargeW", "ArmoredCar2MultiW", "ArmoredCar2TwinW"
  ],
  "ht": [
    "HalfTrackC", "HalfTrackW", "HalfTrackArtilleryC", "HalfTrackDefensiveC",
    "HalfTrackOffensiveW", "HalfTrackTwinW", "HalftrackMultiW"
  ],
  "halftrack": [
    "HalfTrackC", "HalfTrackW", "HalfTrackArtilleryC", "HalfTrackDefensiveC",
    "HalfTrackOffensiveW", "HalfTrackTwinW", "HalftrackMultiW"
  ],
  "tankette": ["TanketteC", "TanketteFlameC", "TanketteMultiC", "TanketteOffensiveC"],

  // === RESOURCES ===
  "bmat": ["Cloth"],
  "bmats": ["Cloth"],
  "rmat": ["Wood"],
  "rmats": ["Wood"],
  "cmat": ["FacilityMaterials1"],
  "cmats": ["FacilityMaterials1"],
  "conc": ["Concrete"],
  "concrete": ["Concrete"],
  "comp": ["Components"],
  "comps": ["Components"],
  "ms": ["MaintenanceSupplies"],
  "msupp": ["MaintenanceSupplies"],
  "msupps": ["MaintenanceSupplies"],
  "ss": ["SoldierSupplies"],
  "shirts": ["SoldierSupplies"],
  "amat": [
    "FacilityMaterials4", "FacilityMaterials5", "FacilityMaterials6",
    "FacilityMaterials7", "FacilityMaterials8"
  ],
  "am": [
    "FacilityMaterials4", "FacilityMaterials5", "FacilityMaterials6",
    "FacilityMaterials7", "FacilityMaterials8"
  ],
  "assembly": [
    "FacilityMaterials4", "FacilityMaterials5", "FacilityMaterials6",
    "FacilityMaterials7", "FacilityMaterials8"
  ],
  "salvage": ["Metal"],
  "scrap": ["Metal"],
  "diesel": ["Diesel"],
  "petrol": ["Petrol"],
  "fuel": ["Diesel", "Petrol"],

  // === ANTI-TANK WEAPONS ===
  "at": [
    "ATRifleW", "ATRifleLightC", "ATRifleTC", "ATRifleSniperC", "ATRifleAssaultW",
    "ATRifleAutomaticW", "ATRPGC", "ATRPGHeavyC", "ATRPGHeavyW", "ATRPGW",
    "ATRPGLightC", "ATRPGTW", "FieldATC", "FieldATW", "FieldAT2C", "FieldAT2W",
    "FieldATDamageW", "LargeFieldATC", "EmplacedATW", "StickyBomb", "ATGrenadeW",
    "ATLaunchedGrenadeW", "TankMine"
  ],
  "atr": [
    "ATRifleW", "ATRifleLightC", "ATRifleTC", "ATRifleSniperC",
    "ATRifleAssaultW", "ATRifleAutomaticW"
  ],
  "rpg": [
    "ATRPGC", "ATRPGHeavyC", "ATRPGHeavyW", "ATRPGW", "ATRPGLightC",
    "ATRPGTW", "RPGTW", "RpgW"
  ],
  "cutler": ["RpgW", "RPGTW"],
  "bonesaw": ["ATRPGW", "ATRPGTW"],
  "venom": ["ATRPGC"],
  "bane": ["ATRPGHeavyC"],
  "ignifist": ["ATRPGLightC"],
  "sticky": ["StickyBomb"],
  "flask": ["ATGrenadeW"],
  "atg": [
    "FieldATC", "FieldATW", "FieldAT2C", "FieldAT2W", "FieldATDamageW",
    "LargeFieldATC", "EmplacedATW"
  ],

  // === MACHINE GUNS ===
  "mg": ["MGC", "MGW", "MGTC", "MGTW", "FieldMGC", "FieldMGW"],
  "hmg": ["MGTC", "MGTW", "FieldMGC", "FieldMGW"],
  "lmg": ["MGC", "MGW"],
  "emg": ["FieldMGC", "FieldMGW"],
  "gast": ["MGC"],
  "malone": ["MGW", "MGTW"],
  "ratcatcher": ["MGTW"],
  "lamentum": ["MGTC"],

  // === SMALL ARMS ===
  "smg": ["SMGC", "SMGW", "SMGHeavyC", "SMGHeavyW"],
  "fiddler": ["SMGW"],
  "pitchgun": ["SMGC"],
  "liar": ["SMGHeavyW"],
  "lionclaw": ["SMGHeavyC"],
  "ar": ["AssaultRifleC", "AssaultRifleW", "AssaultRifleHeavyC", "AssaultRifleHeavyW"],
  "storm": ["AssaultRifleHeavyC", "AssaultRifleHeavyW", "ATRifleAssaultW"],
  "dusk": ["AssaultRifleHeavyC"],
  "booker": ["AssaultRifleHeavyW", "ATRifleAutomaticW"],
  "rifle": [
    "RifleC", "RifleW", "RifleLightC", "RifleLightW", "RifleHeavyC",
    "RifleHeavyW", "RifleLongC", "RifleLongW", "RifleShortW",
    "RifleAutomaticC", "RifleAutomaticW"
  ],
  "loughcaster": ["RifleW"],
  "argenti": ["RifleC"],
  "sniper": ["SniperRifleC", "SniperRifleW", "RifleLongC", "RifleLongW"],
  "shotgun": ["ShotgunC", "ShotgunW"],
  "pistol": ["PistolC", "PistolW", "PistolLightW", "Revolver"],

  // === GRENADES ===
  "nade": [
    "GrenadeC", "GrenadeW", "HEGrenade", "SmokeGrenade", "GreenAsh",
    "ATGrenadeW", "ATLaunchedGrenadeW"
  ],
  "frag": ["GrenadeC", "GrenadeW"],
  "he": ["HEGrenade"],
  "mammon": ["HEGrenade"],
  "smoke": ["SmokeGrenade"],
  "gas": ["GreenAsh"],
  "greenash": ["GreenAsh"],

  // === ARTILLERY ===
  "arty": [
    "FieldMortarC", "FieldMortarW", "EmplacedHeavyArtilleryC", "EmplacedHeavyArtilleryW",
    "EmplacedLightArtilleryW", "LargeFieldMortarC", "LargeFieldLightArtilleryC",
    "HalfTrackArtilleryC", "LightTankArtilleryW", "BattleTankHeavyArtilleryC",
    "BattleTankHeavyArtilleryW", "TrainLRArtillery"
  ],
  "mortar": [
    "Mortar", "MortarTankC", "FieldMortarC", "FieldMortarW",
    "LargeFieldMortarC", "HalfTrackArtilleryC", "LightTankArtilleryW"
  ],
  "ballista": ["MortarTankC"],
  "isg": ["ISGTC"],
  "fac": ["FieldCannonW", "FieldCannonDamageC", "LargeFieldCannonW"],
  "120mm": ["EmplacedLightArtilleryW", "LargeFieldLightArtilleryC"],
  "150mm": [
    "EmplacedHeavyArtilleryC", "EmplacedHeavyArtilleryW",
    "BattleTankHeavyArtilleryC", "BattleTankHeavyArtilleryW"
  ],

  // === AMMO ===
  "762": ["RifleAmmo"],
  "792": ["AssaultRifleAmmo"],
  "9mm": ["SMGAmmo"],
  "8mm": ["PistolAmmo"],
  "127": ["MGAmmo"],
  "40mm": ["LightTankAmmo"],
  "68mm": ["ATAmmo"],
  "75mm": ["BattleTankAmmo"],

  // === LOGISTICS VEHICLES ===
  "logi": [
    "TruckC", "TruckW", "TruckMobilityC", "TruckMobilityW", "TruckResourceC",
    "TruckResourceW", "TruckLiquidC", "TruckLiquidW", "FlatbedTruck",
    "Crane", "LargeCrane", "Harvester"
  ],
  "truck": [
    "TruckC", "TruckW", "TruckMobilityC", "TruckMobilityW", "TruckResourceC",
    "TruckResourceW", "TruckLiquidC", "TruckLiquidW", "TruckDefensiveW",
    "TruckOffensiveC", "TruckMultiC", "HeavyTruckC", "HeavyTruckW"
  ],
  "flatbed": ["FlatbedTruck"],
  "crane": ["Crane", "LargeCrane"],
  "harvester": ["Harvester"],
  "bus": ["BusC", "BusW"],
  "ambulance": ["AmbulanceC", "AmbulanceW", "AmbulanceFlameC", "AmbulanceFlameW"],

  // === NAVAL ===
  "boat": [
    "Motorboat", "GunboatC", "GunboatW", "Barge", "LandingCraftC",
    "LandingCraftW", "LandingCraftOffensiveC"
  ],
  "gunboat": ["GunboatC", "GunboatW"],
  "barge": ["Barge"],
  "freighter": ["Freighter"],
  "sub": ["LargeShipSubmarineC", "LargeShipSubmarineW"],
  "submarine": ["LargeShipSubmarineC", "LargeShipSubmarineW"],
  "destroyer": ["LargeShipDestroyerC", "LargeShipDestroyerW"],
  "battleship": ["LargeShipBattleshipC", "LargeShipBattleshipW"],

  // === EQUIPMENT ===
  "binos": ["Binoculars"],
  "radio": ["Radio", "RadioBackpack"],
  "gasmask": ["GasMask", "GasMaskFilter"],
  "wrench": ["WorkWrench"],
  "hammer": ["WorkHammer"],
  "shovel": ["Shovel"],
  "bandage": ["Bandages"],
  "fa": ["FirstAidKit"],
  "fak": ["FirstAidKit"],
  "trauma": ["TraumaKit"],
  "plasma": ["BloodPlasma"],
  "tripod": ["Tripod"],

  // === EXPLOSIVES ===
  "satchel": ["SatchelChargeW", "ExplosiveTripod", "SatchelChargeT"],
  "c4": ["SatchelChargeW"],
  "alligator": ["SatchelChargeW"],
  "havoc": ["ExplosiveTripod", "SatchelChargeT"],
  "mine": ["InfantryMine", "TankMine", "WaterMine"],
  "atmine": ["TankMine"],

  // === UNIFORMS ===
  "uniform": [
    "SoldierUniformC", "SoldierUniformW", "EngineerUniformC", "EngineerUniformW",
    "MedicUniformC", "MedicUniformW", "ScoutUniformC", "ScoutUniformW",
    "TankUniformC", "TankUniformW", "OfficerUniformC", "OfficerUniformW",
    "ArmourUniformC", "ArmourUniformW", "AmmoUniformW", "GrenadeUniformC",
    "RainUniformC", "SnowUniformC", "SnowUniformW", "NavalUniformC", "NavalUniformW"
  ],

  // === MISC ===
  "mech": ["Mech", "MechW"],
  "cv": ["Construction", "ConstructionUtility"],
  "motorcycle": ["MotorcycleC", "MotorcycleW", "MotorcycleOffensiveC"],
  "bike": ["Bicycle", "MotorcycleC", "MotorcycleW", "MotorcycleOffensiveC"],
  "scout": [
    "ScoutVehicleW", "ScoutVehicleMobilityC", "ScoutVehicleOffensiveC",
    "ScoutVehicleOffensiveW", "ScoutVehicleUtilityC", "ScoutVehicleUtilityW"
  ],
  "luv": [
    "ScoutVehicleW", "ScoutVehicleMobilityC", "ScoutVehicleOffensiveC",
    "ScoutVehicleOffensiveW", "ScoutVehicleUtilityC", "ScoutVehicleUtilityW"
  ],
};

/**
 * Get item codes that match a given tag/abbreviation
 * @param tag The abbreviation or slang term to look up
 * @returns Array of item codes that match, or empty array if no match
 */
export function getItemCodesByTag(tag: string): string[] {
  return ITEM_TAGS[tag.toLowerCase()] || [];
}

/**
 * Get all tags that apply to a given item
 * @param itemCode The item code to look up
 * @returns Array of tags that reference this item
 */
export function getTagsForItem(itemCode: string): string[] {
  const tags: string[] = [];
  for (const [tag, codes] of Object.entries(ITEM_TAGS)) {
    if (codes.includes(itemCode)) {
      tags.push(tag);
    }
  }
  return tags;
}
