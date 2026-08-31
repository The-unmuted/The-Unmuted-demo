import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SimulationPage from "@/components/SimulationPage";

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
    expect(screen.getByText("TA正在被家暴该怎么做")).toBeTruthy();
    expect(screen.getByText("TA被性骚扰了该怎么做")).toBeTruthy();
    expect(screen.getByText("TA被性侵了该怎么做")).toBeTruthy();
    expect(screen.getByText(/不构成法律意见/)).toBeTruthy();
    expect(screen.getAllByText(/待法律校对/).length).toBe(3);
  });

  it("plays a full path to an ending with a debrief", async () => {
    render(<SimulationPage language="zh" onGoToAid={() => {}} />);
    fireEvent.click(screen.getByText("TA正在被家暴该怎么做"));

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

    // Ending: result card renders asynchronously (canvas → blob → inline image).
    expect(await screen.findByText(/长按下方图片/)).toBeTruthy();
    fireEvent.click(screen.getByText("查看具体分析"));

    // Now the ending summary + debrief are visible
    expect(screen.getByText("拿到保护令——用六个月做规划")).toBeTruthy();
    expect(screen.getByText(/复盘/)).toBeTruthy();
    // Debrief blocks are collapsed by default; expand "你做对了" to reach specific items
    fireEvent.click(screen.getByText(/你做对了/));
    expect(screen.getByText(/申请了人身安全保护令/)).toBeTruthy();
    // Real flow section (collapsible) is present
    expect(screen.getByText(/真实流程/)).toBeTruthy();
    expect(screen.getByText("换一条路再走一遍")).toBeTruthy();
  });

  it("real-help panel opens and routes to the aid tab", () => {
    const onGoToAid = vi.fn();
    render(<SimulationPage language="zh" onGoToAid={onGoToAid} />);
    fireEvent.click(screen.getByText("TA正在被家暴该怎么做"));
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
