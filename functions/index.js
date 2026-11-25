
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

import { analyzeComplaint as run, AppError } from './src/analyze.js';
import { generateAnalysis, SYSTEM_INSTRUCTION, TRIAGE_JSON_SCHEMA, triagePrompt } from './src/gemini.js';
import { checkRateLimit } from './src/rateLimit.js';

import { runAutonomousAgent } from './src/agent.js';
import { createFirestoreAgentTools } from './src/firestoreAgentTools.js';
import { analyzeFoodWaste as runFoodAnalysis, generateFoodAdvice } from './src/foodAi.js';
import { RANGES, addDays } from './src/foodForecast.js';
import { getLlm } from './src/llm.js';
import { classifyRoute, buildSelfHelp, buildEmails, buildAdminEmail, EMERGENCY_SLA } from './src/complaintRouter.js';
import { sendMail } from './src/mailer.js';

initializeApp();

const db = getFirestore();

setGlobalOptions({ region: 'us-central1', maxInstances: 5 });

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const GEMINI_MODEL = defineString('GEMINI_MODEL', {
  default: 'gemini-3.5-flash-lite',
});

// Firebase automatically sets this in the local emulator.
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

// Gemini key: Firebase secret in production. In the emulator, an optional
// GEMINI_API_KEY_LOCAL in functions/.env.local (free key from https://aistudio.google.com).
// Returns '' when no key is configured, so callers fall back to rule-based logic.
function geminiKey() {
  if (isEmulator) return process.env.GEMINI_API_KEY_LOCAL || '';
  try {
    return GEMINI_API_KEY.value() || '';
  } catch {
    return '';
  }
}

// Free AI provider for this request: Gemini if a key is set, otherwise local Ollama
// (emulator only, nothing to pay), otherwise null so callers use their rule-based fallback.
function pickLlm() {
  return getLlm({
    geminiKey: geminiKey(),
    geminiModel: GEMINI_MODEL.value(),
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:3b',
    allowOllama: isEmulator,
  });
}

// Today's date in India (the mess works on IST days).
function todayIST() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

// Existing Gemini complaint analysis function.
export const analyzeComplaint = onCall(
  { secrets: isEmulator ? [] : [GEMINI_API_KEY], timeoutSeconds: 90, memory: '256MiB' },
  async (request) => {
    try {
      const llm = await pickLlm();
      if (!llm) {
        throw new AppError(
          'failed-precondition',
          'No AI is running right now. Choose the category yourself. CampusFix rules will still route your complaint.'
        );
      }
      return await run({
        data: request.data,
        uid: request.auth?.uid,
        deps: {
          // The daily limit protects the free Gemini quota. Local AI has no quota.
          checkRateLimit: llm.name === 'gemini' ? checkRateLimit : async () => {},
          generate: (input) =>
            llm.name === 'gemini'
              ? generateAnalysis({ apiKey: geminiKey(), model: GEMINI_MODEL.value(), ...input })
              : llm.generateJson({
                  system: SYSTEM_INSTRUCTION,
                  prompt: triagePrompt(input.title, input.description),
                  schema: TRIAGE_JSON_SCHEMA,
                  temperature: 0.2,
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

    const full = { ...complaint, id: complaintId };
    const { route, reason } = classifyRoute(full);
    let outcome;

    try {
      if (route === 'portal') {
        const tools = createFirestoreAgentTools(db);
        const result = await runAutonomousAgent({
          complaintId,
          complaint,
          apiKey: isEmulator ? undefined : geminiKey(),
          model: GEMINI_MODEL.value(),
          executeTool: tools.executeAgentTool,
          demoMode: isEmulator,
        });
        if (result.status === 'resolved') {
          outcome = {
            status: 'Resolved',
            agentStatus: 'resolved',
            agentRoute: route,
            agentResolution: result.resolution,
            agentHistory: result.history,
            note: 'CampusFix AI completed and independently verified the simulated portal recovery.',
          };
        } else {
          outcome = await forwardOutcome(full, {
            route: 'department',
            reason: `${result.resolution} Forwarded to ${complaint.department}.`,
            history: result.history,
          });
        }
      } else if (route === 'self-help') {
        const llm = await pickLlm();
        const help = await buildSelfHelp(full, {
          generate: llm ? (args) => llm.generateJson(args) : null,
          log: (e) => logger.warn('Self-help AI failed, using built-in guide', { message: String(e?.message).slice(0, 200) }),
        });
        if (help.canSelfSolve) {
          outcome = {
            status: 'In Progress',
            agentStatus: 'awaiting-student',
            agentRoute: route,
            agentResolution: `${reason} Try the steps below and tell us if it worked.`,
            aiSelfHelp: { ...help, provider: help.source === 'ai' ? llm?.label : 'Built-in guide' },
            note: 'CampusFix AI sent step-by-step fix instructions to the student.',
          };
        } else {
          outcome = await forwardOutcome(full, {
            route: 'department',
            reason: `${help.reason || 'Not something the student can fix alone.'} Forwarded to ${complaint.department}.`,
          });
        }
      } else if (route === 'admin') {
        outcome = await adminOutcome(full, reason);
      } else {
        outcome = await forwardOutcome(full, { route, reason });
      }
    } catch (error) {
      logger.error('Agent routing failed', { complaintId, message: String(error?.message || error).slice(0, 300) });
      outcome = await adminOutcome(full, 'The AI agent hit an error. Admin review is required.');
    }

    await saveOutcome(complaintRef, outcome);

    return {
      complaintId,
      route: outcome.agentRoute,
      status: outcome.agentStatus,
      resolution: outcome.agentResolution,
    };
  }
);

// ---------- complaint routing helpers ----------

const mailLog = (e) => logger.error('Email send failed', { message: String(e?.message || e).slice(0, 300) });

// Emails the department (cc admin) and marks the complaint as forwarded.
async function forwardOutcome(complaint, { route, reason, extra, history }) {
  const mails = buildEmails(complaint, { route, reason, extra });
  const sent = [];
  for (const mail of mails) {
    const record = await sendMail(db, { ...mail, complaintId: complaint.id }, { log: mailLog });
    sent.push({ to: record.to, cc: record.cc, status: record.status, outboxId: record.id });
  }
  const emergency = route === 'emergency';
  return {
    status: 'In Progress',
    agentStatus: emergency ? 'escalated' : 'forwarded',
    agentRoute: route,
    agentResolution: reason,
    referredToAdmin: true,
    emailsSent: sent,
    ...(emergency ? { priority: 'Critical', sla: EMERGENCY_SLA } : {}),
    ...(history ? { agentHistory: history } : {}),
    note: `${emergency ? 'URGENT: ' : ''}CampusFix AI emailed ${complaint.department} (${sent.map((s) => s.to).join(', ')}) and informed the admin.`,
  };
}

async function adminOutcome(complaint, reason) {
  const record = await sendMail(db, { ...buildAdminEmail(complaint, reason), complaintId: complaint.id }, { log: mailLog });
  return {
    status: 'Pending',
    agentStatus: 'escalated',
    agentRoute: 'admin',
    agentResolution: reason,
    referredToAdmin: true,
    emailsSent: [{ to: record.to, cc: null, status: record.status, outboxId: record.id }],
    note: 'CampusFix AI referred this complaint to the admin for a decision.',
  };
}

async function saveOutcome(complaintRef, outcome) {
  const { note, ...fields } = outcome;
  try {
    await complaintRef.update({
      ...fields,
      agentCompletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updates: FieldValue.arrayUnion({
        time: new Date().toISOString(),
        actor: 'CampusFix AI Agent',
        note,
      }),
    });
  } catch (error) {
    logger.error('Could not save agent result', { message: String(error?.message || error).slice(0, 300) });
    throw new HttpsError('internal', 'The agent finished, but its result could not be saved.');
  }
}

// Student: tell the agent whether the self-help steps fixed the problem.
export const respondToSelfHelp = onCall({ timeoutSeconds: 60 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Please log in first.');

  const { complaintId, solved } = request.data || {};
  if (typeof complaintId !== 'string' || !complaintId || complaintId.length > 100 || typeof solved !== 'boolean') {
    throw new HttpsError('invalid-argument', 'Complaint ID and answer are required.');
  }

  const ref = db.collection('complaints').doc(complaintId);
  // Claim the complaint so a double click cannot send two emails.
  const complaint = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Complaint not found.');
    const data = snap.data();
    if (data.studentId !== uid) throw new HttpsError('permission-denied', 'You can only answer for your own complaint.');
    if (data.agentStatus !== 'awaiting-student') {
      throw new HttpsError('failed-precondition', 'This complaint is no longer waiting for your answer.');
    }
    tx.update(ref, { agentStatus: 'processing', updatedAt: FieldValue.serverTimestamp() });
    return { ...data, id: complaintId };
  });

  let outcome;
  if (solved) {
    outcome = {
      status: 'Resolved',
      agentStatus: 'resolved',
      agentResolution: 'Fixed by the student using the CampusFix AI self-help steps.',
      note: 'Student confirmed the self-help steps fixed the problem.',
    };
  } else {
    const tried = (complaint.aiSelfHelp?.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
    outcome = await forwardOutcome(complaint, {
      route: 'department',
      reason: 'The student tried the AI self-help steps but the problem is not fixed.',
      extra: tried ? `Steps the student already tried:\n${tried}` : '',
    });
  }

  await saveOutcome(ref, outcome);
  return { status: outcome.agentStatus };
});

// ---------- end complaint routing ----------
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

// ---------- AI FOOD WASTE ANALYSIS ----------

// Admin: analyse historical food reports and forecast how much to cook on a target date.
export const analyzeFoodWaste = onCall(
  {
    secrets: isEmulator ? [] : [GEMINI_API_KEY],
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Please log in first.');
    }
    await requireMessAdmin(uid);

    const { range = '12m', targetDate, totalStudents } = request.data || {};
    const today = todayIST();

    if (!RANGES[range]) {
      throw new HttpsError('invalid-argument', 'Unknown date range.');
    }
    if (
      targetDate != null &&
      (typeof targetDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(targetDate) ||
        targetDate <= today ||
        targetDate > addDays(today, 400))
    ) {
      throw new HttpsError('invalid-argument', 'Choose a future date within the next year.');
    }
    const strength = totalStudents == null ? null : Number(totalStudents);
    if (strength != null && (!Number.isInteger(strength) || strength < 1 || strength > 20000)) {
      throw new HttpsError('invalid-argument', 'Hostel strength must be a whole number.');
    }

    // Festival factors need the same festival from earlier years, so always read
    // at least ~2.2 years of history even when the dashboard range is shorter.
    const from = range === 'all' ? null : addDays(today, -800);
    let query = db.collection('mealReports');
    if (from) query = query.where('date', '>=', from);
    const snapshot = await query.get();
    const reports = snapshot.docs.map((d) => d.data());

    const llm = await pickLlm();
    let generate = null;
    if (llm) {
      try {
        // Rate limit protects the free Gemini quota. Local Ollama has no quota.
        if (llm.name === 'gemini') await checkRateLimit(uid);
        generate = (payload) => generateFoodAdvice({ llm, payload });
      } catch (error) {
        logger.warn('Food analysis AI skipped (rate limit)', { message: String(error?.message) });
      }
    }

    try {
      const result = await runFoodAnalysis({
        reports,
        today,
        range,
        targetDate,
        totalStudents: strength,
        generate,
        aiSource: llm?.name,
        log: (e) =>
          logger.error('Gemini food analysis failed', {
            status: e?.status,
            message: String(e?.message || e).slice(0, 300),
          }),
      });
      return { ...result, aiConfigured: Boolean(llm), aiLabel: llm?.label || null };
    } catch (error) {
      logger.error('Food analysis crashed', { message: String(error?.message || error).slice(0, 300) });
      throw new HttpsError('internal', 'Could not analyse food data.');
    }
  }
);