var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.dataset.theme = dark ? 'black' : 'light';
document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#000000' : '#ffffff');
