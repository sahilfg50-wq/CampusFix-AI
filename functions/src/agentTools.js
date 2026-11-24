
/**
 * CampusFix AI - Simulated Campus Service Tools
 *
 * These tools operate ONLY on an in-memory demo service.
 * They do not connect to or modify real campus infrastructure.
 */

const portalState = {
  online: false,
  restartCount: 0,
};
export const AGENT_TOOLS = Object.freeze({
  CHECK_PORTAL: 'check_portal_status',
  RESTART_PORTAL: 'restart_demo_portal',
  VERIFY_PORTAL: 'verify_portal_status',
  ESCALATE_ADMIN: 'escalate_to_admin',
});
/**
 * Check the simulated campus portal status.
 */
export async function checkPortalStatus() {
  return {
    success: true,
    tool: AGENT_TOOLS.CHECK_PORTAL,
    service: 'Simulated Campus Portal',
    online: portalState.online,
    message: portalState.online
      ? 'The demo portal is online.'
      : 'The demo portal is currently unavailable.',
  };
}

/**
 * Perform a controlled recovery action on the demo portal.
 */
export async function restartDemoPortal() {
  portalState.restartCount += 1;
  portalState.online = true;

  return {
    success: true,
    tool: AGENT_TOOLS.RESTART_PORTAL,
    service: 'Simulated Campus Portal',
    restartCount: portalState.restartCount,
    message: 'The simulated portal recovery action completed.',
  };
}

/**
 * Verify whether the demo portal is online after recovery.
 */
export async function verifyPortalStatus() {
  return {
    success: true,
    tool: AGENT_TOOLS.VERIFY_PORTAL,
    service: 'Simulated Campus Portal',
    verified: portalState.online,
    message: portalState.online
      ? 'Portal recovery verified successfully.'
      : 'Portal is still unavailable.',
  };
}

/**
 * Only these predefined tools can be executed.
 */
export async function executeAgentTool(toolName) {
  switch (toolName) {
    case AGENT_TOOLS.CHECK_PORTAL:
      return checkPortalStatus();

    case AGENT_TOOLS.RESTART_PORTAL:
      return restartDemoPortal();

    case AGENT_TOOLS.VERIFY_PORTAL:
      return verifyPortalStatus();

    default:
      throw new Error('Unauthorized or unknown agent tool.');
  }
}

/**
 * Reset demo state for isolated tests.
 */
export function resetDemoPortal() {
  portalState.online = false;
  portalState.restartCount = 0;
}
