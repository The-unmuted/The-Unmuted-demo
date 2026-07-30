import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SimulationPage from "@/components/SimulationPage";

describe("SimulationPage", () => {
  it("shows the scenario picker with disclaimer", () => {
    render(<SimulationPage language="zh" onGoToAid={() => {}} />);
    expect(screen.getByText("模拟练习")).toBeTruthy();
    expect(screen.getByText("TA被家暴了该怎么做")).toBeTruthy();
    expect(screen.getByText("TA被性骚扰了该怎么做")).toBeTruthy();
    expect(screen.getByText("TA被性侵了该怎么做")).toBeTruthy();
    expect(screen.getByText(/不构成法律意见/)).toBeTruthy();
    expect(screen.getAllByText(/待法律校对/).length).toBe(3);
  });

  it("plays a full path to an ending with a debrief", () => {
    render(<SimulationPage language="zh" onGoToAid={() => {}} />);
    fireEvent.click(screen.getByText("TA被家暴了该怎么做"));

    // Opening scene with real-help exit visible
    expect(screen.getByText("我现在就需要真实帮助")).toBeTruthy();
    fireEvent.click(screen.getByText("拨打 110 报警"));
    expect(screen.getByText(/官方记录/)).toBeTruthy();

    fireEvent.click(screen.getByText("要求做询问笔录，并索要报警回执"));
    fireEvent.click(screen.getByText("要求开具鉴定委托，明天一早就去"));
    fireEvent.click(screen.getByText("主动要求出具《家庭暴力告诫书》"));
    fireEvent.click(screen.getByText("收下保证书，存到只有自己知道的地方"));
    fireEvent.click(screen.getByText("向法院申请人身安全保护令"));
    fireEvent.click(screen.getByText("把手上所有材料都交上去"));

    // Strong ending via warning-letter flag
    expect(screen.getByText("保护令签发——证据扎实")).toBeTruthy();
    expect(screen.getByText(/复盘/)).toBeTruthy();
    expect(screen.getByText("主动要到了《家庭暴力告诫书》")).toBeTruthy();
    // Real flow section appears after debrief
    expect(screen.getByText(/真实流程/)).toBeTruthy();
    expect(screen.getByText("换一条路再走一遍")).toBeTruthy();
  });

  it("real-help panel opens and routes to the aid tab", () => {
    const onGoToAid = vi.fn();
    render(<SimulationPage language="zh" onGoToAid={onGoToAid} />);
    fireEvent.click(screen.getByText("TA被家暴了该怎么做"));
    fireEvent.click(screen.getByText("我现在就需要真实帮助"));
    expect(screen.getByText("110")).toBeTruthy();
    expect(screen.getByText("12338")).toBeTruthy();
    fireEvent.click(screen.getByText("打开援助目录"));
    expect(onGoToAid).toHaveBeenCalled();
  });

  it("renders bilingually (EN)", () => {
    render(<SimulationPage language="en" onGoToAid={() => {}} />);
    expect(screen.getByText("Practice Simulator")).toBeTruthy();
    expect(screen.getByText("What to Do When Someone Is Being Abused")).toBeTruthy();
  });
});
