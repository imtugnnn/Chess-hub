const paths = {
  students: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m9 1a4 4 0 0 1 0 7m4 10v-2a4 4 0 0 0-3-3.87',
  book: 'M3 4h7a2 2 0 0 1 2 2v15a3 3 0 0 0-3-2H3V4m9 2a2 2 0 0 1 2-2h7v15h-6a3 3 0 0 0-3 2',
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2',
  check: 'm5 12 4 4L19 6',
  center: 'M3 21V8l9-5 9 5v13M8 21v-6h8v6M7 9h2m6 0h2M7 12h2m6 0h2',
  classes: 'm2 8 10-5 10 5-10 5L2 8m4 2v7c4 3 8 3 12 0v-7m4-2v8',
  trophy: 'M8 3h8v6a4 4 0 0 1-8 0V3m0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v5m-4 3h8m-6-3h4v3',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 7l3-3 3 2h4l3-2 3 3-2 3v4l2 3-3 3-3-2h-4l-3 2-3-3 2-3v-4L4 7',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  search: 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15m5.3 12.8L21 21',
  plus: 'M12 5v14M5 12h14',
  chevron: 'm9 5 7 7-7 7',
  logout: 'M9 3H4v18h5m6-14 5 5-5 5m-7-5h12',
  video: 'M3 5h12v14H3V5m12 5 6-4v12l-6-4',
};

export function UiIcon({ name, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.home} /></svg>;
}
