const getLocalStorage = (key) => {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(key);
  }
};

export default getLocalStorage;
