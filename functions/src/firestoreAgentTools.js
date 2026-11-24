
import { AGENT_TOOLS } from './agentTools.js';

/**
 * Firestore-backed demo portal.
 * This simulator does not connect to real campus infrastructure.
 */

const SERVICE_PATH = 'demoServices/campusPortal';

export function createFirestoreAgentTools(db) {
  if (!db) {
    throw new Error('Firestore database instance is required.');
  }

  const serviceRef = db.doc(SERVICE_PATH);

  async function checkPortalStatus() {
    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(serviceRef);

      if (!snapshot.exists) {
        transaction.create(serviceRef, {
          online: false,
          restartCount: 0,
          updatedAt: new Date().toISOString(),
        });

        return false;
      }

      return snapshot.data().online === true;
    });

    return {
      success: true,
      tool: AGENT_TOOLS.CHECK_PORTAL,
      service: 'Simulated Campus Portal',
      online: result,
      message: result
        ? 'The demo portal is online.'
        : 'The demo portal is currently unavailable.',
    };
  }

  async function restartDemoPortal() {
    const restartCount = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(serviceRef);
      const current = snapshot.exists ? snapshot.data() : {};

      const nextCount = (current.restartCount || 0) + 1;

      transaction.set(serviceRef, {
        online: true,
        restartCount: nextCount,
        updatedAt: new Date().toISOString(),
      });

      return nextCount;
    });

    return {
      success: true,
      tool: AGENT_TOOLS.RESTART_PORTAL,
      service: 'Simulated Campus Portal',
      restartCount,
      message: 'The simulated portal recovery action completed.',
    };
  }

  async function verifyPortalStatus() {
    const snapshot = await serviceRef.get();
    const verified = snapshot.exists && snapshot.data().online === true;

    return {
      success: true,
      tool: AGENT_TOOLS.VERIFY_PORTAL,
      service: 'Simulated Campus Portal',
      verified,
      message: verified
        ? 'Portal recovery verified successfully.'
        : 'Portal is still unavailable.',
    };
  }

  async function executeAgentTool(toolName) {
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

  return Object.freeze({ executeAgentTool });
}
