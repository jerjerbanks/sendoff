/**
 * Spot illustrations for empty states and the one celebration moment. Transparent WebP,
 * so they sit on light and dark with no box. Decorative unless the caller passes alt text.
 */
const SPOTS = {
  "empty-tent": { src: "/illustrations/spot-empty-tent.webp", width: 480, height: 428 },
  "everyone-in": { src: "/illustrations/spot-everyone-in.webp", width: 640, height: 412 },
} as const;

export function Spot({ name, alt = "", className = "" }: { name: keyof typeof SPOTS; alt?: string; className?: string }) {
  const spot = SPOTS[name];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static WebP served straight from assets, no optimizer on Workers
    <img className={`ft-spot ${className}`} src={spot.src} width={spot.width} height={spot.height} alt={alt} loading="lazy" decoding="async" />
  );
}
