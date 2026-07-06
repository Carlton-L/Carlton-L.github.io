/**
 * fast-gather.js — board state for the FAST Gather demo.
 *
 * Mirrors the product's lab board model (Lab/tools/gather): categories (columns)
 * holding LabSubject cards, each with the three strategic indices HR / WS / TT
 * on a 0–10 scale. Metric colors are the product's exact theme tokens
 * (horizonRank #D4AF37, whiteSpace #20B2AA, techTransfer #FF6B47 — src/theme).
 * "Uncategorized" is the default column and stays first, as in the product.
 *
 * CONTENT: Carlton's real "Interstellar Propulsion Lab" (sanitized export,
 * 2025-11) — real category names (including the delightfully unrenamed
 * "Category Y") and real subjects. Index values are real where the lab has
 * them (digital twin 6.0/4.0/7.0); `null` = the product's N/A state for
 * subjects whose indices are not yet computed. Summaries are trimmed from the
 * lab's ent_summary fields or, where the lab has none, kept to neutral
 * one-line definitions.
 */

export const METRIC_COLORS = { HR: '#D4AF37', WS: '#20B2AA', TT: '#FF6B47' };

export const LAB_NAME = 'Interstellar Propulsion Lab';

export const INITIAL_BOARD = [
  {
    id: 'cat-uncat',
    name: 'Uncategorized',
    type: 'default',
    subjects: [
      { id: 'g-ansible', name: 'ansible', hr: null, ws: null, tt: null, summary: 'Hypothetical faster-than-light communications device, introduced by Ursula K. Le Guin in 1966.' },
    ],
  },
  {
    id: 'cat-y',
    name: 'Category Y',
    type: 'custom',
    subjects: [
      { id: 'g-dtwin', name: 'digital twin', hr: 6.0, ws: 4.0, tt: 7.0, summary: 'Virtual, dynamic model of a physical system kept in sync via real-time data; simulation as an operations tool.' },
      { id: 'g-antimatter', name: 'antimatter rocket', hr: null, ws: null, tt: null, summary: 'Propulsion from matter-antimatter annihilation; the theoretical ceiling of energy density.' },
      { id: 'g-fission', name: 'fission fragment rocket', hr: null, ws: null, tt: null, summary: 'Exhausts fission fragments directly for extremely high specific impulse.' },
      { id: 'g-ion', name: 'ion engine', hr: null, ws: null, tt: null, summary: 'Electrostatic acceleration of ions; low thrust, very high efficiency, flight-proven.' },
      { id: 'g-npp', name: 'nuclear pulse propulsion', hr: null, ws: null, tt: null, summary: 'Nuclear pulse units detonated behind a pusher plate; the Orion lineage.' },
    ],
  },
  {
    id: 'cat-prop',
    name: 'Propulsion Systems',
    type: 'custom',
    subjects: [
      { id: 'g-ramjet', name: 'ramjet', hr: null, ws: null, tt: null, summary: 'Air-breathing engine that uses forward motion to compress intake air; built for supersonic flight.' },
      { id: 'g-ramscoop', name: 'ramscoop', hr: null, ws: null, tt: null, summary: 'Bussard-style concept that scoops interstellar hydrogen as fusion fuel en route.' },
      { id: 'g-sail', name: 'solar sail', hr: null, ws: null, tt: null, summary: 'Propellant-free thrust from photon pressure on large reflective membranes.' },
      { id: 'g-rfcavity', name: 'radio frequency resonant cavity thruster', hr: null, ws: null, tt: null, summary: 'The contested EmDrive family: claimed thrust from a closed resonant cavity.' },
    ],
  },
  {
    id: 'cat-stl',
    name: 'Slower than Light Travel',
    type: 'custom',
    subjects: [
      { id: 'g-genship', name: 'generation ship', hr: null, ws: null, tt: null, summary: 'Crewed vessel designed for voyages longer than a human lifetime.' },
      { id: 'g-suspend', name: 'suspended animation', hr: null, ws: null, tt: null, summary: 'Slowing or pausing biological processes to survive long transits.' },
      { id: 'g-timedil', name: 'time dilation', hr: null, ws: null, tt: null, summary: 'Relativistic time difference between travelers at high fractions of c and observers at home.' },
      { id: 'g-nano', name: 'nano probes', hr: null, ws: null, tt: null, summary: 'Gram-scale spacecraft launched in swarms; small enough to accelerate to meaningful fractions of c.' },
    ],
  },
];
