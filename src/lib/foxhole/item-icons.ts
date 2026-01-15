// Item icon URLs - served locally from /public/icons/
// Icons downloaded from foxholetools/assets repository

// Map item codes to their exact icon filenames (based on actual files in repo)
const ICON_MAP: Record<string, string> = {
  // === AMMUNITION ===
  "ATAmmo": "ATAmmoIcon.png",
  "ATLargeAmmo": "ATAmmoIcon.png", // 94.5mm uses same icon
  "ATRifleAmmo": "ATRifleAmmoItemIcon.png",
  "ATRPGAmmo": "ATRpgAmmoItemIcon.png",
  "ATRPGIndirectAmmo": "ATRpgAmmoItemIcon.png",
  "AssaultRifleAmmo": "AssaultRifleAmmoItemIcon.png",
  "BattleTankAmmo": "BattleTankAmmoItemIcon.png",
  "FlameAmmo": "FlameAmmoIcon.png",
  "HeavyArtilleryAmmo": "HeavyArtilleryAmmoItemIcon.png",
  "LightArtilleryAmmo": "LightArtilleryAmmoItemIcon.png",
  "LightTankAmmo": "LightTankAmmoItemIcon.png",
  "LRArtilleryAmmo": "LRArtilleryAmmoItemIcon.png",
  "MGAmmo": "MachineGunAmmoIcon.png",
  "MiniTankAmmo": "MiniTankAmmoItemIcon.png",
  "MortarAmmo": "MortarAmmoIcon.png",
  "MortarAmmoFL": "MortarAmmoIcon.png",
  "MortarAmmoFlame": "MortarAmmoIcon.png",
  "MortarAmmoSH": "MortarAmmoIcon.png",
  "MortarTankAmmo": "MortarTankAmmoBRIcon.png",
  "MortarTankAmmoBR": "MortarTankAmmoBRIcon.png",
  "PistolAmmo": "PistolAmmoItemIcon.png",
  "RevolverAmmo": "RevolverAmmoItemIcon.png",
  "RifleAmmo": "RifleAmmoItemIcon.png",
  "RpgAmmo": "RpgAmmoItemIcon.png",
  "ShotgunAmmo": "ShotgunAmmoItemIcon.png",
  "SMGAmmo": "SubMachineGunAmmoIcon.png",
  "FireRocketAmmo": "FlameRocketAmmoIcon.png",
  "HERocketAmmo": "HERocketAmmoIcon.png",
  "DemolitionRocketAmmo": "DemolitionRocketAmmoIcon.png",
  "DepthChargeAmmo": "DepthChargeIcon.png",
  "TorpedoAmmo": "TorpedoIcon.png",

  // === MATERIALS & RESOURCES ===
  "Cloth": "BasicMaterialsIcon.png",
  "Wood": "RefinedMaterialsIcon.png",
  "Metal": "SalvageIcon.png",
  "Components": "ComponentsIcon.png",
  "Concrete": "ConcreteBagIcon.png",
  "Sulfur": "SulfurIcon.png",
  "Coal": "CoalIcon.png",
  "Iron": "ResouceIronIcon.png",
  "IronA": "ResouceIronRefinedIcon.png",
  "Copper": "ResourceCopperIcon.png",
  "CopperA": "ResourceCopperRefinedIcon.png",
  "Aluminum": "ResouceAluminumIcon.png",
  "AluminumA": "ResouceAluminumRefinedIcon.png",
  "Oil": "RefinedFuelIcon.png",
  "Petrol": "RefinedFuelIcon.png",
  "Diesel": "RefinedFuelIcon.png",
  "Water": "WaterIcon.png",
  "RareMetal": "RareMaterialsIcon.png",
  "Explosive": "ExplosiveMaterialIcon.png",
  "HeavyExplosive": "ExplosiveMaterialIcon.png",
  "RelicMaterials": "RelicMaterialItemIcon.png",
  "GroundMaterials": "GroundMaterialsIcon.png",

  // === FACILITY MATERIALS ===
  "FacilityCoal1": "CokeIcon.png",
  "FacilityComponents1": "ComponentsDamagedIcon.png",
  "FacilityMaterials1": "FacilityMaterials4Icon.png",
  "FacilityMaterials2": "FacilityMaterials4Icon.png",
  "FacilityMaterials3": "FacilityMaterials4Icon.png",
  "FacilityMaterials4": "FacilityMaterials4Icon.png",
  "FacilityMaterials5": "FacilityMaterials4Icon.png",
  "FacilityMaterials6": "FacilityMaterials4Icon.png",
  "FacilityMaterials7": "FacilityMaterials4Icon.png",
  "FacilityMaterials8": "FacilityMaterials4Icon.png",
  "FacilityMaterials9": "FacilityMaterials09Icon.png",
  "FacilityMaterials10": "FacilityMaterials10Icon.png",
  "FacilityMaterials11": "FacilityMaterials11Icon.png",
  "FacilityOil1": "FacilityOil1Icon.png",
  "FacilityOil2": "FacilityOil2Icon.png",

  // === BUILDING MATERIALS ===
  "BarbedWireMaterials": "BarbedWireMaterialItemIcon.png",
  "SandbagMaterials": "SandbagMaterialItemIcon.png",
  "MetalBeamMaterials": "MetalBeamMaterialItemIcon.png",
  "PipeMaterials": "FacilityPipeValveIcon.png",

  // === MEDICAL ===
  "Bandages": "BandagesItemIcon.png",
  "FirstAidKit": "FirstAidKitItem.png",
  "TraumaKit": "TraumaKitItemIcon.png",
  "BloodPlasma": "BloodPlasmaItemIcon.png",
  "CriticalSoldier": "CriticallyWoundedIcon.png",

  // === GRENADES ===
  "GrenadeW": "GrenadeItemIcon.png",
  "GrenadeC": "GrenadeCItemIcon.png",
  "HEGrenade": "HEGrenadeItemIcon.png",
  "SmokeGrenade": "Smokegrenadeicon1.png",
  "GreenAsh": "DeadlyGas01Icon.png",
  "StickyBomb": "StickyBombIcon.png",
  "ATGrenadeW": "ATGrenadeWIcon.png",
  "ATLaunchedGrenadeW": "ATLaunchedGrenadeWIcon.png",
  "HELaunchedGrenade": "HELaunchedGrenadeItemIcon.png",

  // === TOOLS & EQUIPMENT ===
  "Shovel": "ShovelIcon.png",
  "WorkHammer": "HammerIcon.png",
  "SledgeHammer": "SledgeHammerItemIcon.png",
  "WorkWrench": "WorkWrench.png",
  "Binoculars": "BinocularsItemIcon.png",
  "Radio": "RadioItemIcon.png",
  "RadioBackpack": "RadioBackpackItemIcon.png",
  "GasMask": "GasmaskIcon.png",
  "GasMaskFilter": "GasMaskFilterIcon.png",
  "Tripod": "DeployableTripodItemIcon.png",
  "ListeningKit": "ListeningKitIcon.png",
  "Bayonet": "BayonetIcon.png",
  "GrenadeAdapter": "GrenadeAdapterIcon.png",

  // === SUPPLIES ===
  "SoldierSupplies": "CrateItemIcon.png",
  "MaintenanceSupplies": "MaintenanceSuppliesIcon.png",
  "MaterialPlatform": "MaterialPlatformItemIcon.png",
  "ReservePower": "ReservePower.png",

  // === RIFLES ===
  "RifleW": "RifleItemIcon.png",
  "RifleC": "RifleCItemIcon.png",
  "RifleAutomaticW": "RifleAutomaticW.png",
  "RifleAutomaticC": "RifleAutomaticCIcon.png",
  "RifleLightW": "RifleItemIcon.png",
  "RifleLightC": "RifleLightCItemIcon.png",
  "RifleHeavyW": "RifleItemIcon.png",
  "RifleHeavyC": "RifleHeavyCItemIcon.png",
  "RifleLongW": "RifleLongW.png",
  "RifleLongC": "RifleLongC.png",
  "RifleShortW": "RifleShortWIcon.png",
  "SniperRifleW": "SniperRifleItemIcon.png",
  "SniperRifleC": "SniperRifleCItemIcon.png",

  // === ASSAULT RIFLES ===
  "AssaultRifleW": "AssaultRifleItemIcon.png",
  "AssaultRifleC": "AssaultRifleItemIcon.png",
  "AssaultRifleHeavyW": "AssaultRifleHeavyWItemIcon.png",
  "AssaultRifleHeavyC": "AssaultRifleHeavyCItemIcon.png",

  // === PISTOLS ===
  "PistolW": "PistolWItemIcon.png",
  "PistolC": "PistolItemIcon.png",
  "PistolLightW": "PistolLightWItemIcon.png",
  "Revolver": "RevolverItemIcon.png",

  // === SMGs ===
  "SMGW": "SubMachineGunIcon.png",
  "SMGC": "SMGCItemIcon.png",
  "SMGHeavyW": "SMGHeavyWItemIcon.png",
  "SMGHeavyC": "SMGHeavyCItemIcon.png",

  // === SHOTGUNS ===
  "ShotgunW": "ShotgunWItemIcon.png",
  "ShotgunC": "ShotgunCItemIcon.png",

  // === MACHINE GUNS ===
  "MGW": "MGWItemIcon.png",
  "MGC": "MGCItemIcon.png",
  "MGTW": "HeavyMachineGunIcon.png",
  "MGTC": "HeavyMachineGunIcon.png",

  // === ANTI-TANK WEAPONS ===
  "ATRifleW": "ATRifleItemIcon.png",
  "ATRifleAutomaticW": "ATRifleAutomaticWItemIcon.png",
  "ATRifleAssaultW": "ATRifleItemIcon.png",
  "ATRifleLightC": "ATRifleLightCIcon.png",
  "ATRifleSniperC": "ATRifleItemIcon.png",
  "ATRifleTC": "ATRifleTCIcon.png",
  "ATRPGW": "ATRpgItemIcon.png",
  "ATRPGC": "ATRPGCItemIcon.png",
  "ATRPGHeavyW": "ATRPGHeavyWIcon.png",
  "ATRPGHeavyC": "ATRPGCItemIcon.png",
  "ATRPGLightC": "ATRPGLightCItemIcon.png",
  "ATRPGTW": "ATRPGTWIcon.png",
  "RpgW": "RpgItemIcon.png",
  "RPGTW": "RpgItemIcon.png",

  // === MORTAR ===
  "Mortar": "MortarItemIcon.png",

  // === GRENADE LAUNCHERS ===
  "GrenadeLauncherC": "GrenadeLauncherCItemIcon.png",
  "GrenadeLauncherTC": "GrenadeLauncherTCIcon.png",

  // === FLAMETHROWERS ===
  "FlameTorchW": "FlamegunWICon.png",
  "FlameTorchC": "FlamegunCICon.png",
  "FlameBackpackW": "FlamePackWIcon.png",
  "FlameBackpackC": "FlamePackCIcon.png",

  // === MELEE ===
  "MaceW": "TrenchMaceWIcon.png",
  "SwordC": "StilSwordCIcon.png",

  // === EXPLOSIVES ===
  "SatchelChargeW": "StickyBombIcon.png",
  "SatchelChargeT": "SatchelChargeTIcon.png",
  "ExplosiveTripod": "ExplosiveTripodIcon.png",
  "ExplosiveLightC": "ExplosiveMaterialIcon.png",
  "InfantryMine": "InfantryMineIcon.png",
  "TankMine": "AntiTankMineItemIcon.png",
  "WaterMine": "SeaMineIcon.png",

  // === ROCKET PARTS ===
  "RocketPartTop": "RocketPartTopIcon.png",
  "RocketPartCenter": "RocketPartCenterIcon.png",
  "RocketPartBottom": "RocketPartBottomIcon.png",

  // === UNIFORMS (in subdirectory) ===
  "SoldierUniformW": "Uniforms/SoldierUniformWIcon.png",
  "SoldierUniformC": "Uniforms/SoldierUniformCIcon.png",
  "MedicUniformW": "Uniforms/MedicUniformWIcon.png",
  "MedicUniformC": "Uniforms/MedicUniformCIcon.png",
  "EngineerUniformW": "Uniforms/EngineerUniformWIcon.png",
  "EngineerUniformC": "Uniforms/EngineerUniformCIcon.png",
  "ScoutUniformW": "Uniforms/ScoutUniformWIcon.png",
  "ScoutUniformC": "Uniforms/ScoutUniformCIcon.png",
  "TankUniformW": "Uniforms/TankUniformWIcon.png",
  "TankUniformC": "Uniforms/TankUniformCIcon.png",
  "OfficerUniformW": "Uniforms/OfficerUniformWIcon.png",
  "OfficerUniformC": "Uniforms/OfficerUniformCIcon.png",
  "SnowUniformW": "Uniforms/SnowUniformWIcon.png",
  "SnowUniformC": "Uniforms/SnowUniformCIcon.png",
  "RainUniformC": "Uniforms/RainUniformCIcon.png",
  "NavalUniformW": "Uniforms/NavalUniformW.png",
  "NavalUniformC": "Uniforms/NavalUniformC.png",
  "ArmourUniformW": "Uniforms/ArmourUniformW.png",
  "ArmourUniformC": "Uniforms/ArmourUniformC.png",
  "AmmoUniformW": "Uniforms/AmmoUniformWIcon.png",
  "GrenadeUniformC": "Uniforms/GrenadeUniformCIcon.png",

  // === FIELD WEAPONS ===
  "FieldATW": "ATRpgItemIcon.png",
  "FieldATC": "ATRpgItemIcon.png",
  "FieldATDamageW": "ATRpgItemIcon.png",
  "FieldAT2W": "ATRpgItemIcon.png",
  "FieldAT2C": "ATRpgItemIcon.png",
  "FieldMGW": "HeavyMachineGunIcon.png",
  "FieldMGC": "HeavyMachineGunIcon.png",
  "FieldCannonW": "LightTankAmmoItemIcon.png",
  "FieldCannonDamageC": "LightTankAmmoItemIcon.png",
  "FieldMortarW": "MortarItemIcon.png",
  "FieldMortarC": "MortarItemIcon.png",
  "LargeFieldATW": "ATAmmoIcon.png",
  "LargeFieldATC": "ATAmmoIcon.png",
  "LargeFieldCannonW": "BattleTankAmmoItemIcon.png",
  "LargeFieldMortarC": "MortarItemIcon.png",
  "LargeFieldLightArtilleryC": "LightArtilleryAmmoItemIcon.png",
  "LargeFieldMultiW": "HERocketAmmoIcon.png",
  "ISGTC": "InfantrySupportGunItemIcon.png",
  "EmplacedATW": "ATAmmoIcon.png",
  "EmplacedInfantryW": "HeavyMachineGunIcon.png",
  "EmplacedInfantryC": "HeavyMachineGunIcon.png",
  "EmplacedIndirectC": "MortarItemIcon.png",
  "EmplacedLightArtilleryW": "LightArtilleryAmmoItemIcon.png",
  "EmplacedHeavyArtilleryW": "HeavyArtilleryAmmoItemIcon.png",
  "EmplacedHeavyArtilleryC": "HeavyArtilleryAmmoItemIcon.png",

  // === VEHICLES (in vehicles/ directory) ===
  "AmbulanceC": "vehicles/Ambulance.png",
  "AmbulanceFlameC": "vehicles/AmbulanceFlameC.png",
  "AmbulanceFlameW": "vehicles/AmbulanceFlameW.png",
  "AmbulanceW": "vehicles/AmbulanceWar.png",
  "ArmoredCar2LargeW": "vehicles/ArmoredCar2MultiWIcon.png",
  "ArmoredCar2MultiW": "vehicles/ArmoredCar2MultiWIcon.png",
  "ArmoredCar2TwinW": "vehicles/ArmoredCarTwinWIcon.png",
  "ArmoredCarATW": "vehicles/ArmoredCarATWVehicleIcon.png",
  "ArmoredCarC": "vehicles/ArmoredCarVehicleIcon.png",
  "ArmoredCarFlameW": "vehicles/ArmoredCarFlameWarVehicleIcon.png",
  "ArmoredCarMobilityW": "vehicles/ArmoredCarMobilityWarVehicleIcon.png",
  "ArmoredCarOffensiveC": "vehicles/ArmoredCarOffensiveCVehicleIcon.png",
  "ArmoredCarTwinC": "vehicles/ArmoredCarTwinCItemIcon.png",
  "ArmoredCarW": "vehicles/ArmoredCarWarVehicleIcon.png",
  "Barge": "vehicles/BargeVehicleIcon.png",
  "BattleTankATC": "vehicles/BattleTankATCIcon.png",
  "BattleTankC": "vehicles/BattleTank.png",
  "BattleTankDefensiveW": "vehicles/BattleTankWarDefensiveVehicleIcon.png",
  "BattleTankHeavyArtilleryC": "vehicles/BattleTankHeavyArtilleryCIcon.png",
  "BattleTankHeavyArtilleryW": "vehicles/BattleTankHeavyArtilleryWIcon.png",
  "BattleTankW": "vehicles/BattleTankWar.png",
  "Bicycle": "vehicles/RelicBicycleVehicleIcon.png",
  "BusC": "vehicles/BusIcon.png",
  "BusW": "vehicles/BusWarIcon.png",
  "ConcreteMixer": "vehicles/ConstructionVehicleIcon.png",
  "Construction": "vehicles/ConstructionVehicleIcon.png",
  "ConstructionUtility": "vehicles/AdvancedConstructionVehicleIcon.png",
  "Crane": "vehicles/CraneVehicleIcon.png",
  "DestroyerTankFlameW": "vehicles/DestroyerTankFlameWIcon.png",
  "DestroyerTankW": "vehicles/DestroyerTankWVehicleIcon.png",
  "FlatbedTruck": "vehicles/FlatbedTruckVehicleIcon.png",
  "Freighter": "vehicles/Freighter02ItemIcon.png",
  "GunboatC": "vehicles/GunBoatVehicleIcon.png",
  "GunboatW": "vehicles/GunboatWIcon.png",
  "HalfTrackArtilleryC": "vehicles/HalfTrackArtilleryCIcon.png",
  "HalfTrackC": "vehicles/HalfTrackColVehicleIcon.png",
  "HalfTrackDefensiveC": "vehicles/HalfTrackColHeavyArmorVehicleIcon.png",
  "HalfTrackOffensiveW": "vehicles/HalfTrackOffensiveWarVehicleIcon.png",
  "HalfTrackTwinW": "vehicles/HalfTrackVehicleIcon.png",
  "HalfTrackW": "vehicles/HalfTrackWarVehicleIcon.png",
  "HalftrackMultiW": "vehicles/HalftrackMultiWIcon.png",
  "Harvester": "vehicles/Harvester.png",
  "HeavyTruckC": "vehicles/HeavyTruckCVehicleIcon.png",
  "HeavyTruckW": "vehicles/HeavyTruckWItemIcon_copy.png",
  "LandingCraftC": "vehicles/LandingCraftVehicleIcon.png",
  "LandingCraftOffensiveC": "vehicles/LandingCraftOffensiveVehicleIcon.png",
  "LandingCraftW": "vehicles/LandingCraftWarVehicleIcon.png",
  "LandingShipC": "vehicles/LandingShipCIcon.png",
  "LandingShipW": "vehicles/LandingShipWIcon.png",
  "LargeCrane": "vehicles/CraneVehicleIcon.png",
  "LargeShipBaseShip": "vehicles/LargeShipBaseShipIcon.png",
  "LargeShipBattleshipC": "vehicles/LargeShipBattleshipCIcon.png",
  "LargeShipBattleshipW": "vehicles/LargeShipBattleshipWIcon.png",
  "LargeShipDestroyerC": "vehicles/LargeShipDestroyerCIcon.png",
  "LargeShipDestroyerW": "vehicles/LargeShipDestroyerCIcon.png",
  "LargeShipResourceShip": "vehicles/LargeShipResourceIcon.png",
  "LargeShipStorageShip": "vehicles/LargeShipStorageShipIcon.png",
  "LargeShipSubmarineC": "vehicles/LargeShipSubmarineWIcon.png",
  "LargeShipSubmarineW": "vehicles/LargeShipSubmarineWIcon.png",
  "LightTank2InfantryC": "vehicles/LightTank2InfantryCVehicleIcon.png",
  "LightTankArtilleryW": "vehicles/LightTankArtilleryWar.png",
  "LightTankC": "vehicles/LightTankColVehicleIcon.png",
  "LightTankDefensiveW": "vehicles/LightTankWarDefensiveVehicleIcon.png",
  "LightTankFlameC": "vehicles/LightTankFlameCIcon.png",
  "LightTankMobilityC": "vehicles/LightTankColMobilityVehicleIcon.png",
  "LightTankOffensiveC": "vehicles/LightTankOffensiveCVehicleIcon.png",
  "LightTankW": "vehicles/LightTankWarVehicleIcon.png",
  "Mech": "vehicles/SuperTankCtemIcon.png",
  "MechW": "vehicles/SuperTankWVehicleIcon.png",
  "MediumTank2C": "vehicles/MediumTank2CIcon.png",
  "MediumTank2IndirectW": "vehicles/MediumTank2IndirectWIcon.png",
  "MediumTank2MultiW": "vehicles/MediumTank2MultiWIcon.png",
  "MediumTank2RangeW": "vehicles/MediumTank2RangeWIcon.png",
  "MediumTank2TwinC": "vehicles/MediumTank2TwinCVehicleIcon.png",
  "MediumTank2W": "vehicles/MediumTank2WIcon.png",
  "MediumTank3C": "vehicles/MediumTank3CItemIcon.png",
  "MediumTankATW": "vehicles/MediumTankATWIcon.png",
  "MediumTankC": "vehicles/ColonialMediumTankIcon.png",
  "MediumTankLargeC": "vehicles/MediumTankLargeCIcon.png",
  "MediumTankOffensiveC": "vehicles/ColonialMediumTankOffensive.png",
  "MediumTankSiegeW": "vehicles/MediumTankSiegeWVehicleIcon.png",
  "MediumTankW": "vehicles/WardenMediumTankIcon.png",
  "MortarTankC": "vehicles/MortarTankVehicleIcon.png",
  "Motorboat": "vehicles/Motorboat.png",
  "MotorcycleC": "vehicles/MotorcycleVehicleIcon.png",
  "MotorcycleOffensiveC": "vehicles/MotorcycleOffensiveVehicleIcon.png",
  "MotorcycleW": "vehicles/MotorcycleWIcon.png",
  "RelicAPC": "vehicles/RelicApc.png",
  "RelicArmouredCar": "vehicles/RelicArmouredCarVehicleIcon.png",
  "RelicLightTank": "vehicles/RelicLightTankVehicleIcon.png",
  "RelicMediumTank": "vehicles/ColonialRelicMediumTankVehicleIcon.png",
  "RelicScoutVehicle": "vehicles/RelicCarVehicleIcon.png",
  "RelicTruck": "vehicles/RelicTruckVehicleIcon.png",
  "ScoutTankMultiW": "vehicles/ScoutTankMultiWIcon.png",
  "ScoutTankOffensiveW": "vehicles/ScoutTankOffensiveWIcon.png",
  "ScoutTankW": "vehicles/ScoutTankWIcon.png",
  "ScoutVehicleMobilityC": "vehicles/ScoutVehicleMobilityVehicleIcon.png",
  "ScoutVehicleOffensiveC": "vehicles/ScoutVehicleOffensiveVehicleIcon.png",
  "ScoutVehicleOffensiveW": "vehicles/ScoutVehicleOffensiveWarVehicleIcon.png",
  "ScoutVehicleUtilityC": "vehicles/ScoutVehicleUtilityCVehicleIcon.png",
  "ScoutVehicleUtilityW": "vehicles/ScoutVehicleIcon.png",
  "ScoutVehicleW": "vehicles/ScoutVehicleWarVehicleIcon.png",
  "ShipPart1": "vehicles/ShipPart1.png",
  "ShipPart2": "vehicles/ShipPart2.png",
  "ShipPart3": "vehicles/ShipPart3.png",
  "SmallTrainEngine": "vehicles/SmallGaugeEngineVehicleIcon.png",
  "SmallTrainLiquid": "vehicles/SmallTrainFuelContainerIcon.png",
  "SmallTrainMaterial": "vehicles/SmallGaugeFlatbedCarVehicleIcon.png",
  "SmallTrainResource": "vehicles/SmallGaugeResourceCarVehicleIcon.png",
  "SmallTrainShipping": "vehicles/SmallTrainShippingContainerIcon.png",
  "SuperTankC": "vehicles/SuperTankCtemIcon.png",
  "SuperTankW": "vehicles/SuperTankWVehicleIcon.png",
  "TanketteC": "vehicles/TanketteCVehicleIcon.png",
  "TanketteFlameC": "vehicles/TanketteFlameCIcon.png",
  "TanketteMultiC": "vehicles/TanketteMultiCIcon.png",
  "TanketteOffensiveC": "vehicles/TanketteOffensiveCVehicleIcon.png",
  "TrailerLiquid": "vehicles/FuelTrailerIcon.png",
  "TrailerMaterial": "vehicles/MaterialTrailerIcon.png",
  "TrailerResource": "vehicles/ResourceTrailerIcon.png",
  "TrainCaboose": "vehicles/TrainCabooseItemIcon.png",
  "TrainCoal": "vehicles/TrainCoalCarVehicleIcon.png",
  "TrainCombatCarC": "vehicles/CombatCarCVehicleIcon.png",
  "TrainCombatCarW": "vehicles/CombatCarWVehicleIcon.png",
  "TrainEngine": "vehicles/TrainEngineVehicleIcon.png",
  "TrainFlatbed": "vehicles/TrainCarVehicleIcon.png",
  "TrainHospital": "vehicles/TrainCarVehicleIcon.png",
  "TrainInfantry": "vehicles/TrainCarVehicleIcon.png",
  "TrainLRArtillery": "vehicles/TrainLRArtilleryVehicleIcon.png",
  "TruckC": "vehicles/TruckVehicleIcon.png",
  "TruckDefensiveW": "vehicles/TruckDefensiveWIcon.png",
  "TruckLiquidC": "vehicles/OilTankerIcon.png",
  "TruckLiquidW": "vehicles/OilTankerWarIcon.png",
  "TruckMobilityC": "vehicles/TruckMobilityCVehicleIcon.png",
  "TruckMobilityW": "vehicles/TruckMobilityWarVehicleIcon.png",
  "TruckMultiC": "vehicles/TruckMultiCIcon.png",
  "TruckOffensiveC": "vehicles/TruckOffensiveVehicleIcon.png",
  "TruckResourceC": "vehicles/TruckUtilityVehicleIcon.png",
  "TruckResourceW": "vehicles/TruckUtilityWarVehicleIcon.png",
  "TruckW": "vehicles/TruckWarVehicleIcon.png",

  // === MISCELLANEOUS ===
  "WindsockT": "WindsockItemIcon.png",
  "UnexplodedOrdnance": "UnexplodedOrdnanceIcon.png",
  "LiquidContainer": "WaterIcon.png",
  "ResourceContainer": "CrateItemIcon.png",
  "ShippingContainer": "CrateItemIcon.png",
  "ConstructionEquipment": "ConstructionPartsShippableIcon.png",
  "WaterBucket": "WaterIcon.png",
  "Wreckage": "Salvage02Icon.png",
};

/**
 * Get the icon URL for an item code
 * Returns local path from /public/icons/
 */
export function getItemIconUrl(itemCode: string): string {
  const iconFile = ICON_MAP[itemCode];
  if (iconFile) {
    // Handle different icon directories
    if (iconFile.startsWith("vehicles/")) {
      return `/icons/${iconFile}`;
    }
    // Items directory (including Uniforms/ subdirectory)
    return `/icons/items/${iconFile}`;
  }
  // Fallback: try common patterns or return placeholder
  return `/icons/items/CrateItemIcon.png`;
}

/**
 * Check if an item code is a vehicle
 */
export function isVehicle(itemCode: string): boolean {
  const iconFile = ICON_MAP[itemCode];
  return iconFile?.startsWith("vehicles/") ?? false;
}

/**
 * Get all vehicle item codes
 */
export function getVehicleItemCodes(): string[] {
  return Object.entries(ICON_MAP)
    .filter(([, iconFile]) => iconFile.startsWith("vehicles/"))
    .map(([itemCode]) => itemCode);
}
