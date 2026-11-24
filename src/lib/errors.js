const MESSAGES = {
  'auth/invalid-email': 'That email address is not valid.',
  'auth/missing-password': 'Please enter your password.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'Network problem. Check your internet connection.',
  'auth/operation-not-allowed': 'Email/password sign-in is turned off. Enable it in Firebase Console → Authentication → Sign-in method.',
  'permission-denied': 'Firestore refused this request. Check that the security rules are published and that your account has the right role.',
  'functions/unauthenticated': 'Please log in again to use AI suggestions.',
  'functions/not-found': 'AI analysis is not available yet (the Cloud Function has not been deployed).',
  'functions/unavailable': 'The AI service could not be reached. Try again in a moment.',
  'functions/deadline-exceeded': 'The AI took too long to answer. Try again in a moment.',
  'ai/invalid-response': 'The AI answer could not be used.',
  unavailable: 'Cannot reach Firestore. Check your internet connection and try again.',
  'failed-precondition': 'Firestore needs extra setup for this request (for example the database is not created yet).',
};

export const friendlyError = (e) => MESSAGES[e?.code] || e?.message || 'Something went wrong. Please try again.';
