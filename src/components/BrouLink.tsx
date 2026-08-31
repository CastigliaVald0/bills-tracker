"use client";

const BROU_COTIZACIONES_URL = "https://www.brou.com.uy/cotizaciones";
const BROU_ANDROID_PACKAGE = "uy.brou";

export function BrouLink() {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid) return;

    e.preventDefault();
    const fallback = encodeURIComponent(BROU_COTIZACIONES_URL);
    window.location.href = `intent://#Intent;package=${BROU_ANDROID_PACKAGE};scheme=https;S.browser_fallback_url=${fallback};end`;
  }

  return (
    <a
      href={BROU_COTIZACIONES_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
    >
      Cotización BROU
      <span aria-hidden>↗</span>
    </a>
  );
}
