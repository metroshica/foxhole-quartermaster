/**
 * Icon Mapping for Foxhole Items
 *
 * Maps item codes to their icon filenames.
 * Icons are stored in /public/icons/items/ and /public/icons/vehicles/
 *
 * TODO: Complete the mapping for items marked with null
 */

// Item icons (equipment, materials, ammo, etc.)
export const ITEM_ICON_MAP: Record<string, string | null> = {
  // === AMMO ===
  "ATAmmo": "ATAmmoIcon.png",
  "ATLargeAmmo": null, // 94.5mm - need to find
  "ATRPGAmmo": "ATRpgAmmoItemIcon.png",
  "ATRPGIndirectAmmo": "ATRpgAmmoItemIcon.png",
  "ATRifleAmmo": "ATRifleAmmoItemIcon.png",
  "AssaultRifleAmmo": "AssaultRifleAmmoItemIcon.png",
  "BattleTankAmmo": "BattleTankAmmoItemIcon.png",
  "DemolitionRocketAmmo": "DemolitionRocketAmmoIcon.png",
  "DepthChargeAmmo": "DepthChargeIcon.png",
  "FireRocketAmmo": "FlameRocketAmmoIcon.png",
  "FlameAmmo": "FlameAmmoIcon.png",
  "HELaunchedGrenade": "HELaunchedGrenadeItemIcon.png",
  "HERocketAmmo": "HERocketAmmoIcon.png",
  "HeavyArtilleryAmmo": "HeavyArtilleryAmmoItemIcon.png",
  "LRArtilleryAmmo": "LRArtilleryAmmoItemIcon.png",
  "LightArtilleryAmmo": "LightArtilleryAmmoItemIcon.png",
  "LightTankAmmo": "LightTankAmmoItemIcon.png",
  "MGAmmo": "MachineGunAmmoIcon.png",
  "MiniTankAmmo": "MiniTankAmmoItemIcon.png",
  "MortarAmmo": "MortarAmmoIcon.png",
  "MortarAmmoFL": null, // Flare Mortar Shell
  "MortarAmmoFlame": null, // Incendiary Mortar Shell
  "MortarAmmoSH": null, // Shrapnel Mortar Shell
  "MortarTankAmmo": null, // 250mm Purity Shell
  "MortarTankAmmoBR": "MortarTankAmmoBRIcon.png",
  "PistolAmmo": "PistolAmmoItemIcon.png",
  "RevolverAmmo": "RevolverAmmoItemIcon.png",
  "RifleAmmo": "RifleAmmoItemIcon.png",
  "RpgAmmo": "RpgAmmoItemIcon.png",
  "SMGAmmo": "SubMachineGunAmmoIcon.png",
  "ShotgunAmmo": "ShotgunAmmoItemIcon.png",
  "TorpedoAmmo": "TorpedoIcon.png",

  // === GRENADES ===
  "ATGrenadeW": "ATGrenadeWIcon.png",
  "ATLaunchedGrenadeW": "ATLaunchedGrenadeWIcon.png",
  "GreenAsh": "DeadlyGas01Icon.png",
  "GrenadeC": "GrenadeCItemIcon.png",
  "GrenadeW": "GrenadeItemIcon.png",
  "HEGrenade": "HEGrenadeItemIcon.png",
  "SmokeGrenade": "Smokegrenadeicon1.png",
  "StickyBomb": "StickyBombIcon.png",

  // === RIFLES ===
  "ATRifleAssaultW": "ATRifleAssaultWIcontga.png",
  "ATRifleAutomaticW": "ATRifleAutomaticWItemIcon.png",
  "ATRifleLightC": "ATRifleLightCIcon.png",
  "ATRifleSniperC": "ATRifleSniperCIcontga.png",
  "ATRifleTC": "ATRifleTCIcon.png",
  "ATRifleW": "ATRifleItemIcon.png",
  "AssaultRifleC": "AssaultRifleItemIcon.png",
  "AssaultRifleHeavyC": "AssaultRifleHeavyCItemIcon.png",
  "AssaultRifleHeavyW": "AssaultRifleHeavyWItemIcon.png",
  "AssaultRifleW": "AssaultRifleItemIcon.png",
  "RifleAutomaticC": "RifleAutomaticCIcon.png",
  "RifleAutomaticW": "RifleAutomaticW.png",
  "RifleC": "RifleCItemIcon.png",
  "RifleHeavyC": "RifleHeavyCItemIcon.png",
  "RifleHeavyW": null, // The Hangman 757
  "RifleLightC": "RifleLightCItemIcon.png",
  "RifleLightW": null, // Blakerow 871
  "RifleLongC": "RifleLongC.png",
  "RifleLongW": "RifleLongW.png",
  "RifleShortW": "RifleShortWIcon.png",
  "RifleW": "RifleW.png",
  "SniperRifleC": "SniperRifleCItemIcon.png",
  "SniperRifleW": "SniperRifleItemIcon.png",

  // === SMGs ===
  "SMGC": "SMGCItemIcon.png",
  "SMGHeavyC": "SMGHeavyCItemIcon.png",
  "SMGHeavyW": "SMGHeavyWItemIcon.png",
  "SMGW": "SubMachineGunIcon.png",

  // === PISTOLS ===
  "PistolC": "PistolItemIcon.png",
  "PistolLightW": "PistolLightWItemIcon.png",
  "PistolW": "PistolWItemIcon.png",
  "Revolver": "RevolverItemIcon.png",

  // === SHOTGUNS ===
  "ShotgunC": "ShotgunCItemIcon.png",
  "ShotgunW": "ShotgunWItemIcon.png",

  // === HEAVY WEAPONS ===
  "ATRPGC": "ATRPGCItemIcon.png",
  "ATRPGHeavyC": null, // Bane 45
  "ATRPGHeavyW": "ATRPGHeavyWIcon.png",
  "ATRPGLightC": "ATRPGLightCItemIcon.png",
  "ATRPGTW": "ATRPGTWIcon.png",
  "ATRPGW": null, // Bonesaw MK.3
  "ISGTC": "InfantrySupportGunItemIcon.png",
  "MGC": "MGCItemIcon.png",
  "MGTC": null, // Lamentum mm.IV
  "MGTW": "MGHeavyTWItemIcon.png",
  "MGW": "MGWItemIcon.png",
  "Mortar": "MortarItemIcon.png",
  "RPGTW": null, // Cutler Foebreaker
  "RpgW": "RpgItemIcon.png",

  // === FLAME WEAPONS ===
  "FlameBackpackC": "FlamePackCIcon.png",
  "FlameBackpackW": "FlamePackWIcon.png",
  "FlameTorchC": "FlamegunCICon.png",
  "FlameTorchW": "FlamegunWICon.png",

  // === LAUNCHERS ===
  "GrenadeAdapter": "GrenadeAdapterIcon.png",
  "GrenadeLauncherC": "GrenadeLauncherCItemIcon.png",
  "GrenadeLauncherTC": "GrenadeLauncherTCIcon.png",

  // === MELEE ===
  "Bayonet": "BayonetIcon.png",
  "MaceW": "TrenchMaceWIcon.png",
  "SwordC": "StilSwordCIcon.png",

  // === EXPLOSIVES ===
  "ExplosiveLightC": null, // Hydra's Whisper
  "ExplosiveTripod": "ExplosiveTripodIcon.png",
  "InfantryMine": "InfantryMineIcon.png",
  "SatchelChargeT": "SatchelChargeTIcon.png",
  "SatchelChargeW": null, // Alligator Charge
  "TankMine": "AntiTankMineItemIcon.png",
  "WaterMine": "SeaMineIcon.png",

  // === MEDICAL ===
  "Bandages": "BandagesItemIcon.png",
  "BloodPlasma": "BloodPlasmaItemIcon.png",
  "CriticalSoldier": "CriticallyWoundedIcon.png",
  "FirstAidKit": "FirstAidKitItem.png",
  "TraumaKit": "TraumaKitItemIcon.png",

  // === EQUIPMENT ===
  "Binoculars": "BinocularsItemIcon.png",
  "GasMask": "GasmaskIcon.png",
  "GasMaskFilter": "GasMaskFilterIcon.png",
  "ListeningKit": "ListeningKitIcon.png",
  "Radio": "RadioItemIcon.png",
  "RadioBackpack": "RadioBackpackItemIcon.png",
  "Tripod": "DeployableTripodItemIcon.png",

  // === TOOLS ===
  "Shovel": "ShovelIcon.png",
  "SledgeHammer": "SledgeHammerItemIcon.png",
  "WorkHammer": "HammerIcon.png",
  "WorkWrench": "WorkWrench.png",

  // === MATERIALS ===
  "Aluminum": "ResouceAluminumIcon.png",
  "AluminumA": "ResouceAluminumRefinedIcon.png",
  "BarbedWireMaterials": "BarbedWireMaterialItemIcon.png",
  "Cloth": "BasicMaterialsIcon.png",
  "Coal": "CoalIcon.png",
  "Components": "ComponentsIcon.png",
  "Concrete": "ConcreteBagIcon.png",
  "Copper": "ResourceCopperIcon.png",
  "CopperA": "ResourceCopperRefinedIcon.png",
  "Diesel": null, // Need diesel icon
  "Explosive": "ExplosiveMaterialIcon.png",
  "FacilityCoal1": "CokeIcon.png",
  "FacilityComponents1": "ComponentsDamagedIcon.png",
  "FacilityMaterials1": null, // Construction Materials
  "FacilityMaterials10": "FacilityMaterials10Icon.png",
  "FacilityMaterials11": "FacilityMaterials11Icon.png",
  "FacilityMaterials2": null, // Processed Construction Materials
  "FacilityMaterials3": null, // Steel Construction Materials
  "FacilityMaterials4": "FacilityMaterials4Icon.png",
  "FacilityMaterials5": null, // Assembly Materials II
  "FacilityMaterials6": null, // Assembly Materials III
  "FacilityMaterials7": null, // Assembly Materials IV
  "FacilityMaterials8": null, // Assembly Materials V
  "FacilityMaterials9": "FacilityMaterials09Icon.png",
  "FacilityOil1": "FacilityOil1Icon.png",
  "FacilityOil2": "FacilityOil2Icon.png",
  "GroundMaterials": "GroundMaterialsIcon.png",
  "HeavyExplosive": null, // Heavy Explosive Powder
  "Iron": "ResouceIronIcon.png",
  "IronA": "ResouceIronRefinedIcon.png",
  "Metal": "SalvageIcon.png",
  "MetalBeamMaterials": "MetalBeamMaterialItemIcon.png",
  "Oil": null, // Oil
  "Petrol": "RefinedFuelIcon.png",
  "PipeMaterials": null, // Pipe
  "RareMetal": "RareMaterialsIcon.png",
  "RelicMaterials": "RelicMaterialItemIcon.png",
  "SandbagMaterials": "SandbagMaterialItemIcon.png",
  "Sulfur": "SulfurIcon.png",
  "Water": "WaterIcon.png",
  "WaterBucket": null, // Water Bucket
  "Wood": "RefinedMaterialsIcon.png",

  // === CONTAINERS ===
  "ConstructionEquipment": "ConstructionPartsShippableIcon.png",
  "LiquidContainer": null, // Liquid Container
  "MaterialPlatform": "MaterialPlatformItemIcon.png",
  "ResourceContainer": null, // Resource Container
  "ShippingContainer": null, // Shipping Container

  // === MAINTENANCE ===
  "MaintenanceSupplies": "MaintenanceSuppliesIcon.png",
  "ReservePower": "ReservePower.png",
  "SoldierSupplies": "", // Soldier Supplies
  "Wreckage": null, // Wreckage

  // === ROCKET PARTS ===
  "RocketPartBottom": "RocketPartBottomIcon.png",
  "RocketPartCenter": "RocketPartCenterIcon.png",
  "RocketPartTop": "RocketPartTopIcon.png",

  // === SHIP PARTS ===
  "ShipPart1": null, // Naval Hull Segments
  "ShipPart2": null, // Naval Shell Plating
  "ShipPart3": null, // Naval Turbine Components

  // === OTHER ===
  "UnexplodedOrdnance": "UnexplodedOrdnanceIcon.png",
  "WindsockT": "WindsockItemIcon.png",
};

// Vehicle icons
export const VEHICLE_ICON_MAP: Record<string, string | null> = {
  // === TRUCKS ===
  "TruckC": "TruckVehicleIcon.png",
  "TruckW": "TruckWarVehicleIcon.png",
  "TruckDefensiveW": "TruckDefensiveWIcon.png",
  "TruckLiquidC": "OilTankerIcon.png",
  "TruckLiquidW": "OilTankerWarIcon.png",
  "TruckMobilityC": "TruckMobilityCVehicleIcon.png",
  "TruckMobilityW": "TruckMobilityWarVehicleIcon.png",
  "TruckMultiC": "TruckMultiCIcon.png",
  "TruckOffensiveC": "TruckOffensiveVehicleIcon.png",
  "TruckResourceC": "TruckUtilityVehicleIcon.png",
  "TruckResourceW": "TruckUtilityWarVehicleIcon.png",
  "HeavyTruckC": "HeavyTruckCVehicleIcon.png",
  "HeavyTruckW": "HeavyTruckWItemIcon_copy.png",
  "FlatbedTruck": "FlatbedTruckVehicleIcon.png",

  // === AMBULANCES ===
  "AmbulanceC": "Ambulance.png",
  "AmbulanceW": "AmbulanceWar.png",
  "AmbulanceFlameC": "AmbulanceFlameC.png",
  "AmbulanceFlameW": "AmbulanceFlameW.png",

  // === BUSES ===
  "BusC": "BusIcon.png",
  "BusW": "BusWarIcon.png",

  // === SCOUT VEHICLES ===
  "ScoutVehicleW": "ScoutVehicleWarVehicleIcon.png",
  "ScoutVehicleMobilityC": "ScoutVehicleMobilityVehicleIcon.png",
  "ScoutVehicleOffensiveC": "ScoutVehicleOffensiveVehicleIcon.png",
  "ScoutVehicleOffensiveW": "ScoutVehicleOffensiveWarVehicleIcon.png",
  "ScoutVehicleUtilityC": "ScoutVehicleUtilityCVehicleIcon.png",
  "ScoutVehicleUtilityW": null,

  // === MOTORCYCLES ===
  "MotorcycleC": "MotorcycleVehicleIcon.png",
  "MotorcycleW": "MotorcycleWIcon.png",
  "MotorcycleOffensiveC": "MotorcycleOffensiveVehicleIcon.png",
  "Bicycle": "RelicBicycleVehicleIcon.png",

  // === ARMORED CARS ===
  "ArmoredCarC": "ArmoredCarVehicleIcon.png",
  "ArmoredCarW": "ArmoredCarWarVehicleIcon.png",
  "ArmoredCar2LargeW": null,
  "ArmoredCar2MultiW": "ArmoredCar2MultiWIcon.png",
  "ArmoredCar2TwinW": "ArmoredCarTwinWIcon.png",
  "ArmoredCarATW": "ArmoredCarATWVehicleIcon.png",
  "ArmoredCarFlameW": "ArmoredCarFlameWarVehicleIcon.png",
  "ArmoredCarMobilityW": "ArmoredCarMobilityWarVehicleIcon.png",
  "ArmoredCarOffensiveC": "ArmoredCarOffensiveCVehicleIcon.png",
  "ArmoredCarTwinC": "ArmoredCarTwinCItemIcon.png",

  // === HALF-TRACKS ===
  "HalfTrackC": "HalfTrackColVehicleIcon.png",
  "HalfTrackW": "HalfTrackWarVehicleIcon.png",
  "HalfTrackArtilleryC": "HalfTrackArtilleryCIcon.png",
  "HalfTrackDefensiveC": "HalfTrackColHeavyArmorVehicleIcon.png",
  "HalfTrackOffensiveW": "HalfTrackOffensiveWarVehicleIcon.png",
  "HalfTrackTwinW": null,
  "HalftrackMultiW": "HalftrackMultiWIcon.png",

  // === TANKETTES ===
  "TanketteC": "TanketteCVehicleIcon.png",
  "TanketteFlameC": "TanketteFlameCIcon.png",
  "TanketteMultiC": "TanketteMultiCIcon.png",
  "TanketteOffensiveC": "TanketteOffensiveCVehicleIcon.png",

  // === SCOUT TANKS ===
  "ScoutTankW": "ScoutTankWIcon.png",
  "ScoutTankMultiW": "ScoutTankMultiWIcon.png",
  "ScoutTankOffensiveW": "ScoutTankOffensiveWIcon.png",

  // === LIGHT TANKS ===
  "LightTankC": "LightTankColVehicleIcon.png",
  "LightTankW": "LightTankWarVehicleIcon.png",
  "LightTank2InfantryC": "LightTank2InfantryCVehicleIcon.png",
  "LightTankArtilleryW": "LightTankArtilleryWar.png",
  "LightTankDefensiveW": "LightTankWarDefensiveVehicleIcon.png",
  "LightTankFlameC": "LightTankFlameCIcon.png",
  "LightTankMobilityC": "LightTankColMobilityVehicleIcon.png",
  "LightTankOffensiveC": "LightTankOffensiveCVehicleIcon.png",

  // === MEDIUM TANKS ===
  "MediumTankC": "ColonialMediumTankIcon.png",
  "MediumTankW": "WardenMediumTankIcon.png",
  "MediumTank2C": "MediumTank2CIcon.png",
  "MediumTank2W": "MediumTank2WIcon.png",
  "MediumTank2IndirectW": "MediumTank2IndirectWIcon.png",
  "MediumTank2MultiW": "MediumTank2MultiWIcon.png",
  "MediumTank2RangeW": "MediumTank2RangeWIcon.png",
  "MediumTank2TwinC": "MediumTank2TwinCVehicleIcon.png",
  "MediumTank3C": "MediumTank3CItemIcon.png",
  "MediumTankATW": "MediumTankATWIcon.png",
  "MediumTankLargeC": "MediumTankLargeCIcon.png",
  "MediumTankOffensiveC": "ColonialMediumTankOffensive.png",
  "MediumTankSiegeW": "MediumTankSiegeWVehicleIcon.png",

  // === BATTLE TANKS ===
  "BattleTankC": "BattleTank.png",
  "BattleTankW": "BattleTankWar.png",
  "BattleTankATC": "BattleTankATCIcon.png",
  "BattleTankDefensiveW": "BattleTankWarDefensiveVehicleIcon.png",
  "BattleTankHeavyArtilleryC": "BattleTankHeavyArtilleryCIcon.png",
  "BattleTankHeavyArtilleryW": "BattleTankHeavyArtilleryWIcon.png",

  // === SUPER TANKS ===
  "SuperTankC": "SuperTankCtemIcon.png",
  "SuperTankW": "SuperTankWVehicleIcon.png",

  // === DESTROYER TANKS ===
  "DestroyerTankW": "DestroyerTankWVehicleIcon.png",
  "DestroyerTankFlameW": "DestroyerTankFlameWIcon.png",

  // === MORTAR TANKS ===
  "MortarTankC": "MortarTankVehicleIcon.png",

  // === MECHS ===
  "Mech": null, // Centurion MV-2
  "MechW": null, // Herne QMW 1a Scourge Hunter

  // === FIELD GUNS ===
  "FieldATC": "FieldAntiTankColVehicleIcon.png",
  "FieldATW": "FieldAntiTankWarVehicleIcon.png",
  "FieldAT2C": "FieldAT2CIcon.png",
  "FieldAT2W": "FieldAT2WIcon.png",
  "FieldATDamageW": null,
  "FieldCannonDamageC": null,
  "FieldCannonW": "FieldCannonWVehicleIcon.png",
  "FieldMGC": "FieldMachineGun.png",
  "FieldMGW": "FieldMachineGunWar.png",
  "FieldMortarC": "FieldMortarCIcon.png",
  "FieldMortarW": "FieldMortarWIcon.png",
  "LargeFieldATC": "FieldATHeavyCIcon.png",
  "LargeFieldCannonW": "FieldCannonHeavyWIcon.png",
  "LargeFieldLightArtilleryC": null,
  "LargeFieldMortarC": "LargeFieldMortarCIcon.png",
  "LargeFieldMultiW": "FieldMultiWItemIcon.png",

  // === EMPLACED ===
  "EmplacedATW": null,
  "EmplacedHeavyArtilleryC": null,
  "EmplacedHeavyArtilleryW": null,
  "EmplacedIndirectC": "EmplacedIndirectCIcon.png",
  "EmplacedInfantryC": "EmplacedInfantryCIcon.png",
  "EmplacedInfantryW": null,
  "EmplacedLightArtilleryW": null,

  // === UTILITY VEHICLES ===
  "Crane": "CraneVehicleIcon.png",
  "LargeCrane": null,
  "Construction": "ConstructionVehicleIcon.png",
  "ConstructionUtility": "AdvancedConstructionVehicleIcon.png",
  "Harvester": "Harvester.png",
  "ConcreteMixer": null,

  // === TRAILERS ===
  "TrailerLiquid": "FuelTrailerIcon.png",
  "TrailerMaterial": "MaterialTrailerIcon.png",
  "TrailerResource": "ResourceTrailerIcon.png",

  // === BOATS ===
  "Barge": "BargeVehicleIcon.png",
  "Freighter": "Freighter02ItemIcon.png",
  "GunboatC": "GunBoatVehicleIcon.png",
  "GunboatW": "GunboatWIcon.png",
  "LandingCraftC": "LandingCraftVehicleIcon.png",
  "LandingCraftW": "LandingCraftWarVehicleIcon.png",
  "LandingCraftOffensiveC": "LandingCraftOffensiveVehicleIcon.png",
  "LandingShipC": "LandingShipCIcon.png",
  "LandingShipW": "LandingShipWIcon.png",
  "Motorboat": "Motorboat.png",

  // === LARGE SHIPS ===
  "LargeShipBaseShip": "LargeShipBaseShipIcon.png",
  "LargeShipBattleshipC": "LargeShipBattleshipCIcon.png",
  "LargeShipBattleshipW": "LargeShipBattleshipWIcon.png",
  "LargeShipDestroyerC": "LargeShipDestroyerCIcon.png",
  "LargeShipDestroyerW": null,
  "LargeShipResourceShip": "LargeShipResourceIcon.png",
  "LargeShipStorageShip": "LargeShipStorageShipIcon.png",
  "LargeShipSubmarineC": "LargeShipSubmarineCIcon.png",
  "LargeShipSubmarineW": "LargeShipSubmarineWIcon.png",

  // === TRAINS ===
  "SmallTrainEngine": "SmallGaugeEngineVehicleIcon.png",
  "SmallTrainLiquid": "SmallTrainFuelContainerIcon.png",
  "SmallTrainMaterial": "SmallGaugeFlatbedCarVehicleIcon.png",
  "SmallTrainResource": "SmallGaugeResourceCarVehicleIcon.png",
  "SmallTrainShipping": "SmallTrainShippingContainerIcon.png",
  "TrainCaboose": "TrainCabooseItemIcon.png",
  "TrainCoal": "TrainCoalCarVehicleIcon.png",
  "TrainCombatCarC": "CombatCarCVehicleIcon.png",
  "TrainCombatCarW": "CombatCarWVehicleIcon.png",
  "TrainEngine": "TrainEngineVehicleIcon.png",
  "TrainFlatbed": "TrainCarVehicleIcon.png",
  "TrainHospital": "TrainHospitalItemIcon.png",
  "TrainInfantry": null,
  "TrainLRArtillery": "TrainLRArtilleryVehicleIcon.png",

  // === RELICS ===
  "RelicAPC": "RelicApc.png",
  "RelicArmouredCar": "RelicArmouredCarVehicleIcon.png",
  "RelicLightTank": "RelicLightTankVehicleIcon.png",
  "RelicMediumTank": "ColonialRelicMediumTankVehicleIcon.png",
  "RelicScoutVehicle": "RelicCarVehicleIcon.png",
  "RelicTruck": "RelicTruckVehicleIcon.png",
};

// Uniform icons - many uniforms don't have dedicated icons
export const UNIFORM_ICON_MAP: Record<string, string | null> = {
  "AmmoUniformW": null,
  "ArmourUniformC": null,
  "ArmourUniformW": null,
  "EngineerUniformC": null,
  "EngineerUniformW": null,
  "GrenadeUniformC": null,
  "MedicUniformC": null,
  "MedicUniformW": null,
  "NavalUniformC": null,
  "NavalUniformW": null,
  "OfficerUniformC": null,
  "OfficerUniformW": null,
  "RainUniformC": null,
  "ScoutUniformC": null,
  "ScoutUniformW": null,
  "SnowUniformC": null,
  "SnowUniformW": null,
  "SoldierUniformC": null,
  "SoldierUniformW": null,
  "TankUniformC": null,
  "TankUniformW": null,
};

/**
 * Get the icon URL for an item code
 */
export function getIconPath(itemCode: string): string | null {
  // Check item icons first
  if (itemCode in ITEM_ICON_MAP) {
    const icon = ITEM_ICON_MAP[itemCode];
    return icon ? `/icons/items/${icon}` : null;
  }

  // Check vehicle icons
  if (itemCode in VEHICLE_ICON_MAP) {
    const icon = VEHICLE_ICON_MAP[itemCode];
    return icon ? `/icons/vehicles/${icon}` : null;
  }

  // Check uniform icons
  if (itemCode in UNIFORM_ICON_MAP) {
    const icon = UNIFORM_ICON_MAP[itemCode];
    return icon ? `/icons/items/${icon}` : null;
  }

  return null;
}

/**
 * Get stats on icon mapping coverage
 */
export function getIconMappingStats() {
  const itemTotal = Object.keys(ITEM_ICON_MAP).length;
  const itemMapped = Object.values(ITEM_ICON_MAP).filter(v => v !== null).length;

  const vehicleTotal = Object.keys(VEHICLE_ICON_MAP).length;
  const vehicleMapped = Object.values(VEHICLE_ICON_MAP).filter(v => v !== null).length;

  const uniformTotal = Object.keys(UNIFORM_ICON_MAP).length;
  const uniformMapped = Object.values(UNIFORM_ICON_MAP).filter(v => v !== null).length;

  return {
    items: { total: itemTotal, mapped: itemMapped, percent: Math.round(itemMapped / itemTotal * 100) },
    vehicles: { total: vehicleTotal, mapped: vehicleMapped, percent: Math.round(vehicleMapped / vehicleTotal * 100) },
    uniforms: { total: uniformTotal, mapped: uniformMapped, percent: Math.round(uniformMapped / uniformTotal * 100) },
  };
}
