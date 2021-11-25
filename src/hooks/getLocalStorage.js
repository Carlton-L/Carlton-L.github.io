const getLocalStorage = (key) => {
  if (typeof window !== 'undefined') {
    window.localStorage.getItem(key);
  }
};

export default getLocalStorage;
