package cloudbox.platform.service;

import cloudbox.platform.dto.dynamic.*;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * 动态交互数据服务（教学演示用，脚本数据）
 */
@Service
public class DynamicFlowService {

    private static final List<Map<String, Object>> SCENARIOS = List.of(
            Map.<String, Object>of("key", "engine", "name", "单发失效"),
            Map.<String, Object>of("key", "smoke", "name", "烟雾异味"),
            Map.<String, Object>of("key", "nav", "name", "导航失效"),
            Map.<String, Object>of("key", "hijack", "name", "劫机"),
            Map.<String, Object>of("key", "misop", "name", "人为误操作"),
            Map.<String, Object>of("key", "generic", "name", "通用时序演示")
    );

    private static final int[] SAVES = {0, 5, 10, 15, 20, 25, 35, 35, 35};

    public List<Map<String, Object>> getScenarios() {
        return new ArrayList<>(SCENARIOS);
    }

    public Map<String, Object> getScenarioSteps(ScenarioStepsRequest req) {
        String key = req.getScenarioKey() != null ? req.getScenarioKey() : "engine";
        List<Map<String, Object>> baseSteps = buildBaseSteps(key);
        List<Map<String, Object>> steps = new ArrayList<>();
        for (int i = 0; i < baseSteps.size(); i++) {
            Map<String, Object> s = baseSteps.get(i);
            int tNo = ((Number) s.get("t")).intValue();
            int tYes = Math.max(0, tNo - (i < SAVES.length ? SAVES[i] : 35));
            int hopsNo = 3 + Math.min(i, 2);
            int hopsYes = Math.max(1, hopsNo - 1 - i / 2);
            Map<String, Object> step = new HashMap<>(s);
            step.put("t_no", tNo);
            step.put("t_yes", tYes);
            step.put("nodeId", i);
            step.put("id", i);
            step.put("hops_no", hopsNo);
            step.put("hops_yes", hopsYes);
            step.put("path_no", "地面→中继" + (i + 1) + "→中继" + (i + 2) + "→机载");
            step.put("path_yes", hopsYes > 1 ? "地面→中继" + (i + 1) + "→机载" : "地面→机载");
            steps.add(step);
        }
        List<Map<String, Object>> disposalCards = new ArrayList<>();
        for (Map<String, Object> s : steps) {
            Map<String, Object> card = new HashMap<>();
            card.put("id", s.get("id"));
            card.put("nodeId", s.get("nodeId"));
            card.put("phase", s.get("phase"));
            card.put("title", s.get("title"));
            card.put("summary", s.get("summary"));
            card.put("state", s.get("state"));
            card.put("t_no", s.get("t_no"));
            card.put("t_yes", s.get("t_yes"));
            card.put("t", s.get("t_no"));
            card.put("events", s.get("events"));
            card.put("evidence", s.get("evidence"));
            card.put("actions", s.get("actions"));
            card.put("alert", s.getOrDefault("alert", ""));
            int tNo = ((Number) s.get("t_no")).intValue();
            int tYes = ((Number) s.get("t_yes")).intValue();
            int hopsNo = ((Number) s.get("hops_no")).intValue();
            int hopsYes = ((Number) s.get("hops_yes")).intValue();
            card.put("compare", Map.of(
                    "t_no", tNo, "t_yes", tYes, "dt", Math.abs(tNo - tYes),
                    "hops_no", hopsNo, "hops_yes", hopsYes, "dhops", hopsNo - hopsYes,
                    "path_no", s.get("path_no"), "path_yes", s.get("path_yes")
            ));
            disposalCards.add(card);
        }
        return Map.of("steps", steps, "disposalCards", disposalCards);
    }

    private List<Map<String, Object>> buildBaseSteps(String scenarioKey) {
        switch (scenarioKey) {
            case "engine" -> {
                return List.of(
                        step(0, "起始", "证实", "进入场景：单发失效（示意）", false, "待证实", List.of("进入场景：单发失效（示意）"), List.of(), List.of()),
                        step(10, "发现异常", "证实", "发动机参数异常（示意）", true, "证实中", List.of("发动机参数异常（示意）", "机组报告异常（示意）"), List.of("机组报告异常（示意）"), List.of("发起研判")),
                        step(25, "证实完成", "决策", "确认：单发失效（示意）", true, "已证实", List.of("确认：单发失效（示意）"), List.of("多源证据"), List.of("确认结论")),
                        step(45, "决策", "决策", "建议：保持高度/评估备降（示意）", true, "决策中", List.of("建议：保持高度/评估备降（示意）"), List.of("航路限制"), List.of("制定备选")),
                        step(65, "协调", "协调", "通知：空管/机场/航司（示意）", true, "协调中", List.of("通知：空管/机场/航司（示意）"), List.of("通联记录"), List.of("协调资源")),
                        step(85, "指挥执行", "指挥", "下达：改航路/优先落地（示意）", true, "执行中", List.of("下达：改航路/优先落地（示意）"), List.of("执行回执"), List.of("下发指令")),
                        step(100, "闭环", "指挥", "处置完成（示意）", false, "完成", List.of("处置完成（示意）"), List.of("复盘记录"), List.of("归档数据"))
                );
            }
            case "smoke" -> {
                return List.of(
                        step(0, "起始", "证实", "进入场景：烟雾异味（示意）", false, "待证实", List.of("进入场景：烟雾异味（示意）"), List.of(), List.of()),
                        step(15, "发现烟雾", "证实", "烟雾颜色由黄到红（示意）", true, "证实中", List.of("烟雾颜色由黄到红（示意）", "浓度数值上升（示意）"), List.of("监测数据"), List.of("发起研判")),
                        step(35, "证实完成", "决策", "确认：烟雾/异味（示意）", true, "已证实", List.of("确认：烟雾/异味（示意）"), List.of("多源证据"), List.of("确认结论")),
                        step(55, "决策", "决策", "建议：降低高度/备降评估（示意）", true, "决策中", List.of("建议：降低高度/备降评估（示意）"), List.of("航路限制"), List.of("制定备选")),
                        step(75, "协调", "协调", "通知：空管/机场（示意）", true, "协调中", List.of("通知：空管/机场（示意）"), List.of("通联记录"), List.of("协调资源")),
                        step(95, "指挥执行", "指挥", "指令：优先落地/灭火准备（示意）", true, "执行中", List.of("指令：优先落地/灭火准备（示意）"), List.of("执行回执"), List.of("下发指令")),
                        step(100, "闭环", "指挥", "处置完成（示意）", false, "完成", List.of("处置完成（示意）"), List.of("复盘记录"), List.of("归档数据"))
                );
            }
            case "nav" -> {
                return List.of(
                        step(0, "起始", "证实", "进入场景：导航失效（示意）", false, "待证实", List.of("进入场景：导航失效（示意）"), List.of(), List.of()),
                        step(12, "航线异常", "证实", "预定航线虚化闪烁（示意）", true, "证实中", List.of("预定航线虚化闪烁（示意）", "实际轨迹蓝色虚线生成（示意）"), List.of("监测数据"), List.of("发起研判")),
                        step(30, "导航模块失效", "决策", "导航模块红色闪烁（示意）", true, "已证实", List.of("导航模块红色闪烁（示意）", "弹出故障警示（示意）"), List.of("多源证据"), List.of("确认结论")),
                        step(55, "决策", "决策", "建议：转人工导航/改航路（示意）", true, "决策中", List.of("建议：转人工导航/改航路（示意）"), List.of("航路限制"), List.of("制定备选")),
                        step(75, "协调", "协调", "通知：空管/机场/航司（示意）", true, "协调中", List.of("通知：空管/机场/航司（示意）"), List.of("通联记录"), List.of("协调资源")),
                        step(95, "指挥执行", "指挥", "执行：改航路/备降准备（示意）", true, "执行中", List.of("执行：改航路/备降准备（示意）"), List.of("执行回执"), List.of("下发指令")),
                        step(100, "闭环", "指挥", "处置完成（示意）", false, "完成", List.of("处置完成（示意）"), List.of("复盘记录"), List.of("归档数据"))
                );
            }
            case "hijack" -> {
                return List.of(
                        step(0, "起始", "证实", "进入场景：劫机（示意）", false, "待证实", List.of("进入场景：劫机（示意）"), List.of(), List.of()),
                        step(10, "触发警报", "证实", "飞机红闪/弹出劫持警报（示意）", true, "证实中", List.of("飞机红闪/弹出劫持警报（示意）"), List.of("监测数据"), List.of("发起研判")),
                        step(25, "威胁区生成", "决策", "航线断裂（示意）", true, "已证实", List.of("航线断裂（示意）", "生成红色威胁扇形区（示意）"), List.of("多源证据"), List.of("确认结论")),
                        step(50, "决策", "决策", "建议：联动安保/应急预案（示意）", true, "决策中", List.of("建议：联动安保/应急预案（示意）"), List.of("航路限制"), List.of("制定备选")),
                        step(75, "协调", "协调", "通知：空管/机场/航司/地面监控（示意）", true, "协调中", List.of("通知：空管/机场/航司/地面监控（示意）"), List.of("通联记录"), List.of("协调资源")),
                        step(95, "指挥执行", "指挥", "执行：空域隔离/地面应急（示意）", true, "执行中", List.of("执行：空域隔离/地面应急（示意）"), List.of("执行回执"), List.of("下发指令")),
                        step(100, "闭环", "指挥", "处置完成（示意）", false, "完成", List.of("处置完成（示意）"), List.of("复盘记录"), List.of("归档数据"))
                );
            }
            case "misop", "human" -> {
                return List.of(
                        step(0, "起始", "证实", "进入场景：人为误操作（示意）", false, "待证实", List.of("进入场景：人为误操作（示意）"), List.of(), List.of()),
                        step(8, "参数异常", "证实", "误操作区域闪烁（示意）", true, "证实中", List.of("误操作区域闪烁（示意）", "参数跳动发光（示意）"), List.of("监测数据"), List.of("发起研判")),
                        step(22, "超限时间触发", "决策", "展示超限时间（示意）", true, "已证实", List.of("展示超限时间（示意）", "轨迹抖动（示意）"), List.of("多源证据"), List.of("确认结论")),
                        step(45, "决策", "决策", "建议：回退参数/切换冗余（示意）", true, "决策中", List.of("建议：回退参数/切换冗余（示意）"), List.of("航路限制"), List.of("制定备选")),
                        step(65, "协调", "协调", "通知：空管/机场/航司（示意）", true, "协调中", List.of("通知：空管/机场/航司（示意）"), List.of("通联记录"), List.of("协调资源")),
                        step(85, "指挥执行", "指挥", "执行：恢复/稳定航迹（示意）", true, "执行中", List.of("执行：恢复/稳定航迹（示意）"), List.of("执行回执"), List.of("下发指令")),
                        step(100, "闭环", "指挥", "处置完成（示意）", false, "完成", List.of("处置完成（示意）"), List.of("复盘记录"), List.of("归档数据"))
                );
            }
            default -> {
                return List.of(
                        step(0, "起始", "证实", "通用演示：故障 → 感知-识别-处置（示意）", false, "待证实", List.of("通用演示（示意）"), List.of(), List.of()),
                        step(12, "体系感知", "证实", "告警触发（示意）", true, "证实中", List.of("告警触发（示意）", "信息上报（示意）"), List.of("监测数据"), List.of("发起研判")),
                        step(30, "识别", "决策", "风险识别（示意）", true, "已证实", List.of("风险识别（示意）", "证据聚合（示意）"), List.of("多源证据"), List.of("确认结论")),
                        step(55, "处置决策", "决策", "方案生成（示意）", true, "决策中", List.of("方案生成（示意）", "评估与选择（示意）"), List.of("航路限制"), List.of("制定备选")),
                        step(75, "协调", "协调", "跨单位协同（示意）", true, "协调中", List.of("跨单位协同（示意）"), List.of("通联记录"), List.of("协调资源")),
                        step(95, "指挥执行", "指挥", "执行链路（示意）", true, "执行中", List.of("执行链路（示意）"), List.of("执行回执"), List.of("下发指令")),
                        step(100, "闭环", "指挥", "演示完成（示意）", false, "完成", List.of("演示完成（示意）"), List.of("复盘记录"), List.of("归档数据"))
                );
            }
        }
    }

    private static Map<String, Object> step(int t, String title, String phase, String summary, boolean alert, String state,
                                           List<String> events, List<String> evidence, List<String> actions) {
        Map<String, Object> m = new HashMap<>();
        m.put("t", t);
        m.put("name", title);
        m.put("title", title);
        m.put("phase", phase);
        m.put("summary", summary);
        m.put("alert", alert);
        m.put("state", state);
        m.put("events", events);
        m.put("evidence", evidence);
        m.put("actions", actions);
        return m;
    }

    public Map<String, Object> getFlightInfo(FlightInfoRequest req) {
        String key = req.getScenarioKey() != null ? req.getScenarioKey() : "engine";
        String name = SCENARIOS.stream()
                .filter(s -> key.equals(s.get("key")))
                .map(s -> (String) s.get("name"))
                .findFirst()
                .orElse("单发失效");
        return Map.of(
                "f_no", "MU0001",
                "f_type", "A320（示意）",
                "f_route", "WPT-1 → WPT-3（示意）",
                "f_time", "T+0 ~ T+100（示意）",
                "f_state", "待证实",
                "f_node", "起始",
                "scenarioKey", key,
                "scenarioName", name
        );
    }

    public List<Map<String, Object>> getEvents(EventsRequest req) {
        ScenarioStepsRequest sr = new ScenarioStepsRequest();
        sr.setScenarioKey(req.getScenarioKey());
        Map<String, Object> data = getScenarioSteps(sr);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> steps = (List<Map<String, Object>>) data.get("steps");
        int currentTime = req.getCurrentTime() != null ? req.getCurrentTime() : 0;
        List<Map<String, Object>> events = new ArrayList<>();
        for (Map<String, Object> s : steps) {
            int tNo = ((Number) s.get("t_no")).intValue();
            if (currentTime < tNo) continue;
            @SuppressWarnings("unchecked")
            List<String> evs = (List<String>) s.get("events");
            if (evs != null) {
                for (String ev : evs) {
                    events.add(Map.of(
                            "text", ev,
                            "time", tNo,
                            "step", s.get("name"),
                            "state", s.get("state")
                    ));
                }
            }
        }
        return events;
    }

    public Map<String, Object> getRiskKpi(RiskKpiRequest req) {
        String key = req.getScenarioKey() != null ? req.getScenarioKey() : "engine";
        String name = SCENARIOS.stream()
                .filter(s -> key.equals(s.get("key")))
                .map(s -> (String) s.get("name"))
                .findFirst()
                .orElse("单发失效");
        String pos = switch (key) {
            case "engine" -> "WPT-2 附近（示意）";
            case "smoke" -> "客舱区域（示意）";
            case "nav" -> "航路段（示意）";
            case "hijack" -> "空域段（示意）";
            case "misop", "human" -> "关键参数链路（示意）";
            default -> "—";
        };
        return Map.of(
                "riskType", name,
                "riskPos", pos,
                "riskTime", "T+10s（示意）",
                "riskCmd", "建议：证实 → 决策 → 协调 → 指挥（示意）",
                "kpi1", "+15%（示意）",
                "kpi2", "处置链路缩短（示意）",
                "kpi3", "-35s（示意）"
        );
    }

    public List<Map<String, Object>> getHistory(HistoryRequest req) {
        EventsRequest er = new EventsRequest();
        er.setScenarioKey(req.getScenarioKey());
        er.setCurrentTime(100);
        return getEvents(er);
    }
}
