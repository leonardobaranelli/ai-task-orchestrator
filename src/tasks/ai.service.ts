import { Injectable } from '@nestjs/common';

/**
 * Placeholder service for LLM integration (e.g. OpenAI, Grok, Claude).
 * In production this would connect to a real AI service to auto-categorize tasks.
 */
@Injectable()
export class AiService {
  /**
   * Simulates a call to an LLM to automatically categorize a task based on its description.
   */
  async categorizeTask(description: string): Promise<string | null> {
    // Simulate network/AI latency
    await new Promise((resolve) => setTimeout(resolve, 150));

    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('meeting') || lowerDesc.includes('reunión')) {
      return 'Meetings';
    }
    if (lowerDesc.includes('report') || lowerDesc.includes('informe')) {
      return 'Reports';
    }
    if (
      lowerDesc.includes('develop') ||
      lowerDesc.includes('code') ||
      lowerDesc.includes('desarroll') ||
      lowerDesc.includes('implement') ||
      lowerDesc.includes('feature')
    ) {
      return 'Development';
    }
    if (
      lowerDesc.includes('design') ||
      lowerDesc.includes('diseñ') ||
      lowerDesc.includes('ui') ||
      lowerDesc.includes('mockup') ||
      lowerDesc.includes('dashboard')
    ) {
      return 'Design';
    }
    if (
      lowerDesc.includes('marketing') ||
      lowerDesc.includes('campaign') ||
      lowerDesc.includes('campaña')
    ) {
      return 'Marketing';
    }

    return 'General'; // Default category
  }
}
