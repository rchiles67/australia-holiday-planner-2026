const flightIdea = (id, name, routeFrom, routeTo, coordinates, summary) => ({
  id,
  name,
  routeFrom,
  routeTo,
  kind: 'flight',
  region: 'Flight',
  area: 'Flights & transfers',
  mapGroup: 'Flights',
  coordinates,
  mapLabel: name,
  summary,
  days: 1,
  status: 'excluded',
  color: 'flight',
  image: '',
  gallery: [],
  highlights: ['One calendar day reserved for the flight and airport logistics', 'Confirm the operating day before fixing accommodation', 'Allow for car return or collection at each end'],
  note: 'This is a planning allowance, not a cabin-class choice or a confirmed booking.',
  rationale: 'A visible one-day block prevents a flight from disappearing between two scenic stays.',
  tradeoffs: 'Actual flying time may be shorter, but airport, baggage, vehicle and schedule constraints consume useful touring time.',
  season: 'Check the live timetable and fare before booking adjoining accommodation or vehicle hire.',
})

export const flightIdeas = [
  flightIdea('tas-sydney-transit', 'Hobart → Sydney flight', 'Hobart', 'Sydney', [151.2093, -33.8688], 'A one-day domestic transfer into the likely UK departure city.'),
  flightIdea('perth-melbourne-transit', 'Perth → Melbourne flight', 'Perth', 'Melbourne', [144.9631, -37.8136], 'A one-day domestic transfer between the WA and Victoria road sections.'),
  flightIdea('melbourne-sydney-transit', 'Melbourne → Sydney flight', 'Melbourne', 'Sydney', [151.2093, -33.8688], 'A one-day domestic transfer before the Sydney finish.'),
]
