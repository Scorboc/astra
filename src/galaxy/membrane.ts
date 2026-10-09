// Art is the owner's approved concept, unchanged (see design/…/04-nebula-membrane.png).
// The SVG mask exposes only the original frame. All content inside is real HTML;
// no baked heading/button and no still image replacing the Three.js universe.
const silhouette='M454 414 C445 373 465 349 490 324 C531 289 540 247 555 206 C581 152 633 157 684 173 C771 197 826 201 883 194 C952 187 1002 159 1059 140 C1113 119 1149 136 1174 169 C1204 207 1202 242 1231 283 C1257 324 1307 344 1298 390 C1295 438 1262 477 1235 518 C1212 555 1229 592 1232 629 C1243 679 1219 740 1175 775 C1135 812 1094 798 1040 785 C982 770 941 783 897 795 C832 817 794 785 741 779 C681 772 644 766 605 735 C565 705 575 652 568 614 C558 567 518 519 490 484 C472 462 457 439 454 414Z';

export function membraneFrame(){return `<svg class="membrane-art" viewBox="400 95 960 760" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <defs>
    <filter id="membrane-feather" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
    <mask id="membrane-rim" maskUnits="userSpaceOnUse" x="380" y="70" width="1000" height="810"><path d="${silhouette}" fill="none" stroke="white" stroke-width="44" filter="url(#membrane-feather)"/></mask>
    <radialGradient id="membrane-shade"><stop offset="0" stop-color="#020816" stop-opacity=".84"/><stop offset=".55" stop-color="#020816" stop-opacity=".76"/><stop offset=".82" stop-color="#020816" stop-opacity=".4"/><stop offset="1" stop-color="#020816" stop-opacity="0"/></radialGradient>
  </defs>
  <path d="${silhouette}" fill="url(#membrane-shade)"/>
  <image href="/ui/nebula-membrane-approved.png" x="0" y="0" width="1672" height="941" mask="url(#membrane-rim)" opacity=".55"/>
  <g class="membrane-sparks" fill="#fff4d7"><circle cx="594" cy="180" r="2"/><circle cx="1137" cy="155" r="2.2"/><circle cx="1280" cy="355" r="1.8"/><circle cx="577" cy="671" r="1.5"/><circle cx="1189" cy="752" r="2"/><circle cx="885" cy="797" r="1.6"/></g>
</svg>`;}
