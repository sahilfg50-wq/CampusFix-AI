
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  runAutonomousAgent,
} from '../src/agent.js';

import {
  AGENT_TOOLS,
} from '../src/agentTools.js';

const complaint = {
  title: 'Campus portal is not working',
  description: 'Students cannot access the campus portal.',
  category: 'IT',
};

function createDecisionSequence(decisions) {
  let index = 0;

  return async () => {
    if (index >= decisions.length) {
      throw new Error('Unexpected additional Gemini decision.');
    }

    return { tool: decisions[index++] };
  };
}

test('agent resolves complaint after successful portal recovery', async () => {
  const decisions = createDecisionSequence([
    AGENT_TOOLS.CHECK_PORTAL,
    AGENT_TOOLS.RESTART_PORTAL,
  ]);

  const executed = [];

  const mockTool = async (toolName) => {
    executed.push(toolName);

    if (toolName === AGENT_TOOLS.CHECK_PORTAL) {
      return { success: true, online: false };
    }

    if (toolName === AGENT_TOOLS.RESTART_PORTAL) {
      return { success: true };
    }

    if (toolName === AGENT_TOOLS.VERIFY_PORTAL) {
      return { success: true, verified: true };
    }

    throw new Error('Unexpected tool');
  };

  const result = await runAutonomousAgent({
    complaintId: 'CFX-2026-TEST01',
    complaint,
    selectAction: decisions,
    executeTool: mockTool,
  });

  assert.equal(result.status, 'resolved');
  assert.equal(result.history.length, 5);

  assert.deepEqual(executed, [
    AGENT_TOOLS.CHECK_PORTAL,
    AGENT_TOOLS.RESTART_PORTAL,
    AGENT_TOOLS.VERIFY_PORTAL,
  ]);
});

test('agent escalates when portal is online but complaint remains unverified', async () => {
  const decisions = createDecisionSequence([
    AGENT_TOOLS.CHECK_PORTAL,
  ]);

  const mockTool = async () => ({
    success: true,
    online: true,
  });

  const result = await runAutonomousAgent({
    complaintId: 'CFX-2026-TEST02',
    complaint,
    selectAction: decisions,
    executeTool: mockTool,
  });

  assert.equal(result.status, 'escalated');
  assert.equal(result.history.length, 2);
});

test('agent escalates when Gemini selects admin escalation', async () => {
  const decisions = createDecisionSequence([
    AGENT_TOOLS.ESCALATE_ADMIN,
  ]);

  let toolExecuted = false;

  const result = await runAutonomousAgent({
    complaintId: 'CFX-2026-TEST03',
    complaint: {
      title: 'Classroom fan is broken',
      description: 'The fan is not working.',
      category: 'Electrical',
    },
    selectAction: decisions,
    executeTool: async () => {
      toolExecuted = true;
      return { success: true };
    },
  });

  assert.equal(result.status, 'escalated');
  assert.equal(toolExecuted, false);
});

test('agent escalates when recovery cannot be verified', async () => {
  const decisions = createDecisionSequence([
    AGENT_TOOLS.CHECK_PORTAL,
    AGENT_TOOLS.RESTART_PORTAL,
  ]);

  const mockTool = async (toolName) => {
    if (toolName === AGENT_TOOLS.CHECK_PORTAL) {
      return { success: true, online: false };
    }

    if (toolName === AGENT_TOOLS.RESTART_PORTAL) {
      return { success: true };
    }

    if (toolName === AGENT_TOOLS.VERIFY_PORTAL) {
      return { success: true, verified: false };
    }

    throw new Error('Unexpected tool');
  };

  const result = await runAutonomousAgent({
    complaintId: 'CFX-2026-TEST04',
    complaint,
    selectAction: decisions,
    executeTool: mockTool,
  });

  assert.equal(result.status, 'escalated');
});

test('agent escalates when a tool execution fails', async () => {
  const decisions = createDecisionSequence([
    AGENT_TOOLS.CHECK_PORTAL,
  ]);

  const result = await runAutonomousAgent({
    complaintId: 'CFX-2026-TEST05',
    complaint,
    selectAction: decisions,
    executeTool: async () => {
      throw new Error('Simulated tool failure');
    },
  });

  assert.equal(result.status, 'escalated');
  assert.equal(result.history.at(-1).type, 'error');
});

test('agent rejects an unauthorized action without executing it', async () => {
  const decisions = createDecisionSequence([
    'delete_all_records',
  ]);

  let toolExecuted = false;

  const result = await runAutonomousAgent({
    complaintId: 'CFX-2026-TEST06',
    complaint,
    selectAction: decisions,
    executeTool: async () => {
      toolExecuted = true;
      return { success: true };
    },
  });

  assert.equal(result.status, 'escalated');
  assert.equal(toolExecuted, false);
});

test('agent rejects an invalid complaint ID', async () => {
  await assert.rejects(
    () => runAutonomousAgent({
      complaintId: '',
      complaint,
      selectAction: async () => ({
        tool: AGENT_TOOLS.CHECK_PORTAL,
      }),
    }),
    /valid complaint ID/
  );
});

test('agent rejects a missing complaint', async () => {
  await assert.rejects(
    () => runAutonomousAgent({
      complaintId: 'CFX-2026-TEST07',
    }),
    /valid complaint/
  );
});
