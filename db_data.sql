--
-- PostgreSQL database dump
--

\restrict wHdYsuAvFU0pWywcydnplaXVx0eF6V4ueyHDci40EcxQG765vFZNY5KOVinGwZK

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."User" VALUES ('cmkafsxxr0000gwst4fwoqfkj', '112967182752768000', 'landonwo@gmail.com', NULL, 'metroshica', 'https://cdn.discordapp.com/avatars/112967182752768000/6d175337fd9dc73e9fd75afdb5260fd0.png', '221807570682118144', '2026-01-12 00:41:03.183', '2026-01-12 23:50:12.135');


--
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Account" VALUES ('cmkafsxxu0002gwst29sjva2o', 'cmkafsxxr0000gwst4fwoqfkj', 'oauth', 'discord', '112967182752768000', 'AyPwjU7tK55XhSGVK1B7aLZUoKKaQI', 'MTQ1OTg2MjY3MzkzNTE3MTczMQ.o0tcCCkDoh575JgIST5EUC737BmQeu', 1768783263, 'bearer', 'guilds.members.read identify email guilds', NULL, NULL);


--
-- Data for Name: Regiment; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Regiment" VALUES ('cmk9v0ovq0003gwk5rfw9eoe7', '221807570682118144', 'Metroshica', NULL, '2026-01-11 14:59:12.759', '2026-01-11 14:59:12.759', '{}', '{}', '{}');


--
-- Data for Name: Item; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Stockpile; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Stockpile" VALUES ('cmkaljajr001hgwst5bpxh8b7', '221807570682118144', '18th-KCO1', 'STORAGE_DEPOT', 'King''s Cage', 'Gibbet Fields', NULL, '2026-01-12 03:21:30.664', '2026-01-12 16:34:57.659');
INSERT INTO public."Stockpile" VALUES ('cmkallagu001qgwstelprsex3', '221807570682118144', '18th PUB', 'STORAGE_DEPOT', 'The Heartlands', 'The Blemish', NULL, '2026-01-12 03:23:03.871', '2026-01-12 16:35:24.776');
INSERT INTO public."Stockpile" VALUES ('cmkalelj7000igwstsz13m68n', '221807570682118144', '18thPUB', 'STORAGE_DEPOT', 'Origin', 'Teichotima', NULL, '2026-01-12 03:17:51.62', '2026-01-12 16:35:46.738');
INSERT INTO public."Stockpile" VALUES ('cmkaldoen0005gwstdy8dx74s', '221807570682118144', '18th-ACO1', 'SEAPORT', 'Ash Fields', 'Ashtown', NULL, '2026-01-12 03:17:08.687', '2026-01-12 23:51:47.846');
INSERT INTO public."Stockpile" VALUES ('cmkalg69k000ogwstcme0itmh', '221807570682118144', '18th-GM01', 'STORAGE_DEPOT', 'Great March', 'Sitaria', NULL, '2026-01-12 03:19:05.144', '2026-01-12 23:52:32.299');


--
-- Data for Name: StockpileScan; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."StockpileScan" VALUES ('cmkaqfhz200a1gwy7nt8bvk5q', 'cmkalg69k000ogwstcme0itmh', 'cmkafsxxr0000gwst4fwoqfkj', NULL, 0.9273333333333333, 30, '2026-01-12 05:38:31.743');
INSERT INTO public."StockpileScan" VALUES ('cmkbdum89000ygwds53xmen88', 'cmkalg69k000ogwstcme0itmh', 'cmkafsxxr0000gwst4fwoqfkj', NULL, 0.9283333333333335, 33, '2026-01-12 16:34:08.265');
INSERT INTO public."StockpileScan" VALUES ('cmkbdv6g3001bgwds8tyv986h', 'cmkaldoen0005gwstdy8dx74s', 'cmkafsxxr0000gwst4fwoqfkj', NULL, 0.9424545454545453, 11, '2026-01-12 16:34:34.467');
INSERT INTO public."StockpileScan" VALUES ('cmkbdvoch001mgwds41nwd0qv', 'cmkaljajr001hgwst5bpxh8b7', 'cmkafsxxr0000gwst4fwoqfkj', NULL, 0.9326666666666666, 9, '2026-01-12 16:34:57.665');
INSERT INTO public."StockpileScan" VALUES ('cmkbdw99o001sgwds3bb12348', 'cmkallagu001qgwstelprsex3', 'cmkafsxxr0000gwst4fwoqfkj', NULL, 0.93425, 4, '2026-01-12 16:35:24.781');
INSERT INTO public."StockpileScan" VALUES ('cmkbdwq7s0020gwds0llerdmh', 'cmkalelj7000igwstsz13m68n', 'cmkafsxxr0000gwst4fwoqfkj', NULL, 0.9159999999999999, 6, '2026-01-12 16:35:46.744');
INSERT INTO public."StockpileScan" VALUES ('cmkbthg9e001fgwve4jappzyl', 'cmkaldoen0005gwstdy8dx74s', 'cmkafsxxr0000gwst4fwoqfkj', NULL, 0.9224800000000002, 50, '2026-01-12 23:51:47.859');
INSERT INTO public."StockpileScan" VALUES ('cmkbtiek5002fgwve6zsgombc', 'cmkalg69k000ogwstcme0itmh', 'cmkafsxxr0000gwst4fwoqfkj', NULL, 0.927764705882353, 34, '2026-01-12 23:52:32.31');


--
-- Data for Name: Inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Operation; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Operation" VALUES ('cmkardycl0004gwqxxcl7kexl', '221807570682118144', 'Pushguns and ACs', 'Taking out ACs and 12.7 pushguns', 'PLANNING', '2026-01-14 01:00:00', 'Deadlands', 'cmkafsxxr0000gwst4fwoqfkj', '2026-01-12 06:05:19.27', '2026-01-12 06:08:25.039', 'cmkalg69k000ogwstcme0itmh', '2026-01-14 04:00:00');
INSERT INTO public."Operation" VALUES ('cmkarm0uu000ggwqxp5j3biqq', '221807570682118144', 'Pushguns and ACs', 'Taking out pushguns and ACs', 'PLANNING', '2026-01-14 01:00:00', 'Deadlands', 'cmkafsxxr0000gwst4fwoqfkj', '2026-01-12 06:11:35.766', '2026-01-12 06:11:46.955', 'cmkalg69k000ogwstcme0itmh', '2026-01-14 05:00:00');


--
-- Data for Name: OperationRequirement; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."OperationRequirement" VALUES ('cmkarhxoz000agwqx795yvdsj', 'cmkardycl0004gwqxxcl7kexl', 250, 3, 'MGAmmo');
INSERT INTO public."OperationRequirement" VALUES ('cmkarhxoz000bgwqxdejk03ly', 'cmkardycl0004gwqxxcl7kexl', 6, 3, 'ArmoredCarC');
INSERT INTO public."OperationRequirement" VALUES ('cmkarhxoz000cgwqxxwejf227', 'cmkardycl0004gwqxxcl7kexl', 50, 2, 'AssaultRifleAmmo');
INSERT INTO public."OperationRequirement" VALUES ('cmkarhxoz000dgwqxrffsd5mo', 'cmkardycl0004gwqxxcl7kexl', 30, 1, 'Binoculars');
INSERT INTO public."OperationRequirement" VALUES ('cmkarhxoz000egwqx4e9ofdly', 'cmkardycl0004gwqxxcl7kexl', 20, 1, 'Cloth');
INSERT INTO public."OperationRequirement" VALUES ('cmkarm9hq000ngwqxt3wr33kb', 'cmkarm0uu000ggwqxp5j3biqq', 250, 3, 'MGAmmo');
INSERT INTO public."OperationRequirement" VALUES ('cmkarm9hq000ogwqxpq7qddrf', 'cmkarm0uu000ggwqxp5j3biqq', 6, 3, 'ArmoredCarC');
INSERT INTO public."OperationRequirement" VALUES ('cmkarm9hq000pgwqxoxoqaxqf', 'cmkarm0uu000ggwqxp5j3biqq', 30, 2, 'Cloth');
INSERT INTO public."OperationRequirement" VALUES ('cmkarm9hq000qgwqx3flt88ac', 'cmkarm0uu000ggwqxp5j3biqq', 20, 1, 'Binoculars');
INSERT INTO public."OperationRequirement" VALUES ('cmkarm9hq000rgwqxdefrs76n', 'cmkarm0uu000ggwqxp5j3biqq', 50, 1, 'ATRifleAmmo');


--
-- Data for Name: RegimentMember; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."RegimentMember" VALUES ('cmkaft8480004gwst7xhaj51x', 'cmkafsxxr0000gwst4fwoqfkj', '221807570682118144', 'ADMIN', '2026-01-12 00:41:16.377', '2026-01-12 00:41:16.377');


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: StockpileItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."StockpileItem" VALUES ('cmkbdwq7q001tgwdsq40bqasp', 'cmkalelj7000igwstsz13m68n', 'SoldierSupplies', 0, true, 0.939, '2026-01-12 16:35:46.742');
INSERT INTO public."StockpileItem" VALUES ('cmkbdwq7q001ugwds1ro1p2ua', 'cmkalelj7000igwstsz13m68n', 'MaintenanceSupplies', 0, true, 0.968, '2026-01-12 16:35:46.742');
INSERT INTO public."StockpileItem" VALUES ('cmkbdwq7q001vgwdsprlodvci', 'cmkalelj7000igwstsz13m68n', 'ArmoredCarC', 6, false, 0.88, '2026-01-12 16:35:46.742');
INSERT INTO public."StockpileItem" VALUES ('cmkbdwq7q001wgwdsflbr9abo', 'cmkalelj7000igwstsz13m68n', 'FieldMGC', 6, false, 0.931, '2026-01-12 16:35:46.742');
INSERT INTO public."StockpileItem" VALUES ('cmkbdwq7q001xgwds85ry8ii4', 'cmkalelj7000igwstsz13m68n', 'TruckC', 1, false, 0.882, '2026-01-12 16:35:46.742');
INSERT INTO public."StockpileItem" VALUES ('cmkbdwq7q001ygwdsswmwo3yg', 'cmkalelj7000igwstsz13m68n', 'ArmoredCarTwinC', 1, false, 0.896, '2026-01-12 16:35:46.742');
INSERT INTO public."StockpileItem" VALUES ('cmkbdw99n001ngwdsi5beoj4i', 'cmkallagu001qgwstelprsex3', 'SoldierSupplies', 0, true, 0.939, '2026-01-12 16:35:24.779');
INSERT INTO public."StockpileItem" VALUES ('cmkbdw99n001ogwdsijknk5uj', 'cmkallagu001qgwstelprsex3', 'MaintenanceSupplies', 0, true, 0.968, '2026-01-12 16:35:24.779');
INSERT INTO public."StockpileItem" VALUES ('cmkbdw99n001pgwds6sh7fc04', 'cmkallagu001qgwstelprsex3', 'FlatbedTruck', 1, false, 0.889, '2026-01-12 16:35:24.779');
INSERT INTO public."StockpileItem" VALUES ('cmkbdw99n001qgwdsy55kg2cv', 'cmkallagu001qgwstelprsex3', 'TruckResourceC', 1, false, 0.941, '2026-01-12 16:35:24.779');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg980000gwvevrmgotc7', 'cmkaldoen0005gwstdy8dx74s', 'SoldierSupplies', 15, true, 0.939, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg980001gwvequ2q2iea', 'cmkaldoen0005gwstdy8dx74s', 'MaintenanceSupplies', 0, true, 0.968, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg980002gwvey2c94cdh', 'cmkaldoen0005gwstdy8dx74s', 'BarbedWireMaterials', 97, true, 0.841, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg980003gwvephxqpvfd', 'cmkaldoen0005gwstdy8dx74s', 'SandbagMaterials', 77, true, 0.976, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg980004gwveuyt5r9al', 'cmkaldoen0005gwstdy8dx74s', 'Explosive', 27, true, 0.944, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg980005gwvecurjsukm', 'cmkaldoen0005gwstdy8dx74s', 'ShotgunC', 25, true, 0.859, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg980006gwvekb8dindm', 'cmkaldoen0005gwstdy8dx74s', 'ShotgunAmmo', 18, true, 0.945, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg980007gwvesyig1w8e', 'cmkaldoen0005gwstdy8dx74s', 'Wood', 12, true, 0.945, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg980008gwvez24xee9q', 'cmkaldoen0005gwstdy8dx74s', 'FacilityMaterials1', 9, true, 0.93, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg980009gwvez7p70xdx', 'cmkaldoen0005gwstdy8dx74s', 'RifleC', 8, true, 0.865, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg98000agwve18rt8kii', 'cmkaldoen0005gwstdy8dx74s', 'RifleAmmo', 8, true, 0.91, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg98000bgwveq3lld6y6', 'cmkaldoen0005gwstdy8dx74s', 'TraumaKit', 6, true, 0.96, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg98000cgwvejavdf7do', 'cmkaldoen0005gwstdy8dx74s', 'Shovel', 5, true, 0.925, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg98000dgwvevam77irq', 'cmkaldoen0005gwstdy8dx74s', 'Diesel', 5, true, 0.922, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg98000egwveuk8ovvgv', 'cmkaldoen0005gwstdy8dx74s', 'EngineerUniformC', 5, true, 0.953, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg98000fgwveu566vu7a', 'cmkaldoen0005gwstdy8dx74s', 'FirstAidKit', 4, true, 0.931, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000ggwvebrroeayz', 'cmkaldoen0005gwstdy8dx74s', 'Bandages', 4, true, 0.92, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000hgwvezfdmxxcu', 'cmkaldoen0005gwstdy8dx74s', 'BloodPlasma', 4, true, 0.9, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000igwve859drr67', 'cmkaldoen0005gwstdy8dx74s', 'RevolverAmmo', 4, true, 0.894, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000jgwvezsvt7akm', 'cmkaldoen0005gwstdy8dx74s', 'GasMaskFilter', 4, true, 0.904, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000kgwvegud831hy', 'cmkaldoen0005gwstdy8dx74s', 'GasMask', 4, true, 0.949, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000lgwvebptrefp6', 'cmkaldoen0005gwstdy8dx74s', 'GreenAsh', 3, true, 0.932, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000mgwves0vpm6un', 'cmkaldoen0005gwstdy8dx74s', 'ScoutUniformC', 2, true, 0.91, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000ngwvec1xruw8m', 'cmkaldoen0005gwstdy8dx74s', 'Binoculars', 2, true, 0.97, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000ogwvewu7zhku3', 'cmkaldoen0005gwstdy8dx74s', 'RifleHeavyC', 2, true, 0.796, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000pgwvea8pe8wuv', 'cmkaldoen0005gwstdy8dx74s', 'Tripod', 2, true, 0.858, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000qgwvejmxzm1ra', 'cmkaldoen0005gwstdy8dx74s', 'Radio', 2, true, 0.927, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000rgwvehqksl4um', 'cmkaldoen0005gwstdy8dx74s', 'MedicUniformC', 2, true, 0.897, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000sgwvevvrqjinl', 'cmkaldoen0005gwstdy8dx74s', 'Revolver', 2, true, 0.868, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000tgwve9wojurcu', 'cmkaldoen0005gwstdy8dx74s', 'MGAmmo', 2, true, 0.959, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000ugwvet2bh9n4d', 'cmkaldoen0005gwstdy8dx74s', 'StickyBomb', 1, true, 0.915, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000vgwved1bxpfqq', 'cmkaldoen0005gwstdy8dx74s', 'SnowUniformC', 1, true, 0.903, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000wgwve15nfm80w', 'cmkaldoen0005gwstdy8dx74s', 'HEGrenade', 1, true, 0.938, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000xgwvebqocaxie', 'cmkaldoen0005gwstdy8dx74s', 'ArmourUniformC', 1, true, 0.914, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000ygwve46i3jt7l', 'cmkaldoen0005gwstdy8dx74s', 'Bayonet', 1, true, 0.908, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99000zgwveudz69uop', 'cmkaldoen0005gwstdy8dx74s', 'OfficerUniformC', 1, true, 0.941, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg990010gwve6a7mlc6h', 'cmkaldoen0005gwstdy8dx74s', 'ATRifleAmmo', 1, true, 0.908, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg990011gwve8zd04ivr', 'cmkaldoen0005gwstdy8dx74s', 'WorkWrench', 1, true, 0.957, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg990012gwve9umn71oq', 'cmkaldoen0005gwstdy8dx74s', 'SMGAmmo', 1, true, 0.944, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg990013gwveijf5lael', 'cmkaldoen0005gwstdy8dx74s', 'RainUniformC', 1, true, 0.918, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg990014gwvekl5z3ozg', 'cmkaldoen0005gwstdy8dx74s', 'SMGC', 1, true, 0.871, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg990015gwve2kg058m0', 'cmkaldoen0005gwstdy8dx74s', 'Freighter', 3, false, 0.944, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg990016gwvejzz5l3pj', 'cmkaldoen0005gwstdy8dx74s', 'FlatbedTruck', 3, false, 0.976, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg990017gwve4s4uopa5', 'cmkaldoen0005gwstdy8dx74s', 'ScoutVehicleMobilityC', 2, false, 0.924, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg990018gwvexwlhijlr', 'cmkaldoen0005gwstdy8dx74s', 'TruckMobilityC', 1, false, 0.938, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg990019gwvemargjotc', 'cmkaldoen0005gwstdy8dx74s', 'TruckResourceC', 1, false, 0.978, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99001agwvewmkk3fyc', 'cmkaldoen0005gwstdy8dx74s', 'Freighter', 4, true, 0.899, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99001bgwvewslweoy2', 'cmkaldoen0005gwstdy8dx74s', 'ArmoredCarC', 4, true, 0.936, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99001cgwveolhl8xpq', 'cmkaldoen0005gwstdy8dx74s', 'ResourceContainer', 9, false, 0.947, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbthg99001dgwvet44jsun1', 'cmkaldoen0005gwstdy8dx74s', 'ResourceContainer', 2, true, 0.968, '2026-01-12 23:51:47.853');
INSERT INTO public."StockpileItem" VALUES ('cmkbdvocf001cgwdsqa8n1xbc', 'cmkaljajr001hgwst5bpxh8b7', 'SoldierSupplies', 0, true, 0.939, '2026-01-12 16:34:57.663');
INSERT INTO public."StockpileItem" VALUES ('cmkbdvocf001dgwdspd0cjbdi', 'cmkaljajr001hgwst5bpxh8b7', 'MaintenanceSupplies', 0, true, 0.968, '2026-01-12 16:34:57.663');
INSERT INTO public."StockpileItem" VALUES ('cmkbdvocf001egwdszzlt5cqi', 'cmkaljajr001hgwst5bpxh8b7', 'MGAmmo', 50, true, 0.915, '2026-01-12 16:34:57.663');
INSERT INTO public."StockpileItem" VALUES ('cmkbdvocf001fgwdsp5ruxfzz', 'cmkaljajr001hgwst5bpxh8b7', 'AssaultRifleAmmo', 50, true, 0.933, '2026-01-12 16:34:57.663');
INSERT INTO public."StockpileItem" VALUES ('cmkbdvocf001ggwdsf5pe4l5y', 'cmkaljajr001hgwst5bpxh8b7', 'HEGrenade', 50, true, 0.928, '2026-01-12 16:34:57.663');
INSERT INTO public."StockpileItem" VALUES ('cmkbdvocf001hgwdszc3v1m55', 'cmkaljajr001hgwst5bpxh8b7', 'RpgAmmo', 45, true, 0.917, '2026-01-12 16:34:57.663');
INSERT INTO public."StockpileItem" VALUES ('cmkbdvocf001igwdscpm0qhc6', 'cmkaljajr001hgwst5bpxh8b7', 'ATRifleAmmo', 45, true, 0.946, '2026-01-12 16:34:57.663');
INSERT INTO public."StockpileItem" VALUES ('cmkbdvocf001jgwds9h7cutvw', 'cmkaljajr001hgwst5bpxh8b7', 'FlatbedTruck', 2, false, 0.92, '2026-01-12 16:34:57.663');
INSERT INTO public."StockpileItem" VALUES ('cmkbdvocf001kgwdsrrh6nd41', 'cmkaljajr001hgwst5bpxh8b7', 'ShippingContainer', 4, false, 0.928, '2026-01-12 16:34:57.663');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001ggwve8dfze85p', 'cmkalg69k000ogwstcme0itmh', 'SoldierSupplies', 20, true, 0.939, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001hgwvewibugg7a', 'cmkalg69k000ogwstcme0itmh', 'MaintenanceSupplies', 20, true, 0.968, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001igwveyapvistn', 'cmkalg69k000ogwstcme0itmh', 'Cloth', 65, true, 0.942, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001jgwvehgadhbn2', 'cmkalg69k000ogwstcme0itmh', 'ATRifleAmmo', 48, true, 0.946, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001kgwve3n8k8qfn', 'cmkalg69k000ogwstcme0itmh', 'MGAmmo', 46, true, 0.915, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001lgwvex7i0l53i', 'cmkalg69k000ogwstcme0itmh', 'Explosive', 38, true, 0.944, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001mgwve4kb0k469', 'cmkalg69k000ogwstcme0itmh', 'RifleC', 38, true, 0.917, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001ngwvepmxkdsky', 'cmkalg69k000ogwstcme0itmh', 'RifleAmmo', 25, true, 0.91, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001ogwveeemg3kq0', 'cmkalg69k000ogwstcme0itmh', 'Bandages', 21, true, 0.921, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001pgwve8f74ncv3', 'cmkalg69k000ogwstcme0itmh', 'Radio', 16, true, 0.927, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001qgwve51la976j', 'cmkalg69k000ogwstcme0itmh', 'MedicUniformC', 16, true, 0.897, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001rgwve4lr85ajw', 'cmkalg69k000ogwstcme0itmh', 'HEGrenade', 9, true, 0.928, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001sgwve7lhxxwzf', 'cmkalg69k000ogwstcme0itmh', 'LightArtilleryAmmo', 9, true, 0.942, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001tgwveyme4xufw', 'cmkalg69k000ogwstcme0itmh', 'Binoculars', 8, true, 0.937, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001ugwvek6yrd8xy', 'cmkalg69k000ogwstcme0itmh', 'ArmourUniformC', 7, true, 0.914, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001vgwvef9t46ast', 'cmkalg69k000ogwstcme0itmh', 'SwordC', 7, true, 0.936, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001wgwveeabqtl1o', 'cmkalg69k000ogwstcme0itmh', 'WorkWrench', 5, true, 0.957, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001xgwvey156nv36', 'cmkalg69k000ogwstcme0itmh', 'StickyBomb', 4, true, 0.916, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001ygwveq5gudtnj', 'cmkalg69k000ogwstcme0itmh', 'GasMaskFilter', 3, true, 0.96, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0001zgwveae2mz03s', 'cmkalg69k000ogwstcme0itmh', 'LightTankAmmo', 3, true, 0.914, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek00020gwve0da4433f', 'cmkalg69k000ogwstcme0itmh', 'ShotgunAmmo', 2, true, 0.905, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek00021gwvehuo00qx6', 'cmkalg69k000ogwstcme0itmh', 'ShotgunC', 2, true, 0.91, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek00022gwveb1c3dm1w', 'cmkalg69k000ogwstcme0itmh', 'GasMask', 2, true, 0.916, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek00023gwvehscjxksi', 'cmkalg69k000ogwstcme0itmh', 'TruckResourceC', 4, false, 0.922, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek00024gwve95emo1qw', 'cmkalg69k000ogwstcme0itmh', 'FlatbedTruck', 3, false, 0.976, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek00025gwvej6500hqe', 'cmkalg69k000ogwstcme0itmh', 'TruckLiquidC', 2, false, 0.911, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek00026gwveqlax8kfb', 'cmkalg69k000ogwstcme0itmh', 'TruckC', 6, true, 0.874, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek00027gwveag41j72b', 'cmkalg69k000ogwstcme0itmh', 'FlatbedTruck', 5, true, 0.939, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek00028gwve4fqt5em0', 'cmkalg69k000ogwstcme0itmh', 'TruckResourceC', 3, true, 0.873, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek00029gwveli48c707', 'cmkalg69k000ogwstcme0itmh', 'ResourceContainer', 3, false, 0.947, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0002agwveyyiqwavc', 'cmkalg69k000ogwstcme0itmh', 'MaterialPlatform', 2, false, 0.867, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0002bgwvehlvzejb1', 'cmkalg69k000ogwstcme0itmh', 'ShippingContainer', 2, false, 0.929, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0002cgwve0a5pk20v', 'cmkalg69k000ogwstcme0itmh', 'ResourceContainer', 10, true, 0.967, '2026-01-12 23:52:32.304');
INSERT INTO public."StockpileItem" VALUES ('cmkbtiek0002dgwve7lzo14x1', 'cmkalg69k000ogwstcme0itmh', 'ShippingContainer', 5, true, 0.978, '2026-01-12 23:52:32.304');


--
-- Data for Name: VerificationToken; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- PostgreSQL database dump complete
--

\unrestrict wHdYsuAvFU0pWywcydnplaXVx0eF6V4ueyHDci40EcxQG765vFZNY5KOVinGwZK

