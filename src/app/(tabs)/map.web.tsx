import * as Location from 'expo-location';
import { Link } from 'expo-router';
import type LType from 'leaflet';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MapContainer as MapContainerType, Marker as MarkerType, Popup as PopupType, TileLayer as TileLayerType } from 'react-leaflet';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSites } from '@/lib/data';

const DEFAULT_CENTER: [number, number] = [27.87, 34.35];
const DEFAULT_ZOOM = 10;

type UserLocation = { latitude: number; longitude: number } | null;

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
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution="&copy; OpenStreetMap contributors &copy; CARTO"
              subdomains="abcd"
              maxZoom={20}
              detectRetina
            />

            {(sites ?? []).map((site) => (
              <leaflet.Marker key={site.id} position={[site.lat, site.lng]}>
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
});
