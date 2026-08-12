import { Injectable } from '@nestjs/common';

import type { WorkflowDefinition } from './workflow.types';

/**
 * Pluggable workflow catalog.
 * Adding a workflow = define it + register() — no Planner changes.
 */
@Injectable()
export class WorkflowRegistry {
  private readonly workflows = new Map<string, WorkflowDefinition>();

  register(workflow: WorkflowDefinition): void {
    if (!workflow.id?.trim()) {
      throw new Error('Workflow id is required');
    }
    if (!workflow.steps?.length) {
      throw new Error(
        `Workflow "${workflow.id}" must declare at least one step`,
      );
    }
    this.workflows.set(workflow.id, workflow);
  }

  getById(id: string): WorkflowDefinition | undefined {
    return this.workflows.get(id);
  }

  list(): WorkflowDefinition[] {
    return [...this.workflows.values()];
  }

  /**
   * Match the first workflow whose trigger phrases hit the user message.
   * Independent of the Planner.
   */
  match(message: string): WorkflowDefinition | null {
    const text = message.trim();
    if (!text) return null;

    for (const workflow of this.workflows.values()) {
      for (const trigger of workflow.triggerPhrases) {
        if (typeof trigger === 'string') {
          if (text.toLowerCase().includes(trigger.toLowerCase())) {
            return workflow;
          }
        } else if (trigger.test(text)) {
          return workflow;
        }
      }
    }

    return null;
  }
}
