export const activityOrbitCurve = {
  start: [0, 44],
  control1: [210, 190],
  control2: [560, 198],
  end: [1000, 38],
  width: 1000,
  height: 260,
} as const;

export const activityOrbitPath =
  `M${activityOrbitCurve.start.join(" ")} ` +
  `C${activityOrbitCurve.control1.join(" ")} ` +
  `${activityOrbitCurve.control2.join(" ")} ` +
  activityOrbitCurve.end.join(" ");

const cubic = (
  start: number,
  control1: number,
  control2: number,
  end: number,
  t: number,
) => {
  const inverse = 1 - t;
  return (
    inverse ** 3 * start +
    3 * inverse ** 2 * t * control1 +
    3 * inverse * t ** 2 * control2 +
    t ** 3 * end
  );
};

export function activityOrbitPointAtX(left: number) {
  const targetX = (left / 100) * activityOrbitCurve.width;
  let lower = 0;
  let upper = 1;

  for (let iteration = 0; iteration < 48; iteration += 1) {
    const t = (lower + upper) / 2;
    const x = cubic(
      activityOrbitCurve.start[0],
      activityOrbitCurve.control1[0],
      activityOrbitCurve.control2[0],
      activityOrbitCurve.end[0],
      t,
    );
    if (x < targetX) lower = t;
    else upper = t;
  }

  const t = (lower + upper) / 2;
  const y = cubic(
    activityOrbitCurve.start[1],
    activityOrbitCurve.control1[1],
    activityOrbitCurve.control2[1],
    activityOrbitCurve.end[1],
    t,
  );

  return {
    left,
    top: (y / activityOrbitCurve.height) * 100,
  };
}
