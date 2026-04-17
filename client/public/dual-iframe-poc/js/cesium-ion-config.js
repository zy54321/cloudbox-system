/**
 * 双 iframe 静态子页：必须在加载 Cesium.js 之前执行。
 * 与 PoC 原版一致：仅设 Ion Token，不覆盖 CESIUM_BASE_URL（CDN 版 Cesium 自行推断）。
 */
(function () {
  if (typeof window.__CESIUM_ION_TOKEN__ === 'string' && window.__CESIUM_ION_TOKEN__) {
    return;
  }
  window.__CESIUM_ION_TOKEN__ = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3NWJhNGM0NC1jNWI1LTQ4OGItYWJmMS0yMmE1NjNmNmM2NWEiLCJpZCI6MTY4MTMsImlhdCI6MTc3MzM2NjQyMn0.do-dqwJ5RUbAK0Z6WyvKLKkSwzBEPFpB5CQRo7H0Slc';
})();
