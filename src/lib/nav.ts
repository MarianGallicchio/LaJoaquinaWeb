// Navegación entre tienda y admin que funciona con o sin barra final,
// en localhost (/) y en GitHub Pages (/LaJoaquinaWeb/).

function siblingFile(file: 'admin.html' | 'index.html'): string {
  const path = window.location.pathname;
  if (path.endsWith('/' + file)) return window.location.href.split('?')[0];
  if (path.endsWith('.html')) return path.replace(/[^/]*$/, file);
  const base = path.endsWith('/') ? path : path + '/';
  return base + file;
}

export function goAdmin(): void {
  window.location.href = siblingFile('admin.html');
}

export function goStore(): void {
  window.location.href = siblingFile('index.html');
}
