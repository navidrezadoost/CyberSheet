import { CalculationController } from "../src/CalculationController";

describe("CalculationController mode contract", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("defers recalculation in manual mode and starts it when automatic mode resumes", () => {
    jest.useFakeTimers();
    const controller = new CalculationController();
    const started = jest.fn();
    const completed = jest.fn();
    controller.on("calculationStarted", started);
    controller.on("calculationCompleted", completed);

    controller.setMode("manual");
    controller.markNeedsRecalc();

    expect(controller.getMode()).toBe("manual");
    expect(controller.needsRecalculation()).toBe(true);
    expect(controller.isCalculating()).toBe(false);
    expect(started).not.toHaveBeenCalled();

    controller.setMode("automatic");
    expect(started).toHaveBeenCalledTimes(1);
    expect(started).toHaveBeenCalledWith("all");
    expect(controller.isCalculating()).toBe(true);

    jest.advanceTimersByTime(10);

    expect(completed).toHaveBeenCalledTimes(1);
    expect(completed.mock.calls[0][0]).toMatchObject({ scope: "all" });
    expect(controller.needsRecalculation()).toBe(false);
    expect(controller.isCalculating()).toBe(false);
  });

  it("keeps the explicit active-sheet recalculation scope", () => {
    jest.useFakeTimers();
    const controller = new CalculationController();
    const started = jest.fn();
    controller.on("calculationStarted", started);

    controller.calculateSheet();

    expect(started).toHaveBeenCalledWith("sheet");
    expect(controller.isCalculating()).toBe(true);
    jest.advanceTimersByTime(10);
    expect(controller.isCalculating()).toBe(false);
  });
});
