import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSites } from '@/lib/data';

const DEFAULT_CENTER: [number, number] = [27.87, 34.35];
const DEFAULT_ZOOM = 10;

type UserLocation = { latitude: number; longitude: number } | null;

function buildMapHtml(sites: { slug: string; name: string; lat: number; lng: number }[], userLocation: UserLocation) {
  const sitesJson = JSON.stringify(sites);
  const userLocationJson = JSON.stringify(userLocation);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
      .site-popup-link {
        display: inline-block;
        margin-top: 6px;
        padding: 6px 10px;
        background: #0E7C86;
        color: #FFFFFF;
        border-radius: 6px;
        text-decoration: none;
        font-family: sans-serif;
        font-size: 13px;
        border: none;
        cursor: pointer;
      }
      .site-popup-title { font-family: sans-serif; font-weight: 700; margin: 0 0 4px 0; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      var sites = ${sitesJson};
      var userLocation = ${userLocationJson};

      var map = L.map('map').setView([${DEFAULT_CENTER[0]}, ${DEFAULT_CENTER[1]}], ${DEFAULT_ZOOM});

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      var userIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        className: 'user-location-marker'
      });

      sites.forEach(function (site) {
        var marker = L.marker([site.lat, site.lng]).addTo(map);
        var popupNode = document.createElement('div');
        var title = document.createElement('p');
        title.className = 'site-popup-title';
        title.textContent = site.name;
        var button = document.createElement('button');
        button.className = 'site-popup-link';
        button.textContent = 'View site';
        button.onclick = function () {
          window.ReactNativeWebView.postMessage(site.slug);
        };
        popupNode.appendChild(title);
        popupNode.appendChild(button);
        marker.bindPopup(popupNode);
      });

      if (userLocation) {
        L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon })
          .addTo(map)
          .bindPopup('<p class="site-popup-title">Your location</p>');
      }
    </script>
  </body>
</html>`;
}

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

  const html = useMemo(() => buildMapHtml(sites ?? [], userLocation), [sites, userLocation]);

  const handleMessage = (event: WebViewMessageEvent) => {
    const slug = event.nativeEvent.data;
    if (slug) {
      router.push(`/site/${slug}`);
    }
  };

  const isLoading = sitesLoading || locationLoading;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
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
      </SafeAreaView>

      {!isLoading && (
        <View style={styles.mapContainer}>
          <WebView
            source={{ html }}
            style={styles.webview}
            originWhitelist={['*']}
            onMessage={handleMessage}
            javaScriptEnabled
          />
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two, gap: Spacing.one },
  title: { fontSize: 28, lineHeight: 34 },
  message: { paddingBottom: Spacing.one },
  mapContainer: { flex: 1 },
  webview: { flex: 1 },
});
