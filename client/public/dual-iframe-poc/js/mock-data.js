(function () {
  function position(lon, lat, height) {
    return { lon: lon, lat: lat, height: height };
  }

  window.MockScenarioData = {
    left: {
      name: "left",
      duration: 24,
      themeColor: "#67d5ff",
      initialView: {
        destination: position(116.96, 40.02, 140000)
      },
      airplane: {
        label: "有云匣子飞机",
        color: "#67d5ff",
        path: [
          { t: 0, position: position(116.32, 39.90, 12000) },
          { t: 5, position: position(116.78, 39.96, 13200) },
          { t: 9, position: position(117.22, 40.02, 14200) },
          { t: 13, position: position(117.75, 40.14, 15000) },
          { t: 18, position: position(118.16, 40.28, 15800) },
          { t: 24, position: position(118.62, 40.35, 16200) }
        ]
      },
      points: [
        {
          id: "cloud-box",
          label: "云匣子",
          color: "#8dffbd",
          visibleFrom: 0,
          visibleTo: 18,
          position: position(116.95, 39.98, 0)
        },
        {
          id: "relay-station",
          label: "中继站",
          color: "#ffd36b",
          visibleFrom: 4,
          visibleTo: 24,
          position: position(117.56, 40.18, 0)
        },
        {
          id: "ground-hub",
          label: "地面站",
          color: "#8fb8ff",
          visibleFrom: 2,
          visibleTo: 24,
          position: position(117.18, 39.88, 0)
        },
        {
          id: "support-team",
          label: "保障组",
          color: "#ff9be3",
          visibleFrom: 10,
          visibleTo: 24,
          position: position(118.08, 40.31, 0)
        }
      ],
      links: [
        {
          id: "aircraft-to-cloud-box",
          from: "aircraft",
          to: "cloud-box",
          color: "#6ff7d3",
          visibleFrom: 2,
          visibleTo: 9
        },
        {
          id: "cloud-box-to-relay",
          from: "cloud-box",
          to: "relay-station",
          color: "#ffe48b",
          visibleFrom: 8,
          visibleTo: 24
        },
        {
          id: "cloud-box-to-ground-hub",
          from: "cloud-box",
          to: "ground-hub",
          color: "#7ab7ff",
          visibleFrom: 3,
          visibleTo: 16
        },
        {
          id: "aircraft-to-relay",
          from: "aircraft",
          to: "relay-station",
          color: "#66f2ff",
          visibleFrom: 11,
          visibleTo: 24
        },
        {
          id: "relay-to-support-team",
          from: "relay-station",
          to: "support-team",
          color: "#ffb3ea",
          visibleFrom: 14,
          visibleTo: 24
        }
      ],
      keyframes: {
        keyMoment1: {
          time: 6,
          camera: {
            destination: position(116.88, 39.97, 60000),
            duration: 1.8
          }
        },
        keyMoment2: {
          time: 15,
          camera: {
            destination: position(117.70, 40.16, 70000),
            duration: 2.2
          }
        }
      }
    },
    right: {
      name: "right",
      duration: 24,
      themeColor: "#ff9f7a",
      initialView: {
        destination: position(117.45, 39.94, 150000)
      },
      airplane: {
        label: "无云匣子飞机",
        color: "#ff9f7a",
        path: [
          { t: 0, position: position(116.32, 39.90, 12000) },
          { t: 5, position: position(116.84, 39.95, 12600) },
          { t: 9, position: position(117.42, 39.98, 13000) },
          { t: 13, position: position(118.06, 39.95, 12600) },
          { t: 18, position: position(118.58, 39.88, 11800) },
          { t: 24, position: position(118.96, 39.82, 11200) }
        ]
      },
      points: [
        {
          id: "fallback-station",
          label: "应急站点",
          color: "#ffbe6b",
          visibleFrom: 3,
          visibleTo: 24,
          position: position(117.12, 39.92, 0)
        },
        {
          id: "manual-team",
          label: "人工保障组",
          color: "#ff7f7f",
          visibleFrom: 10,
          visibleTo: 24,
          position: position(118.18, 39.87, 0)
        },
        {
          id: "temporary-radar",
          label: "临时雷达",
          color: "#87d8ff",
          visibleFrom: 1,
          visibleTo: 24,
          position: position(117.72, 39.99, 0)
        },
        {
          id: "manual-command",
          label: "人工指挥点",
          color: "#d3a6ff",
          visibleFrom: 8,
          visibleTo: 24,
          position: position(118.52, 39.84, 0)
        }
      ],
      links: [
        {
          id: "aircraft-to-fallback",
          from: "aircraft",
          to: "fallback-station",
          color: "#ffcf87",
          visibleFrom: 5,
          visibleTo: 11
        },
        {
          id: "fallback-to-manual",
          from: "fallback-station",
          to: "manual-team",
          color: "#ff8f8f",
          visibleFrom: 12,
          visibleTo: 24
        },
        {
          id: "aircraft-to-radar",
          from: "aircraft",
          to: "temporary-radar",
          color: "#95e0ff",
          visibleFrom: 2,
          visibleTo: 14
        },
        {
          id: "radar-to-command",
          from: "temporary-radar",
          to: "manual-command",
          color: "#c5a8ff",
          visibleFrom: 9,
          visibleTo: 24
        },
        {
          id: "manual-team-to-command",
          from: "manual-team",
          to: "manual-command",
          color: "#ffbbcf",
          visibleFrom: 14,
          visibleTo: 24
        }
      ],
      keyframes: {
        keyMoment1: {
          time: 6,
          camera: {
            destination: position(117.10, 39.93, 75000),
            duration: 1.8
          }
        },
        keyMoment2: {
          time: 15,
          camera: {
            destination: position(118.15, 39.88, 85000),
            duration: 2.2
          }
        }
      }
    }
  };
})();
