// Email and Google sign-in. Phones and home-screen apps use redirect because popups
// are unreliable there; desktop browsers keep the popup.
const Auth = (function () {
  let auth = null;

  const MESSAGES = {
    'auth/invalid-email': 'That email address does not look right.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'Wrong email or password.',
    'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
    'auth/weak-password': 'Use a password of at least 6 characters.',
    'auth/too-many-requests': 'Too many tries. Wait a few minutes and try again.',
    'auth/network-request-failed': 'No connection. Check your signal and try again.',
    'auth/account-exists-with-different-credential': 'That email already has an account. Sign in with your password.',
    'auth/popup-blocked': 'Your browser blocked the Google window. Allow popups and try again.',
  };

  function message(err) {
    return MESSAGES[err.code] || 'Sign-in failed. Please try again.';
  }

  function usesRedirect() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    return standalone || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function init(onChange, onError) {
    auth = firebase.auth();
    auth.onAuthStateChanged(onChange);
    auth.getRedirectResult().catch((err) => onError(message(err)));
  }

  function google() {
    const provider = new firebase.auth.GoogleAuthProvider();
    if (usesRedirect()) return auth.signInWithRedirect(provider);
    return auth.signInWithPopup(provider).catch((err) => {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') throw err;
    });
  }

  return {
    init,
    message,
    google,
    signIn: (email, password) => auth.signInWithEmailAndPassword(email, password),
    signUp: (email, password) => auth.createUserWithEmailAndPassword(email, password),
    reset: (email) => auth.sendPasswordResetEmail(email),
    signOut: () => auth.signOut(),
  };
})();
