import type { AIProvider } from "@/lib/ai/providers/types";

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
  private costUsd = 0;

  recordUsage(usage: TokenUsage, provider?: AIProvider): void {
    this.inputTokens += usage.inputTokens;
    this.outputTokens += usage.outputTokens;
    if (provider) {
      this.costUsd +=
        usage.inputTokens * provider.getInputPrice() +
        usage.outputTokens * provider.getOutputPrice();
    } else {
      this.costUsd +=
        usage.inputTokens * (3.0 / 1_000_000) +
        usage.outputTokens * (15.0 / 1_000_000);
    }
  }

  getUsage(): AccumulatedUsage {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      costUsd: this.costUsd,
    };
  }

  checkBudget(currentMonthSpend: number, budgetCap: number): boolean {
    return currentMonthSpend + this.costUsd <= budgetCap;
  }
}
