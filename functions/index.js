
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
// ---------- DINNER NON-VEG TOKEN SYSTEM ----------

async function requireMessAdmin(uid) {
  const profile = await db.collection('users').doc(uid).get();

  if (!profile.exists || profile.data()?.role !== 'admin') {
    throw new HttpsError(
      'permission-denied',
      'Only authorised mess staff can perform this action.'
    );
  }
}

function validateTokenInput(date, tokenNumber) {
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    throw new HttpsError('invalid-argument', 'Invalid date.');
  }

  if (
    typeof tokenNumber !== 'string' ||
    !/^\d{3}$/.test(tokenNumber)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Enter a valid 3-digit token number.'
    );
  }
}

// Student: confirm dinner preference and allocate a token if Non-Veg.
export const confirmDinnerPreference = onCall(
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError('unauthenticated', 'Please log in first.');
    }

    const { date, preference } = request.data || {};

    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !['Veg', 'Non-Veg'].includes(preference)
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Valid date and dinner preference are required.'
      );
    }

    const profileSnapshot = await db.collection('users').doc(uid).get();

    if (!profileSnapshot.exists) {
      throw new HttpsError('failed-precondition', 'Student profile not found.');
    }

    const studentName = profileSnapshot.data().name || 'Unknown Student';

    const menuRef = db.collection('messMenu').doc(`${date}_dinner`);
    const confirmationRef = db.collection('mealConfirmations')
      .doc(`${date}_dinner_${uid}`);
    const counterRef = db.collection('mealTokenCounters').doc(date);

    try {
      return await db.runTransaction(async (transaction) => {
        const menuSnapshot = await transaction.get(menuRef);
        const confirmationSnapshot = await transaction.get(confirmationRef);

        if (!menuSnapshot.exists) {
          throw new HttpsError(
            'failed-precondition',
            'Dinner menu has not been published.'
          );
        }

        const deadline = menuSnapshot.data().deadlineAt?.toDate?.();

        if (!deadline || Date.now() >= deadline.getTime()) {
          throw new HttpsError(
            'failed-precondition',
            'Dinner confirmation deadline has passed or is invalid.'
          );
        }

        const previous = confirmationSnapshot.exists
          ? confirmationSnapshot.data()
          : {};

        const previousTokenNumber = previous.tokenNumber || null;

        let tokenRef = null;
        let tokenSnapshot = null;

        if (previousTokenNumber) {
          tokenRef = db.collection('mealTokens')
            .doc(`${date}_${previousTokenNumber}`);

          tokenSnapshot = await transaction.get(tokenRef);
        }

        if (preference === 'Veg') {
          if (tokenSnapshot?.exists) {
            const tokenData = tokenSnapshot.data();

            if (tokenData.status === 'Served') {
              throw new HttpsError(
                'failed-precondition',
                'This dinner token has already been served.'
              );
            }

            transaction.update(tokenRef, {
              status: 'Cancelled',
              updatedAt: FieldValue.serverTimestamp(),
            });
          }

          transaction.set(confirmationRef, {
            studentId: uid,
            studentName,
            date,
            meal: 'Dinner',
            preference: 'Veg',
            tokenNumber: null,
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });

          return { preference: 'Veg', tokenNumber: null };
        }

        if (tokenSnapshot?.exists) {
          const tokenData = tokenSnapshot.data();

          if (tokenData.status === 'Served') {
            throw new HttpsError(
              'failed-precondition',
              'This dinner token has already been served.'
            );
          }

          transaction.update(tokenRef, {
            preference: 'Non-Veg',
            status: 'Pending',
            updatedAt: FieldValue.serverTimestamp(),
          });

          transaction.set(confirmationRef, {
            studentId: uid,
            studentName,
            date,
            meal: 'Dinner',
            preference: 'Non-Veg',
            tokenNumber: previousTokenNumber,
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });

          return {
            preference: 'Non-Veg',
            tokenNumber: previousTokenNumber,
          };
        }

        const counterSnapshot = await transaction.get(counterRef);
        const nextNumber = (counterSnapshot.exists
          ? counterSnapshot.data().lastNumber || 0
          : 0) + 1;

        if (nextNumber > 999) {
          throw new HttpsError(
            'resource-exhausted',
            'All 999 dinner tokens have been allocated for this date.'
          );
        }

        const tokenNumber = String(nextNumber).padStart(3, '0');
        const newTokenRef = db.collection('mealTokens')
          .doc(`${date}_${tokenNumber}`);

        transaction.set(counterRef, {
          lastNumber: nextNumber,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        transaction.set(newTokenRef, {
          date,
          tokenNumber,
          studentId: uid,
          studentName,
          meal: 'Dinner',
          preference: 'Non-Veg',
          status: 'Pending',
          createdAt: FieldValue.serverTimestamp(),
        });

        transaction.set(confirmationRef, {
          studentId: uid,
          studentName,
          date,
          meal: 'Dinner',
          preference: 'Non-Veg',
          tokenNumber,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return { preference: 'Non-Veg', tokenNumber };
      });
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      logger.error('Dinner token allocation failed', {
        uid,
        message: String(error?.message || error).slice(0, 300),
      });

      throw new HttpsError('internal', 'Could not confirm dinner preference.');
    }
  }
);

// Admin: look up a dinner token without marking it served.
export const lookupDinnerToken = onCall(
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError('unauthenticated', 'Please log in first.');
    }

    await requireMessAdmin(uid);

    const { date, tokenNumber } = request.data || {};
    validateTokenInput(date, tokenNumber);

    const snapshot = await db.collection('mealTokens')
      .doc(`${date}_${tokenNumber}`)
      .get();

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Dinner token not found.');
    }

    return snapshot.data();
  }
);

// Admin: mark a pending dinner token as served exactly once.
export const markDinnerTokenServed = onCall(
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError('unauthenticated', 'Please log in first.');
    }

    await requireMessAdmin(uid);

    const { date, tokenNumber } = request.data || {};
    validateTokenInput(date, tokenNumber);

    const tokenRef = db.collection('mealTokens')
      .doc(`${date}_${tokenNumber}`);

    try {
      return await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(tokenRef);

        if (!snapshot.exists) {
          throw new HttpsError('not-found', 'Dinner token not found.');
        }

        const token = snapshot.data();

        if (token.status === 'Cancelled') {
          throw new HttpsError(
            'failed-precondition',
            'This token has been cancelled.'
          );
        }

        if (token.status === 'Served') {
          throw new HttpsError(
            'already-exists',
            'This token has already been marked as served.'
          );
        }

        transaction.update(tokenRef, {
          status: 'Served',
          servedBy: uid,
          servedAt: FieldValue.serverTimestamp(),
        });

        return {
          success: true,
          studentName: token.studentName,
          tokenNumber: token.tokenNumber,
          status: 'Served',
        };
      });
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      logger.error('Dinner token verification failed', {
        uid,
        message: String(error?.message || error).slice(0, 300),
      });

      throw new HttpsError('internal', 'Could not verify dinner token.');
    }
  }
);