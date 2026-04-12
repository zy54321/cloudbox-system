import * as Cesium from 'cesium';

export type LonLat = { lon: number; lat: number };
export type Runway = { a: LonLat; b: LonLat };
export type PathPoint = {
  lon: number;
  lat: number;
  alt: number;
  phase: 'takeoff' | 'climb' | 'cruise' | 'approach' | 'landing';
};

function smootherstep(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** 空中段高度剖面：t 从 0 到 1，起点 0 爬升到巡航再下降到 0 */
function altProfile(
  t: number,
  cruiseAlt: number,
  climbEnd = 0.18,
  descendStart = 0.78
) {
  if (t <= climbEnd) {
    return cruiseAlt * smootherstep(t / climbEnd);
  }
  if (t >= descendStart) {
    return cruiseAlt * (1 - smootherstep((t - descendStart) / (1 - descendStart)));
  }
  return cruiseAlt;
}

function phaseOf(
  t: number,
  climbEnd = 0.18,
  descendStart = 0.78
): PathPoint['phase'] {
  if (t < 0.05) return 'takeoff';
  if (t < climbEnd) return 'climb';
  if (t < descendStart) return 'cruise';
  if (t < 0.95) return 'approach';
  return 'landing';
}

/** 沿大地线插值得到 LonLat 数组（不含起点，含终点；用于避免重复点） */
function sampleGeodesic(
  from: LonLat,
  to: LonLat,
  numPoints: number
): LonLat[] {
  const a = Cesium.Cartographic.fromDegrees(from.lon, from.lat);
  const b = Cesium.Cartographic.fromDegrees(to.lon, to.lat);
  const g = new Cesium.EllipsoidGeodesic(a, b);
  const out: LonLat[] = [];
  for (let i = 1; i <= numPoints; i++) {
    const f = i / numPoints;
    const p = g.interpolateUsingFraction(f);
    out.push({
      lon: Cesium.Math.toDegrees(p.longitude),
      lat: Cesium.Math.toDegrees(p.latitude)
    });
  }
  return out;
}

/** 沿大地线插值，得到从 from 到 to 的 numPoints 个点（含 from，含 to） */
function sampleGeodesicInclusive(
  from: LonLat,
  to: LonLat,
  numPoints: number
): LonLat[] {
  const a = Cesium.Cartographic.fromDegrees(from.lon, from.lat);
  const b = Cesium.Cartographic.fromDegrees(to.lon, to.lat);
  const g = new Cesium.EllipsoidGeodesic(a, b);
  const out: LonLat[] = [];
  for (let i = 0; i < numPoints; i++) {
    const f = numPoints <= 1 ? 1 : i / (numPoints - 1);
    const p = g.interpolateUsingFraction(f);
    out.push({
      lon: Cesium.Math.toDegrees(p.longitude),
      lat: Cesium.Math.toDegrees(p.latitude)
    });
  }
  return out;
}

/** 沿大地线插值（不含起点，不含终点；用于下降段避免与 E0 重复） */
function sampleGeodesicExcludeEnd(
  from: LonLat,
  to: LonLat,
  numPoints: number
): LonLat[] {
  const a = Cesium.Cartographic.fromDegrees(from.lon, from.lat);
  const b = Cesium.Cartographic.fromDegrees(to.lon, to.lat);
  const g = new Cesium.EllipsoidGeodesic(a, b);
  const out: LonLat[] = [];
  for (let i = 1; i <= numPoints; i++) {
    const f = i / (numPoints + 1);
    const p = g.interpolateUsingFraction(f);
    out.push({
      lon: Cesium.Math.toDegrees(p.longitude),
      lat: Cesium.Math.toDegrees(p.latitude)
    });
  }
  return out;
}

/**
 * 5 段拼接：起飞跑道(S0->S1) + 空中段(A->M->B，含爬升/巡航/下降) + 降落跑道(E0->E1)
 * A = S1 沿起飞方向外推 distOut，高度由剖面 climbEnd 决定
 * B = E0 沿“反向落地跑道”外推 distIn，高度由剖面 descendStart 决定
 */
export function buildFlightPathFromRunways(
  start: Runway,
  end: Runway,
  opts?: {
    cruiseAlt?: number;
    samplesPerLeg?: number;
    arcBend?: number;
    distOut?: number;
    distIn?: number;
    runwaySamples?: number;
  }
): PathPoint[] {
  const cruiseAlt = opts?.cruiseAlt ?? 10000;
  const samplesPerLeg = opts?.samplesPerLeg ?? 220;
  const arcBend = opts?.arcBend ?? -0.13;
  const distOut = opts?.distOut ?? 25000;
  const distIn = opts?.distIn ?? 25000;
  const runwaySamples = opts?.runwaySamples ?? 60;

  const climbEnd = 0.18;
  const descendStart = 0.78;

  const S0 = start.a;
  const S1 = start.b;
  const E0 = end.a;
  const E1 = end.b;

  // ------ 1) 起飞跑道段 S0 -> S1，alt=0，严格大地线 ------
  const takeoffRunway = sampleGeodesicInclusive(S0, S1, runwaySamples);
  const takeoffPoints: PathPoint[] = takeoffRunway.map((p) => ({
    lon: p.lon,
    lat: p.lat,
    alt: 0,
    phase: 'takeoff' as const
  }));

  // ------ 2) 锚点 A：S1 沿起飞方向外推 distOut，高度 = 剖面 climbEnd 处 ------
  const cartS0 = Cesium.Cartographic.fromDegrees(S0.lon, S0.lat);
  const cartS1 = Cesium.Cartographic.fromDegrees(S1.lon, S1.lat);
  const gS = new Cesium.EllipsoidGeodesic(cartS0, cartS1);
  const dS = gS.surfaceDistance;
  const cartA = gS.interpolateUsingSurfaceDistance(dS + distOut);
  const A: LonLat = {
    lon: Cesium.Math.toDegrees(cartA.longitude),
    lat: Cesium.Math.toDegrees(cartA.latitude)
  };

  // ------ 3) 锚点 B：E0 沿反向落地跑道方向外推 distIn ------
  const cartE0 = Cesium.Cartographic.fromDegrees(E0.lon, E0.lat);
  const cartE1 = Cesium.Cartographic.fromDegrees(E1.lon, E1.lat);
  const gE = new Cesium.EllipsoidGeodesic(cartE1, cartE0); // E1->E0，这样从 E0 往外推是 E0 + (E0-E1) 方向
  const dE = gE.surfaceDistance;
  const cartB = gE.interpolateUsingSurfaceDistance(dE + distIn);
  const B: LonLat = {
    lon: Cesium.Math.toDegrees(cartB.longitude),
    lat: Cesium.Math.toDegrees(cartB.latitude)
  };

  // ------ 4) 爬升段 S1 -> A（不含 S1，含 A）：高度由 0 平滑升到巡航 ------
  const climbHoriz = sampleGeodesic(S1, A, Math.max(24, Math.floor(samplesPerLeg * 0.25)));
  const climbPoints: PathPoint[] = climbHoriz.map((p, i) => {
    const u = climbHoriz.length <= 1 ? 1 : i / (climbHoriz.length - 1);
    const alt = cruiseAlt * smootherstep(u);
    return {
      lon: p.lon,
      lat: p.lat,
      alt,
      phase: 'climb' as const
    };
  });

  // ------ 5) 空中段 A -> M -> B：全程巡航高 ------
  const M0 = {
    lon: (A.lon + B.lon) / 2,
    lat: (A.lat + B.lat) / 2
  };
  const dx = B.lon - A.lon;
  const dy = B.lat - A.lat;
  const M = {
    lon: M0.lon - dy * arcBend,
    lat: M0.lat + dx * arcBend
  };

  const seg1 = sampleGeodesic(A, M, samplesPerLeg);
  const seg2 = sampleGeodesic(M, B, samplesPerLeg);
  const airHoriz = [A, ...seg1, ...seg2];
  const airPoints: PathPoint[] = airHoriz.map((p) => ({
    lon: p.lon,
    lat: p.lat,
    alt: cruiseAlt,
    phase: 'cruise' as const
  }));

  // ------ 6) 下降段 B -> E0（不含 B 不含 E0）：高度由巡航平滑降到 0 ------
  const descendHoriz = sampleGeodesicExcludeEnd(B, E0, Math.max(24, Math.floor(samplesPerLeg * 0.25)));
  const descendPoints: PathPoint[] = descendHoriz.map((p, i) => {
    const u = descendHoriz.length <= 1 ? 1 : i / (descendHoriz.length - 1);
    const alt = cruiseAlt * (1 - smootherstep(u));
    return {
      lon: p.lon,
      lat: p.lat,
      alt,
      phase: 'approach' as const
    };
  });

  // ------ 7) 降落跑道段 E0 -> E1：贴地 ------
  const landingRunway = sampleGeodesicInclusive(E0, E1, runwaySamples);
  const landingPoints: PathPoint[] = landingRunway.map((p) => ({
    lon: p.lon,
    lat: p.lat,
    alt: 0,
    phase: 'landing' as const
  }));

  return [
    ...takeoffPoints,
    ...climbPoints,
    ...airPoints,
    ...descendPoints,
    ...landingPoints
  ];
}

/**
 * 按累计距离分配时间，生成匀速 SampledPositionProperty（起点/终点不覆写高度）
 */
export function buildSampledPositionFromPath(
  path: PathPoint[],
  totalSeconds?: number,
  startTime?: Cesium.JulianDate
): {
  prop: Cesium.SampledPositionProperty;
  start: Cesium.JulianDate;
  stop: Cesium.JulianDate;
} {
  const positions = path.map((p) =>
    Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt)
  );
  const n = positions.length;
  if (n < 2) {
    const start = Cesium.JulianDate.now();
    const prop = new Cesium.SampledPositionProperty();
    if (n === 1) prop.addSample(start, positions[0]);
    return {
      prop,
      start,
      stop: start
    };
  }
  const cumDist: number[] = [0];
  for (let i = 1; i < n; i++) {
    cumDist[i] = cumDist[i - 1] + Cesium.Cartesian3.distance(positions[i - 1], positions[i]);
  }
  const totalDist = cumDist[n - 1] || 1;
  const total = totalSeconds ?? totalDist / 200;
  const start = startTime ? Cesium.JulianDate.clone(startTime, new Cesium.JulianDate()) : Cesium.JulianDate.now();
  const prop = new Cesium.SampledPositionProperty();
  prop.setInterpolationOptions({
    interpolationDegree: 1,
    interpolationAlgorithm: Cesium.LinearApproximation
  });
  for (let i = 0; i < n; i++) {
    const t = (cumDist[i] / totalDist) * total;
    const jd = Cesium.JulianDate.addSeconds(start, t, new Cesium.JulianDate());
    prop.addSample(jd, positions[i]);
  }
  const stop = Cesium.JulianDate.addSeconds(start, total, new Cesium.JulianDate());
  return { prop, start, stop };
}
