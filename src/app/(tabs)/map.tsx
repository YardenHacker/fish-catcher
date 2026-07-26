import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSitesForRegion } from '@/lib/data';
import { useActiveRegion } from '@/lib/region-context';

// Sharm el Sheikh's default center/zoom, preserved exactly as-is for existing
// users. Any other region (including one with zero sites so far) centers on
// the average lat/lng of its own sites instead -- see computeMapCenter.
const SHARM_SLUG = 'sharm-el-sheikh';
const DEFAULT_CENTER: [number, number] = [27.87, 34.35];
const DEFAULT_ZOOM = 10;

function computeMapCenter(sites: { lat: number; lng: number }[], regionSlug: string | undefined): [number, number] {
  if (regionSlug === SHARM_SLUG || sites.length === 0) return DEFAULT_CENTER;
  const avgLat = sites.reduce((sum, s) => sum + s.lat, 0) / sites.length;
  const avgLng = sites.reduce((sum, s) => sum + s.lng, 0) / sites.length;
  return [avgLat, avgLng];
}

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

function buildMapHtml(
  sites: { slug: string; name: string; lat: number; lng: number; area: string }[],
  userLocation: UserLocation,
  center: [number, number],
) {
  const sitesJson = JSON.stringify(sites);
  const userLocationJson = JSON.stringify(userLocation);
  const areaColorsJson = JSON.stringify(AREA_COLORS);

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
      .site-marker-icon { background: transparent; border: none; }
      .area-legend {
        position: absolute;
        bottom: 24px;
        left: 10px;
        z-index: 1000;
        background: rgba(255, 255, 255, 0.92);
        padding: 8px 10px;
        border-radius: 6px;
        font-family: sans-serif;
        font-size: 11px;
        line-height: 1.6;
        color: #10161c;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
      }
      .area-legend-item { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
      .area-legend-swatch { width: 10px; height: 10px; border-radius: 50%; display: inline-block; border: 1px solid #fff; flex: none; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div class="area-legend" id="area-legend"></div>
    <script>
      var sites = ${sitesJson};
      var userLocation = ${userLocationJson};
      var AREA_COLORS = ${areaColorsJson};
      var DEFAULT_AREA_COLOR = '${DEFAULT_AREA_COLOR}';

      var map = L.map('map').setView([${center[0]}, ${center[1]}], ${DEFAULT_ZOOM});

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        subdomains: 'abcd',
        detectRetina: true,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
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

      function pinIcon(color) {
        var svg = '<svg width="25" height="34" viewBox="0 0 25 34" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 21.5 12.5 21.5s12.5-12.1 12.5-21.5C25 5.6 19.4 0 12.5 0z" fill="' + color + '" stroke="#ffffff" stroke-width="1.5"/>' +
          '<circle cx="12.5" cy="12.5" r="5" fill="#ffffff"/>' +
          '</svg>';
        return L.divIcon({
          html: svg,
          className: 'site-marker-icon',
          iconSize: [25, 34],
          iconAnchor: [12.5, 34],
          popupAnchor: [0, -30]
        });
      }

      sites.forEach(function (site) {
        var color = AREA_COLORS[site.area] || DEFAULT_AREA_COLOR;
        var marker = L.marker([site.lat, site.lng], { icon: pinIcon(color) }).addTo(map);
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

      (function renderLegend() {
        var legend = document.getElementById('area-legend');
        var seenAreas = [];
        sites.forEach(function (site) {
          if (seenAreas.indexOf(site.area) === -1) seenAreas.push(site.area);
        });
        seenAreas.forEach(function (area) {
          var item = document.createElement('div');
          item.className = 'area-legend-item';
          var swatch = document.createElement('span');
          swatch.className = 'area-legend-swatch';
          swatch.style.background = AREA_COLORS[area] || DEFAULT_AREA_COLOR;
          var label = document.createElement('span');
          label.textContent = area;
          item.appendChild(swatch);
          item.appendChild(label);
          legend.appendChild(item);
        });
      })();

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
  const activeRegion = useActiveRegion();
  const { data: sites, isLoading: sitesLoading } = useSitesForRegion(activeRegion?.slug);
  const [userLocation, setUserLocation] = useState<UserLocation>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Geolocation is a nice-to-have overlay, never a gate on the map itself --
    // some environments can leave this promise hanging indefinitely rather
    // than rejecting. An 8s timeout guarantees this always settles.
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('location timed out')), 8000),
    );

    (async () => {
      try {
        const { status } = await Promise.race([Location.requestForegroundPermissionsAsync(), timeout]);
        if (status !== 'granted') {
          if (!cancelled) setLocationDenied(true);
          return;
        }
        const loc = await Promise.race([Location.getCurrentPositionAsync({}), timeout]);
        if (!cancelled) {
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch {
        if (!cancelled) setLocationDenied(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const center = useMemo(() => computeMapCenter(sites ?? [], activeRegion?.slug), [sites, activeRegion?.slug]);
  const html = useMemo(() => buildMapHtml(sites ?? [], userLocation, center), [sites, userLocation, center]);

  const handleMessage = (event: WebViewMessageEvent) => {
    const slug = event.nativeEvent.data;
    if (slug) {
      router.push(`/site/${slug}`);
    }
  };

  // Location is intentionally NOT part of this gate -- the map is fully
  // usable without it, and a user-location marker layers in whenever/if it
  // resolves. Only the site data itself blocks the initial render.
  const isLoading = sitesLoading;

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
