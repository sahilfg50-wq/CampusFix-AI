
import { AGENT_TOOLS } from './agentTools.js';

// These are the only decisions Gemini may return.
const ALLOWED_ACTIONS = Object.freeze([
  AGENT_TOOLS.CHECK_PORTAL,
  AGENT_TOOLS.RESTART_PORTAL,
  AGENT_TOOLS.VERIFY_PORTAL,
  AGENT_TOOLS.ESCALATE_ADMIN,
]);

/**
 * Validate the action requested by Gemini.
 * Never execute arbitrary tool names or arguments.
 */
export function validateAgentAction(action) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    return {
      valid: false,
      reason: 'Invalid action format.',
    };
  }

  if (typeof action.tool !== 'string') {
    return {
      valid: false,
      reason: 'Tool name must be a string.',
    };
  }

  if (!ALLOWED_ACTIONS.includes(action.tool)) {
    return {
      valid: false,
      reason: 'This action is not authorized.',
    };
  }

  if (
    action.arguments !== undefined &&
    (
      !action.arguments ||
      typeof action.arguments !== 'object' ||
      Array.isArray(action.arguments) ||
      Object.keys(action.arguments).length !== 0
    )
  ) {
    return {
      valid: false,
      reason: 'Arguments are not permitted for this action.',
    };
  }

  return {
    valid: true,
    tool: action.tool,
    requiresAdmin: action.tool === AGENT_TOOLS.ESCALATE_ADMIN,
  };
}

export function getAllowedAgentActions() {
  return [...ALLOWED_ACTIONS];
}
