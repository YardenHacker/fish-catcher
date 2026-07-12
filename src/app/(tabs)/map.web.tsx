import * as Location from 'expo-location';
import { Link } from 'expo-router';
import type LType from 'leaflet';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MapContainer as MapContainerType, Marker as MarkerType, Popup as PopupType, TileLayer as TileLayerType } from 'react-leaflet';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useSites } from '@/lib/data';

const DEFAULT_CENTER: [number, number] = [27.87, 34.35];
const DEFAULT_ZOOM = 10;

type UserLocation = { latitude: number; longitude: number } | null;

/**
 * Marker color per dive-site area, matching the areas defined in
 * `src/app/(tabs)/sites.tsx` (AREA_ORDER) so the map stays visually
 * consistent with the rest of the app. Areas not in this list (there
 * shouldn't be any) fall back to DEFAULT_AREA_COLOR.
 */
const AREA_COLORS: Record<string, string> = {
  'Ras Mohammed': '#e2723a',
  'Straits of Tiran': '#3d78d8',
  'Sharm Local': '#0a7a6e',
  'Offshore Wrecks': '#9b59d0',
};
const DEFAULT_AREA_COLOR = '#6b7785';

function areaPinIcon(L: typeof LType, color: string): LType.DivIcon {
  const svg =
    '<svg width="25" height="34" viewBox="0 0 25 34" xmlns="http://www.w3.org/2000/svg">' +
    `<path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 21.5 12.5 21.5s12.5-12.1 12.5-21.5C25 5.6 19.4 0 12.5 0z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>` +
    '<circle cx="12.5" cy="12.5" r="5" fill="#ffffff"/>' +
    '</svg>';
  return L.divIcon({
    html: svg,
    className: 'site-marker-icon',
    iconSize: [25, 34],
    iconAnchor: [12.5, 34],
    popupAnchor: [0, -30],
  });
}

// Leaflet touches `window` as soon as its module is evaluated (not just when
// rendered), which crashes Expo Router's server-side render of this route in
// Node. It must only ever be imported inside the browser, after mount --
// never at module scope -- so both the import and the resulting components
// are loaded lazily on the client via this piece of state.
interface LeafletBundle {
  L: typeof LType;
  MapContainer: typeof MapContainerType;
  TileLayer: typeof TileLayerType;
  Marker: typeof MarkerType;
  Popup: typeof PopupType;
  userIcon: LType.Icon;
}

export default function MapScreen() {
  const { data: sites, isLoading: sitesLoading } = useSites();
  const [userLocation, setUserLocation] = useState<UserLocation>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [leaflet, setLeaflet] = useState<LeafletBundle | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([import('leaflet'), import('react-leaflet'), import('leaflet/dist/leaflet.css')]).then(
      ([{ default: L }, reactLeaflet]) => {
        if (cancelled) return;

        // Leaflet's default marker icon references image assets in a way
        // that breaks under most bundlers (webpack/Metro). The standard
        // workaround is to delete the broken instance method and re-merge
        // default options with explicit CDN URLs. `_getIconUrl` isn't part
        // of Leaflet's public types, hence the `any`.
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        const userIcon = new L.Icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
          className: 'user-location-marker',
        });

        // Leaflet's default `.leaflet-div-icon` CSS (from leaflet.css, just
        // imported above) draws a white box with a border behind every
        // divIcon. The colored SVG pins used for area markers below need
        // that stripped so only the pin shape shows; this project has no
        // shared stylesheet the two map screens both pull from, so it's
        // injected here directly rather than touching global.css.
        const styleId = 'site-marker-icon-style';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = '.site-marker-icon { background: transparent !important; border: none !important; }';
          document.head.appendChild(style);
        }

        setLeaflet({
          L,
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Marker: reactLeaflet.Marker,
          Popup: reactLeaflet.Popup,
          userIcon,
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) {
            setLocationDenied(true);
            setLocationLoading(false);
          }
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          setLocationLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLocationDenied(true);
          setLocationLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isLoading = sitesLoading || locationLoading || !leaflet;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Dive Map
        </ThemedText>

        {locationDenied && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            Location permission not granted — showing dive sites only.
          </ThemedText>
        )}

        {isLoading && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            Loading map…
          </ThemedText>
        )}
      </View>

      {!isLoading && leaflet && (
        <View style={styles.mapContainer}>
          <leaflet.MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={styles.map}>
            <leaflet.TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution="&copy; OpenStreetMap contributors &copy; CARTO"
              subdomains="abcd"
              maxZoom={20}
              detectRetina
            />

            {(sites ?? []).map((site) => (
              <leaflet.Marker
                key={site.id}
                position={[site.lat, site.lng]}
                icon={areaPinIcon(leaflet.L, AREA_COLORS[site.area] ?? DEFAULT_AREA_COLOR)}>
                <leaflet.Popup>
                  <strong>{site.name}</strong>
                  <div>
                    <Link href={`/site/${site.slug}`}>View site</Link>
                  </div>
                </leaflet.Popup>
              </leaflet.Marker>
            ))}

            {userLocation && (
              <leaflet.Marker
                position={[userLocation.latitude, userLocation.longitude]}
                icon={leaflet.userIcon}>
                <leaflet.Popup>Your location</leaflet.Popup>
              </leaflet.Marker>
            )}
          </leaflet.MapContainer>

          <View style={styles.legend} pointerEvents="none">
            {Array.from(new Set((sites ?? []).map((site) => site.area))).map((area) => (
              <View key={area} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: AREA_COLORS[area] ?? DEFAULT_AREA_COLOR }]} />
                <ThemedText type="small" style={styles.legendLabel}>
                  {area}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four, paddingBottom: Spacing.two, gap: Spacing.one },
  title: { fontSize: 28, lineHeight: 34 },
  message: { paddingBottom: Spacing.one },
  mapContainer: { flex: 1 },
  map: { height: '100%', width: '100%' },
  legend: {
    position: 'absolute',
    bottom: Spacing.four,
    left: Spacing.two,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: Radii.medium,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.half,
    zIndex: 1000,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  legendSwatch: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#fff' },
  legendLabel: { color: '#10161c', fontSize: 12, lineHeight: 16 },
});
