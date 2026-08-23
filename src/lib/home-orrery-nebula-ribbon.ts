import {
  sampleCubic,
  tangentCubic,
  type CubicPath,
  type OrreryStream,
} from "./home-orrery-geometry.ts";

export type NebulaRibbon = {
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
};

const streamWidthScale: Record<OrreryStream, number> = {
  moon: 1,
  earth: 0.95,
  "black-hole": 1.05,
};

const usableShortEdge = (shortEdge: number) =>
  Number.isFinite(shortEdge) && shortEdge > 0 ? shortEdge : 0;

const sampleCountFor = (segments: number) =>
  Math.max(1, Number.isFinite(segments) ? Math.floor(segments) : 1);

const normalFor = (path: CubicPath, progress: number) => {
  const tangent = tangentCubic(path, progress);
  const length = Math.hypot(tangent.x, tangent.y);
  if (Number.isFinite(length) && length > 1e-6) {
    return { x: -tangent.y / length, y: tangent.x / length };
  }

  const chord = {
    x: path.end.x - path.start.x,
    y: path.end.y - path.start.y,
  };
  const chordLength = Math.hypot(chord.x, chord.y);
  if (Number.isFinite(chordLength) && chordLength > 1e-6) {
    return { x: -chord.y / chordLength, y: chord.x / chordLength };
  }
  return { x: 0, y: 1 };
};

const widthAt = (
  stream: OrreryStream,
  shortEdge: number,
  progress: number,
) => {
  const terminalCoverage = 0.18;
  const endpointTaper = Math.sin(Math.PI * progress) ** 0.62;
  const profile = terminalCoverage + (1 - terminalCoverage) * endpointTaper;
  return shortEdge * 0.035 * streamWidthScale[stream] * profile;
};

export const createNebulaRibbon = (
  path: CubicPath,
  stream: OrreryStream,
  shortEdge: number,
  segments: number,
): NebulaRibbon => {
  const segmentCount = sampleCountFor(segments);
  const positions = new Float32Array((segmentCount + 1) * 2 * 3);
  const uvs = new Float32Array((segmentCount + 1) * 2 * 2);
  const indices = new Uint32Array(segmentCount * 6);
  const edge = usableShortEdge(shortEdge);

  for (let sample = 0; sample <= segmentCount; sample += 1) {
    const progress = sample / segmentCount;
    const center = sampleCubic(path, progress);
    const normal = normalFor(path, progress);
    const halfWidth = widthAt(stream, edge, progress) * 0.5;
    const vertex = sample * 2;
    const positionOffset = vertex * 3;
    const uvOffset = vertex * 2;

    positions[positionOffset] = center.x - normal.x * halfWidth;
    positions[positionOffset + 1] = center.y - normal.y * halfWidth;
    positions[positionOffset + 2] = 0;
    positions[positionOffset + 3] = center.x + normal.x * halfWidth;
    positions[positionOffset + 4] = center.y + normal.y * halfWidth;
    positions[positionOffset + 5] = 0;
    uvs[uvOffset] = progress;
    uvs[uvOffset + 1] = 0;
    uvs[uvOffset + 2] = progress;
    uvs[uvOffset + 3] = 1;
  }

  for (let segment = 0; segment < segmentCount; segment += 1) {
    const vertex = segment * 2;
    const offset = segment * 6;
    indices[offset] = vertex;
    indices[offset + 1] = vertex + 1;
    indices[offset + 2] = vertex + 2;
    indices[offset + 3] = vertex + 2;
    indices[offset + 4] = vertex + 1;
    indices[offset + 5] = vertex + 3;
  }

  return { positions, uvs, indices };
};
