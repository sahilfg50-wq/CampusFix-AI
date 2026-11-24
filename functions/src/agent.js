
import {
  executeAgentTool,
  AGENT_TOOLS,
} from './agentTools.js';

import {
  validateAgentAction,
} from './agentValidation.js';

import {
  selectAgentAction,
} from './agentGemini.js';

export async function runAutonomousAgent({
  complaintId,
  complaint,
  apiKey,
  model,
  selectAction,
  executeTool = executeAgentTool,
  demoMode = false,
} = {}) {
  if (
    typeof complaintId !== 'string' ||
    complaintId.trim().length === 0
  ) {
    throw new Error('A valid complaint ID is required.');
  }

  if (!complaint || typeof complaint !== 'object' || Array.isArray(complaint)) {
    throw new Error('A valid complaint is required.');
  }

  const history = [];

  function escalate(reason) {
    return {
      complaintId,
      status: 'escalated',
      resolution: reason,
      history,
    };
  }

  function isPortalComplaint() {
    const text = [
      complaint.title,
      complaint.description,
      complaint.category,
    ].join(' ').toLowerCase();

    return (
      text.includes('portal') ||
      text.includes('website login') ||
      text.includes('student login')
    );
  }

  async function performAction(toolName) {
    const validation = validateAgentAction({ tool: toolName });

    if (!validation.valid || validation.requiresAdmin) {
      throw new Error('This action cannot be executed as a campus tool.');
    }

    const result = await executeTool(validation.tool);

    history.push({
      type: 'execution',
      tool: validation.tool,
      success: result?.success === true,
      result,
    });

    if (!result || result.success !== true) {
      throw new Error('The simulated campus action failed.');
    }

    return result;
  }

  async function getDecision(portalStatus) {
    const action = await (selectAction || selectAgentAction)({
      apiKey,
      model,
      complaint,
      portalStatus,
    });

    const validation = validateAgentAction(action);

    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    history.push({
      type: 'decision',
      tool: validation.tool,
    });

    return validation;
  }

  try {
    if (demoMode) {
      if (!isPortalComplaint()) {
        return escalate(
          'This complaint requires the relevant department administrator.'
        );
      }

      history.push({
        type: 'decision',
        tool: AGENT_TOOLS.CHECK_PORTAL,
        mode: 'local-demo',
      });
    } else {
      const firstDecision = await getDecision('unknown');

      if (firstDecision.requiresAdmin) {
        return escalate('Admin review is required for this complaint.');
      }

      if (firstDecision.tool !== AGENT_TOOLS.CHECK_PORTAL) {
        return escalate('The selected investigation action was not permitted.');
      }
    }

    const initialCheck = await performAction(AGENT_TOOLS.CHECK_PORTAL);

    if (initialCheck.online === true) {
      return escalate(
        'The simulated portal is already online. Admin investigation is required.'
      );
    }

    if (demoMode) {
      history.push({
        type: 'decision',
        tool: AGENT_TOOLS.RESTART_PORTAL,
        mode: 'local-demo',
      });
    } else {
      const secondDecision = await getDecision('offline');

      if (secondDecision.requiresAdmin) {
        return escalate('Admin review is required for portal recovery.');
      }

      if (secondDecision.tool !== AGENT_TOOLS.RESTART_PORTAL) {
        return escalate('The selected recovery action was not permitted.');
      }
    }

    await performAction(AGENT_TOOLS.RESTART_PORTAL);

    const verification = await performAction(AGENT_TOOLS.VERIFY_PORTAL);

    if (verification.verified === true) {
      return {
        complaintId,
        status: 'resolved',
        resolution: 'Simulated portal recovery was independently verified.',
        history,
      };
    }

    return escalate('Recovery could not be verified. Admin assistance is required.');
  } catch (error) {
    history.push({
      type: 'error',
      message: String(error?.message || 'Unknown error'),
    });

    return escalate(
      'The agent could not safely complete the workflow. Admin review is required.'
    );
  }
}
