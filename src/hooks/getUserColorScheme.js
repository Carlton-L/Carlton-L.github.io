const getUserColorScheme = () => {
  if (typeof window !== 'undefined') {
    if (window.metchMedia && window.matchMedia('prefers-color-scheme: light').matches) {
      return 'light';
    }
    return 'dark';
  }
};

export default getUserColorScheme;
