import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SimulationPage from "@/components/SimulationPage";
import { renderScoreCard } from "@/lib/simulationImage";

// jsdom does not implement HTMLCanvasElement.getContext or URL.createObjectURL,
// which the result-card renderer needs. Stub them so ScoreCard resolves to a
// blob URL and renders the inline image + "long-press to save" prompt.
vi.mock("@/lib/simulationImage", async () => {
  return {
    renderScoreCard: vi.fn(async () => new Blob(["fake"], { type: "image/png" })),
    saveOrShareBlob: vi.fn(async () => ({ method: "download" as const })),
  };
});
if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
}

describe("SimulationPage", () => {
  it("shows the scenario picker with disclaimer", () => {
    render(<SimulationPage language="zh" onGoToAid={() => {}} />);
    expect(screen.getByText("模拟练习")).toBeTruthy();
    expect(screen.getByText("TA被家暴该怎么做")).toBeTruthy();
    expect(screen.getByText("TA被性骚扰了该怎么做")).toBeTruthy();
    expect(screen.getByText("性侵害发生后可以怎么做")).toBeTruthy();
    expect(screen.getByText("向亲友求助后遭遇“二次伤害”怎么办")).toBeTruthy();
    expect(screen.getByText("技术促成的性别暴力")).toBeTruthy();
    expect(screen.getByText(/不构成法律意见/)).toBeTruthy();
    expect(screen.getAllByText(/待法律校对/).length).toBe(5);
  });

  it("shows a sensitive-content warning before entering a scenario", () => {
    render(<SimulationPage language="zh" onGoToAid={() => {}} />);

    fireEvent.click(screen.getByText("TA被家暴该怎么做"));

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText("敏感内容提示")).toBeTruthy();
    expect(screen.getByText(/部分内容可能令人不适，或触发创伤记忆/)).toBeTruthy();
    expect(screen.queryByText("我现在就需要真实帮助")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "返回" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByText("选择情景")).toBeTruthy();

    fireEvent.click(screen.getByText("TA被家暴该怎么做"));
    fireEvent.click(screen.getByRole("button", { name: "继续进入练习" }));
    expect(screen.getByText("我现在就需要真实帮助")).toBeTruthy();
  });

  it("plays a full path to an ending with a debrief", async () => {
    render(<SimulationPage language="zh" onGoToAid={() => {}} />);
    fireEvent.click(screen.getByText("TA被家暴该怎么做"));
    fireEvent.click(screen.getByText("继续进入练习"));

    // Opening scene: three-way branch selection with real-help exit visible
    expect(screen.getByText("我现在就需要真实帮助")).toBeTruthy();
    fireEvent.click(screen.getByText(/分手后/));

    // post-open scene
    fireEvent.click(screen.getByText(/每次事发都拨 110 报警/));
    // post-safety scene
    fireEvent.click(screen.getByText(/向所在地家事法庭申请人身安全保护令/));
    // po-application auto → po-granted (multi-reports flag was set)
    // po-granted scene
    fireEvent.click(screen.getByText("暂不起诉离婚"));

    // Every scenario now opens the same result-report shell and direct-save image.
    expect(screen.getByTestId("simulation-result-report")).toBeTruthy();
    expect(screen.getByText("保护性选择")).toBeTruthy();
    expect(screen.getByText("避开风险")).toBeTruthy();
    expect(screen.getByText("拿到保护令——用六个月做规划")).toBeTruthy();
    expect(screen.queryByText("每次事发都拨 110 报警，每次都保留接处警记录")).toBeNull();
    expect(screen.queryByText("申请了人身安全保护令")).toBeNull();

    // Both result factors expand into path-specific details.
    fireEvent.click(screen.getByRole("button", { name: /保护性选择/ }));
    expect(screen.getByText("本次路径中的保护性选择")).toBeTruthy();
    expect(screen.getByText("每次事发都拨 110 报警，每次都保留接处警记录")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /避开风险/ }));
    expect(screen.getByText("本次路径中避开的风险")).toBeTruthy();
    expect(screen.getByText("通过他的家人劝阻")).toBeTruthy();

    // The shareable canvas is generated directly, with fixed 3 + 3 lists.
    expect(await screen.findByTestId("shareable-score-card")).toBeTruthy();
    expect(screen.queryByText("保存可分享的结果卡片")).toBeNull();
    expect(vi.mocked(renderScoreCard)).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variant: "domestic-report",
        score: expect.objectContaining({ score: 66 }),
        summary: expect.objectContaining({
          scoreTitle: "家庭暴力安全应对 · 知识储备得分",
          shareHint: "长按保存图片 · 希望这些知识永远不必用上",
          correctItems: expect.arrayContaining([expect.objectContaining({ title: expect.any(String) })]),
          educationItems: expect.arrayContaining([expect.objectContaining({ title: expect.any(String) })]),
          qrLabel: "扫码体验内测版",
        }),
      })
    );
    const summary = vi.mocked(renderScoreCard).mock.lastCall?.[0].summary;
    expect(summary).not.toHaveProperty("protectiveCount");
    expect(summary).not.toHaveProperty("avoidedRiskCount");
    expect(summary?.correctItems).toHaveLength(3);
    expect(summary?.educationItems).toHaveLength(3);
    expect(summary?.educationItems.every((item) => !/^你/.test(item.title))).toBe(true);
    fireEvent.click(screen.getByText("查看具体分析"));

    // The lower analysis now contains only practical guidance, without duplicates.
    expect(screen.getByText("实用提示与参考建议")).toBeTruthy();
    expect(screen.queryByText("法律提示与实用指引")).toBeNull();
    expect(screen.getByRole("button", { name: /本次流程中的实用提示/ })).toBeTruthy();
    expect(screen.queryByText(/本次流程中的法律提示/)).toBeNull();
    // Real flow section (collapsible) is present
    expect(screen.getByText(/真实流程/)).toBeTruthy();
    expect(screen.queryByText(/你做对了/)).toBeNull();
    expect(screen.queryByText(/这次你避开的风险/)).toBeNull();
    expect(screen.queryByText("复盘")).toBeNull();
    expect(screen.getByText("换一条路再走一遍")).toBeTruthy();
  });

  it("uses the unified result card for non-domestic scenarios", async () => {
    render(<SimulationPage language="zh" onGoToAid={() => {}} />);
    fireEvent.click(screen.getByText("TA被性骚扰了该怎么做"));
    fireEvent.click(screen.getByText("继续进入练习"));
    fireEvent.click(screen.getByText(/文字骚扰/));
    fireEvent.click(screen.getByText("因为不愿再看到而删除全部记录"));
    fireEvent.click(screen.getByText("向平台投诉并保存受理回执"));

    expect(screen.getByTestId("simulation-result-report")).toBeTruthy();
    expect(await screen.findByTestId("shareable-score-card")).toBeTruthy();
    expect(vi.mocked(renderScoreCard)).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variant: "domestic-report",
        summary: expect.objectContaining({
          scoreTitle: "性骚扰安全应对 · 知识储备得分",
          correctItems: expect.arrayContaining([expect.any(Object)]),
          educationItems: expect.arrayContaining([expect.any(Object)]),
        }),
      })
    );
  });

  it("uses the same expandable result system for the sexual-assault scenario", async () => {
    render(<SimulationPage language="zh" onGoToAid={() => {}} />);
    fireEvent.click(screen.getByText("性侵害发生后可以怎么做"));
    fireEvent.click(screen.getByText("继续进入练习"));
    fireEvent.click(screen.getByText("事情刚刚发生"));
    fireEvent.click(screen.getByText("转移到安全地点并联系紧急服务"));
    fireEvent.click(screen.getByText("就医，并询问本地证据保存选项"));
    fireEvent.click(screen.getByText("保存现有数字记录，并记下可能的证人或监控地点"));
    fireEvent.click(screen.getByText("决定前先咨询 12348 或律师"));

    expect(screen.getByTestId("simulation-result-report")).toBeTruthy();
    expect(screen.getByRole("button", { name: /保护性选择/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /避开风险/ })).toBeTruthy();
    expect(screen.queryByText("事情刚刚发生")).toBeNull();
    expect(await screen.findByTestId("shareable-score-card")).toBeTruthy();
  });

  it("uses the same expandable result system for technology-facilitated violence", async () => {
    render(<SimulationPage language="zh" onGoToAid={() => {}} />);
    fireEvent.click(screen.getByText("技术促成的性别暴力"));
    fireEvent.click(screen.getByText("继续进入练习"));
    fireEvent.click(screen.getByText("色情深度伪造或冒名账号正在传播"));
    fireEvent.click(screen.getByText("不转发影像，保存网址、账号 ID、时间、搜索结果和转载关系"));
    fireEvent.click(screen.getByText("咨询律师或 12348，了解通知删除及其他救济"));

    expect(screen.getByTestId("simulation-result-report")).toBeTruthy();
    expect(screen.getByRole("button", { name: /保护性选择/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /避开风险/ })).toBeTruthy();
    expect(screen.queryByText("色情深度伪造或冒名账号正在传播")).toBeNull();
    expect(await screen.findByTestId("shareable-score-card")).toBeTruthy();
  });

  it("uses a non-scored reflection report for secondary victimisation", () => {
    render(<SimulationPage language="zh" onGoToAid={() => {}} />);
    fireEvent.click(screen.getByText("向亲友求助后遭遇“二次伤害”怎么办"));
    fireEvent.click(screen.getByText("继续进入练习"));
    fireEvent.click(screen.getByText("对方质疑或责怪我"));
    fireEvent.click(screen.getByText("说：“我需要你倾听，不是判断这件事有没有发生。”"));
    fireEvent.click(screen.getByText("转向另一位可信任的人或专业服务"));

    expect(screen.getByTestId("simulation-reflection-report")).toBeTruthy();
    expect(screen.getByText("你的反应不需要被打分。")).toBeTruthy();
    expect(screen.queryByTestId("simulation-result-report")).toBeNull();
    expect(screen.queryByText(/知识储备得分/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /边界与支持选择/ }));
    expect(screen.getByText("本次路径中的边界与支持")).toBeTruthy();
    expect(screen.getByText("说：“我需要你倾听，不是判断这件事有没有发生。”")).toBeTruthy();
    expect(screen.getByText("转向另一位可信任的人或专业服务")).toBeTruthy();

    fireEvent.click(screen.getByText("查看具体分析"));
    expect(screen.queryByText("你的边界与支持选择")).toBeNull();
    expect(screen.queryByText("这条路线没有产生复盘条目。")).toBeNull();
    expect(screen.getByText(/真实流程与参考步骤/)).toBeTruthy();
  });

  it("passes the low score to the red-band result card", async () => {
    render(<SimulationPage language="zh" onGoToAid={() => {}} />);
    fireEvent.click(screen.getByText("TA被家暴该怎么做"));
    fireEvent.click(screen.getByText("继续进入练习"));
    fireEvent.click(screen.getByText("长期——这样的事持续了几个月或几年"));
    fireEvent.click(screen.getByText("继续这样过"));
    fireEvent.click(screen.getByText("暂时不采取行动"));

    expect(await screen.findByTestId("shareable-score-card")).toBeTruthy();
    expect(vi.mocked(renderScoreCard)).toHaveBeenLastCalledWith(
      expect.objectContaining({ score: expect.objectContaining({ score: 32, band: "weak" }) })
    );
  });

  it("passes the high score to the green-band result card", async () => {
    render(<SimulationPage language="zh" onGoToAid={() => {}} />);
    fireEvent.click(screen.getByText("TA被家暴该怎么做"));
    fireEvent.click(screen.getByText("继续进入练习"));
    fireEvent.click(screen.getByText("紧急——现在正在发生，或刚刚发生"));
    fireEvent.click(screen.getByText("跑到邻居家，从那里拨打 110"));
    fireEvent.click(screen.getByText("做完询问笔录，签字受案"));
    fireEvent.click(screen.getByText("今晚就去医院，并要求做法医鉴定"));
    fireEvent.click(screen.getByText("拨打 12338 询问临时庇护所"));
    fireEvent.click(screen.getByText("同时申请保护令 + 咨询离婚"));
    fireEvent.click(screen.getByText("同时依民法典 1091 条提起离婚 + 损害赔偿"));

    expect(await screen.findByTestId("shareable-score-card")).toBeTruthy();
    expect(vi.mocked(renderScoreCard)).toHaveBeenLastCalledWith(
      expect.objectContaining({ score: expect.objectContaining({ score: 94, band: "excellent" }) })
    );
  });

  it("real-help panel opens and routes to the aid tab", () => {
    const onGoToAid = vi.fn();
    render(<SimulationPage language="zh" onGoToAid={onGoToAid} />);
    fireEvent.click(screen.getByText("TA被家暴该怎么做"));
    fireEvent.click(screen.getByText("继续进入练习"));
    fireEvent.click(screen.getByText("我现在就需要真实帮助"));
    expect(screen.getByText("110")).toBeTruthy();
    expect(screen.getByText("12338")).toBeTruthy();
    fireEvent.click(screen.getByText("打开援助目录"));
    expect(onGoToAid).toHaveBeenCalled();
  });

  it("renders bilingually (EN)", () => {
    render(<SimulationPage language="en" onGoToAid={() => {}} />);
    expect(screen.getByText("Practice Simulator")).toBeTruthy();
    expect(screen.getByText(/What to Do When Someone Is Being Abused/)).toBeTruthy();
  });
});
