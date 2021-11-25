const setLocalStorage = (key, value) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, value);
  }
};

export default setLocalStorage;
