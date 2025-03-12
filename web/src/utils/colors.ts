// Adjusts a hex color by the given amount (negative to darken, positive to lighten)
export const adjustColor = (col: string, amt: number): string => {
  let usePound = false;
  
  if (col[0] === "#") {
    col = col.slice(1);
    usePound = true;
  }
  
  const num = parseInt(col, 16);
  
  let r = (num >> 16) + amt;
  r = Math.min(255, Math.max(0, r));
  
  let b = ((num >> 8) & 0x00ff) + amt;
  b = Math.min(255, Math.max(0, b));
  
  let g = (num & 0x0000ff) + amt;
  g = Math.min(255, Math.max(0, g));
  
  return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}; 