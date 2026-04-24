/** 地面单元按展示名称对齐（trim），用于动静态并集 */
export function groundUnitNameKey(name) {
  return String(name ?? '').trim();
}

/**
 * 同名时保留静态架构标点（经纬度、图标、文案等），实体 id 沿用动态侧以便链路仍指向 yes-/no- 等 id。
 * @param {object} dynU
 * @param {object|null|undefined} statU
 */
function mergeDynamicWithStaticByName(dynU, statU) {
  if (!statU) return { ...dynU };
  const merged = { ...statU, id: dynU.id };
  if (dynU.attachToPlane != null) merged.attachToPlane = dynU.attachToPlane;
  return merged;
}

function collectStaticGroundByName(staticDoc) {
  const map = new Map();
  const clusters = staticDoc?.ground?.clusters;
  if (!Array.isArray(clusters)) return { map, firstCenter: null };
  let firstCenter = null;
  for (const c of clusters) {
    if (!firstCenter && c?.center) firstCenter = { ...c.center };
    for (const u of c.units || []) {
      const nk = groundUnitNameKey(u?.name);
      if (nk && !map.has(nk)) map.set(nk, u);
    }
  }
  return { map, firstCenter };
}

/**
 * 动态 units 文档与静态 units.json 地面部分合并：按 name 匹配，同名采用静态标点；仅静态存在的 name 追加到单独集群。
 * @param {object} dynamicDoc
 * @param {object} staticDoc
 * @returns {object}
 */
export function mergeGroundUnitsWithStatic(dynamicDoc, staticDoc) {
  const out = JSON.parse(JSON.stringify(dynamicDoc || {}));
  const { map: staticByName, firstCenter } = collectStaticGroundByName(staticDoc);
  if (staticByName.size === 0) return out;

  const dynamicNames = new Set();
  const clusters = out.ground?.clusters;
  if (Array.isArray(clusters)) {
    for (const c of clusters) {
      for (const u of c.units || []) {
        const nk = groundUnitNameKey(u?.name);
        if (nk) dynamicNames.add(nk);
      }
    }
    for (const c of clusters) {
      c.units = (c.units || []).map((u) =>
        mergeDynamicWithStaticByName(u, staticByName.get(groundUnitNameKey(u?.name)))
      );
    }
  }

  const extraAddedNames = new Set();
  const extraUnits = [];
  const sClusters = staticDoc?.ground?.clusters;
  if (Array.isArray(sClusters)) {
    for (const c of sClusters) {
      for (const u of c.units || []) {
        const nk = groundUnitNameKey(u?.name);
        if (!nk || dynamicNames.has(nk)) continue;
        if (extraAddedNames.has(nk)) continue;
        extraAddedNames.add(nk);
        extraUnits.push({ ...u });
      }
    }
  }
  if (extraUnits.length) {
    if (!out.ground) out.ground = { clusters: [] };
    if (!Array.isArray(out.ground.clusters)) out.ground.clusters = [];
    out.ground.clusters.push({
      clusterId: 'STATIC_ARCH_EXTRA',
      name: '静态架构地面（补充）',
      center: firstCenter || undefined,
      units: extraUnits
    });
  }
  return out;
}
