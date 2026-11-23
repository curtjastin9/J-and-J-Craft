/* Simple vector illustrations used as placeholders until real product photos are added.
   To use a real photo later, replace the `art` field in catalog (see order.js) with an <img>. */
const ART = {
  mug: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="178" rx="64" ry="8" fill="#000" opacity=".1"/>
    <path d="M150 86h9a23 23 0 0 1 0 46h-9" fill="none" stroke="#E4262C" stroke-width="12" stroke-linecap="round"/>
    <path d="M46 60h108v82a28 28 0 0 1-28 28H74a28 28 0 0 1-28-28z" fill="#E4262C"/>
    <rect x="58" y="70" width="9" height="86" rx="4.5" fill="#fff" opacity=".28"/>
    <ellipse cx="100" cy="60" rx="54" ry="10" fill="#B81B21"/>
    <ellipse cx="100" cy="60" rx="47" ry="7" fill="#6B3A26"/>
    <circle cx="100" cy="114" r="25" fill="#FFC72C"/>
    <text x="100" y="121" text-anchor="middle" font-family="Baloo 2,Arial" font-weight="800" font-size="20" fill="#2B1B17">J&amp;J</text>
    <path d="M84 40c-7-9 7-14 0-24M104 40c-7-9 7-14 0-24M124 40c-7-9 7-14 0-24" fill="none" stroke="#2B1B17" stroke-opacity=".28" stroke-width="4" stroke-linecap="round"/>
  </svg>`,

  rose: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <path d="M100 104C100 140 95 165 100 194" stroke="#2E7D32" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M99 150C72 138 60 148 54 160C78 172 94 166 99 150z" fill="#43A047"/>
    <path d="M101 168C126 156 140 164 146 176C122 188 106 182 101 168z" fill="#388E3C"/>
    <path d="M86 98l-6 12M114 98l6 12" stroke="#2E7D32" stroke-width="6" stroke-linecap="round"/>
    <circle cx="100" cy="68" r="44" fill="#C62828"/>
    <path d="M62 66c4-20 22-34 40-34 22 0 38 16 38 36 0 22-18 42-40 42-24 0-40-18-38-44z" fill="#E53935"/>
    <path d="M100 68m-27 2a27 27 0 1 1 29 25" fill="none" stroke="#FF8A80" stroke-width="6" stroke-linecap="round"/>
    <path d="M100 66m-14 2a14 14 0 1 1 15 13" fill="none" stroke="#FFCDD2" stroke-width="5" stroke-linecap="round"/>
    <circle cx="101" cy="66" r="4" fill="#C62828"/>
  </svg>`,

  frame: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="180" rx="66" ry="7" fill="#000" opacity=".1"/>
    <rect x="28" y="28" width="144" height="140" rx="8" fill="#8D5524"/>
    <rect x="28" y="28" width="144" height="140" rx="8" fill="none" stroke="#6F3F17" stroke-width="3"/>
    <rect x="42" y="42" width="116" height="112" fill="#FFF8EC"/>
    <rect x="52" y="52" width="96" height="92" fill="#BFE4F6"/>
    <circle cx="124" cy="80" r="11" fill="#FFC72C"/>
    <path d="M52 144 90 92l24 30 16-18 18 24v16z" fill="#43A047"/>
    <path d="M90 92l-12 16 8-3 4 8 8-6z" fill="#fff" opacity=".7"/>
    <rect x="46" y="46" width="108" height="104" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>
  </svg>`,

  paper: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect x="58" y="34" width="100" height="136" rx="6" fill="#E5DCCB" transform="rotate(6 108 100)"/>
    <path d="M44 28h84l28 28v118a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6V34a6 6 0 0 1 6-6z" fill="#fff" stroke="#E5DCCB" stroke-width="3"/>
    <path d="M128 28v22a6 6 0 0 0 6 6h22z" fill="#F0E4D0"/>
    <rect x="52" y="44" width="62" height="9" rx="4.5" fill="#2B1B17"/>
    <rect x="52" y="62" width="40" height="6" rx="3" fill="#BDB2A6"/>
    <rect x="52" y="82" width="86" height="42" rx="6" fill="#FFC72C"/>
    <circle cx="76" cy="98" r="8" fill="#E4262C"/>
    <path d="M52 124l26-18 20 14 14-10 26 14v0H52z" fill="#2E9B5B"/>
    <rect x="52" y="136" width="86" height="6" rx="3" fill="#BDB2A6"/>
    <rect x="52" y="150" width="62" height="6" rx="3" fill="#BDB2A6"/>
  </svg>`,

  tshirt: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="184" rx="60" ry="6" fill="#000" opacity=".1"/>
    <path d="M68 30l32 12 32-12 44 26-20 38-18-9v85H62V85l-18 9-20-38z" fill="#E4262C"/>
    <path d="M82 31q18 24 36 0l-18 10z" fill="#B81B21"/>
    <path d="M82 31q18 28 36 0" fill="none" stroke="#B81B21" stroke-width="5" stroke-linecap="round"/>
    <path d="M44 94l18-9M156 94l-18-9" stroke="#B81B21" stroke-width="3" stroke-linecap="round" opacity=".5"/>
    <circle cx="100" cy="108" r="24" fill="#FFC72C"/>
    <text x="100" y="116" text-anchor="middle" font-family="Baloo 2,Arial" font-weight="800" font-size="21" fill="#2B1B17">J&amp;J</text>
    <path d="M70 60l4 118" stroke="#fff" stroke-opacity=".18" stroke-width="8" stroke-linecap="round"/>
  </svg>`
};
