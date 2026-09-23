// Génère les rendus vectoriels génériques du catalogue de démonstration (public/visuals/*.svg).
// Ces visuels sont des placeholders de marque : à remplacer par les photos réelles via le back-office.
// Usage : node scripts/generate-visuals.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "visuals");
mkdirSync(out, { recursive: true });

const W = 800;
const H = 1000;

const metals = {
  gold: ["#FBE7B0", "#E6CB8F", "#C9A45C", "#8E6A2C", "#5E4418"],
  silver: ["#FFFFFF", "#E3E6EA", "#B8BCC4", "#7E838C", "#4A4E55"],
  bronze: ["#F4C9A0", "#D69A63", "#A8683A", "#6E3F1E", "#442511"],
  steel: ["#F4F6F8", "#CFD4DA", "#9EA3AB", "#6A6F77", "#3E4248"],
  wood: ["#A5643C", "#8A4E2C", "#6B3A22", "#4E2816", "#2F170C"],
  marble: ["#3A3A40", "#26262B", "#1A1A1D", "#111113", "#050506"],
  crystal: ["#FFFFFF", "#EAF4FA", "#CFE3EE", "#A8C8DA", "#7FA6BD"],
  leather: ["#8A5A40", "#6E4430", "#5A3A2A", "#3E2619", "#24150D"],
};

function defs() {
  const grads = Object.entries(metals)
    .map(
      ([k, c]) => `
    <linearGradient id="${k}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c[3]}"/><stop offset=".18" stop-color="${c[1]}"/>
      <stop offset=".42" stop-color="${c[0]}"/><stop offset=".62" stop-color="${c[2]}"/>
      <stop offset=".85" stop-color="${c[3]}"/><stop offset="1" stop-color="${c[4]}"/>
    </linearGradient>
    <linearGradient id="${k}V" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c[0]}"/><stop offset=".5" stop-color="${c[2]}"/><stop offset="1" stop-color="${c[4]}"/>
    </linearGradient>`,
    )
    .join("");
  return `<defs>${grads}
    <radialGradient id="bg" cx=".5" cy=".38" r=".75">
      <stop offset="0" stop-color="#232327"/><stop offset=".55" stop-color="#121214"/><stop offset="1" stop-color="#0A0A0B"/>
    </radialGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#D4AF6A" stop-opacity=".28"/><stop offset="1" stop-color="#D4AF6A" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="shadow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#D4AF6A" stop-opacity="0"/><stop offset=".5" stop-color="#F2DDA8"/><stop offset="1" stop-color="#D4AF6A" stop-opacity="0"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity=".035"/>
    </pattern>
  </defs>`;
}

// Décor commun : fond, grille, repères de registration, cote, sol
function frame(body, { label = "", floor = 880 } = {}) {
  const marks = [
    [60, 60],
    [W - 60, 60],
    [60, H - 60],
    [W - 60, H - 60],
  ]
    .map(
      ([x, y]) =>
        `<g stroke="#D4AF6A" stroke-opacity=".45" stroke-width="1"><path d="M${x - 14} ${y}h28M${x} ${y - 14}v28"/><circle cx="${x}" cy="${y}" r="6" fill="none"/></g>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">
  ${defs()}
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <circle cx="${W / 2}" cy="${floor - 330}" r="360" fill="url(#glow)"/>
  <ellipse cx="${W / 2}" cy="${floor}" rx="250" ry="26" fill="url(#shadow)"/>
  ${marks}
  <path d="M100 ${floor + 50}H${W - 100}" stroke="#ffffff" stroke-opacity=".12"/>
  ${Array.from({ length: 13 }, (_, i) => `<path d="M${100 + i * 50} ${floor + 44}v12" stroke="#ffffff" stroke-opacity=".18"/>`).join("")}
  ${body}
  <rect x="0" y="${floor - 470}" width="${W}" height="2" fill="url(#beam)" opacity=".55"/>
  <text x="${W / 2}" y="${H - 40}" text-anchor="middle" font-family="monospace" font-size="15" letter-spacing="4" fill="#8B8F98">${label.toUpperCase()}</text>
</svg>`;
}

const plinth = (y, w = 300, h = 90, m = "marble") => `
  <rect x="${400 - w / 2}" y="${y}" width="${w}" height="${h}" rx="4" fill="url(#${m})"/>
  <rect x="${400 - w / 2}" y="${y}" width="${w}" height="6" fill="#ffffff" opacity=".08"/>
  <rect x="${400 - w * 0.3}" y="${y + h * 0.35}" width="${w * 0.6}" height="${h * 0.34}" rx="2" fill="url(#gold)"/>
  <path d="M${400 - w * 0.22} ${y + h * 0.5}h${w * 0.44}M${400 - w * 0.16} ${y + h * 0.6}h${w * 0.32}" stroke="#5E4418" stroke-width="3" opacity=".6"/>`;

const shapes = {
  cup: (m) => `
    <path d="M250 250 C250 470 320 540 400 548 C480 540 550 470 550 250 Z" fill="url(#${m})"/>
    <ellipse cx="400" cy="250" rx="150" ry="26" fill="url(#${m}V)"/>
    <ellipse cx="400" cy="252" rx="130" ry="18" fill="#000" opacity=".35"/>
    <path d="M252 290 C170 290 170 420 290 450" fill="none" stroke="url(#${m})" stroke-width="20" stroke-linecap="round"/>
    <path d="M548 290 C630 290 630 420 510 450" fill="none" stroke="url(#${m})" stroke-width="20" stroke-linecap="round"/>
    <path d="M378 548 h44 l14 120 h-72 Z" fill="url(#${m})"/>
    <ellipse cx="400" cy="668" rx="80" ry="14" fill="url(#${m}V)"/>
    <rect x="330" y="668" width="140" height="42" fill="url(#${m})"/>
    ${plinth(710)}
    <path d="M300 300 C305 420 340 500 380 525" stroke="#fff" stroke-opacity=".5" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  star: (m) => `
    <polygon points="400,170 440,285 560,285 463,355 500,470 400,400 300,470 337,355 240,285 360,285" fill="url(#${m})"/>
    <polygon points="400,170 400,400 300,470 337,355 240,285 360,285" fill="#000" opacity=".18"/>
    <rect x="380" y="455" width="40" height="190" fill="url(#${m})"/>
    <ellipse cx="400" cy="645" rx="70" ry="12" fill="url(#${m}V)"/>
    <rect x="340" y="645" width="120" height="65" fill="url(#silver)"/>
    ${plinth(710)}`,
  column: (m) => `
    <ellipse cx="400" cy="300" rx="90" ry="18" fill="url(#${m}V)"/>
    <circle cx="400" cy="235" r="62" fill="url(#${m})"/>
    <circle cx="400" cy="235" r="40" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
    <path d="M388 225 l12 -20 l12 20 h-8 v20 h-8 v-20 z" fill="#5E4418" opacity=".7"/>
    <rect x="345" y="300" width="110" height="340" fill="url(#${m})"/>
    ${Array.from({ length: 6 }, (_, i) => `<rect x="${352 + i * 17}" y="300" width="4" height="340" fill="#000" opacity=".12"/>`).join("")}
    <ellipse cx="400" cy="640" rx="100" ry="16" fill="url(#${m}V)"/>
    <rect x="310" y="640" width="180" height="70" fill="url(#marble)"/>
    ${plinth(710)}`,
  crystal: () => `
    <path d="M300 200 L500 200 L520 660 L280 660 Z" fill="url(#crystal)" opacity=".92"/>
    <path d="M300 200 L330 230 L490 230 L500 200 Z" fill="#fff" opacity=".7"/>
    <path d="M330 230 L345 640 L280 660 L300 200 Z" fill="#fff" opacity=".25"/>
    <path d="M490 230 L505 640 L520 660 L500 200 Z" fill="#7FA6BD" opacity=".45"/>
    <g fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2">
      <circle cx="400" cy="330" r="46"/><path d="M380 330 l14 14 l26 -30"/>
      <path d="M340 420h120M355 450h90M370 480h60"/>
    </g>
    <rect x="270" y="660" width="260" height="50" fill="url(#marble)"/>
    ${plinth(710, 320, 80)}`,
  acrylic: () => `
    <rect x="290" y="190" width="220" height="470" rx="26" fill="#DDE8F0" opacity=".22" stroke="#fff" stroke-opacity=".6" stroke-width="3"/>
    <rect x="315" y="230" width="170" height="170" rx="85" fill="#D4AF6A" opacity=".85"/>
    <rect x="335" y="250" width="130" height="130" rx="65" fill="#0A0A0B" opacity=".85"/>
    <text x="400" y="332" text-anchor="middle" font-family="Georgia,serif" font-size="46" fill="#E6CB8F">N°1</text>
    <path d="M330 450h140M345 480h110M360 510h80" stroke="#fff" stroke-opacity=".75" stroke-width="4" stroke-linecap="round"/>
    <path d="M300 205 q10 -10 30 -12" stroke="#fff" stroke-width="4" opacity=".7" fill="none"/>
    ${plinth(660, 280, 90)}`,
  medal: (m) => `
    <path d="M330 120 L400 380 L470 120 Z" fill="#1E4F8F"/>
    <path d="M330 120 L360 120 L400 300 L440 120 L470 120 L400 380 Z" fill="#E0594A"/>
    <path d="M355 120 L400 330 L445 120" fill="none" stroke="#F5F2EB" stroke-width="10"/>
    <circle cx="400" cy="560" r="190" fill="url(#${m})"/>
    <circle cx="400" cy="560" r="160" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="3"/>
    <circle cx="400" cy="560" r="150" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>
    <path d="M400 470 l24 50 55 7 -40 38 10 55 -49 -27 -49 27 10 -55 -40 -38 55 -7 z" fill="#000" opacity=".22"/>
    <path d="M300 470 C320 430 360 410 400 405" stroke="#fff" stroke-opacity=".55" stroke-width="7" fill="none" stroke-linecap="round"/>
    <rect x="385" y="360" width="30" height="30" rx="4" fill="url(#${m})"/>`,
  plaque: (m, board = "wood") => `
    <rect x="200" y="220" width="400" height="520" rx="10" fill="url(#${board})"/>
    <rect x="200" y="220" width="400" height="10" fill="#fff" opacity=".12"/>
    <rect x="245" y="275" width="310" height="410" rx="4" fill="url(#${m})"/>
    <rect x="262" y="292" width="276" height="376" rx="2" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="2"/>
    <circle cx="400" cy="380" r="42" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="4"/>
    <g stroke="#000" stroke-opacity=".38" stroke-width="5" stroke-linecap="round">
      <path d="M300 470h200"/><path d="M320 510h160"/><path d="M290 560h220"/><path d="M340 600h120"/>
    </g>
    <path d="M250 280 L360 280 L250 420 Z" fill="#fff" opacity=".12"/>`,
  pen: () => `
    <g transform="rotate(-35 400 520)">
      <rect x="370" y="210" width="60" height="560" rx="30" fill="url(#steel)"/>
      <rect x="370" y="210" width="60" height="200" rx="30" fill="url(#marble)"/>
      <rect x="425" y="250" width="12" height="170" rx="6" fill="url(#gold)"/>
      <path d="M370 770 L400 850 L430 770 Z" fill="url(#gold)"/>
      <path d="M390 520h20M388 560h24M392 600h16" stroke="#3E4248" stroke-width="3"/>
      <rect x="370" y="410" width="60" height="10" fill="url(#gold)"/>
    </g>`,
  wood: () => `
    <path d="M200 420 L400 330 L600 420 L400 510 Z" fill="#8A4E2C"/>
    <path d="M200 420 L400 510 L400 720 L200 630 Z" fill="url(#wood)"/>
    <path d="M600 420 L400 510 L400 720 L600 630 Z" fill="#4E2816"/>
    <g fill="none" stroke="#2F170C" stroke-width="3" opacity=".8">
      <ellipse cx="400" cy="420" rx="90" ry="36"/><ellipse cx="400" cy="420" rx="60" ry="22"/>
      <path d="M250 520 l120 55M250 560 l120 55M250 600 l90 42"/>
    </g>
    <path d="M200 420 L400 330 L400 340 L210 425 Z" fill="#fff" opacity=".12"/>`,
  bottle: () => `
    <rect x="350" y="170" width="100" height="70" rx="14" fill="url(#marble)"/>
    <rect x="365" y="240" width="70" height="40" fill="url(#steel)"/>
    <path d="M320 320 Q320 280 365 280 H435 Q480 280 480 320 V740 Q480 770 450 770 H350 Q320 770 320 740 Z" fill="url(#steel)"/>
    <g fill="none" stroke="#3E4248" stroke-width="3" opacity=".85">
      <circle cx="400" cy="470" r="44"/><path d="M372 470 h56 M400 442 v56"/>
      <path d="M350 560h100M362 590h76"/>
    </g>
    <path d="M338 330 V730" stroke="#fff" stroke-opacity=".6" stroke-width="8" stroke-linecap="round"/>`,
  banner: () => `
    <path d="M110 330 H690 V640 H110 Z" fill="#F2F2F2"/>
    <rect x="110" y="330" width="580" height="310" fill="url(#marble)" opacity=".2"/>
    <rect x="140" y="360" width="250" height="250" fill="#1A1A1D"/>
    <circle cx="265" cy="485" r="80" fill="#D4AF6A"/>
    <rect x="420" y="380" width="240" height="34" fill="#1A1A1D"/>
    <rect x="420" y="430" width="200" height="16" fill="#8B8F98"/>
    <rect x="420" y="456" width="220" height="16" fill="#8B8F98"/>
    <rect x="420" y="540" width="150" height="46" rx="23" fill="#E0594A"/>
    ${[130, 280, 400, 520, 670].map((x) => `<circle cx="${x}" cy="345" r="7" fill="url(#steel)"/><circle cx="${x}" cy="625" r="7" fill="url(#steel)"/>`).join("")}
    <path d="M110 330 C300 350 500 320 690 335" stroke="#000" stroke-opacity=".08" stroke-width="16" fill="none"/>`,
  rollup: () => `
    <rect x="300" y="150" width="200" height="680" fill="#F5F2EB"/>
    <rect x="300" y="150" width="200" height="300" fill="#1A1A1D"/>
    <circle cx="400" cy="300" r="70" fill="#D4AF6A"/>
    <rect x="325" y="480" width="150" height="26" fill="#1A1A1D"/>
    <rect x="325" y="520" width="120" height="12" fill="#8B8F98"/><rect x="325" y="542" width="135" height="12" fill="#8B8F98"/>
    <rect x="325" y="720" width="150" height="50" fill="#E0594A"/>
    <rect x="290" y="830" width="220" height="30" rx="6" fill="url(#steel)"/>
    <rect x="296" y="140" width="208" height="12" rx="4" fill="url(#steel)"/>`,
  panel: () => `
    <rect x="150" y="260" width="500" height="430" rx="6" fill="#E4E4E4"/>
    <rect x="170" y="280" width="460" height="390" fill="#1A1A1D"/>
    <path d="M170 600 L300 470 L400 560 L480 490 L630 620 V670 H170 Z" fill="#4FB286" opacity=".8"/>
    <circle cx="540" cy="360" r="40" fill="#E0A43A"/>
    <path d="M150 260 L330 260 L150 440 Z" fill="#fff" opacity=".12"/>
    ${[[175, 285], [625, 285], [175, 665], [625, 665]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="url(#steel)"/>`).join("")}`,
  door: () => `
    <rect x="180" y="380" width="440" height="200" rx="8" fill="#DDE8F0" opacity=".3" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>
    <rect x="200" y="400" width="400" height="160" rx="4" fill="url(#marble)"/>
    <text x="400" y="470" text-anchor="middle" font-family="Georgia,serif" font-size="44" fill="#E6CB8F">Direction</text>
    <text x="400" y="515" text-anchor="middle" font-family="monospace" font-size="20" letter-spacing="6" fill="#B8BCC4">BUREAU 204</text>
    ${[[195, 395], [605, 395], [195, 565], [605, 565]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="url(#steel)"/>`).join("")}`,
  letters: () => `
    <rect x="120" y="300" width="560" height="380" fill="#1A1A1D"/>
    <text x="408" y="560" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="240" fill="#6E4418">UG</text>
    <text x="400" y="552" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="240" fill="url(#goldV)">UG</text>
    <rect x="200" y="600" width="400" height="6" fill="url(#beam)"/>`,
  lightbox: () => `
    <rect x="150" y="360" width="500" height="240" rx="18" fill="url(#steel)"/>
    <rect x="170" y="380" width="460" height="200" rx="10" fill="#FFF6DD"/>
    <rect x="170" y="380" width="460" height="200" rx="10" fill="url(#glow)"/>
    <text x="400" y="500" text-anchor="middle" font-family="Georgia,serif" font-size="68" fill="#1A1A1D">OUVERT</text>
    <ellipse cx="400" cy="480" rx="330" ry="170" fill="#F2DDA8" opacity=".14"/>`,
  mug: () => `
    <path d="M270 360 H510 V700 Q510 740 470 740 H310 Q270 740 270 700 Z" fill="url(#silver)"/>
    <ellipse cx="390" cy="360" rx="120" ry="22" fill="#E3E6EA"/><ellipse cx="390" cy="362" rx="104" ry="15" fill="#4A2A18"/>
    <path d="M510 420 C600 420 600 620 510 620" fill="none" stroke="url(#silver)" stroke-width="30"/>
    <circle cx="390" cy="540" r="70" fill="#D4AF6A"/><text x="390" y="556" text-anchor="middle" font-family="Georgia,serif" font-size="44" fill="#0A0A0B">UG</text>
    <path d="M290 380 V700" stroke="#fff" stroke-opacity=".7" stroke-width="10" stroke-linecap="round"/>`,
  keyring: () => `
    <circle cx="400" cy="300" r="70" fill="none" stroke="url(#steel)" stroke-width="12"/>
    <rect x="385" y="365" width="30" height="60" rx="8" fill="url(#steel)"/>
    <rect x="300" y="420" width="200" height="300" rx="40" fill="url(#gold)"/>
    <circle cx="400" cy="460" r="14" fill="#0A0A0B"/>
    <text x="400" y="600" text-anchor="middle" font-family="Georgia,serif" font-size="80" fill="#5E4418" opacity=".75">A</text>`,
  tshirt: () => `
    <path d="M280 220 L200 280 L150 420 L240 460 L260 420 V780 H540 V420 L560 460 L650 420 L600 280 L520 220 Q400 290 280 220 Z" fill="#F5F2EB"/>
    <path d="M280 220 Q400 290 520 220 Q400 250 280 220" fill="#D8D4CA"/>
    <circle cx="400" cy="470" r="90" fill="#1A1A1D"/><circle cx="400" cy="470" r="60" fill="#D4AF6A"/>
    <text x="400" y="620" text-anchor="middle" font-family="monospace" font-size="30" letter-spacing="6" fill="#1A1A1D">TEAM 2026</text>`,
  gift: () => `
    <rect x="180" y="440" width="440" height="280" rx="10" fill="url(#wood)"/>
    <rect x="195" y="455" width="410" height="250" rx="6" fill="#1A1A1D"/>
    <rect x="230" y="500" width="230" height="170" rx="6" fill="url(#leather)"/>
    <rect x="490" y="490" width="22" height="190" rx="11" fill="url(#steel)"/>
    <rect x="535" y="560" width="40" height="80" rx="6" fill="url(#gold)"/>
    <path d="M180 440 L620 440 L560 300 L240 300 Z" fill="url(#wood)" opacity=".85"/>
    <text x="345" y="595" text-anchor="middle" font-family="Georgia,serif" font-size="30" fill="#E6CB8F" opacity=".8">UG</text>`,
  notebook: () => `
    <rect x="250" y="220" width="320" height="480" rx="14" fill="url(#leather)"/>
    <rect x="570" y="240" width="18" height="440" rx="6" fill="#F5F2EB"/>
    <rect x="530" y="220" width="12" height="480" fill="#24150D" opacity=".5"/>
    <rect x="300" y="400" width="200" height="110" rx="4" fill="none" stroke="#E6CB8F" stroke-opacity=".7" stroke-width="3"/>
    <text x="400" y="470" text-anchor="middle" font-family="Georgia,serif" font-size="36" fill="#E6CB8F" opacity=".85">2026</text>
    <rect x="400" y="700" width="16" height="90" fill="#E0594A"/>`,
  stand: () => `
    <path d="M140 250 Q400 190 660 250 V760 Q400 700 140 760 Z" fill="#1A1A1D"/>
    <path d="M140 250 Q270 222 400 214 V726 Q270 734 140 760 Z" fill="#26262B"/>
    <circle cx="400" cy="420" r="90" fill="#D4AF6A"/>
    <text x="400" y="570" text-anchor="middle" font-family="Georgia,serif" font-size="46" fill="#F5F2EB">Votre marque</text>
    <rect x="300" y="610" width="200" height="14" fill="#8B8F98"/>
    <rect x="220" y="780" width="360" height="60" rx="8" fill="url(#marble)"/>`,
  flag: () => `
    <path d="M380 130 V860" stroke="url(#steel)" stroke-width="10"/>
    <path d="M385 140 C520 150 560 300 540 520 C520 660 460 720 385 740 Z" fill="#D4AF6A"/>
    <path d="M385 140 C470 150 505 260 500 380 L385 380 Z" fill="#1A1A1D"/>
    <text transform="rotate(90 460 520)" x="460" y="520" text-anchor="middle" font-family="Georgia,serif" font-size="46" fill="#1A1A1D">PROMO</text>
    <path d="M320 860 L380 830 L440 860" stroke="url(#steel)" stroke-width="10" fill="none"/>`,
};

const visuals = {
  "trophy-cup-gold": [shapes.cup("gold"), "Coupe"],
  "trophy-cup-silver": [shapes.cup("silver"), "Coupe"],
  "trophy-star": [shapes.star("gold"), "Étoile"],
  "trophy-column": [shapes.column("gold"), "Colonne"],
  "crystal-award": [shapes.crystal(), "Cristal"],
  "acrylic-award": [shapes.acrylic(), "Acrylique"],
  "medal-gold": [shapes.medal("gold"), "Médaille"],
  "medal-silver": [shapes.medal("silver"), "Médaille"],
  "medal-bronze": [shapes.medal("bronze"), "Médaille"],
  "plaque-wood": [shapes.plaque("gold", "wood"), "Plaque"],
  "plaque-steel": [shapes.plaque("steel", "marble"), "Plaque inox"],
  "plaque-brass": [shapes.plaque("gold", "marble"), "Plaque laiton"],
  pen: [shapes.pen(), "Stylo gravé"],
  "wood-engraving": [shapes.wood(), "Gravure bois"],
  bottle: [shapes.bottle(), "Gourde inox"],
  banner: [shapes.banner(), "Bâche"],
  rollup: [shapes.rollup(), "Roll-up"],
  "dibond-panel": [shapes.panel(), "Dibond UV"],
  "door-sign": [shapes.door(), "Signalétique"],
  "letters-3d": [shapes.letters(), "Lettres 3D"],
  lightbox: [shapes.lightbox(), "Caisson lumineux"],
  mug: [shapes.mug(), "Mug"],
  keyring: [shapes.keyring(), "Porte-clés"],
  tshirt: [shapes.tshirt(), "Textile"],
  "gift-box": [shapes.gift(), "Coffret"],
  notebook: [shapes.notebook(), "Carnet cuir"],
  stand: [shapes.stand(), "Stand"],
  "beach-flag": [shapes.flag(), "Beach flag"],
};

for (const [name, [body, label]] of Object.entries(visuals)) {
  writeFileSync(join(out, `${name}.svg`), frame(body, { label }));
}
console.log(`${Object.keys(visuals).length} visuels générés dans ${out}`);
