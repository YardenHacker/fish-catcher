import { StyleSheet, View } from 'react-native';

const BRACKET_SIZE = 18;
const BRACKET_THICKNESS = 2;

/**
 * Four small L-shaped "viewfinder corner bracket" marks drawn with plain
 * Views, overlaid on a photo to give it an instrument-panel/HUD viewfinder
 * feel instead of a plain rounded-rect or circular frame. Purely a visual
 * overlay -- render on top of the existing photo, absolutely positioned.
 */
export function CornerFrame({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.corner, styles.topLeft, { borderColor: color }]} />
      <View style={[styles.corner, styles.topRight, { borderColor: color }]} />
      <View style={[styles.corner, styles.bottomLeft, { borderColor: color }]} />
      <View style={[styles.corner, styles.bottomRight, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: 'absolute',
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
  },
  topLeft: {
    top: 6,
    left: 6,
    borderLeftWidth: BRACKET_THICKNESS,
    borderTopWidth: BRACKET_THICKNESS,
  },
  topRight: {
    top: 6,
    right: 6,
    borderRightWidth: BRACKET_THICKNESS,
    borderTopWidth: BRACKET_THICKNESS,
  },
  bottomLeft: {
    bottom: 6,
    left: 6,
    borderLeftWidth: BRACKET_THICKNESS,
    borderBottomWidth: BRACKET_THICKNESS,
  },
  bottomRight: {
    bottom: 6,
    right: 6,
    borderRightWidth: BRACKET_THICKNESS,
    borderBottomWidth: BRACKET_THICKNESS,
  },
});
