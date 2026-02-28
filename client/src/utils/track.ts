import * as Cesium from 'cesium';

/**
 * Chaikin 角点切割平滑：每轮在每段上插入 0.25/0.75 两点，使折线更圆滑。
 * @param points Cartesian3 数组
 * @param rounds 轮数，建议 2～3
 * @returns 平滑后的 Cartesian3 数组
 */
export function chaikinSmooth(
  points: Cesium.Cartesian3[],
  rounds: number = 2
): Cesium.Cartesian3[] {
  if (!points.length) return [];
  if (points.length < 2) return points.map((p) => p.clone());
  let current: Cesium.Cartesian3[] = points.map((p) => p.clone());
  for (let r = 0; r < rounds; r++) {
    const next: Cesium.Cartesian3[] = [current[0].clone()];
    for (let i = 0; i < current.length - 1; i++) {
      const p0 = current[i];
      const p1 = current[i + 1];
      next.push(Cesium.Cartesian3.lerp(p0, p1, 0.25, new Cesium.Cartesian3()));
      next.push(Cesium.Cartesian3.lerp(p0, p1, 0.75, new Cesium.Cartesian3()));
    }
    next.push(current[current.length - 1].clone());
    current = next;
  }
  return current;
}

/**
 * 等距重采样：沿折线每隔 stepMeters 取一个点。
 * @param points Cartesian3 数组（世界坐标，Cesium 单位即米）
 * @param stepMeters 步长（米）
 * @returns 重采样后的 Cartesian3 数组
 */
export function resampleByStep(
  points: Cesium.Cartesian3[],
  stepMeters: number
): Cesium.Cartesian3[] {
  if (!points.length || stepMeters <= 0) return points.map((p) => p.clone());
  if (points.length === 1) return [points[0].clone()];
  const out: Cesium.Cartesian3[] = [points[0].clone()];
  let totalDist = 0;
  let nextDist = stepMeters;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const segLen = Cesium.Cartesian3.distance(a, b);
    const segStart = totalDist;
    const segEnd = totalDist + segLen;
    if (segLen >= 1e-6) {
      while (nextDist <= segEnd) {
        const t = (nextDist - segStart) / segLen;
        out.push(Cesium.Cartesian3.lerp(a, b, t, new Cesium.Cartesian3()));
        nextDist += stepMeters;
      }
    }
    totalDist = segEnd;
  }
  out.push(points[points.length - 1].clone());
  return out;
}
