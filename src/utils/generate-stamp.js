// Renders a circular rubber-stamp image (PNG data URL) with the org name
// curved around the top and a star at the bottom. Designed for embedding
// in @react-pdf/renderer <Image> tags. Must run in the browser (uses canvas).

const cache = new Map();

export function generateStampDataUrl(
  orgName,
  { color = "#5B1E5E", size = 240 } = {}
) {
  if (typeof document === "undefined") return null;
  const name = (orgName || "").trim();
  if (!name) return null;

  const cacheKey = `${name}|${color}|${size}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const text = name.toUpperCase();
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 6;
  const outerR2 = outerR - 5;
  const innerSmallR = outerR2 - 55;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, innerSmallR, 0, Math.PI * 2);
  ctx.stroke();

  const bandWidth = outerR2 - innerSmallR;
  const baseFont = Math.floor(bandWidth * 0.55);
  let fontSize = baseFont;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const textRadius = (outerR2 + innerSmallR) / 2 + 2;
  const letterSpacing = 2;

  const measureTotalAngle = () => {
    let total = 0;
    for (const ch of text) {
      total += (ctx.measureText(ch).width + letterSpacing) / textRadius;
    }
    return total;
  };

  let totalAngle = measureTotalAngle();
  const maxArc = Math.PI * 1.05;
  while (totalAngle > maxArc && fontSize > 7) {
    fontSize -= 1;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    totalAngle = measureTotalAngle();
  }

  let angle = -Math.PI / 2 - totalAngle / 2;
  for (const ch of text) {
    const charAngle =
      (ctx.measureText(ch).width + letterSpacing) / textRadius;
    const drawAngle = angle + charAngle / 2;
    ctx.save();
    ctx.translate(
      cx + Math.cos(drawAngle) * textRadius,
      cy + Math.sin(drawAngle) * textRadius
    );
    ctx.rotate(drawAngle + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    angle += charAngle;
  }

  const starOuter = bandWidth * 0.25;
  const starInner = starOuter * 0.45;
  drawStar(
    ctx,
    cx,
    cy + (outerR2 + innerSmallR) / 2,
    5,
    starOuter,
    starInner
  );

  const dataUrl = canvas.toDataURL("image/png");
  cache.set(cacheKey, dataUrl);
  return dataUrl;
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outerR;
    let y = cy + Math.sin(rot) * outerR;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
  ctx.fill();
}
