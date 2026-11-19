(() => {
  let saved;
  try { saved = localStorage.getItem('shixu-theme'); } catch {}
  const theme = saved === 'light' || saved === 'dark' ? saved : 'light';
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === 'light' ? '#ffffff' : '#0c1829';
})();
