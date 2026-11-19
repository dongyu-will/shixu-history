// Queries select scenes; keep resources inside the site's current directory.
export const sitePath = path => typeof path==='string' && path.startsWith('/') ? `.${path}` : path;
