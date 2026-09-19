/** Search limits are shared by server workers and the setup UI. No rule bonuses. */
export type AiDifficulty = 'normal' | 'hard' | 'expert';
export const AI_VERSION = 'strategic-v1';
export interface AiBudget { budgetMs: number; maxNodes: number; depth: number }
export const AI_BUDGETS: Readonly<Record<AiDifficulty, AiBudget>> = {
  normal: { budgetMs: 500, maxNodes: 0, depth: 0 },
  hard: { budgetMs: 3_000, maxNodes: 180, depth: 4 },
  expert: { budgetMs: 30_000, maxNodes: 600, depth: 5 },
};
export function isAiDifficulty(value: string): value is AiDifficulty {
  return value === 'normal' || value === 'hard' || value === 'expert';
}

export const AI_DIFFICULTY_LABELS: Readonly<Record<AiDifficulty, string>> = {normal:'Normal',hard:'Hard',expert:'Expert'};
