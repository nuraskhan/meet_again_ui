<script setup lang="ts">
// A small map (OpenStreetMap, drawn by Leaflet) with one pin, in the designers' "hg-map" frame.
// Clicking the map puts the pin there; the pin can be dragged. The component owns no state: it
// shows the coordinates it is given and reports where the person pointed.

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  /** Where the pin is; null = no pin yet. Both or neither. */
  latitude: number | null
  longitude: number | null
}>()

const emit = defineEmits<{
  /** The person clicked the map or dropped the pin. */
  pick: [latitude: number, longitude: number]
}>()

/** Shown while there is no pin: the continental United States. */
const START_CENTER: L.LatLngTuple = [39.5, -98.35]
const START_ZOOM = 3
/** Close enough to see streets: for a pin whose position is precise. */
const PIN_ZOOM = 13
/** A city and its surroundings: for a first, rough click on the far-out map. */
const CLICK_ZOOM = 10

const element = ref<HTMLElement | null>(null)

let map: L.Map | undefined
let pin: L.Marker | undefined
/** The coordinates about to arrive in the props were pointed at on this map (not given from outside). */
let pickedHere = false

// The pin is drawn with CSS (see .location-map__pin-shape below), not with Leaflet's image files:
// those are looked up by a path that does not survive bundling.
//
// Leaflet moves the outer element with its own `transform`, so the drop shape is an inner element
// with its own rotation. A 24px square turned by 45 degrees points down 17px below its centre:
// the tip is at (12, 29), and that is the anchor.
const pinIcon: L.DivIcon = L.divIcon({
  className: 'location-map__pin',
  html: '<span class="location-map__pin-shape"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 29],
})

onMounted(() => {
  if (element.value === null) {
    return
  }

  map = L.map(element.value, {
    center: START_CENTER,
    zoom: START_ZOOM,
    // Scrolling the page must not zoom the map by accident; the + and - buttons zoom.
    scrollWheelZoom: false,
  })

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map)

  map.on('click', (event: L.LeafletMouseEvent) => report(event.latlng))

  showPin()
})

onBeforeUnmount(() => {
  map?.remove()
  map = undefined
  pin = undefined
})

watch(() => [props.latitude, props.longitude], showPin)

/** Makes the map show what the props say. */
function showPin(): void {
  if (map === undefined) {
    return
  }

  if (props.latitude === null || props.longitude === null) {
    pin?.remove()
    pin = undefined
    return
  }

  const position: L.LatLngTuple = [props.latitude, props.longitude]

  if (pin === undefined) {
    pin = L.marker(position, { icon: pinIcon, draggable: true, keyboard: false }).addTo(map)
    pin.on('dragend', () => {
      if (pin !== undefined) {
        report(pin.getLatLng())
      }
    })
    // A pin that has just appeared: go and look at it. One that came from the device or was saved
    // earlier is precise, so look closely. One dropped by a click on the far-out map is a rough
    // guess: stop at the level of a city, where the next click can be exact.
    map.setView(position, Math.max(map.getZoom(), pickedHere ? CLICK_ZOOM : PIN_ZOOM))
    pickedHere = false
    return
  }

  pickedHere = false
  pin.setLatLng(position)
  // Moved by a click or a drag: it is already in view. Moved from outside (the device's
  // location): bring it into view.
  if (!map.getBounds().contains(position)) {
    map.setView(position, Math.max(map.getZoom(), PIN_ZOOM))
  }
}

function report(point: L.LatLng): void {
  // The map repeats sideways: bring the longitude back into -180..180.
  const wrapped: L.LatLng = point.wrap()
  pickedHere = true
  // Five decimals is about a yard.
  emit('pick', Number(wrapped.lat.toFixed(5)), Number(wrapped.lng.toFixed(5)))
}
</script>

<template>
  <div
    ref="element"
    class="hg-map location-map"
    role="application"
    aria-label="Map. Click to place the pin, or drag the pin."
    data-tst-id="location-map"
  ></div>
</template>

<style scoped>
/* The frame (height, corners, border) is the designers' "hg-map"; here is only what Leaflet needs. */
.location-map {
  /* Its own stacking context: Leaflet's layers have large z-indexes and would otherwise cover the
     sticky top bar when the page scrolls. */
  z-index: 0;
  width: 100%;
  /* Leaflet paints its own grey behind the tiles that have not arrived yet. */
  background: var(--c-surface-soft);
  cursor: crosshair;
}

/* Everything below is created by Leaflet outside the component's template, hence :deep. */

/* Muted tiles: the map is a background for the pin, not a picture of its own. */
.location-map :deep(.leaflet-tile-pane) {
  filter: saturate(0.6);
}

/* The zoom buttons and the credit line in the colours of the theme (Leaflet's are always white). */
.location-map :deep(.leaflet-bar) {
  overflow: hidden;
  border: 1px solid var(--c-line);
  border-radius: var(--r-s);
  box-shadow: var(--shadow-1);
}

.location-map :deep(.leaflet-bar a) {
  border-bottom-color: var(--c-line);
  background: var(--c-surface);
  color: var(--c-ink);
}

.location-map :deep(.leaflet-bar a:hover) {
  background: var(--c-surface-soft);
}

.location-map :deep(.leaflet-control-attribution) {
  background: var(--c-surface);
  color: var(--c-ink-soft);
}

.location-map :deep(.leaflet-control-attribution a) {
  color: var(--c-ink-soft);
}

/* The pin: a drop shape in the colour of the text with a light dot - the design keeps the accent
   colour for actions. */
.location-map :deep(.location-map__pin) {
  cursor: grab;
}

.location-map :deep(.location-map__pin-shape) {
  position: relative;
  display: block;
  width: 24px;
  height: 24px;
  border: 2px solid var(--c-surface);
  border-radius: 50% 50% 50% 0;
  background: var(--c-ink);
  box-shadow: var(--shadow-1);
  transform: rotate(-45deg);
}

.location-map :deep(.location-map__pin-shape)::after {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: var(--r-full);
  background: var(--c-surface);
}

/* The tiles stay OpenStreetMap's light ones; in the dark theme they are dimmed so that the map does
   not glare on a black page. */
.location-map :deep(.leaflet-tile-pane) {
  /* Set per theme in assets/main.css: the theme may be chosen by hand, not only by the system. */
  filter: var(--map-tile-filter);
}
</style>
