// Auth session is per-tab (sessionStorage) by default so that logging into
// a different account in another tab/window never bleeds into an already
// open tab — localStorage is shared across every tab of the same origin,
// which was causing every open "branch admin" session to collapse onto
// whichever account most recently logged in anywhere in the browser.
// "Remember me" is the only case that opts into the shared, persistent
// localStorage behavior.
const TOKEN_KEY = "token";
const USER_KEY = "user";

export const saveToken = (token: string, rememberMe = false) => {
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const getToken = () => {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
};

export const saveUser = (user: any, rememberMe = false) => {
  const value = JSON.stringify(user);
  if (rememberMe) {
    localStorage.setItem(USER_KEY, value);
    sessionStorage.removeItem(USER_KEY);
  } else {
    sessionStorage.setItem(USER_KEY, value);
    localStorage.removeItem(USER_KEY);
  }
};

export const getUser = () => {
  const user = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const remove = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
