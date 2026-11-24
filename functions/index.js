
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

import { analyzeComplaint as run, AppError } from './src/analyze.js';
import { generateAnalysis } from './src/gemini.js';
import { checkRateLimit } from './src/rateLimit.js';

import { runAutonomousAgent } from './src/agent.js';
import { createFirestoreAgentTools } from './src/firestoreAgentTools.js';

initializeApp();

const db = getFirestore();

setGlobalOptions({ region: 'us-central1', maxInstances: 5 });

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const GEMINI_MODEL = defineString('GEMINI_MODEL', {
  default: 'gemini-3.5-flash-lite',
});

// Firebase automatically sets this in the local emulator.
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

// Existing Gemini complaint analysis function.
export const analyzeComplaint = onCall(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    try {
      return await run({
        data: request.data,
        uid: request.auth?.uid,
        deps: {
          checkRateLimit,
          generate: (input) =>
            generateAnalysis({
              apiKey: GEMINI_API_KEY.value(),
              model: GEMINI_MODEL.value(),
              ...input,
            }),
          log: (e) =>
            logger.error('Gemini call failed', {
              status: e?.status,
              message: String(e?.message || e).slice(0, 300),
            }),
        },
      });
    } catch (e) {
      if (e instanceof AppError) {
        throw new HttpsError(e.code, e.message);
      }

      logger.error('analyzeComplaint crashed', {
        message: String(e?.message || e).slice(0, 300),
      });

      throw new HttpsError(
        'internal',
        'Something went wrong while analysing the complaint.'
      );
    }
  }
);

// Authenticated autonomous complaint processing.
export const processComplaintAutonomously = onCall(
  {
    secrets: isEmulator ? [] : [GEMINI_API_KEY],
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Please log in first.');
    }

    const complaintId = request.data?.complaintId;

    if (
      typeof complaintId !== 'string' ||
      complaintId.trim().length === 0 ||
      complaintId.length > 100
    ) {
      throw new HttpsError(
        'invalid-argument',
        'A valid complaint ID is required.'
      );
    }

    const complaintRef = db.collection('complaints').doc(complaintId);
    let complaint;

    try {
      complaint = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(complaintRef);

        if (!snapshot.exists) {
          throw new HttpsError('not-found', 'Complaint not found.');
        }

        const data = snapshot.data();

        if (data.studentId !== request.auth.uid) {
          throw new HttpsError(
            'permission-denied',
            'You can only process your own complaint.'
          );
        }

        if (data.status !== 'Pending') {
          throw new HttpsError(
            'failed-precondition',
            'Only pending complaints can be processed.'
          );
        }

        if (
          data.agentStatus === 'processing' ||
          data.agentStatus === 'resolved' ||
          data.agentStatus === 'escalated'
        ) {
          throw new HttpsError(
            'already-exists',
            'This complaint has already been processed or is being processed.'
          );
        }

        transaction.update(complaintRef, {
          agentStatus: 'processing',
          agentStartedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        return data;
      });
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      logger.error('Could not claim complaint for agent processing', {
        complaintId,
        message: String(error?.message || error).slice(0, 300),
      });

      throw new HttpsError(
        'internal',
        'Could not start complaint processing.'
      );
    }

    const tools = createFirestoreAgentTools(db);

    const result = await runAutonomousAgent({
      complaintId,
      complaint,
      apiKey: isEmulator ? undefined : GEMINI_API_KEY.value(),
      model: GEMINI_MODEL.value(),
      executeTool: tools.executeAgentTool,
      demoMode: isEmulator,
    });

    try {
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(complaintRef);

        if (!snapshot.exists || snapshot.data().agentStatus !== 'processing') {
          throw new Error(
            'Complaint processing state changed unexpectedly.'
          );
        }

        const resolved = result.status === 'resolved';

        const note = resolved
          ? 'CampusFix AI completed and independently verified the simulated portal recovery.'
          : 'CampusFix AI could not safely resolve the complaint. Admin investigation is required.';

        transaction.update(complaintRef, {
          status: resolved ? 'Resolved' : 'In Progress',
          agentStatus: resolved ? 'resolved' : 'escalated',
          agentResolution: result.resolution,
          agentHistory: result.history,
          agentCompletedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          updates: FieldValue.arrayUnion({
            time: new Date().toISOString(),
            actor: 'CampusFix AI Agent',
            note,
          }),
        });
      });
    } catch (error) {
      logger.error('Could not save autonomous agent result', {
        complaintId,
        message: String(error?.message || error).slice(0, 300),
      });

      throw new HttpsError(
        'internal',
        'The agent finished, but its result could not be saved.'
      );
    }

    return {
      complaintId,
      status: result.status,
      resolution: result.resolution,
    };
  }
);
