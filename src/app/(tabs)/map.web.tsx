import * as Location from 'expo-location';
import { Link } from 'expo-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSites } from '@/lib/data';

const DEFAULT_CENTER: [number, number] = [27.87, 34.35];
const DEFAULT_ZOOM = 10;

// Leaflet's default marker icon references image assets in a way that breaks
// under most bundlers (webpack/Metro). The standard workaround is to delete
// the broken instance method and re-merge default options with explicit CDN
// URLs. `_getIconUrl` isn't part of Leaflet's public types, hence the `any`.
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

type UserLocation = { latitude: number; longitude: number } | null;

export default function MapScreen() {
  const { data: sites, isLoading: sitesLoading } = useSites();
  const [userLocation, setUserLocation] = useState<UserLocation>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);

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

  const isLoading = sitesLoading || locationLoading;

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

      {!isLoading && (
        <View style={styles.mapContainer}>
          <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={styles.map}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {(sites ?? []).map((site) => (
              <Marker key={site.id} position={[site.lat, site.lng]}>
                <Popup>
                  <strong>{site.name}</strong>
                  <div>
                    <Link href={`/site/${site.slug}`}>View site</Link>
                  </div>
                </Popup>
              </Marker>
            ))}

            {userLocation && (
              <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
                <Popup>Your location</Popup>
              </Marker>
            )}
          </MapContainer>
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
