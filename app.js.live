'use strict';

const app = document.getElementById('app');
const BOOK = window.BOOK_DATA || [];
const chapters = Array.isArray(BOOK) ? BOOK : (BOOK.entries || []);

let flat = null;
let currentQuery = '';
let occMarks = [];
let occCur = -1;

/* ---------- Arabic text helpers ---------- */
const DIAC = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/;

function normChar(c) {
  if (c === 'إ' || c === 'أ' || c === 'آ' || c === 'ٱ') return 'ا';
  if (c === 'ى') return 'ي';
  if (c === 'ؤ') return 'و';
  if (c === 'ئ') return 'ي';
  if (c === 'ة') return 'ه';
  return c.toLowerCase();
}

function normalize(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (DIAC.test(c)) continue;
    out += normChar(c);
  }
  return out;
}

function buildNormMap(text) {
  const out = [];
  const map = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (DIAC.test(c)) continue;
    out.push(normChar(c));
    map.push(i);
  }
  return { out: out.join(''), map };
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function highlight(text, nq) {
  if (!nq) return { html: esc(text), count: 0 };
  const { out, map } = buildNormMap(text);
  let idx = out.indexOf(nq);
  if (idx === -1) return { html: esc(text), count: 0 };
  const segs = [];
  let last = 0, count = 0;
  while (idx !== -1) {
    const s = map[idx];
    const e = map[idx + nq.length - 1] + 1;
    if (s > last) segs.push({ t: text.slice(last, s), m: false });
    segs.push({ t: text.slice(s, e), m: true });
    last = e; count++;
    idx = out.indexOf(nq, idx + nq.length);
  }
  if (last < text.length) segs.push({ t: text.slice(last), m: false });
  return { html: segs.map(x => (x.m ? '<mark class="hl">' + esc(x.t) + '</mark>' : esc(x.t))).join(''), count };
}

function snippet(text, nq) {
  const { out, map } = buildNormMap(text);
  const idx = out.indexOf(nq);
  if (idx === -1) return esc(text.slice(0, 150));
  const start = map[idx];
  const a = Math.max(0, start - 70);
  const b = Math.min(text.length, start + nq.length + 120);
  const { html } = highlight(text.slice(a, b), nq);
  return (a > 0 ? '… ' : '') + html + (b < text.length ? ' …' : '');
}

/* ---------- theme + font ---------- */
function setupTheme() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const cur = () => document.documentElement.getAttribute('data-theme') || 'light';
  const update = () => { btn.textContent = cur() === 'dark' ? '☀️' : '🌙'; };
  update();
  btn.addEventListener('click', () => {
    const next = cur() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    update();
    try { localStorage.setItem('a3chab_theme', next); } catch (e) {}
  });
}

let fontSize = 1;
try { fontSize = parseFloat(localStorage.getItem('a3chab_font')) || 1; } catch (e) {}
function applyFontSize() {
  document.documentElement.style.setProperty('--content-font-size', fontSize + 'rem');
  try { localStorage.setItem('a3chab_font', String(fontSize)); } catch (e) {}
}
function fontControlsHTML() {
  return '<span class="font-row">' +
    '<button type="button" id="fontDec" title="تصغير الخط">A−</button>' +
    '<button type="button" id="fontReset" title="الخط الافتراضي">A</button>' +
    '<button type="button" id="fontInc" title="تكبير الخط">A+</button>' +
    '</span>';
}
function setupFontControls() {
  const d = document.getElementById('fontDec');
  const r = document.getElementById('fontReset');
  const i = document.getElementById('fontInc');
  if (d) d.onclick = () => { if (fontSize > 0.8) { fontSize = Math.round((fontSize - 0.1) * 10) / 10; applyFontSize(); } };
  if (r) r.onclick = () => { fontSize = 1; applyFontSize(); };
  if (i) i.onclick = () => { if (fontSize < 1.8) { fontSize = Math.round((fontSize + 0.1) * 10) / 10; applyFontSize(); } };
}
applyFontSize();

/* ---------- network indicator ---------- */
function setupNetwork() {
  const el = document.getElementById('netStatus');
  if (!el) return;
  const label = el.querySelector('.net-label');
  const update = () => {
    const on = navigator.onLine;
    el.classList.toggle('offline', !on);
    if (label) label.textContent = on ? 'متصل' : 'دون اتصال';
    el.title = on ? 'متصل بالإنترنت' : 'تعمل النسخة المحفوظة دون اتصال';
  };
  update();
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
}

/* ---------- data ---------- */
function metaOf(ch) {
  const parts = [];
  if (ch.darja) parts.push(['الدارجة', ch.darja]);
  if (ch.tamazight) parts.push(['الأمازيغية', ch.tamazight]);
  if (ch.latin) parts.push(['اللاتينية', ch.latin]);
  if (ch.french) parts.push(['الفرنسية', ch.french]);
  return parts;
}

function buildFlat() {
  if (flat) return flat;
  flat = [];
  chapters.forEach((ch, ci) => {
    flat.push({ ci, text: ch.title, norm: normalize(ch.title) });
    const m = metaOf(ch).map(p => p[0] + ': ' + p[1]).join(' · ');
    if (m) flat.push({ ci, text: m, norm: normalize(m) });
    String(ch.content || '').split('\n').forEach(p => {
      flat.push({ ci, text: p, norm: normalize(p) });
    });
  });
  return flat;
}

/* ---------- reader ---------- */
function renderReader(id) {
  const idx = chapters.findIndex(c => c.id === id);
  if (idx === -1) return renderHome();
  const ch = chapters[idx];
  try { localStorage.setItem('a3chab_last', String(id)); } catch (e) {}

  const nq = normalize(currentQuery);
  const title = highlight(ch.title, nq).html;
  const parts = metaOf(ch);
  const meta = ch.isHeader || !parts.length ? '' :
    '<div class="plant-meta">' + parts.map(p =>
      '<div><strong>' + esc(p[0]) + ':</strong> ' + highlight(p[1], nq).html + '</div>').join('') + '</div>';
  const isRef = /تُراجع البطاقة رقم/.test(ch.content || '');
  const note = isRef ? '<div class="ref-note">📌 بطاقة تعريف بالاسم المحلي — يُرجى مراجعة البطاقة الأصلية للاستعمالات الكاملة.</div>' : '';
  const body = String(ch.content || '').split('\n').map(p => '<p>' + highlight(p, nq).html + '</p>').join('');
  const photo = ch.image
    ? '<figure class="plant-photo">' +
        '<img src="./' + esc(ch.image) + '" alt="' + esc(ch.title + (ch.latin ? ' — ' + ch.latin : '')) + '" loading="lazy" decoding="async">' +
        '<figcaption>📷 ' + esc(ch.imageCredit || 'Wikimedia Commons') +
          (ch.imageLicense ? ' · <a href="' + esc(ch.imageLicenseUrl || '#') + '" target="_blank" rel="noopener">' + esc(ch.imageLicense) + '</a>' : '') +
          ' · <a href="' + esc(ch.imageSource || '#') + '" target="_blank" rel="noopener">ويكيميديا كومنز</a>' +
        '</figcaption>' +
      '</figure>'
    : '<div class="plant-photo placeholder" role="img" aria-label="لا توجد صورة متاحة لهذا النبات"><span>🌿</span><small>الصورة قيد المراجعة</small></div>';

  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx < chapters.length - 1 ? chapters[idx + 1] : null;
  const kicker = ch.isHeader
    ? 'الموسوعة · مقدمة'
    : 'الموسوعة · المدخل ' + toArabicDigits(idx) + ' من ' + toArabicDigits(chapters.length - 1);

  app.innerHTML =
    '<div class="topnav">' + fontControlsHTML() +
      '<button id="copyBtn" type="button">📋 نسخ المدخل</button>' +
      '<button id="reportBtn" type="button">⚠️ أبلغ عن خطأ</button>' +
      '<button id="homeBtn" type="button">🏠 الفهرس</button>' +
      '<button id="safetyBtn" type="button">🛡️ السلامة</button>' +
    '</div>' +
    '<div class="searchbar">' +
      '<input id="chapSearch" type="search" aria-label="ابحث في هذا المدخل" placeholder="ابحث في هذا المدخل…" value="' + esc(currentQuery) + '" autocomplete="off">' +
      '<span class="counter" id="occCount" aria-live="polite"></span>' +
      '<button type="button" class="navbtn" id="occNext" title="النتيجة التالية">▼</button>' +
      '<button type="button" class="navbtn" id="occPrev" title="النتيجة السابقة">▲</button>' +
      '<button type="button" class="clearbtn" id="clearSearch" title="مسح البحث">✕</button>' +
    '</div>' +
    '<div class="card" id="chapterCard">' +
      '<div class="kicker">' + esc(kicker) + '</div>' +
      '<h2>' + title + '</h2>' +
      photo + note + meta + body +
      '<div class="safety-note"><strong>تنبيه:</strong> هذا المدخل محتوى تعليمي عن استخدام تقليدي، وليس وصفة. ' +
        'لا تتجاوز الجرعات المذكورة، وتوقّف عند أي عرض غير متوقع، واستشر طبيباً أو صيدلياً قبل الاستعمال المنتظم، ' +
        'خاصة أثناء الحمل أو الرضاعة أو مع أدوية أخرى.</div>' +
    '</div>' +
    '<div class="pager">' +
      '<button id="prevBtn"' + (prev ? '' : ' disabled') + '>→ السابق</button>' +
      '<span>' + esc(kicker) + '</span>' +
      '<button id="nextBtn"' + (next ? '' : ' disabled') + '>التالي ←</button>' +
    '</div>';

  if (prev) document.getElementById('prevBtn').onclick = () => go('#/read/' + encodeURIComponent(prev.id));
  if (next) document.getElementById('nextBtn').onclick = () => go('#/read/' + encodeURIComponent(next.id));
  document.getElementById('homeBtn').onclick = () => go('#/');
  document.getElementById('safetyBtn').onclick = () => go('#/safety');
  document.getElementById('reportBtn').onclick = () => {
    const body = 'المدخل: ' + ch.id + '\nالعنوان: ' + ch.title +
      '\n\nوصف الخطأ (معلومة طبية/اسم/جرعة/رابط...):\n\n';
    const url = 'https://github.com/ucfzem/ucfzem.github.io/issues/new?labels=content&title=' +
      encodeURIComponent('بلاغ عن خطأ: ' + ch.title) + '&body=' + encodeURIComponent(body);
    window.open(url, '_blank', 'noopener');
  };
  document.getElementById('copyBtn').onclick = (e) => {
    const metaLines = parts.map(p => p[0] + ': ' + p[1]).join('\n');
    copyText(ch.title + '\n' + metaLines + (metaLines ? '\n\n' : '') + ch.content, e.currentTarget);
  };
  setupFontControls();

  const input = document.getElementById('chapSearch');
  input.oninput = debounce(() => {
    currentQuery = input.value.trim();
    renderReader(id);
    const box = document.getElementById('chapSearch');
    if (box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
  }, 220);
  input.onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); goOcc(e.shiftKey ? -1 : 1); }
  };
  document.getElementById('clearSearch').onclick = () => {
    currentQuery = '';
    renderReader(id);
    const box = document.getElementById('chapSearch');
    if (box) box.focus();
  };
  document.getElementById('occNext').onclick = () => goOcc(1);
  document.getElementById('occPrev').onclick = () => goOcc(-1);

  collectMarks();
}

function collectMarks() {
  occMarks = Array.from(document.querySelectorAll('#chapterCard mark.hl'));
  occCur = occMarks.length ? 0 : -1;
  paintMarks(false);
}
function paintMarks(scroll) {
  occMarks.forEach(m => m.classList.remove('hl-cur'));
  const cEl = document.getElementById('occCount');
  const prevB = document.getElementById('occPrev');
  const nextB = document.getElementById('occNext');
  const has = occMarks.length > 0;
  if (prevB) prevB.disabled = !has;
  if (nextB) nextB.disabled = !has;
  if (has && occCur >= 0) {
    const m = occMarks[occCur];
    m.classList.add('hl-cur');
    if (scroll) m.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (cEl) cEl.textContent = toArabicDigits(occCur + 1) + ' / ' + toArabicDigits(occMarks.length);
  } else if (cEl) {
    cEl.textContent = normalize(currentQuery) ? '0 / 0' : '';
  }
}
function goOcc(delta) {
  if (!occMarks.length) return;
  occCur = (occCur + delta + occMarks.length) % occMarks.length;
  paintMarks(true);
}

/* ---------- home / TOC / global search ---------- */
function renderHome() {
  let resume = null;
  try { resume = localStorage.getItem('a3chab_last'); } catch (e) {}
  const resumeCh = resume ? chapters.find(c => c.id === resume) : null;
  const resumeBtn = resumeCh
    ? '<button id="resumeBtn" type="button">↩️ متابعة القراءة — ' + esc(resumeCh.title) + '</button>' : '';

  const plants = chapters.filter(c => !c.isHeader).length;

  app.innerHTML =
    '<div class="topnav">' + fontControlsHTML() + resumeBtn +
      '<button id="homeSafetyBtn" type="button">🛡️ السلامة أولاً</button>' +
      '<button id="homeSourcesBtn" type="button">📚 المصادر والمنهج</button>' +
    '</div>' +
    '<div class="home">' +
      '<h1>🌿 المعشبة المغربية</h1>' +
      '<p class="desc">دليل تفاعلي للأنواع الطبية المغربية المتداولة في الأسواق التقليدية: ' +
        toArabicDigits(plants) + ' مدخلاً موسوعياً بمسمياتها الدارجة والأمازيغية والعربية والفرنسية واللاتينية، ' +
        'مع استعمالاتها وطرق تحضيرها وتنبيهات السلامة. ابحث في الموسوعة كلها في الوقت نفسه، ' +
        'وستُلوَّن النتائج بالأخضر مع عدّاد وتنقّل بين المواضع.</p>' +
      '<p class="stats">' + toArabicDigits(plants) + ' مدخلاً · ' + toArabicDigits(chapters.length - 1) + ' بطاقة نباتية</p>' +
      '<div class="searchbar">' +
        '<input id="globalSearch" type="search" aria-label="ابحث في الموسوعة كلها" placeholder="ابحث في الموسوعة كلها…" autocomplete="off">' +
        '<button type="button" class="clearbtn" id="clearGlobal" title="مسح">✕</button>' +
      '</div>' +
      '<div class="results" id="searchResults" hidden></div>' +
      '<div id="tocWrap">' +
        '<h2>المداخل</h2>' +
        '<div class="toc">' +
          chapters.map((ch, i) =>
            '<button type="button" class="toc-item" data-id="' + esc(ch.id) + '">' +
              (ch.image
                ? '<img class="toc-thumb" src="./' + esc(ch.image) + '" alt="" loading="lazy" decoding="async">'
                : '<span class="toc-thumb placeholder" aria-hidden="true">🌿</span>') +
              '<span class="num">' + (ch.isHeader ? 'مقدمة' : toArabicDigits(i)) + '</span>' +
              '<span>' + esc(ch.title.replace(/^\d+\.\s*/, '')) + '</span>' +
            '</button>').join('') +
        '</div>' +
      '</div>' +
    '</div>';

  setupFontControls();
  document.getElementById('homeSafetyBtn').onclick = () => go('#/safety');
  document.getElementById('homeSourcesBtn').onclick = () => go('#/sources');
  if (resumeCh) {
    const rb = document.getElementById('resumeBtn');
    if (rb) rb.onclick = () => go('#/read/' + encodeURIComponent(resumeCh.id));
  }
  app.querySelectorAll('.toc-item').forEach(b => {
    b.onclick = () => { currentQuery = ''; go('#/read/' + encodeURIComponent(b.dataset.id)); };
  });

  const gi = document.getElementById('globalSearch');
  const resultsEl = document.getElementById('searchResults');
  const tocWrap = document.getElementById('tocWrap');
  gi.oninput = debounce(() => {
    const q = gi.value.trim();
    const nq = normalize(q);
    if (nq.length < 2) {
      resultsEl.hidden = true; resultsEl.innerHTML = '';
      tocWrap.hidden = false;
      return;
    }
    tocWrap.hidden = true;
    const hits = globalSearch(nq);
    if (!hits.length) {
      resultsEl.hidden = false;
      resultsEl.innerHTML = '<p class="empty">لا نتائج عن «' + esc(q) + '».</p>';
      return;
    }
    const shown = hits.slice(0, 150);
    resultsEl.hidden = false;
    resultsEl.innerHTML =
      '<p class="empty">' + toArabicDigits(hits.length) + ' موضعاً في ' +
        toArabicDigits(new Set(hits.map(h => h.e.ci)).size) + ' مدخلاً' +
        (hits.length > shown.length ? ' (تُعرض أول ' + toArabicDigits(shown.length) + ')' : '') + ':</p>' +
      shown.map((h, i) => {
        const ch = chapters[h.e.ci];
        return '<div class="result" data-i="' + i + '">' +
          '<div class="rtitle">' + esc(ch.title) + '</div>' +
          '<div class="rsnip">' + snippet(h.e.text, nq) + '</div>' +
        '</div>';
      }).join('');
    resultsEl.querySelectorAll('.result').forEach((el) => {
      el.onclick = () => {
        const h = shown[Number(el.dataset.i)];
        currentQuery = q;
        go('#/read/' + encodeURIComponent(chapters[h.e.ci].id));
      };
    });
  }, 200);
  document.getElementById('clearGlobal').onclick = () => {
    gi.value = ''; gi.dispatchEvent(new Event('input')); gi.focus();
  };
}

function globalSearch(nq) {
  const idx = buildFlat();
  const hits = [];
  for (let i = 0; i < idx.length; i++) {
    const e = idx[i];
    if (e.norm.indexOf(nq) !== -1) {
      hits.push({ e });
      if (hits.length >= 400) break;
    }
  }
  return hits;
}

/* ---------- safety + sources ---------- */
function entryTitle(id) {
  const c = chapters.find(x => x.id === id);
  return c ? c.title.replace(/^\d+\.\s*/, '') : id;
}
function entryLink(id) {
  return '<a href="#/read/' + encodeURIComponent(id) + '">' + esc(entryTitle(id)) + '</a>';
}

function renderSafety() {
  const toxicIds = ['defla', 'ftila', 'guelb', 'datura', 'sambouk', 'daghmouss',
    'qernoun', 'harmal', 'harmel_blanc', 'kafour', 'mkhinza', 'sena_makki',
    'arek_souss', 'chib', 'chibt', 'khayyata', 'tebbouna'];
  const toxic = toxicIds.filter(id => chapters.some(c => c.id === id))
    .map(id => entryLink(id)).join('');

  app.innerHTML =
    '<div class="topnav">' + fontControlsHTML() +
      '<button id="homeBtn" type="button">🏠 الفهرس</button>' +
      '<button id="sourcesBtn" type="button">📚 المصادر والمنهج</button>' +
    '</div>' +
    '<div class="card">' +
      '<div class="kicker">إرشادات عامة</div>' +
      '<h2>🛡️ السلامة أولاً</h2>' +
      '<p>هذه الموسوعة تعرض معرفة تقليدية عن استعمال النباتات في المغرب، وهدفها تعليمي وتوثيقي. ' +
        'لا تُغني عن تشخيص طبي ولا عن دواء موصوف، ولا يجوز الاعتماد عليها لعلاج حالة مرضية.</p>' +
      '<h3>قواعد أساسية قبل أي استعمال</h3>' +
      '<ul>' +
        '<li>استشر طبيباً أو صيدلياً قبل استعمال أي نبات، خصوصاً إذا كنت تتناول أدوية أو تعاني مرضاً مزمناً.</li>' +
        '<li>أثناء الحمل والرضاعة، ومع الأطفال وكبار السن، لا تستعمل النباتات الطبية دون إشراف مختص.</li>' +
        '<li>أخبر طبيبك بكل الأعشاب والمكمّلات التي تتناولها؛ فبعضها يتفاعل مع مميّعات الدم، وأدوية الضغط والسكري، والمهدّئات، ومثبّطات المناعة.</li>' +
        '<li>احترم الجرعة وطريقة التحضير المذكورتين، ولا تُطِل الاستعمال دون مراجعة. «طبيعي» لا يعني «آمن».</li>' +
        '<li>لا تجمع النباتات البرية بنفسك إن لم تكن متأكداً من تحديدها؛ الالتباس بين نبات سام وآخر نافع من أخطر أسباب التسمم.</li>' +
        '<li>توقّف فوراً عند ظهور غثيان أو دوار أو طفح أو أي عرض غير متوقع.</li>' +
      '</ul>' +
      '<h3>نباتات سامة أو خطرة</h3>' +
      '<p>هذه مداخل تستوجب حذراً خاصاً، وبعضها سام جداً. اضغط على الاسم لقراءة بطاقته وتنبيهاته:</p>' +
      '<div class="toxic-list">' + toxic + '</div>' +
      '<h3>التباس الأسماء المحلية</h3>' +
      '<p>قد يحمل اسم دارج واحد نباتات مختلفة في جهات مختلفة، وقد تكون إحداها سامة. ' +
        'اعتمد دائماً على <strong>الاسم اللاتيني</strong> للتحقق، وقارن الصورة والوصف قبل أي استعمال. ' +
        'بعض المداخل في الموسوعة تشير صراحة إلى أسماء محلية مشتركة أو إلى بطاقة أخرى مرجعية.</p>' +
      '<h3>في حالة الشك أو التسمم</h3>' +
      '<p>أوقف الاستعمال فوراً، واحتفظ بعينة من النبات أو المنتج، واتصل بخدمات الطوارئ أو أقرب مركز لمحاربة التسممات، ' +
        'ولا تُحاول إحداث تقيؤ إلا بتوجيه طبي. أبلغ أيضاً عبر زر «⚠️ أبلغ عن خطأ» في بطاقة المدخل إذا لاحظت معلومة مشكوكاً فيها.</p>' +
      '<div class="safety-note"><strong>ملاحظة:</strong> هذه الصفحة إرشادية عامة، وليست بديلاً عن نشرة دواء أو استشارة مختص.</div>' +
    '</div>';

  setupFontControls();
  document.getElementById('homeBtn').onclick = () => go('#/');
  document.getElementById('sourcesBtn').onclick = () => go('#/sources');
}

function renderSources() {
  app.innerHTML =
    '<div class="topnav">' + fontControlsHTML() +
      '<button id="homeBtn" type="button">🏠 الفهرس</button>' +
      '<button id="safetyBtn" type="button">🛡️ السلامة أولاً</button>' +
    '</div>' +
    '<div class="card">' +
      '<div class="kicker">التوثيق والمنهج</div>' +
      '<h2>📚 المصادر والمنهج</h2>' +
      '<p><strong>المعشبة المغربية</strong> عمل رقمي مستقل أُعدّ خصيصاً لهذا الموقع، وليس نسخة من كتاب مطبوع ولا مأخوذاً عنه. ' +
        'تجمع المداخل معرفة إثنوبوتانية عامة ومتداولة عن النباتات الطبية في المغرب، مع التأكيد على التنبيهات والسلامة.</p>' +
      '<h3>منهج الإعداد</h3>' +
      '<ul>' +
        '<li>لكل مدخل: وصف مختصر، استعمالات تقليدية، طريقة تحضير، وتنبيهات سلامة.</li>' +
        '<li>تُذكر الأسماء بالدارجة والأمازيغية والعربية والفرنسية واللاتينية حين توفرها، مع التنبيه إلى أن الأسماء المحلية تختلف بين الجهات.</li>' +
        '<li>لا تُعرض جرعات علاجية دقيقة للحالات المرضية؛ المحتوى تعليمي وليس وصفة.</li>' +
        '<li>هذه النسخة لا تُرفق لكل مدخل مرجعاً فردياً بعد. نعمل على إضافة التوثيق المرجعي تدريجياً بدل اختلاق مراجع غير محققة.</li>' +
      '</ul>' +
      '<h3>مراجع يُنصح بها للتحقق</h3>' +
      '<ul>' +
        '<li>منظمة الصحة العالمية: <em>WHO Monographs on Selected Medicinal Plants</em>.</li>' +
        '<li>الوكالة الأوروبية للأدوية: <em>EMA Herbal Medicinal Products</em> و<em>European Pharmacopoeia</em>.</li>' +
        '<li>المديرية المغربية للأدوية والصيدلة / دستور الأدوية المغربي (Pharmacopée Marocaine).</li>' +
        '<li>Kew Science — <em>Plants of the World Online</em> للتحقق من الأسماء اللاتينية.</li>' +
        '<li>«الأعشاب الطبية في المغرب» (Éditions Le Fennec) و«العلاج بالأغذية والأعشاب في بلاد المغرب» لابن حبيب: مراجع ببليوغرافية للاستئناس، وليست مصدراً مباشراً لهذا الموقع.</li>' +
      '</ul>' +
      '<h3>الصور والرخص</h3>' +
      '<p>صور النباتات مصدرها <strong>ويكيميديا كومنز</strong>، وتُعرض برخص حرة (CC0، ملكية عامة، CC BY، CC BY-SA) فقط. ' +
        'تظهر تحت كل صورة نسبةُ المصوّر أو المؤلّف ورخصةُ الاستعمال مع رابط المصدر على كومنز. ' +
        'إذا تعذّر العثور على صورة موثوقة ومرخّصة لنوع ما، تُعرض أيقونة بدل الصورة إلى حين مراجعتها يدوياً. ' +
        'الصور لأغراض التعريف البصري فقط، ولا تُغني عن التحقق من الاسم اللاتيني.</p>' +
      '<h3>تصحيح الأخطاء</h3>' +
      '<p>إذا لاحظت خطأ في اسم أو استعمال أو تنبيه، استعمل زر «⚠️ أبلغ عن خطأ» داخل بطاقة المدخل. ' +
        'نراجع البلاغات ونصحّح المحتوى في تحديثات لاحقة.</p>' +
      '<div class="safety-note"><strong>تنبيه:</strong> المعلومات في هذا الموقع لأغراض تعليمية، ولا تُعتبر استشارة طبية أو صيدلية.</div>' +
    '</div>';

  setupFontControls();
  document.getElementById('homeBtn').onclick = () => go('#/');
  document.getElementById('safetyBtn').onclick = () => go('#/safety');
}

/* ---------- misc ---------- */
function toArabicDigits(n) {
  return String(n);
}
function debounce(fn, ms) {
  let t;
  return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
}
function copyText(text, btn) {
  const done = () => {
    if (!btn) return;
    const old = btn.dataset.label || btn.textContent;
    btn.dataset.label = old;
    btn.textContent = '✓ تم النسخ'; btn.classList.add('copied');
    setTimeout(() => { if (btn.isConnected) { btn.textContent = old; btn.classList.remove('copied'); } }, 1600);
  };
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { if (btn) btn.textContent = '⚠️ تعذّر النسخ'; }
    document.body.removeChild(ta);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
  else fallback();
}

/* ---------- routing ---------- */
function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const m = /^read\/(.+)$/.exec(h);
  if (m) return { view: 'read', id: decodeURIComponent(m[1]) };
  if (h === 'safety') return { view: 'safety' };
  if (h === 'sources') return { view: 'sources' };
  return { view: 'home' };
}
function route() {
  const r = parseHash();
  if (r.view === 'read' && chapters.some(c => c.id === r.id)) renderReader(r.id);
  else if (r.view === 'safety') renderSafety();
  else if (r.view === 'sources') renderSources();
  else renderHome();
  window.scrollTo(0, 0);
}

function renderError() {
  app.innerHTML =
    '<div class="home">' +
      '<p class="empty">⚠️ تعذّر تحميل بيانات الموسوعة. أعد تحميل الصفحة.</p>' +
    '</div>';
}

function init() {
  setupTheme();
  setupNetwork();
  if (!chapters.length) { renderError(); return; }
  window.addEventListener('hashchange', route);
  route();
}
init();
