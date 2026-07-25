const asset = (name) => `${import.meta.env.BASE_URL}images/${name}`

const galleryImage = (id, file, caption, credit, license, sourceUrl) => ({
  id,
  src: asset(file),
  caption,
  credit,
  license,
  sourceUrl,
})

export const statusLabels = {
  included: 'Include',
  maybe: 'Maybe',
  excluded: 'Exclude',
}

export const seedIdeas = [
  {
    id: 'perth', name: 'Perth pause', region: 'Western Australia',
    summary: 'Kings Park, Fremantle and an easy arrival day.', days: 2, status: 'included', color: 'green',
    image: asset('perth.jpg'), coordinates: [115.8605, -31.9505], mapLabel: 'Perth',
    highlights: ['Kings Park at sunset', 'Fremantle food and heritage', 'Keep the city stay deliberately brief'],
    note: 'Useful as a first-night landing and a buffer before or after the South West drive.',
    tradeoffs: 'Extra Perth nights make the long-haul arrival gentler, but compete directly with the South West road trip.',
    season: 'Late October is spring: generally mild, with longer daylight and some chance of showers.',
    rationale: 'Two nights gives one recovery day and one useful city day without turning Perth into the main event.',
    gallery: [galleryImage('perth-skyline', 'perth.jpg', 'Perth skyline', 'Robert Young', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Perth_skyline.jpg')],
  },
  {
    id: 'margaret-river', name: 'Margaret River & the Capes', region: 'South West WA',
    summary: 'Busselton, Yallingup, caves, coast, wine and food.', days: 5, status: 'included', color: 'ochre',
    image: asset('boranup-forest.jpg'), coordinates: [115.073, -33.953], mapLabel: 'Margaret River',
    highlights: ['Cape Naturaliste coast', 'Margaret River food and wine', 'Caves and spring wildflowers'],
    note: 'Five days is comfortable without trying to tick off every beach and winery.',
    tradeoffs: 'A single base is easy; two bases reduce backtracking but add a packing day.',
    season: 'Spring suits coastal walks and wildflowers, though ocean weather can turn quickly.',
    rationale: 'Five nights leaves room for a weather-led coast day, a food-and-wine day and the caves without rushing.',
    gallery: [
      galleryImage('boranup', 'boranup-forest.jpg', 'Karri forest at Boranup', 'Paulkyranc', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Karri_trees_-_Boranup_Forest_01.jpg'),
      galleryImage('margaret-coast', 'margaret-river.jpg', 'Indian Ocean coast near Margaret River', 'Wikimedia Commons contributor', 'See source page', 'https://commons.wikimedia.org/wiki/File:2016_Margaret_River_Australia_-_indian_ocean.jpg'),
    ],
  },
  {
    id: 'southern-forests', name: 'Southern Forests & Albany', region: 'South West WA',
    summary: 'Karri forest, Pemberton, Denmark and the Great Southern coast.', days: 4, status: 'included', color: 'ochre',
    image: asset('albany-coast.jpg'), coordinates: [117.8839, -35.0248], mapLabel: 'Albany',
    highlights: ['Giant karri forest', 'Greens Pool and Elephant Rocks', 'Albany’s rugged coast'],
    note: 'This makes the South West feel like a journey rather than a Margaret River out-and-back.',
    tradeoffs: 'The one-way shape is rewarding, but car-return costs and the long Albany–Perth leg need checking.',
    season: 'Cooler and windier than Perth; build in a flexible coast day.',
    rationale: 'Four nights supports two bases or a slow scenic progression through Pemberton, Denmark and Albany.',
    gallery: [
      galleryImage('albany-coast', 'albany-coast.jpg', 'Coast near Albany', 'CSIRO', 'CC BY 3.0', 'https://commons.wikimedia.org/wiki/File:CSIRO_ScienceImage_2482_Coast_near_Albany_Western_Australia.jpg'),
      galleryImage('southern-karri', 'boranup-forest.jpg', 'Karri forest character', 'Paulkyranc', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Karri_trees_-_Boranup_Forest_01.jpg'),
    ],
  },
  {
    id: 'esperance', name: 'Esperance extension', region: 'Western Australia',
    summary: 'Cape Le Grand beaches and a long overland commitment.', days: 4, status: 'maybe', color: 'blue',
    image: asset('lucky-bay.jpg'), coordinates: [121.888, -33.861], mapLabel: 'Esperance',
    highlights: ['Cape Le Grand', 'Lucky Bay', 'Beautiful, but adds substantial road time'],
    note: 'Worth comparing against Tasmania: it reduces flying but makes the WA road trip much longer.',
    tradeoffs: 'The scenery is exceptional; the cost is roughly two demanding transit days unless you fly one leg.',
    season: 'Spring is attractive but exposed beaches can still be cool and windy.',
    rationale: 'Four nights is a minimum sensible module once the long approaches are counted separately.',
    gallery: [galleryImage('lucky-bay', 'lucky-bay.jpg', 'Lucky Bay, Cape Le Grand National Park', 'DaHuzyBru', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Lucky_Bay,_Cape_Le_Grand_National_Park,_January_2025_01.jpg')],
  },
  {
    id: 'tas-hobart', name: 'Hobart & Tasman Peninsula', region: 'Tasmania',
    summary: 'Salamanca, kunanyi and the peninsula’s sea cliffs.', days: 3, status: 'included', color: 'violet',
    image: asset('tas-hobart-salamanca.jpg'), coordinates: [147.3272, -42.8821], mapLabel: 'Hobart',
    highlights: ['Battery Point & Salamanca', 'kunanyi / Mount Wellington', 'Tasman Arch, Remarkable Cave and Tessellated Pavement'],
    timestamps: ['00:01:43', '00:02:20', '00:03:45', '00:36:46', '00:38:44'],
    note: 'Source notes suggest a compact city stay plus a full Tasman Peninsula day.',
    tradeoffs: 'Three nights is efficient, but MONA or a slower Bruny Island day would justify extending it.',
    season: 'November can deliver four seasons in a day; kunanyi may be much colder than the waterfront.',
    rationale: 'Three nights gives Hobart an arrival afternoon, a city day and a full peninsula day.',
    gallery: [
      galleryImage('hobart-salamanca', 'tas-hobart-salamanca.jpg', 'Salamanca Place with kunanyi / Mount Wellington behind', 'Cheng Fei', 'CC BY-SA 2.0', 'https://commons.wikimedia.org/wiki/File:Hobart_Tasmania_Salamanca_Place.jpg'),
      galleryImage('cape-huay', 'tasman-cliffs.jpg', 'Sea cliffs at Cape Huay, Tasman National Park', 'Mooonrise', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:The_spectacular_sea_cliffs_of_Cape_Huay,_Tasman_National_Park,_Tasmania.jpg'),
    ],
  },
  {
    id: 'tas-east', name: 'Freycinet & Bay of Fires', region: 'Tasmania',
    summary: 'Wineglass Bay, Bicheno and orange-boulder beaches.', days: 4, status: 'included', color: 'violet',
    image: asset('wineglass-bay.jpg'), coordinates: [148.287, -42.123], mapLabel: 'Freycinet',
    highlights: ['Wineglass Bay Lookout', 'Honeymoon Bay and Bicheno', 'Skeleton Bay, Cozy Corner and The Gardens'],
    timestamps: ['00:05:30', '00:07:31', '00:10:04', '00:11:02', '00:13:36'],
    note: 'A scenic, relatively easy-flowing section of the anti-clockwise circuit.',
    tradeoffs: 'Splitting nights between Freycinet and the north-east improves flow but adds a hotel change.',
    season: 'Longer spring days help; keep a second walk or food option for wet or windy weather.',
    rationale: 'Four nights avoids reducing the east coast to lookout stops and leaves time for one substantial walk.',
    gallery: [
      galleryImage('wineglass', 'wineglass-bay.jpg', 'Wineglass Bay from the lookout', 'JJ Harrison', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Wineglass_Bay_from_Lookout.jpg'),
      galleryImage('bay-fires', 'bay-of-fires.jpg', 'Granite boulders and coast at Bay of Fires', 'Diego Delso', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Bay_of_Fires-02.jpg'),
    ],
  },
  {
    id: 'tas-highlands', name: 'Cradle Mountain & West', region: 'Tasmania',
    summary: 'Wombats, alpine walks, Strahan and the wild west coast.', days: 5, status: 'included', color: 'violet',
    image: asset('cradle-boatshed.jpg'), coordinates: [145.949, -41.685], mapLabel: 'Cradle Mt',
    highlights: ['Ronny Creek wombats', 'Dove Lake and Marion’s Lookout', 'Strahan, Hogarth Falls and Queenstown drive'],
    timestamps: ['00:28:50', '00:30:41', '00:33:18', '00:35:06', '00:36:06'],
    note: 'Keep weather flexibility here; alpine conditions can change quickly even in spring.',
    tradeoffs: 'The west coast adds the most dramatic landscape contrast and some of the slowest, most winding driving.',
    season: 'Snow, rain, wind and clear sun are all plausible. Treat the major walk as weather-dependent.',
    rationale: 'Five nights lets Cradle and Strahan breathe and makes a bad-weather day less damaging.',
    gallery: [
      galleryImage('cradle-boatshed', 'cradle-boatshed.jpg', 'Dove Lake boatshed and Cradle Mountain', 'Thennicke', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Boat_shed_and_Cradle_Mountain_at_Dove_Lake,_Tas.jpg'),
      galleryImage('strahan', 'strahan.jpg', 'Strahan on Tasmania’s west coast', 'Timox14', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Strahan,_Tasmania.jpg'),
      galleryImage('cradle-dove', 'cradle-mountain.jpg', 'Cradle Mountain over Dove Lake', 'BennyG3255', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Cradle_Mountain_over_Dove_Lake,_Tasmania.jpg'),
    ],
  },
  {
    id: 'tas-north', name: 'Launceston, Stanley & the North', region: 'Tasmania',
    summary: 'Cataract Gorge, wildlife, The Nut and little penguins.', days: 3, status: 'maybe', color: 'violet',
    image: asset('stanley-nut.jpg'), coordinates: [147.1441, -41.4332], mapLabel: 'Launceston',
    highlights: ['Cataract Gorge', 'Narawntapu wildlife', 'Stanley, The Nut and little penguins'],
    timestamps: ['00:18:41', '00:20:30', '00:22:11', '00:23:55'],
    note: 'The main trade-off is drive time versus a slower east-coast and Cradle Mountain stay.',
    tradeoffs: 'Stanley is characterful but sits well west of Launceston; including both creates a wide northern arc.',
    season: 'Spring wildlife is a strength, but exposed north-west weather can affect coastal plans.',
    rationale: 'Three nights is only comfortable if the route continues west toward Cradle rather than returning east.',
    gallery: [galleryImage('stanley-nut', 'stanley-nut.jpg', 'Stanley and The Nut', 'Taspictures', 'CC0', 'https://commons.wikimedia.org/wiki/File:StanleyAndNut.jpg')],
  },
  {
    id: 'adelaide-ki', name: 'Adelaide & Kangaroo Island', region: 'South Australia',
    summary: 'Food, wildlife and a contrasting coastal island route.', days: 6, status: 'maybe', color: 'coral',
    coordinates: [138.6007, -34.9285], mapLabel: 'Adelaide',
    highlights: ['Adelaide Central Market', 'Kangaroo Island wildlife', 'Adds another flight and ferry or short flight'],
    note: 'A strong alternative to Tasmania if you prefer drier landscapes, food and wildlife.',
    tradeoffs: 'A compelling module, but it creates another transport seam and competes with the research already invested in Tasmania.',
    season: 'Late spring is generally a strong time for wildlife and coastal touring; verify ferry and rental rules.',
    rationale: 'Six nights allows Adelaide plus at least three useful days on Kangaroo Island.',
    gallery: [],
  },
]

export const scenarios = [
  {
    id: 'wa-tas', name: 'WA + Tasmania', days: 24, pace: 'Varied, balanced', transit: '~1 domestic flight + road loops',
    image: asset('cradle-boatshed.jpg'), summary: 'Contrasting coasts and wilderness, with one date-sensitive domestic flight.',
    pros: ['Strongest landscape contrast', 'Uses your Tasmania research', 'Easy to trim by region'],
    plan: { perth: ['included', 2], 'margaret-river': ['included', 5], 'southern-forests': ['included', 4], esperance: ['excluded', 4], 'tas-hobart': ['included', 3], 'tas-east': ['included', 4], 'tas-highlands': ['included', 5], 'tas-north': ['maybe', 3], 'adelaide-ki': ['excluded', 6] },
  },
  {
    id: 'wa-deeper', name: 'WA deeper', days: 25, pace: 'Road-trip focused', transit: 'No domestic flight',
    image: asset('margaret-river.jpg'), summary: 'Trade the cross-country flight for more beaches, forests and breathing room in WA.',
    pros: ['Simpler logistics', 'More weather flexibility', 'Fewer packing days'],
    plan: { perth: ['included', 3], 'margaret-river': ['included', 7], 'southern-forests': ['included', 7], esperance: ['included', 6], 'tas-hobart': ['excluded', 3], 'tas-east': ['excluded', 4], 'tas-highlands': ['excluded', 5], 'tas-north': ['excluded', 3], 'adelaide-ki': ['excluded', 6] },
  },
  {
    id: 'wa-sa', name: 'WA + South Australia', days: 26, pace: 'Food + nature', transit: '~1 domestic flight + island transfer',
    image: asset('margaret-river.jpg'), summary: 'Keep the WA core, then swap alpine Tasmania for Adelaide and Kangaroo Island.',
    pros: ['Potentially warmer finish', 'Excellent food and wildlife', 'Less alpine-weather exposure'],
    plan: { perth: ['included', 2], 'margaret-river': ['included', 6], 'southern-forests': ['included', 5], esperance: ['maybe', 4], 'tas-hobart': ['excluded', 3], 'tas-east': ['excluded', 4], 'tas-highlands': ['excluded', 5], 'tas-north': ['excluded', 3], 'adelaide-ki': ['included', 7] },
  },
]

export const flightNotes = [
  { route: 'London → Perth', time: 'Long-haul · live search', detail: 'Compare one-ticket itineraries and leave the first day gentle after the overnight journey.', href: 'https://www.google.com/travel/flights?q=Flights%20from%20London%20to%20Perth%20October%202026', label: 'Search' },
  { route: 'Perth → Hobart', time: 'Direct or one stop', detail: 'Direct service can be limited, so compare the date against connections via Melbourne or Adelaide.', href: 'https://www.google.com/travel/flights?q=Flights%20from%20Perth%20to%20Hobart%20November%202026', label: 'Check dates' },
  { route: 'Perth → Melbourne → Hobart', time: 'One-stop fallback', detail: 'A practical fallback if a direct day does not fit. Keep a generous connection on separate tickets.', href: 'https://www.google.com/travel/flights?q=Flights%20from%20Perth%20to%20Hobart%20via%20Melbourne%20November%202026', label: 'Compare' },
  { route: 'Perth → Adelaide', time: 'Domestic alternative', detail: 'Useful when comparing South Australia against the Tasmania module.', href: 'https://www.google.com/travel/flights?q=Flights%20from%20Perth%20to%20Adelaide%20November%202026', label: 'Compare' },
  { route: 'Hobart → London', time: 'Long-haul · live search', detail: 'Usually compare through-tickets via an Australian or Asian hub; also test Launceston and Melbourne positioning options.', href: 'https://www.google.com/travel/flights?q=Flights%20from%20Hobart%20to%20London%20November%202026', label: 'Search' },
]

export const seedBookmarks = [
  { id: 'tas-video', label: 'Tasmania source video', href: 'https://youtu.be/wC62ZLZgEDM', category: 'Research', scope: 'Tasmania', ideaIds: ['tas-hobart', 'tas-east', 'tas-highlands', 'tas-north'], note: 'Source for the timestamped Tasmania place notes.', pinned: true },
  { id: 'hobart-airport', label: 'Hobart Airport destinations', href: 'https://hobartairport.com.au/travellers/destinations/', category: 'Flights', scope: 'Hobart', ideaIds: ['tas-hobart'], note: 'Check current nonstop destinations before fixing the domestic seam.', pinned: true },
  { id: 'qantas-per-hba', label: 'Qantas Perth–Hobart route', href: 'https://www.qantas.com/en-au/book/flight-deals/from-perth-to-hobart', category: 'Flights', scope: 'Perth / Hobart', ideaIds: ['perth', 'tas-hobart'], note: 'Live route and fare check.', pinned: false },
  { id: 'cradle-shuttle', label: 'Cradle Mountain shuttle', href: 'https://parks.tas.gov.au/explore-our-parks/cradle-mountain/cradle-mountain-shuttle-bus-information', category: 'Logistics', scope: 'Cradle Mountain', ideaIds: ['tas-highlands'], note: 'Seasonal access and shuttle operating details.', pinned: true },
  { id: 'natural-earth', label: 'Natural Earth 1:10m map boundary', href: 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/', category: 'Map data', scope: 'Whole trip', ideaIds: [], note: 'Public-domain coastline used by the route map.', pinned: false },
  { id: 'photo-perth', label: 'Photo: Perth skyline — Robert Young, CC BY 2.0', href: 'https://commons.wikimedia.org/wiki/File:Perth_skyline.jpg', category: 'Photo credit', scope: 'Perth', ideaIds: ['perth'], note: '', pinned: false },
  { id: 'photo-boranup', label: 'Photo: Boranup Forest — Paulkyranc, CC BY-SA 4.0', href: 'https://commons.wikimedia.org/wiki/File:Karri_trees_-_Boranup_Forest_01.jpg', category: 'Photo credit', scope: 'South West WA', ideaIds: ['margaret-river', 'southern-forests'], note: '', pinned: false },
  { id: 'photo-margaret', label: 'Photo: Margaret River coast — Wikimedia Commons', href: 'https://commons.wikimedia.org/wiki/File:2016_Margaret_River_Australia_-_indian_ocean.jpg', category: 'Photo credit', scope: 'Margaret River', ideaIds: ['margaret-river'], note: '', pinned: false },
  { id: 'photo-hobart', label: 'Photo: Salamanca Place — Cheng Fei, CC BY-SA 2.0', href: 'https://commons.wikimedia.org/wiki/File:Hobart_Tasmania_Salamanca_Place.jpg', category: 'Photo credit', scope: 'Hobart', ideaIds: ['tas-hobart'], note: '', pinned: false },
  { id: 'photo-wineglass', label: 'Photo: Wineglass Bay — JJ Harrison, CC BY-SA 3.0', href: 'https://commons.wikimedia.org/wiki/File:Wineglass_Bay_from_Lookout.jpg', category: 'Photo credit', scope: 'Freycinet', ideaIds: ['tas-east'], note: '', pinned: false },
  { id: 'photo-bay-fires', label: 'Photo: Bay of Fires — Diego Delso, CC BY-SA 3.0', href: 'https://commons.wikimedia.org/wiki/File:Bay_of_Fires-02.jpg', category: 'Photo credit', scope: 'East Tasmania', ideaIds: ['tas-east'], note: '', pinned: false },
  { id: 'photo-cradle', label: 'Photo: Cradle Mountain — Thennicke, CC BY-SA 4.0', href: 'https://commons.wikimedia.org/wiki/File:Boat_shed_and_Cradle_Mountain_at_Dove_Lake,_Tas.jpg', category: 'Photo credit', scope: 'Cradle Mountain', ideaIds: ['tas-highlands'], note: '', pinned: false },
  { id: 'photo-albany', label: 'Photo: Albany coast — CSIRO, CC BY 3.0', href: 'https://commons.wikimedia.org/wiki/File:CSIRO_ScienceImage_2482_Coast_near_Albany_Western_Australia.jpg', category: 'Photo credit', scope: 'Albany', ideaIds: ['southern-forests'], note: '', pinned: false },
  { id: 'photo-lucky', label: 'Photo: Lucky Bay — DaHuzyBru, CC BY-SA 4.0', href: 'https://commons.wikimedia.org/wiki/File:Lucky_Bay,_Cape_Le_Grand_National_Park,_January_2025_01.jpg', category: 'Photo credit', scope: 'Esperance', ideaIds: ['esperance'], note: '', pinned: false },
]
