// Shared by the Service Worker and tests. Only original relative media is routed.
export function mediaPath(input, origin) {
  const url = new URL(input, origin);
  if (url.origin !== origin || !/\.(?:png|jpe?g|gif|webp|avif|svg|ico|mp3|ogg|wav|m4a|mp4|webm|woff2?|ttf|otf)$/i.test(url.pathname)) return null;
  if (!/^\/(?:Assets|Audio|Backgrounds|Icons|Screens|Images|Music|Fonts)\//.test(url.pathname)) return null;
  return url.pathname.slice(1) + url.search;
}
