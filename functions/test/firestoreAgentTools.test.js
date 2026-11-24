
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createFirestoreAgentTools,
} from '../src/firestoreAgentTools.js';

import { AGENT_TOOLS } from '../src/agentTools.js';

function createMockFirestore() {
  const store = new Map();

  const serviceRef = {
    async get() {
      const data = store.get('demoServices/campusPortal');

      return {
        exists: data !== undefined,
        data: () => data,
      };
    },
  };

  return {
    doc(path) {
      assert.equal(path, 'demoServices/campusPortal');
      return serviceRef;
    },

    async runTransaction(callback) {
      const transaction = {
        async get() {
          const data = store.get('demoServices/campusPortal');

          return {
            exists: data !== undefined,
            data: () => data,
          };
        },

        create(ref, data) {
          store.set('demoServices/campusPortal', { ...data });
        },

        set(ref, data) {
          store.set('demoServices/campusPortal', { ...data });
        },
      };

      return callback(transaction);
    },
  };
}

describe('Firestore agent tools', () => {
  it('initializes the demo portal as offline', async () => {
    const db = createMockFirestore();
    const tools = createFirestoreAgentTools(db);

    const result = await tools.executeAgentTool(
      AGENT_TOOLS.CHECK_PORTAL
    );

    assert.equal(result.success, true);
    assert.equal(result.online, false);
  });

  it('restarts the demo portal and increments restart count', async () => {
    const db = createMockFirestore();
    const tools = createFirestoreAgentTools(db);

    await tools.executeAgentTool(AGENT_TOOLS.CHECK_PORTAL);

    const result = await tools.executeAgentTool(
      AGENT_TOOLS.RESTART_PORTAL
    );

    assert.equal(result.success, true);
    assert.equal(result.restartCount, 1);

    const secondResult = await tools.executeAgentTool(
      AGENT_TOOLS.RESTART_PORTAL
    );

    assert.equal(secondResult.restartCount, 2);
  });

  it('independently verifies the saved portal status', async () => {
    const db = createMockFirestore();
    const tools = createFirestoreAgentTools(db);

    await tools.executeAgentTool(AGENT_TOOLS.CHECK_PORTAL);

    const beforeRestart = await tools.executeAgentTool(
      AGENT_TOOLS.VERIFY_PORTAL
    );

    assert.equal(beforeRestart.verified, false);

    await tools.executeAgentTool(AGENT_TOOLS.RESTART_PORTAL);

    const afterRestart = await tools.executeAgentTool(
      AGENT_TOOLS.VERIFY_PORTAL
    );

    assert.equal(afterRestart.verified, true);
  });

  it('rejects unauthorized tools', async () => {
    const db = createMockFirestore();
    const tools = createFirestoreAgentTools(db);

    await assert.rejects(
      () => tools.executeAgentTool('delete_campus_database'),
      /Unauthorized or unknown agent tool/
    );
  });

  it('rejects a missing Firestore instance', () => {
    assert.throws(
      () => createFirestoreAgentTools(null),
      /Firestore database instance is required/
    );
  });
});
