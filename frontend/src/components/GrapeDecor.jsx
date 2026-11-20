/**
 * Ciorchine decorativ, motiv viticol pentru Corcova.
 *
 * Se așază la capetele barei de meniu, înclinat la 45°, și coboară în spațiul
 * de sub ea, trecând translucid peste bandă. Este pur ornamental: `aria-hidden`
 * îl scoate din arborele de accesibilitate, iar `pointer-events: none` (din CSS)
 * lasă clicurile să treacă prin el către meniu.
 *
 * `soi` alege paleta: struguri albi, aurii, sau Merlot, roșu-vinețiu. Tonurile
 * de Merlot sunt ridicate mult față de culoarea reală a bobului — peste bara
 * albastru-închis a meniului, un vișiniu adevărat s-ar pierde cu totul.
 */

/* Frunza si carcelul sunt verde deschis la ambele soiuri: frunza de vita e verde
   oricare ar fi bobul. Verdele e ales deschis fiindca desenul sta peste bara
   albastru-inchis a meniului, unde un verde de frunza adevarata s-ar stinge. */
const FRUNZA = {
  frunza: ["#dcf0b4", "#9ccb62"],
  codita: "#b9dd86",
  nervuri: "#6f9f3c",
};

const SOIURI = {
  auriu: {
    ...FRUNZA,
    boaba: ["#fffce0", "#ffe34a", "#f0c81a"],
    reflex: "#fffdf0",
  },
  merlot: {
    ...FRUNZA,
    boaba: ["#edb9d2", "#a81d4e", "#58102f"],
    reflex: "#ffe4ef",
  },
};

/* Boabele nu sunt cercuri egale: fiecare are rază, turtire și înclinare proprii,
   plus o mică abatere de poziție — altfel ciorchinele arată desenat mecanic.
   Valorile sunt fixe, nu aleatorii, ca desenul să fie identic la fiecare randare.
   Ciorchinele e alungit, nu triunghi lat: un contur aproape simetric rotit cu 45°
   s-ar citi tot ca vertical, deci înclinarea n-ar mai fi vizibilă. */
const BOABE = [
  { x: 112, y: 96, rx: 13.4, ry: 12.3, rot: -9, dx: -0.9, dy: 0.7 },
  { x: 136, y: 97, rx: 12.5, ry: 13.6, rot: 13, dx: 1.0, dy: -0.8 },

  { x: 100, y: 117, rx: 14.1, ry: 12.7, rot: -4, dx: -0.4, dy: 1.2 },
  { x: 124, y: 115, rx: 12.1, ry: 13.2, rot: 19, dx: 1.3, dy: -0.5 },
  { x: 148, y: 117, rx: 13.9, ry: 12.5, rot: 6, dx: 0.8, dy: -1.0 },

  { x: 110, y: 137, rx: 12.3, ry: 13.7, rot: -15, dx: -1.2, dy: 0.9 },
  { x: 134, y: 135, rx: 13.2, ry: 12.2, rot: 10, dx: 0.5, dy: 0.4 },
  { x: 158, y: 137, rx: 12.6, ry: 13.3, rot: -7, dx: -0.6, dy: 0.8 },

  { x: 120, y: 157, rx: 13.6, ry: 12.9, rot: -12, dx: -0.7, dy: -0.6 },
  { x: 144, y: 156, rx: 12.7, ry: 13.4, rot: 16, dx: 0.9, dy: 0.6 },

  { x: 130, y: 177, rx: 13.1, ry: 12.4, rot: 4, dx: 0.3, dy: -0.5 },

  { x: 138, y: 196, rx: 11.9, ry: 11.3, rot: -6, dx: -0.4, dy: 0.4 },
];

/* Înclinarea de 45°, antiorară: codița și frunza urcă spre stânga-sus, iar
   ciorchinele cade spre dreapta-jos, în spațiul liber de sub bară.
   Se aplică pe conținut, nu pe elementul <svg>, ca masca de stingere să rămână
   fixă față de pagină. Centrul (140, 118) e mijlocul desenului, iar viewBox-ul
   decalat îi cuprinde diagonala — altfel colțurile rotite ar ieși din casetă. */
const INCLINARE = "rotate(-45 140 118)";

export default function GrapeDecor({ soi = "auriu", className = "" }) {
  const c = SOIURI[soi] ?? SOIURI.auriu;
  /* Identificatorii se prefixează cu soiul: două <svg> pe aceeași pagină cu
     aceleași `id` în <defs> s-ar călca, iar al doilea ciorchine ar lua paleta
     primului. */
  const id = (nume) => `grape-${soi}-${nume}`;

  return (
    <svg
      className={`grape-decor ${className}`.trim()}
      viewBox="35 13 211 211"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={id("boaba")} cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor={c.boaba[0]} />
          <stop offset="40%" stopColor={c.boaba[1]} />
          <stop offset="100%" stopColor={c.boaba[2]} />
        </radialGradient>
        <linearGradient id={id("frunza")} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.frunza[0]} />
          <stop offset="100%" stopColor={c.frunza[1]} />
        </linearGradient>
        {/* Stingere usoara pe diagonala, adica pe axa ciorchinelui. Ciorchinele se
            vede intreg — sta in intregime peste header si peste bara de meniu,
            amandoua inchise la culoare — dar varful se mai domoleste, ca desenul
            sa nu para lipit cu marginea de jos a barei. */}
        <linearGradient id={id("stingere")} x1="0.08" y1="0.08" x2="0.92" y2="0.92">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="72%" stopColor="#fff" />
          <stop offset="100%" stopColor="#8c8c8c" />
        </linearGradient>
        <mask id={id("masca")}>
          <rect x="35" y="13" width="211" height="211" fill={`url(#${id("stingere")})`} />
        </mask>
      </defs>

      <g mask={`url(#${id("masca")})`}>
        <g transform={INCLINARE}>
          {/* cârcel și codiță */}
          <g transform="translate(44 31)" fill="none" stroke={c.codita} strokeWidth="2.6"
             strokeLinecap="round">
            <path d="M85 52 C 84 42, 82 32, 86 24" />
            <path d="M86 24 C 74 20, 64 26, 66 35 C 67 41, 76 42, 77 36 C 77 32, 73 31, 71 34" />
          </g>

          {/* frunză de viță, stilizată */}
          <g transform="translate(40 15)">
            <path
              d="M92 40 L101 27 L108 32 L113 17 L122 24 L131 13 L136 27 L148 24 L143 37
                 L154 43 L141 48 L144 60 L131 54 L125 65 L118 52 L104 55 L108 43 Z"
              fill={`url(#${id("frunza")})`}
            />
            <g stroke={c.nervuri} strokeWidth="1.3" strokeLinecap="round" opacity=".5">
              <path d="M112 50 L132 26" />
              <path d="M112 50 L140 40" />
              <path d="M112 50 L134 55" />
              <path d="M112 50 L120 33" />
            </g>
          </g>

          {/* boabele */}
          <g>
            {BOABE.map((b) => {
              const cx = b.x + b.dx;
              const cy = b.y + b.dy;
              return (
                <g key={`${b.x}-${b.y}`} transform={`rotate(${b.rot} ${cx} ${cy})`}>
                  <ellipse cx={cx} cy={cy} rx={b.rx} ry={b.ry} fill={`url(#${id("boaba")})`} />
                  {/* reflex discret, dă volum fără să îngreuneze desenul */}
                  <ellipse
                    cx={cx - b.rx * 0.32}
                    cy={cy - b.ry * 0.38}
                    rx={b.rx * 0.27}
                    ry={b.ry * 0.2}
                    fill={c.reflex}
                    opacity=".5"
                  />
                </g>
              );
            })}
          </g>
        </g>
      </g>
    </svg>
  );
}
