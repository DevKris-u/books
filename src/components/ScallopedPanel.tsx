import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

type Props = {
  width: number;
  height: number;
  fill: string;
  /** Radius of the scallop bumps, in pixels. */
  bump?: number;
  style?: StyleProp<ViewStyle>;
};

function edgeCenters(width: number, height: number, r: number) {
  const points: Array<{ x: number; y: number }> = [];

  const columns = Math.max(2, Math.ceil((width - 2 * r) / (2 * r)) + 1);
  for (let i = 0; i < columns; i += 1) {
    const x = r + (i * (width - 2 * r)) / (columns - 1);
    points.push({ x, y: r }, { x, y: height - r });
  }

  const rows = Math.max(2, Math.ceil((height - 2 * r) / (2 * r)) + 1);
  for (let i = 1; i < rows - 1; i += 1) {
    const y = r + (i * (height - 2 * r)) / (rows - 1);
    points.push({ x: r, y }, { x: width - r, y });
  }

  return points;
}

/**
 * A solid panel with a scalloped, postcard-like edge.
 * Draws a base rectangle plus a ring of overlapping circles, so the fill stays
 * one flat colour and the edge reads as a soft stamp.
 */
export function ScallopedPanel({ width, height, fill, bump = 22, style }: Props) {
  if (width <= 0 || height <= 0) return null;

  const r = Math.min(bump, width / 4, height / 4);
  const centers = edgeCenters(width, height, r);

  return (
    <Svg width={width} height={height} style={style} pointerEvents="none">
      <Rect x={r} y={r} width={width - 2 * r} height={height - 2 * r} fill={fill} />
      {centers.map((point, index) => (
        <Circle key={index} cx={point.x} cy={point.y} r={r} fill={fill} />
      ))}
    </Svg>
  );
}
