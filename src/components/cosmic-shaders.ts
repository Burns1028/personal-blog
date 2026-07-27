export const PLANET_VERTEX_SHADER = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const PLANET_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uCenter;
uniform float uRoll;
uniform float uElevation;
uniform float uZoom;

varying vec2 vUv;

#define PLANET_RADIUS 1.0
#define RING_INNER 1.55
#define RING_OUTER 7.2
#define CAMERA_DISTANCE 12.0
#define FOCAL_LENGTH 1.62

float hash11(float value) {
  return fract(sin(value * 127.1) * 43758.5453123);
}

float noise1(float value) {
  float index = floor(value);
  float fraction = fract(value);
  float eased = fraction * fraction * (3.0 - 2.0 * fraction);
  return mix(hash11(index), hash11(index + 1.0), eased);
}

float fbm(float value) {
  float result = 0.0;
  float amplitude = 0.55;

  for (int octave = 0; octave < 3; octave++) {
    result += amplitude * noise1(value);
    value = value * 2.07 + 13.7;
    amplitude *= 0.48;
  }

  return result;
}

float ringDensity(float radius) {
  float normalized = clamp(
    (radius - RING_INNER) / (RING_OUTER - RING_INNER),
    0.0,
    1.0
  );

  float broadBands = 0.48 + 0.52 * smoothstep(
    0.2,
    0.72,
    fbm(radius * 1.18 + 3.0)
  );
  float grooves = 0.38 + 0.62 * (
    0.5 + 0.5 * sin(radius * 74.0 + noise1(radius * 7.0) * 5.0)
  );
  float fineDust = 0.72 + 0.28 * (
    0.5 + 0.5 * sin(radius * 173.0 + noise1(radius * 19.0) * 8.0)
  );
  float cassiniGap = 1.0 - 0.7 * exp(-pow((normalized - 0.38) / 0.026, 2.0));
  float innerGap = 1.0 - 0.42 * exp(-pow((normalized - 0.15) / 0.018, 2.0));
  float edge = smoothstep(RING_INNER, RING_INNER + 0.12, radius);
  edge *= 1.0 - smoothstep(RING_OUTER - 1.7, RING_OUTER, radius);

  return broadBands * grooves * fineDust * cassiniGap * innerGap * edge;
}

vec4 shadeRing(vec3 position) {
  float radius = length(position.xz);
  if (radius < RING_INNER || radius > RING_OUTER) {
    return vec4(0.0);
  }

  float normalized = clamp(
    (radius - RING_INNER) / (RING_OUTER - RING_INNER),
    0.0,
    1.0
  );
  float density = ringDensity(radius);
  float angle = atan(position.z, position.x);
  float ringRotation = uTime * 0.2;
  float rotatingAngle = angle - ringRotation;
  float angularSeed =
    sin(rotatingAngle * 3.0) * 3.7 +
    cos(rotatingAngle * 5.0) * 2.1;
  float grain = 0.7 + 0.3 * noise1(radius * 53.0 + angularSeed);
  float dustArc = 0.84 + 0.16 * sin(
    rotatingAngle * 9.0 + radius * 19.0 + noise1(radius * 4.0) * 3.0
  );
  float longArc = 0.82 + 0.18 * smoothstep(
    -0.45,
    0.72,
    sin(rotatingAngle * 2.0 + radius * 1.65)
  );
  density *= grain * dustArc * longArc;

  vec3 warm = vec3(1.0, 0.72, 0.34);
  vec3 parchment = vec3(0.66, 0.50, 0.31);
  vec3 ash = vec3(0.31, 0.33, 0.34);
  vec3 color = mix(warm, parchment, smoothstep(0.05, 0.38, normalized));
  color = mix(color, ash, smoothstep(0.48, 0.9, normalized));

  float innerLight = 1.9 * exp(-(radius - RING_INNER) * 0.82);
  float nearSide = 0.68 + 0.42 * smoothstep(-RING_OUTER, RING_OUTER, position.z);
  float sideLight = 0.84 + 0.24 * smoothstep(-RING_OUTER, RING_OUTER, position.x);
  float leadingArc = pow(
    0.5 + 0.5 * cos(rotatingAngle - 0.42 + normalized * 2.2),
    10.0
  );
  float trailingArc = pow(
    0.5 + 0.5 * cos(rotatingAngle + 2.35 - normalized * 1.4),
    15.0
  );
  float fineGlint = pow(
    0.5 + 0.5 * cos(rotatingAngle - 1.18 + normalized * 4.8),
    34.0
  );
  fineGlint *=
    smoothstep(0.08, 0.2, normalized) *
    (1.0 - smoothstep(0.58, 0.76, normalized));
  float orbitalSignal =
    0.7 +
    leadingArc * 0.64 +
    trailingArc * 0.36 +
    fineGlint * 0.72;
  float brightness =
    (0.34 + innerLight) * nearSide * sideLight * orbitalSignal;
  float shimmer = 0.9 + 0.1 * sin(
    rotatingAngle * 5.0 + radius * 12.0
  );

  vec3 emission = color * density * brightness * shimmer;
  emission += warm * density * fineGlint * (0.24 + innerLight * 0.08);
  float alpha = clamp(density * 1.58, 0.0, 0.88);
  return vec4(emission, alpha);
}

vec3 shadePlanet(vec3 normal, vec3 rayDirection) {
  float rotation = uTime * 0.055;
  float cosine = cos(rotation);
  float sine = sin(rotation);
  vec3 sampleNormal = normal;
  sampleNormal.xz = mat2(cosine, sine, -sine, cosine) * sampleNormal.xz;

  float latitude = sampleNormal.y;
  float longitude = atan(sampleNormal.z, sampleNormal.x);
  float band = fbm(latitude * 7.2 + fbm(longitude * 2.1) * 0.76);

  vec3 shadow = vec3(0.055, 0.043, 0.034);
  vec3 umber = vec3(0.28, 0.20, 0.135);
  vec3 sand = vec3(0.60, 0.42, 0.24);
  vec3 albedo = mix(shadow, umber, smoothstep(0.22, 0.56, band));
  albedo = mix(albedo, sand, smoothstep(0.62, 0.9, band));

  vec3 lightDirection = normalize(vec3(0.12, -0.9, 0.4));
  float light = clamp(dot(normal, lightDirection), 0.0, 1.0);
  float facing = clamp(dot(normal, -rayDirection), 0.0, 1.0);
  float rim = pow(1.0 - facing, 2.8);

  vec3 color = albedo * (0.13 + 1.05 * pow(light, 1.65));
  color *= vec3(1.0, 0.84, 0.62);
  color += vec3(0.92, 0.58, 0.26) * rim * 0.16;
  return color;
}

void main() {
  vec2 fragment = vUv * uResolution.xy;
  vec2 center = uCenter * uResolution.xy;
  vec2 point = (fragment - center) / uResolution.y;

  float cosine = cos(uRoll);
  float sine = sin(uRoll);
  point = mat2(cosine, -sine, sine, cosine) * point;
  point /= uZoom;

  vec3 camera = vec3(
    0.0,
    sin(uElevation),
    cos(uElevation)
  ) * CAMERA_DISTANCE;
  vec3 forward = normalize(-camera);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);
  vec3 rayDirection = normalize(
    point.x * right + point.y * up + FOCAL_LENGTH * forward
  );

  float sphereB = dot(camera, rayDirection);
  float sphereC = dot(camera, camera) - PLANET_RADIUS * PLANET_RADIUS;
  float sphereHit = sphereB * sphereB - sphereC;
  float sphereDistance = 1e9;
  float planetAlpha = 0.0;
  vec3 planetNormal = vec3(0.0);

  if (sphereHit > 0.0) {
    sphereDistance = -sphereB - sqrt(sphereHit);
    planetNormal = normalize(camera + rayDirection * sphereDistance);
    planetAlpha = smoothstep(0.0, 0.004, sphereHit);
  }

  float ringDistance = -1.0;
  if (abs(rayDirection.y) > 0.0001) {
    ringDistance = -camera.y / rayDirection.y;
  }

  vec4 ring = vec4(0.0);
  if (ringDistance > 0.0) {
    ring = shadeRing(camera + rayDirection * ringDistance);
  }

  vec3 planet = planetAlpha > 0.0
    ? shadePlanet(planetNormal, rayDirection)
    : vec3(0.0);

  bool ringInFront = ringDistance > 0.0 && (
    sphereDistance > 1e8 || ringDistance < sphereDistance
  );
  vec3 color;
  float alpha;

  if (ringInFront) {
    color = ring.rgb + planet * planetAlpha * (1.0 - ring.a);
    alpha = ring.a + planetAlpha * (1.0 - ring.a);
  } else {
    color = planet * planetAlpha + ring.rgb * (1.0 - planetAlpha);
    alpha = planetAlpha + ring.a * (1.0 - planetAlpha);
  }

  vec2 glowPoint = point - vec2(0.0, -0.12);
  glowPoint.x *= 0.31;
  glowPoint.y *= 1.18;
  float tightGlow = exp(-dot(glowPoint, glowPoint) * 68.0);
  float wideGlow = exp(-dot(glowPoint, glowPoint) * 14.0);
  vec3 glow = vec3(0.9, 0.57, 0.25) * (
    tightGlow * 0.25 + wideGlow * 0.075
  );

  if (planetAlpha > 0.5) {
    glow *= 0.08;
  }

  color += glow;
  alpha = clamp(alpha + dot(glow, vec3(0.38)), 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);
}
`;
