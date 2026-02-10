export const getMediaUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = (process.env.BACKEND_URL || "").replace(/\/+$/, "");
  const cleanPath = String(path).replace(/^\/+/, "");
  return base ? `${base}/${cleanPath}` : `/${cleanPath}`;
};
