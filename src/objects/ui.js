// Shared text + formatting helpers
export const FONT = 'Fredoka, system-ui, sans-serif';

export function label(scene, x, y, str, { size = 20, color = '#ffffff', stroke = '#3a2a1a', sw = 5, weight = 700, res = 3, align = 'center' } = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT, fontSize: `${size}px`, fontStyle: String(weight), color,
    stroke: stroke || undefined, strokeThickness: stroke ? sw : 0, align,
  });
  t.setResolution(res);
  t.setOrigin(0.5);
  return t;
}

export function money(n) {
  n = Math.floor(n);
  if (n >= 1e6) return `₦${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e4) return `₦${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}K`;
  return `₦${n.toLocaleString('en-US')}`;
}
