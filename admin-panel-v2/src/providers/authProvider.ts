import { AuthProvider } from 'react-admin';

export const authProvider: AuthProvider = {
  login: ({ username, password }) => {
    const request = new Request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });
    return fetch(request)
      .then(response => {
        if (response.status < 200 || response.status >= 300) {
          throw new Error(response.statusText);
        }
        return response.json();
      })
      .then(auth => {
        localStorage.setItem('auth', JSON.stringify(auth));
        return Promise.resolve();
      })
      .catch(() => {
        throw new Error('Invalid credentials');
      });
  },

  logout: () => {
    localStorage.removeItem('auth');
    return Promise.resolve();
  },

  checkError: ({ status }: { status: number }) => {
    if (status === 401 || status === 403) {
      localStorage.removeItem('auth');
      return Promise.reject();
    }
    return Promise.resolve();
  },

  checkAuth: () => {
    return localStorage.getItem('auth')
      ? Promise.resolve()
      : Promise.reject();
  },

  getPermissions: () => {
    const auth = localStorage.getItem('auth');
    return auth ? Promise.resolve(JSON.parse(auth).role) : Promise.reject();
  },

  getIdentity: () => {
    const auth = localStorage.getItem('auth');
    if (auth) {
      const { id, fullName, avatar } = JSON.parse(auth);
      return Promise.resolve({ id, fullName, avatar });
    }
    return Promise.reject();
  },
};