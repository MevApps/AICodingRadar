const SONNET_INPUT_PRICE = 3.0 / 1_000_000;
const SONNET_OUTPUT_PRICE = 15.0 / 1_000_000;

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

interface AccumulatedUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export class RunTracker {
  private inputTokens = 0;
  private outputTokens = 0;

  recordUsage(usage: TokenUsage): void {
    this.inputTokens += usage.inputTokens;
    this.outputTokens += usage.outputTokens;
  }

  getUsage(): AccumulatedUsage {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      costUsd:
        this.inputTokens * SONNET_INPUT_PRICE +
        this.outputTokens * SONNET_OUTPUT_PRICE,
    };
  }

  checkBudget(currentMonthSpend: number, budgetCap: number): boolean {
    return currentMonthSpend + this.getUsage().costUsd <= budgetCap;
  }
}
