// The player's own character: guy or girl, skin tone, outfit, hairstyle and name.

export const SKIN_TONES = [0x4a2e1b, 0x5c3a21, 0x6b4226, 0x8d5a36, 0xa86b45];
export const OUTFITS = [
  { shirt: 0xff7a1a, pattern: 0x0f8b8d, pants: 0x2a3550 },
  { shirt: 0x2bb34a, pattern: 0xffffff, pants: 0x1e1e24 },
  { shirt: 0x7b2d8b, pattern: 0xffd23f, pants: 0x2a3550 },
  { shirt: 0xe33d5c, pattern: 0xffffff, pants: 0x1e1e24 },
  { shirt: 0x2c7be5, pattern: 0xffd23f, pants: 0x3a3a3a },
  { shirt: 0x1e1e24, pattern: 0xff9a1a, pants: 0x6b3f2a },
];
export const HAIR = {
  girl: [{ id: 'wrap', name: 'Headtie' }, { id: 'puff', name: 'Puff' }, { id: 'braids', name: 'Braids' }, { id: 'short', name: 'Low cut' }],
  guy: [{ id: 'short', name: 'Low cut' }, { id: 'cap', name: 'Cap' }, { id: 'puff', name: 'Afro' }],
};

export function defaultProfile() {
  return { name: '', gender: 'girl', skin: 3, outfit: 0, hair: 0 };
}

export function lookFromProfile(p) {
  const girl = p.gender !== 'guy';
  const o = OUTFITS[p.outfit % OUTFITS.length];
  const styles = HAIR[girl ? 'girl' : 'guy'];
  const hair = styles[p.hair % styles.length].id;
  const fabricHair = hair === 'wrap' || hair === 'cap';
  return {
    skin: SKIN_TONES[p.skin % SKIN_TONES.length],
    shirt: o.shirt, pattern: o.pattern, pants: o.pants,
    dress: girl, hair, hairColor: fabricHair ? o.shirt : 0x1b120c, wrapPattern: o.pattern,
    scale: 1.32,
  };
}

/** "CHIDI" -> "CHIDI'S", "AMOS" -> "AMOS'" */
export function possessive(name) {
  const n = (name || 'ADA').toUpperCase();
  return n.endsWith('S') ? `${n}'` : `${n}'S`;
}
