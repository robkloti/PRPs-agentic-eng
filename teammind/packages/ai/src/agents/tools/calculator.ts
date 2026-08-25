import { tool } from 'ai';
import { Parser } from 'expr-eval';
import { z } from 'zod';

/**
 * Calculator tool for evaluating mathematical expressions
 */
export const calculatorTool = tool({
  description:
    'Evaluates a mathematical expression. Supports basic arithmetic (+, -, *, /, ^), constants (pi, e), and common functions (sin, cos, tan, log, etc.).',
  parameters: z.object({
    expression: z.string().describe('The mathematical expression to evaluate.'),
  }),
  execute: async ({ expression }: { expression: string }) => {
    try {
      const result = evaluateExpression(expression);
      return {
        success: true,
        result: result,
        formattedResult: `${expression} = ${result}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
      };
    }
  },
});

/**
 * Evaluates a mathematical expression string.
 * @param expression The mathematical expression to evaluate.
 * @returns The numerical result of the expression.
 * @throws Error if the expression is invalid or cannot be evaluated.
 */
function evaluateExpression(expression: string): number {
  try {
    const parser = new Parser();
    const result = parser.evaluate(expression);
    if (typeof result !== 'number') {
      throw new Error('Expression did not evaluate to a number.');
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to evaluate expression "${expression}": ${message}`,
    );
  }
}
