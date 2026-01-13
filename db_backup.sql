--
-- PostgreSQL database dump
--

\restrict LXs0xzycLoXPfuspsh382lP6rGzA0fcKR0HT1mY8lwhyQmNlLzjuV6tmGWVGS9G

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ItemCategory; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ItemCategory" AS ENUM (
    'SMALL_ARMS',
    'HEAVY_ARMS',
    'AMMUNITION',
    'UTILITY',
    'MEDICAL',
    'RESOURCES',
    'UNIFORMS',
    'VEHICLES',
    'STRUCTURES',
    'SUPPLIES'
);


ALTER TYPE public."ItemCategory" OWNER TO postgres;

--
-- Name: OperationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OperationStatus" AS ENUM (
    'PLANNING',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."OperationStatus" OWNER TO postgres;

--
-- Name: PermissionLevel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PermissionLevel" AS ENUM (
    'ADMIN',
    'EDITOR',
    'VIEWER'
);


ALTER TYPE public."PermissionLevel" OWNER TO postgres;

--
-- Name: StockpileType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."StockpileType" AS ENUM (
    'STORAGE_DEPOT',
    'SEAPORT'
);


ALTER TYPE public."StockpileType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


ALTER TABLE public."Account" OWNER TO postgres;

--
-- Name: Inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Inventory" (
    id text NOT NULL,
    "stockpileId" text NOT NULL,
    "itemId" text NOT NULL,
    quantity integer NOT NULL,
    "cratedQuantity" integer DEFAULT 0 NOT NULL,
    "lastScanId" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Inventory" OWNER TO postgres;

--
-- Name: Item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Item" (
    id text NOT NULL,
    "regimentId" text,
    "internalName" text NOT NULL,
    "displayName" text NOT NULL,
    category public."ItemCategory" NOT NULL,
    "iconUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Item" OWNER TO postgres;

--
-- Name: Operation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Operation" (
    id text NOT NULL,
    "regimentId" text NOT NULL,
    name text NOT NULL,
    description text,
    status public."OperationStatus" DEFAULT 'PLANNING'::public."OperationStatus" NOT NULL,
    "scheduledFor" timestamp(3) without time zone,
    location text,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "destinationStockpileId" text,
    "scheduledEndAt" timestamp(3) without time zone
);


ALTER TABLE public."Operation" OWNER TO postgres;

--
-- Name: OperationRequirement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."OperationRequirement" (
    id text NOT NULL,
    "operationId" text NOT NULL,
    quantity integer NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    "itemCode" text NOT NULL
);


ALTER TABLE public."OperationRequirement" OWNER TO postgres;

--
-- Name: Regiment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Regiment" (
    id text NOT NULL,
    "discordId" text NOT NULL,
    name text NOT NULL,
    icon text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "adminRoles" text[],
    "editorRoles" text[],
    "viewerRoles" text[]
);


ALTER TABLE public."Regiment" OWNER TO postgres;

--
-- Name: RegimentMember; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RegimentMember" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "regimentId" text NOT NULL,
    "permissionLevel" public."PermissionLevel" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RegimentMember" OWNER TO postgres;

--
-- Name: Session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Session" OWNER TO postgres;

--
-- Name: Stockpile; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Stockpile" (
    id text NOT NULL,
    "regimentId" text NOT NULL,
    name text NOT NULL,
    type public."StockpileType" NOT NULL,
    hex text NOT NULL,
    "locationName" text NOT NULL,
    code text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Stockpile" OWNER TO postgres;

--
-- Name: StockpileItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."StockpileItem" (
    id text NOT NULL,
    "stockpileId" text NOT NULL,
    "itemCode" text NOT NULL,
    quantity integer NOT NULL,
    crated boolean DEFAULT false NOT NULL,
    confidence double precision,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StockpileItem" OWNER TO postgres;

--
-- Name: StockpileScan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."StockpileScan" (
    id text NOT NULL,
    "stockpileId" text NOT NULL,
    "scannedById" text NOT NULL,
    "screenshotUrl" text,
    "ocrConfidence" double precision,
    "itemCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."StockpileScan" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "discordId" text,
    email text,
    "emailVerified" timestamp(3) without time zone,
    name text,
    image text,
    "selectedRegimentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: VerificationToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VerificationToken" (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VerificationToken" OWNER TO postgres;

--
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Account" (id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) FROM stdin;
cmkafsxxu0002gwst29sjva2o	cmkafsxxr0000gwst4fwoqfkj	oauth	discord	112967182752768000	AyPwjU7tK55XhSGVK1B7aLZUoKKaQI	MTQ1OTg2MjY3MzkzNTE3MTczMQ.o0tcCCkDoh575JgIST5EUC737BmQeu	1768783263	bearer	guilds.members.read identify email guilds	\N	\N
\.


--
-- Data for Name: Inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Inventory" (id, "stockpileId", "itemId", quantity, "cratedQuantity", "lastScanId", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Item" (id, "regimentId", "internalName", "displayName", category, "iconUrl", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Operation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Operation" (id, "regimentId", name, description, status, "scheduledFor", location, "createdById", "createdAt", "updatedAt", "destinationStockpileId", "scheduledEndAt") FROM stdin;
cmkardycl0004gwqxxcl7kexl	221807570682118144	Pushguns and ACs	Taking out ACs and 12.7 pushguns	PLANNING	2026-01-14 01:00:00	Deadlands	cmkafsxxr0000gwst4fwoqfkj	2026-01-12 06:05:19.27	2026-01-12 06:08:25.039	cmkalg69k000ogwstcme0itmh	2026-01-14 04:00:00
cmkarm0uu000ggwqxp5j3biqq	221807570682118144	Pushguns and ACs	Taking out pushguns and ACs	PLANNING	2026-01-14 01:00:00	Deadlands	cmkafsxxr0000gwst4fwoqfkj	2026-01-12 06:11:35.766	2026-01-12 06:11:46.955	cmkalg69k000ogwstcme0itmh	2026-01-14 05:00:00
\.


--
-- Data for Name: OperationRequirement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OperationRequirement" (id, "operationId", quantity, priority, "itemCode") FROM stdin;
cmkarhxoz000agwqx795yvdsj	cmkardycl0004gwqxxcl7kexl	250	3	MGAmmo
cmkarhxoz000bgwqxdejk03ly	cmkardycl0004gwqxxcl7kexl	6	3	ArmoredCarC
cmkarhxoz000cgwqxxwejf227	cmkardycl0004gwqxxcl7kexl	50	2	AssaultRifleAmmo
cmkarhxoz000dgwqxrffsd5mo	cmkardycl0004gwqxxcl7kexl	30	1	Binoculars
cmkarhxoz000egwqx4e9ofdly	cmkardycl0004gwqxxcl7kexl	20	1	Cloth
cmkarm9hq000ngwqxt3wr33kb	cmkarm0uu000ggwqxp5j3biqq	250	3	MGAmmo
cmkarm9hq000ogwqxpq7qddrf	cmkarm0uu000ggwqxp5j3biqq	6	3	ArmoredCarC
cmkarm9hq000pgwqxoxoqaxqf	cmkarm0uu000ggwqxp5j3biqq	30	2	Cloth
cmkarm9hq000qgwqx3flt88ac	cmkarm0uu000ggwqxp5j3biqq	20	1	Binoculars
cmkarm9hq000rgwqxdefrs76n	cmkarm0uu000ggwqxp5j3biqq	50	1	ATRifleAmmo
\.


--
-- Data for Name: Regiment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Regiment" (id, "discordId", name, icon, "createdAt", "updatedAt", "adminRoles", "editorRoles", "viewerRoles") FROM stdin;
cmk9v0ovq0003gwk5rfw9eoe7	221807570682118144	Metroshica	\N	2026-01-11 14:59:12.759	2026-01-11 14:59:12.759	{}	{}	{}
\.


--
-- Data for Name: RegimentMember; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RegimentMember" (id, "userId", "regimentId", "permissionLevel", "createdAt", "updatedAt") FROM stdin;
cmkaft8480004gwst7xhaj51x	cmkafsxxr0000gwst4fwoqfkj	221807570682118144	ADMIN	2026-01-12 00:41:16.377	2026-01-12 00:41:16.377
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Session" (id, "sessionToken", "userId", expires) FROM stdin;
\.


--
-- Data for Name: Stockpile; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Stockpile" (id, "regimentId", name, type, hex, "locationName", code, "createdAt", "updatedAt") FROM stdin;
cmkaljajr001hgwst5bpxh8b7	221807570682118144	18th-KCO1	STORAGE_DEPOT	King's Cage	Gibbet Fields	\N	2026-01-12 03:21:30.664	2026-01-12 16:34:57.659
cmkallagu001qgwstelprsex3	221807570682118144	18th PUB	STORAGE_DEPOT	The Heartlands	The Blemish	\N	2026-01-12 03:23:03.871	2026-01-12 16:35:24.776
cmkalelj7000igwstsz13m68n	221807570682118144	18thPUB	STORAGE_DEPOT	Origin	Teichotima	\N	2026-01-12 03:17:51.62	2026-01-12 16:35:46.738
cmkaldoen0005gwstdy8dx74s	221807570682118144	18th-ACO1	SEAPORT	Ash Fields	Ashtown	\N	2026-01-12 03:17:08.687	2026-01-12 23:51:47.846
cmkalg69k000ogwstcme0itmh	221807570682118144	18th-GM01	STORAGE_DEPOT	Great March	Sitaria	\N	2026-01-12 03:19:05.144	2026-01-12 23:52:32.299
\.


--
-- Data for Name: StockpileItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."StockpileItem" (id, "stockpileId", "itemCode", quantity, crated, confidence, "updatedAt") FROM stdin;
cmkbdwq7q001tgwdsq40bqasp	cmkalelj7000igwstsz13m68n	SoldierSupplies	0	t	0.939	2026-01-12 16:35:46.742
cmkbdwq7q001ugwds1ro1p2ua	cmkalelj7000igwstsz13m68n	MaintenanceSupplies	0	t	0.968	2026-01-12 16:35:46.742
cmkbdwq7q001vgwdsprlodvci	cmkalelj7000igwstsz13m68n	ArmoredCarC	6	f	0.88	2026-01-12 16:35:46.742
cmkbdwq7q001wgwdsflbr9abo	cmkalelj7000igwstsz13m68n	FieldMGC	6	f	0.931	2026-01-12 16:35:46.742
cmkbdwq7q001xgwds85ry8ii4	cmkalelj7000igwstsz13m68n	TruckC	1	f	0.882	2026-01-12 16:35:46.742
cmkbdwq7q001ygwdsswmwo3yg	cmkalelj7000igwstsz13m68n	ArmoredCarTwinC	1	f	0.896	2026-01-12 16:35:46.742
cmkbdw99n001ngwdsi5beoj4i	cmkallagu001qgwstelprsex3	SoldierSupplies	0	t	0.939	2026-01-12 16:35:24.779
cmkbdw99n001ogwdsijknk5uj	cmkallagu001qgwstelprsex3	MaintenanceSupplies	0	t	0.968	2026-01-12 16:35:24.779
cmkbdw99n001pgwds6sh7fc04	cmkallagu001qgwstelprsex3	FlatbedTruck	1	f	0.889	2026-01-12 16:35:24.779
cmkbdw99n001qgwdsy55kg2cv	cmkallagu001qgwstelprsex3	TruckResourceC	1	f	0.941	2026-01-12 16:35:24.779
cmkbthg980000gwvevrmgotc7	cmkaldoen0005gwstdy8dx74s	SoldierSupplies	15	t	0.939	2026-01-12 23:51:47.853
cmkbthg980001gwvequ2q2iea	cmkaldoen0005gwstdy8dx74s	MaintenanceSupplies	0	t	0.968	2026-01-12 23:51:47.853
cmkbthg980002gwvey2c94cdh	cmkaldoen0005gwstdy8dx74s	BarbedWireMaterials	97	t	0.841	2026-01-12 23:51:47.853
cmkbthg980003gwvephxqpvfd	cmkaldoen0005gwstdy8dx74s	SandbagMaterials	77	t	0.976	2026-01-12 23:51:47.853
cmkbthg980004gwveuyt5r9al	cmkaldoen0005gwstdy8dx74s	Explosive	27	t	0.944	2026-01-12 23:51:47.853
cmkbthg980005gwvecurjsukm	cmkaldoen0005gwstdy8dx74s	ShotgunC	25	t	0.859	2026-01-12 23:51:47.853
cmkbthg980006gwvekb8dindm	cmkaldoen0005gwstdy8dx74s	ShotgunAmmo	18	t	0.945	2026-01-12 23:51:47.853
cmkbthg980007gwvesyig1w8e	cmkaldoen0005gwstdy8dx74s	Wood	12	t	0.945	2026-01-12 23:51:47.853
cmkbthg980008gwvez24xee9q	cmkaldoen0005gwstdy8dx74s	FacilityMaterials1	9	t	0.93	2026-01-12 23:51:47.853
cmkbthg980009gwvez7p70xdx	cmkaldoen0005gwstdy8dx74s	RifleC	8	t	0.865	2026-01-12 23:51:47.853
cmkbthg98000agwve18rt8kii	cmkaldoen0005gwstdy8dx74s	RifleAmmo	8	t	0.91	2026-01-12 23:51:47.853
cmkbthg98000bgwveq3lld6y6	cmkaldoen0005gwstdy8dx74s	TraumaKit	6	t	0.96	2026-01-12 23:51:47.853
cmkbthg98000cgwvejavdf7do	cmkaldoen0005gwstdy8dx74s	Shovel	5	t	0.925	2026-01-12 23:51:47.853
cmkbthg98000dgwvevam77irq	cmkaldoen0005gwstdy8dx74s	Diesel	5	t	0.922	2026-01-12 23:51:47.853
cmkbthg98000egwveuk8ovvgv	cmkaldoen0005gwstdy8dx74s	EngineerUniformC	5	t	0.953	2026-01-12 23:51:47.853
cmkbthg98000fgwveu566vu7a	cmkaldoen0005gwstdy8dx74s	FirstAidKit	4	t	0.931	2026-01-12 23:51:47.853
cmkbthg99000ggwvebrroeayz	cmkaldoen0005gwstdy8dx74s	Bandages	4	t	0.92	2026-01-12 23:51:47.853
cmkbthg99000hgwvezfdmxxcu	cmkaldoen0005gwstdy8dx74s	BloodPlasma	4	t	0.9	2026-01-12 23:51:47.853
cmkbthg99000igwve859drr67	cmkaldoen0005gwstdy8dx74s	RevolverAmmo	4	t	0.894	2026-01-12 23:51:47.853
cmkbthg99000jgwvezsvt7akm	cmkaldoen0005gwstdy8dx74s	GasMaskFilter	4	t	0.904	2026-01-12 23:51:47.853
cmkbthg99000kgwvegud831hy	cmkaldoen0005gwstdy8dx74s	GasMask	4	t	0.949	2026-01-12 23:51:47.853
cmkbthg99000lgwvebptrefp6	cmkaldoen0005gwstdy8dx74s	GreenAsh	3	t	0.932	2026-01-12 23:51:47.853
cmkbthg99000mgwves0vpm6un	cmkaldoen0005gwstdy8dx74s	ScoutUniformC	2	t	0.91	2026-01-12 23:51:47.853
cmkbthg99000ngwvec1xruw8m	cmkaldoen0005gwstdy8dx74s	Binoculars	2	t	0.97	2026-01-12 23:51:47.853
cmkbthg99000ogwvewu7zhku3	cmkaldoen0005gwstdy8dx74s	RifleHeavyC	2	t	0.796	2026-01-12 23:51:47.853
cmkbthg99000pgwvea8pe8wuv	cmkaldoen0005gwstdy8dx74s	Tripod	2	t	0.858	2026-01-12 23:51:47.853
cmkbthg99000qgwvejmxzm1ra	cmkaldoen0005gwstdy8dx74s	Radio	2	t	0.927	2026-01-12 23:51:47.853
cmkbthg99000rgwvehqksl4um	cmkaldoen0005gwstdy8dx74s	MedicUniformC	2	t	0.897	2026-01-12 23:51:47.853
cmkbthg99000sgwvevvrqjinl	cmkaldoen0005gwstdy8dx74s	Revolver	2	t	0.868	2026-01-12 23:51:47.853
cmkbthg99000tgwve9wojurcu	cmkaldoen0005gwstdy8dx74s	MGAmmo	2	t	0.959	2026-01-12 23:51:47.853
cmkbthg99000ugwvet2bh9n4d	cmkaldoen0005gwstdy8dx74s	StickyBomb	1	t	0.915	2026-01-12 23:51:47.853
cmkbthg99000vgwved1bxpfqq	cmkaldoen0005gwstdy8dx74s	SnowUniformC	1	t	0.903	2026-01-12 23:51:47.853
cmkbthg99000wgwve15nfm80w	cmkaldoen0005gwstdy8dx74s	HEGrenade	1	t	0.938	2026-01-12 23:51:47.853
cmkbthg99000xgwvebqocaxie	cmkaldoen0005gwstdy8dx74s	ArmourUniformC	1	t	0.914	2026-01-12 23:51:47.853
cmkbthg99000ygwve46i3jt7l	cmkaldoen0005gwstdy8dx74s	Bayonet	1	t	0.908	2026-01-12 23:51:47.853
cmkbthg99000zgwveudz69uop	cmkaldoen0005gwstdy8dx74s	OfficerUniformC	1	t	0.941	2026-01-12 23:51:47.853
cmkbthg990010gwve6a7mlc6h	cmkaldoen0005gwstdy8dx74s	ATRifleAmmo	1	t	0.908	2026-01-12 23:51:47.853
cmkbthg990011gwve8zd04ivr	cmkaldoen0005gwstdy8dx74s	WorkWrench	1	t	0.957	2026-01-12 23:51:47.853
cmkbthg990012gwve9umn71oq	cmkaldoen0005gwstdy8dx74s	SMGAmmo	1	t	0.944	2026-01-12 23:51:47.853
cmkbthg990013gwveijf5lael	cmkaldoen0005gwstdy8dx74s	RainUniformC	1	t	0.918	2026-01-12 23:51:47.853
cmkbthg990014gwvekl5z3ozg	cmkaldoen0005gwstdy8dx74s	SMGC	1	t	0.871	2026-01-12 23:51:47.853
cmkbthg990015gwve2kg058m0	cmkaldoen0005gwstdy8dx74s	Freighter	3	f	0.944	2026-01-12 23:51:47.853
cmkbthg990016gwvejzz5l3pj	cmkaldoen0005gwstdy8dx74s	FlatbedTruck	3	f	0.976	2026-01-12 23:51:47.853
cmkbthg990017gwve4s4uopa5	cmkaldoen0005gwstdy8dx74s	ScoutVehicleMobilityC	2	f	0.924	2026-01-12 23:51:47.853
cmkbthg990018gwvexwlhijlr	cmkaldoen0005gwstdy8dx74s	TruckMobilityC	1	f	0.938	2026-01-12 23:51:47.853
cmkbthg990019gwvemargjotc	cmkaldoen0005gwstdy8dx74s	TruckResourceC	1	f	0.978	2026-01-12 23:51:47.853
cmkbthg99001agwvewmkk3fyc	cmkaldoen0005gwstdy8dx74s	Freighter	4	t	0.899	2026-01-12 23:51:47.853
cmkbthg99001bgwvewslweoy2	cmkaldoen0005gwstdy8dx74s	ArmoredCarC	4	t	0.936	2026-01-12 23:51:47.853
cmkbthg99001cgwveolhl8xpq	cmkaldoen0005gwstdy8dx74s	ResourceContainer	9	f	0.947	2026-01-12 23:51:47.853
cmkbthg99001dgwvet44jsun1	cmkaldoen0005gwstdy8dx74s	ResourceContainer	2	t	0.968	2026-01-12 23:51:47.853
cmkbdvocf001cgwdsqa8n1xbc	cmkaljajr001hgwst5bpxh8b7	SoldierSupplies	0	t	0.939	2026-01-12 16:34:57.663
cmkbdvocf001dgwdspd0cjbdi	cmkaljajr001hgwst5bpxh8b7	MaintenanceSupplies	0	t	0.968	2026-01-12 16:34:57.663
cmkbdvocf001egwdszzlt5cqi	cmkaljajr001hgwst5bpxh8b7	MGAmmo	50	t	0.915	2026-01-12 16:34:57.663
cmkbdvocf001fgwdsp5ruxfzz	cmkaljajr001hgwst5bpxh8b7	AssaultRifleAmmo	50	t	0.933	2026-01-12 16:34:57.663
cmkbdvocf001ggwdsf5pe4l5y	cmkaljajr001hgwst5bpxh8b7	HEGrenade	50	t	0.928	2026-01-12 16:34:57.663
cmkbdvocf001hgwdszc3v1m55	cmkaljajr001hgwst5bpxh8b7	RpgAmmo	45	t	0.917	2026-01-12 16:34:57.663
cmkbdvocf001igwdscpm0qhc6	cmkaljajr001hgwst5bpxh8b7	ATRifleAmmo	45	t	0.946	2026-01-12 16:34:57.663
cmkbdvocf001jgwds9h7cutvw	cmkaljajr001hgwst5bpxh8b7	FlatbedTruck	2	f	0.92	2026-01-12 16:34:57.663
cmkbdvocf001kgwdsrrh6nd41	cmkaljajr001hgwst5bpxh8b7	ShippingContainer	4	f	0.928	2026-01-12 16:34:57.663
cmkbtiek0001ggwve8dfze85p	cmkalg69k000ogwstcme0itmh	SoldierSupplies	20	t	0.939	2026-01-12 23:52:32.304
cmkbtiek0001hgwvewibugg7a	cmkalg69k000ogwstcme0itmh	MaintenanceSupplies	20	t	0.968	2026-01-12 23:52:32.304
cmkbtiek0001igwveyapvistn	cmkalg69k000ogwstcme0itmh	Cloth	65	t	0.942	2026-01-12 23:52:32.304
cmkbtiek0001jgwvehgadhbn2	cmkalg69k000ogwstcme0itmh	ATRifleAmmo	48	t	0.946	2026-01-12 23:52:32.304
cmkbtiek0001kgwve3n8k8qfn	cmkalg69k000ogwstcme0itmh	MGAmmo	46	t	0.915	2026-01-12 23:52:32.304
cmkbtiek0001lgwvex7i0l53i	cmkalg69k000ogwstcme0itmh	Explosive	38	t	0.944	2026-01-12 23:52:32.304
cmkbtiek0001mgwve4kb0k469	cmkalg69k000ogwstcme0itmh	RifleC	38	t	0.917	2026-01-12 23:52:32.304
cmkbtiek0001ngwvepmxkdsky	cmkalg69k000ogwstcme0itmh	RifleAmmo	25	t	0.91	2026-01-12 23:52:32.304
cmkbtiek0001ogwveeemg3kq0	cmkalg69k000ogwstcme0itmh	Bandages	21	t	0.921	2026-01-12 23:52:32.304
cmkbtiek0001pgwve8f74ncv3	cmkalg69k000ogwstcme0itmh	Radio	16	t	0.927	2026-01-12 23:52:32.304
cmkbtiek0001qgwve51la976j	cmkalg69k000ogwstcme0itmh	MedicUniformC	16	t	0.897	2026-01-12 23:52:32.304
cmkbtiek0001rgwve4lr85ajw	cmkalg69k000ogwstcme0itmh	HEGrenade	9	t	0.928	2026-01-12 23:52:32.304
cmkbtiek0001sgwve7lhxxwzf	cmkalg69k000ogwstcme0itmh	LightArtilleryAmmo	9	t	0.942	2026-01-12 23:52:32.304
cmkbtiek0001tgwveyme4xufw	cmkalg69k000ogwstcme0itmh	Binoculars	8	t	0.937	2026-01-12 23:52:32.304
cmkbtiek0001ugwvek6yrd8xy	cmkalg69k000ogwstcme0itmh	ArmourUniformC	7	t	0.914	2026-01-12 23:52:32.304
cmkbtiek0001vgwvef9t46ast	cmkalg69k000ogwstcme0itmh	SwordC	7	t	0.936	2026-01-12 23:52:32.304
cmkbtiek0001wgwveeabqtl1o	cmkalg69k000ogwstcme0itmh	WorkWrench	5	t	0.957	2026-01-12 23:52:32.304
cmkbtiek0001xgwvey156nv36	cmkalg69k000ogwstcme0itmh	StickyBomb	4	t	0.916	2026-01-12 23:52:32.304
cmkbtiek0001ygwveq5gudtnj	cmkalg69k000ogwstcme0itmh	GasMaskFilter	3	t	0.96	2026-01-12 23:52:32.304
cmkbtiek0001zgwveae2mz03s	cmkalg69k000ogwstcme0itmh	LightTankAmmo	3	t	0.914	2026-01-12 23:52:32.304
cmkbtiek00020gwve0da4433f	cmkalg69k000ogwstcme0itmh	ShotgunAmmo	2	t	0.905	2026-01-12 23:52:32.304
cmkbtiek00021gwvehuo00qx6	cmkalg69k000ogwstcme0itmh	ShotgunC	2	t	0.91	2026-01-12 23:52:32.304
cmkbtiek00022gwveb1c3dm1w	cmkalg69k000ogwstcme0itmh	GasMask	2	t	0.916	2026-01-12 23:52:32.304
cmkbtiek00023gwvehscjxksi	cmkalg69k000ogwstcme0itmh	TruckResourceC	4	f	0.922	2026-01-12 23:52:32.304
cmkbtiek00024gwve95emo1qw	cmkalg69k000ogwstcme0itmh	FlatbedTruck	3	f	0.976	2026-01-12 23:52:32.304
cmkbtiek00025gwvej6500hqe	cmkalg69k000ogwstcme0itmh	TruckLiquidC	2	f	0.911	2026-01-12 23:52:32.304
cmkbtiek00026gwveqlax8kfb	cmkalg69k000ogwstcme0itmh	TruckC	6	t	0.874	2026-01-12 23:52:32.304
cmkbtiek00027gwveag41j72b	cmkalg69k000ogwstcme0itmh	FlatbedTruck	5	t	0.939	2026-01-12 23:52:32.304
cmkbtiek00028gwve4fqt5em0	cmkalg69k000ogwstcme0itmh	TruckResourceC	3	t	0.873	2026-01-12 23:52:32.304
cmkbtiek00029gwveli48c707	cmkalg69k000ogwstcme0itmh	ResourceContainer	3	f	0.947	2026-01-12 23:52:32.304
cmkbtiek0002agwveyyiqwavc	cmkalg69k000ogwstcme0itmh	MaterialPlatform	2	f	0.867	2026-01-12 23:52:32.304
cmkbtiek0002bgwvehlvzejb1	cmkalg69k000ogwstcme0itmh	ShippingContainer	2	f	0.929	2026-01-12 23:52:32.304
cmkbtiek0002cgwve0a5pk20v	cmkalg69k000ogwstcme0itmh	ResourceContainer	10	t	0.967	2026-01-12 23:52:32.304
cmkbtiek0002dgwve7lzo14x1	cmkalg69k000ogwstcme0itmh	ShippingContainer	5	t	0.978	2026-01-12 23:52:32.304
\.


--
-- Data for Name: StockpileScan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."StockpileScan" (id, "stockpileId", "scannedById", "screenshotUrl", "ocrConfidence", "itemCount", "createdAt") FROM stdin;
cmkaqfhz200a1gwy7nt8bvk5q	cmkalg69k000ogwstcme0itmh	cmkafsxxr0000gwst4fwoqfkj	\N	0.9273333333333333	30	2026-01-12 05:38:31.743
cmkbdum89000ygwds53xmen88	cmkalg69k000ogwstcme0itmh	cmkafsxxr0000gwst4fwoqfkj	\N	0.9283333333333335	33	2026-01-12 16:34:08.265
cmkbdv6g3001bgwds8tyv986h	cmkaldoen0005gwstdy8dx74s	cmkafsxxr0000gwst4fwoqfkj	\N	0.9424545454545453	11	2026-01-12 16:34:34.467
cmkbdvoch001mgwds41nwd0qv	cmkaljajr001hgwst5bpxh8b7	cmkafsxxr0000gwst4fwoqfkj	\N	0.9326666666666666	9	2026-01-12 16:34:57.665
cmkbdw99o001sgwds3bb12348	cmkallagu001qgwstelprsex3	cmkafsxxr0000gwst4fwoqfkj	\N	0.93425	4	2026-01-12 16:35:24.781
cmkbdwq7s0020gwds0llerdmh	cmkalelj7000igwstsz13m68n	cmkafsxxr0000gwst4fwoqfkj	\N	0.9159999999999999	6	2026-01-12 16:35:46.744
cmkbthg9e001fgwve4jappzyl	cmkaldoen0005gwstdy8dx74s	cmkafsxxr0000gwst4fwoqfkj	\N	0.9224800000000002	50	2026-01-12 23:51:47.859
cmkbtiek5002fgwve6zsgombc	cmkalg69k000ogwstcme0itmh	cmkafsxxr0000gwst4fwoqfkj	\N	0.927764705882353	34	2026-01-12 23:52:32.31
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, "discordId", email, "emailVerified", name, image, "selectedRegimentId", "createdAt", "updatedAt") FROM stdin;
cmkafsxxr0000gwst4fwoqfkj	112967182752768000	landonwo@gmail.com	\N	metroshica	https://cdn.discordapp.com/avatars/112967182752768000/6d175337fd9dc73e9fd75afdb5260fd0.png	221807570682118144	2026-01-12 00:41:03.183	2026-01-12 23:50:12.135
\.


--
-- Data for Name: VerificationToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VerificationToken" (identifier, token, expires) FROM stdin;
\.


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: Inventory Inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Inventory"
    ADD CONSTRAINT "Inventory_pkey" PRIMARY KEY (id);


--
-- Name: Item Item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Item"
    ADD CONSTRAINT "Item_pkey" PRIMARY KEY (id);


--
-- Name: OperationRequirement OperationRequirement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OperationRequirement"
    ADD CONSTRAINT "OperationRequirement_pkey" PRIMARY KEY (id);


--
-- Name: Operation Operation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Operation"
    ADD CONSTRAINT "Operation_pkey" PRIMARY KEY (id);


--
-- Name: RegimentMember RegimentMember_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RegimentMember"
    ADD CONSTRAINT "RegimentMember_pkey" PRIMARY KEY (id);


--
-- Name: Regiment Regiment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Regiment"
    ADD CONSTRAINT "Regiment_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: StockpileItem StockpileItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StockpileItem"
    ADD CONSTRAINT "StockpileItem_pkey" PRIMARY KEY (id);


--
-- Name: StockpileScan StockpileScan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StockpileScan"
    ADD CONSTRAINT "StockpileScan_pkey" PRIMARY KEY (id);


--
-- Name: Stockpile Stockpile_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Stockpile"
    ADD CONSTRAINT "Stockpile_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");


--
-- Name: Account_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Account_userId_idx" ON public."Account" USING btree ("userId");


--
-- Name: Inventory_itemId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Inventory_itemId_idx" ON public."Inventory" USING btree ("itemId");


--
-- Name: Inventory_stockpileId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Inventory_stockpileId_idx" ON public."Inventory" USING btree ("stockpileId");


--
-- Name: Inventory_stockpileId_itemId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Inventory_stockpileId_itemId_key" ON public."Inventory" USING btree ("stockpileId", "itemId");


--
-- Name: Item_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Item_category_idx" ON public."Item" USING btree (category);


--
-- Name: Item_internalName_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Item_internalName_idx" ON public."Item" USING btree ("internalName");


--
-- Name: Item_regimentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Item_regimentId_idx" ON public."Item" USING btree ("regimentId");


--
-- Name: Item_regimentId_internalName_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Item_regimentId_internalName_key" ON public."Item" USING btree ("regimentId", "internalName");


--
-- Name: OperationRequirement_itemCode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "OperationRequirement_itemCode_idx" ON public."OperationRequirement" USING btree ("itemCode");


--
-- Name: OperationRequirement_operationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "OperationRequirement_operationId_idx" ON public."OperationRequirement" USING btree ("operationId");


--
-- Name: OperationRequirement_operationId_itemCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "OperationRequirement_operationId_itemCode_key" ON public."OperationRequirement" USING btree ("operationId", "itemCode");


--
-- Name: Operation_createdById_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Operation_createdById_idx" ON public."Operation" USING btree ("createdById");


--
-- Name: Operation_destinationStockpileId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Operation_destinationStockpileId_idx" ON public."Operation" USING btree ("destinationStockpileId");


--
-- Name: Operation_regimentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Operation_regimentId_idx" ON public."Operation" USING btree ("regimentId");


--
-- Name: Operation_scheduledFor_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Operation_scheduledFor_idx" ON public."Operation" USING btree ("scheduledFor");


--
-- Name: Operation_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Operation_status_idx" ON public."Operation" USING btree (status);


--
-- Name: RegimentMember_regimentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RegimentMember_regimentId_idx" ON public."RegimentMember" USING btree ("regimentId");


--
-- Name: RegimentMember_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RegimentMember_userId_idx" ON public."RegimentMember" USING btree ("userId");


--
-- Name: RegimentMember_userId_regimentId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RegimentMember_userId_regimentId_key" ON public."RegimentMember" USING btree ("userId", "regimentId");


--
-- Name: Regiment_discordId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Regiment_discordId_idx" ON public."Regiment" USING btree ("discordId");


--
-- Name: Regiment_discordId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Regiment_discordId_key" ON public."Regiment" USING btree ("discordId");


--
-- Name: Session_sessionToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Session_sessionToken_key" ON public."Session" USING btree ("sessionToken");


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: StockpileItem_itemCode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "StockpileItem_itemCode_idx" ON public."StockpileItem" USING btree ("itemCode");


--
-- Name: StockpileItem_stockpileId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "StockpileItem_stockpileId_idx" ON public."StockpileItem" USING btree ("stockpileId");


--
-- Name: StockpileItem_stockpileId_itemCode_crated_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "StockpileItem_stockpileId_itemCode_crated_key" ON public."StockpileItem" USING btree ("stockpileId", "itemCode", crated);


--
-- Name: StockpileScan_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "StockpileScan_createdAt_idx" ON public."StockpileScan" USING btree ("createdAt");


--
-- Name: StockpileScan_scannedById_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "StockpileScan_scannedById_idx" ON public."StockpileScan" USING btree ("scannedById");


--
-- Name: StockpileScan_stockpileId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "StockpileScan_stockpileId_idx" ON public."StockpileScan" USING btree ("stockpileId");


--
-- Name: Stockpile_hex_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Stockpile_hex_idx" ON public."Stockpile" USING btree (hex);


--
-- Name: Stockpile_regimentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Stockpile_regimentId_idx" ON public."Stockpile" USING btree ("regimentId");


--
-- Name: Stockpile_regimentId_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Stockpile_regimentId_name_key" ON public."Stockpile" USING btree ("regimentId", name);


--
-- Name: User_discordId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_discordId_idx" ON public."User" USING btree ("discordId");


--
-- Name: User_discordId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_discordId_key" ON public."User" USING btree ("discordId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_selectedRegimentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_selectedRegimentId_idx" ON public."User" USING btree ("selectedRegimentId");


--
-- Name: VerificationToken_identifier_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON public."VerificationToken" USING btree (identifier, token);


--
-- Name: VerificationToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "VerificationToken_token_key" ON public."VerificationToken" USING btree (token);


--
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Inventory Inventory_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Inventory"
    ADD CONSTRAINT "Inventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."Item"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Inventory Inventory_lastScanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Inventory"
    ADD CONSTRAINT "Inventory_lastScanId_fkey" FOREIGN KEY ("lastScanId") REFERENCES public."StockpileScan"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Inventory Inventory_stockpileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Inventory"
    ADD CONSTRAINT "Inventory_stockpileId_fkey" FOREIGN KEY ("stockpileId") REFERENCES public."Stockpile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Item Item_regimentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Item"
    ADD CONSTRAINT "Item_regimentId_fkey" FOREIGN KEY ("regimentId") REFERENCES public."Regiment"("discordId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OperationRequirement OperationRequirement_operationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OperationRequirement"
    ADD CONSTRAINT "OperationRequirement_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES public."Operation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Operation Operation_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Operation"
    ADD CONSTRAINT "Operation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Operation Operation_destinationStockpileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Operation"
    ADD CONSTRAINT "Operation_destinationStockpileId_fkey" FOREIGN KEY ("destinationStockpileId") REFERENCES public."Stockpile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Operation Operation_regimentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Operation"
    ADD CONSTRAINT "Operation_regimentId_fkey" FOREIGN KEY ("regimentId") REFERENCES public."Regiment"("discordId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RegimentMember RegimentMember_regimentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RegimentMember"
    ADD CONSTRAINT "RegimentMember_regimentId_fkey" FOREIGN KEY ("regimentId") REFERENCES public."Regiment"("discordId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RegimentMember RegimentMember_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RegimentMember"
    ADD CONSTRAINT "RegimentMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockpileItem StockpileItem_stockpileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StockpileItem"
    ADD CONSTRAINT "StockpileItem_stockpileId_fkey" FOREIGN KEY ("stockpileId") REFERENCES public."Stockpile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockpileScan StockpileScan_scannedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StockpileScan"
    ADD CONSTRAINT "StockpileScan_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockpileScan StockpileScan_stockpileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StockpileScan"
    ADD CONSTRAINT "StockpileScan_stockpileId_fkey" FOREIGN KEY ("stockpileId") REFERENCES public."Stockpile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict LXs0xzycLoXPfuspsh382lP6rGzA0fcKR0HT1mY8lwhyQmNlLzjuV6tmGWVGS9G

