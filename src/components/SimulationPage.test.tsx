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
    expect(screen.getByText("TA被性侵了该怎么做")).toBeTruthy();
    expect(screen.getByText(/不构成法律意见/)).toBeTruthy();
    expect(screen.getAllByText(/待法律校对/).length).toBe(3);
  });

  it("plays a full path to an ending with a debrief", async () => {
    render(<SimulationPage language="zh" onGoToAid={() => {}} />);
    fireEvent.click(screen.getByText("TA被家暴该怎么做"));

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
    expect(screen.getByText("拿到保护令——用六个月做规划")).toBeTruthy();
    expect(screen.queryByText("每次事发都拨 110 报警，每次都保留接处警记录")).toBeNull();
    expect(screen.queryByText("申请了人身安全保护令")).toBeNull();

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
    expect(summary?.correctItems).toHaveLength(3);
    expect(summary?.educationItems).toHaveLength(3);
    expect(summary?.educationItems.every((item) => !/^你/.test(item.title))).toBe(true);
    fireEvent.click(screen.getByText("查看具体分析"));

    // The lower analysis now contains only legal/practical guidance, without duplicates.
    expect(screen.getByText("法律提示与实用指引")).toBeTruthy();
    // Real flow section (collapsible) is present
    expect(screen.getByText(/真实流程/)).toBeTruthy();
    expect(screen.getByText("换一条路再走一遍")).toBeTruthy();
  });

  it("uses the unified result card for non-domestic scenarios", async () => {
    render(<SimulationPage language="zh" onGoToAid={() => {}} />);
    fireEvent.click(screen.getByText("TA被性骚扰了该怎么做"));
    fireEvent.click(screen.getByText(/文字骚扰/));
    fireEvent.click(screen.getByText("删除全部聊天记录"));
    fireEvent.click(screen.getByText("不回复也不拉黑——聊天窗口留着"));
    fireEvent.click(screen.getByText("暂时不处理"));
    fireEvent.click(screen.getByText("不再采取行动"));

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

  it("passes the low score to the red-band result card", async () => {
    render(<SimulationPage language="zh" onGoToAid={() => {}} />);
    fireEvent.click(screen.getByText("TA被家暴该怎么做"));
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
