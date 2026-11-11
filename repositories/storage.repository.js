(function () {
  window.PJotaStorageRepository = {
    get(key) {
      return localStorage.getItem(key);
    },
    set(key, value) {
      localStorage.setItem(key, value);
    },
    remove(key) {
      localStorage.removeItem(key);
    },
    getSession(key) {
      return sessionStorage.getItem(key);
    },
    setSession(key, value) {
      sessionStorage.setItem(key, value);
    },
    removeSession(key) {
      sessionStorage.removeItem(key);
    },
  };
})();
