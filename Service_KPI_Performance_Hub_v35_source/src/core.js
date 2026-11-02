/* ===== Service KPI Performance Hub core: Excel streaming parser + de-duplication + aggregation ===== */
var KPI_CORE = (function () {
  // 0 n,1 rrS,2 rr,3 rtS,4 rt,5 rdfS,6 rdf,7 ftrS,8 ftr,9 fvfS_wp,10 fvf_wp,11 fvfS_np,12 fvf_np,
  // 13 onsite,14 spBefore,15 notT2,16 firstVF,17 multiVF,18 advised parts,19 advised parts consumed
  var NC = 20;
  var REQ = {
    caseType: 'CaseType', disp: 'Disposition Date', res: 'ResolutionType', mod: 'Modality', region: 'IB Region',
    parts: '# Parts Consumed', sp: 'Service Plan Available Before First Visit',
    rrS: 'RR Scope', rr: 'RR', fvfS: 'FVF Scope', fvf: 'FVF', ftrS: 'FTR_PA Scope', ftr: 'FTR_PA',
    rdfS: 'RDF Scope', rdf: 'RDF', t2: 'Touched by T2', rtS: 'RT Scope', rt: 'RT'
  };
  var ALT = { t2: ['Touched By Tier 2'] };
  var OPT = { rse: ['RSE Region'], rst: ['RSE ServiceTeam', 'RSE Service Team'], adv: ['Parts Advised List'], cons: ['Parts Consumed List'], mkt: ['Market', 'Market Name', 'IB Market', 'Market Group', 'Market Region'] };
  var IGNORE_FOR_KEY = { 'monthyear': 1, 'weekyear': 1 };
  function num(v) { if (v === undefined || v === null || v === '' || v === '-') return 0; var x = parseFloat(v); return isNaN(x) ? 0 : x; }
  function unesc(s) { return s.indexOf('&') < 0 ? s : s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#10;/g, '\n').replace(/&#13;/g, '').replace(/&amp;/g, '&'); }
  function toDay(v) {
    if (v === undefined || v === null || v === '' || v === '-') return null;
    var x = Number(v);
    if (!isNaN(x) && x > 20000 && x < 80000) return Math.floor(x) - 25569;
    var t = Date.parse(v); if (isNaN(t)) return null;
    return Math.floor(t / 86400000);
  }
  function hash(s) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0, ch; i < s.length; i++) { ch = s.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }
  var PART_RE = /^\s*[A-Z0-9]+-(?:[^-\s]+-)?(\d{8,14})\b/gm;
  function partNos(s) {
    if (!s || s === '-' || s === '0') return [];
    s = String(s).replace(/\\n/g, '\n').replace(/\r/g, '');
    var out = [], m; PART_RE.lastIndex = 0;
    while ((m = PART_RE.exec(s))) out.push(m[1]);
    return out;
  }
  function samePart(a, b) { return a === b || (a.length === b.length && (a.length === 11 || a.length === 12) && a.slice(0, -1) === b.slice(0, -1)); }
  function uniq(arr) { var o = []; arr.forEach(function (p) { if (o.indexOf(p) < 0) o.push(p); }); return o; }
  function Builder() {
    this.dims = { region: [], ctype: [], mod: [], rse: [], rst: [] }; this.idx = { region: {}, ctype: {}, mod: {}, rse: {}, rst: {} };
    this.map = new Map(); this.seen = new Set(); this.market = null; this.mk = {}; this.rowsRead = 0; this.rowsUsed = 0; this.dups = 0;
  }
  Builder.prototype.di = function (d, v) { v = (v === undefined || v === null || v === '' || v === '-') ? '(Blank)' : String(v); var m = this.idx[d]; if (m[v] === undefined) { m[v] = this.dims[d].length; this.dims[d].push(v); } return m[v]; };
  Builder.prototype.add = function (r, key) {
    this.rowsRead++;
    var day = toDay(r.disp); if (day === null) return;
    var h = hash(key); if (this.seen.has(h)) { this.dups++; return; } this.seen.add(h);
    var k = day + '|' + this.di('region', r.region) + '|' + this.di('ctype', r.caseType) + '|' + this.di('mod', r.mod) + '|' + this.di('rse', r.rse) + '|' + this.di('rst', r.rst);
    var a = this.map.get(k); if (!a) { a = new Array(NC).fill(0); this.map.set(k, a); }
    var onsite = num(r.fvfS) === 1, parts = num(r.parts) > 0;
    a[0] += 1; a[1] += num(r.rrS); a[2] += num(r.rr); a[3] += num(r.rtS); a[4] += num(r.rt);
    a[5] += num(r.rdfS); a[6] += num(r.rdf); a[7] += num(r.ftrS); a[8] += num(r.ftr);
    if (onsite) {
      if (parts) { a[9] += 1; a[10] += num(r.fvf); } else { a[11] += 1; a[12] += num(r.fvf); }
      a[13] += 1; a[14] += num(r.sp) === 1 ? 1 : 0;
    }
    a[15] += (String(r.t2).trim() === '0') ? 1 : 0;
    var res = String(r.res || '');
    if (res === 'First Visit Fix') a[16] += 1; else if (res === 'Multi Visit Fix') a[17] += 1;
    var adv = uniq(partNos(r.adv));
    if (adv.length) {
      var cons = partNos(r.cons);
      a[18] += adv.length;
      a[19] += adv.filter(function (q) { return cons.some(function (p) { return samePart(p, q); }); }).length;
    }
    if (r.mkt !== undefined && r.mkt !== null) { var mv = String(r.mkt).trim(); if (mv && mv !== '-') this.mk[mv] = (this.mk[mv] || 0) + 1; }
    this.rowsUsed++;
  };
  Builder.prototype.result = function (name) {
    var rows = []; this.map.forEach(function (a, k) { var p = k.split('|'); rows.push([+p[0], +p[1], +p[2], +p[3], +p[4], +p[5]].concat(a)); });
    var maxDay = rows.reduce(function (m, r) { return Math.max(m, r[0]); }, 0);
    var mk = this.mk, ml = Object.keys(mk).sort(function (a, b) { return mk[b] - mk[a]; }), tot = ml.reduce(function (t, k) { return t + mk[k]; }, 0);
    var colMarket = ml.length ? (ml.length === 1 || mk[ml[0]] / tot >= 0.9 ? ml[0] : ml.slice(0, 3).join(' + ') + (ml.length > 3 ? ' + …' : '')) : null;
    return { v: 5, name: name, market: colMarket || this.market || null, marketList: ml, dims: this.dims, rows: rows, rowsUsed: this.rowsUsed, rowsRead: this.rowsRead, dups: this.dups, maxDay: maxDay, loadedAt: new Date().toISOString() };
  };
  function colMapFromHeader(h) {
    var byName = {}; Object.keys(h).forEach(function (c) { byName[String(h[c]).trim().toLowerCase()] = c; });
    var m = {}, missing = [];
    Object.keys(REQ).forEach(function (k) {
      var c = byName[REQ[k].toLowerCase()];
      if (!c && ALT[k]) ALT[k].some(function (n) { c = byName[n.toLowerCase()]; return !!c; });
      if (c) m[k] = c; else missing.push(REQ[k]);
    });
    Object.keys(OPT).forEach(function (k) { var c; OPT[k].some(function (n) { c = byName[n.toLowerCase()]; return !!c; }); if (c) m[k] = c; });
    var keyCols = Object.keys(h).filter(function (c) { return !IGNORE_FOR_KEY[String(h[c]).trim().toLowerCase()]; }).sort();
    return { m: m, missing: missing, keyCols: keyCols };
  }
  function streamEntry(zipObj, onText) {
    return new Promise(function (resolve, reject) {
      var dec = new TextDecoder('utf-8');
      var st = zipObj.internalStream('uint8array');
      st.on('data', function (chunk) { try { onText(dec.decode(chunk, { stream: true })); } catch (e) { st.pause(); reject(e); } })
        .on('error', reject).on('end', function () { try { onText(dec.decode()); resolve(); } catch (e) { reject(e); } }).resume();
    });
  }
  async function parseXlsx(JSZip, data, opts) {
    opts = opts || {}; var prog = opts.onProgress || function () { };
    var zip = await JSZip.loadAsync(data);
    var sheets = Object.keys(zip.files).filter(function (n) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(n); }).sort();
    if (!sheets.length) throw new Error('No worksheet found in this Excel file.');
    var sheetPath = sheets[0], shared = null, ss = zip.file('xl/sharedStrings.xml');
    if (ss) {
      prog('Reading text values…', 2); shared = []; var sb = '';
      await streamEntry(ss, function (txt) {
        sb += txt; var end = sb.lastIndexOf('</si>'); if (end < 0) return;
        var part = sb.slice(0, end + 5); sb = sb.slice(end + 5);
        var re = /<si>([\s\S]*?)<\/si>/g, m;
        while ((m = re.exec(part))) { var s = '', tr = /<t[^>]*>([\s\S]*?)<\/t>/g, t; while ((t = tr.exec(m[1]))) s += t[1]; shared.push(unesc(s)); }
      });
    }
    var total = zip.files[sheetPath]._data && zip.files[sheetPath]._data.uncompressedSize || 0;
    var b = new Builder(), header = null, cm = null, keyCols = null, buf = '', seen = 0;
    var cellRe = /<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    function cellVal(attrs, inner) {
      if (!inner) return '';
      var tm = /t="([a-zA-Z]+)"/.exec(attrs), typ = tm ? tm[1] : 'n', m;
      if (typ === 'inlineStr') { var s = '', tr = /<t[^>]*>([\s\S]*?)<\/t>/g; while ((m = tr.exec(inner))) s += m[1]; return unesc(s); }
      m = /<v>([\s\S]*?)<\/v>/.exec(inner); if (!m) return '';
      if (typ === 's') return shared ? (shared[+m[1]] || '') : '';
      if (typ === 'str') return unesc(m[1]);
      return m[1];
    }
    function handleRow(xml) {
      var o = {}, m; cellRe.lastIndex = 0;
      while ((m = cellRe.exec(xml))) o[m[1]] = cellVal(m[2], m[3]);
      if (!header) {
        header = o; var r = colMapFromHeader(o);
        if (r.missing.length) throw new Error('Missing required column(s): ' + r.missing.join(', ') + '.\nPlease export with Disposition Date and all KPI scope columns.');
        cm = r.m; keyCols = r.keyCols; return;
      }
      var a = o.A;
      if (a && /^Market:\s*/i.test(a)) { b.market = a.replace(/^Market:\s*/i, '').trim(); }
      var rec = {}; Object.keys(cm).forEach(function (k) { rec[k] = o[cm[k]]; });
      if (rec.disp === undefined || rec.disp === '') return;
      var key = ''; for (var i = 0; i < keyCols.length; i++) key += (o[keyCols[i]] || '') + '\u0001';
      b.add(rec, key);
    }
    var lastPct = -1;
    await streamEntry(zip.file(sheetPath), function (txt) {
      seen += txt.length; buf += txt;
      var start = 0, e;
      while ((e = buf.indexOf('</row>', start)) >= 0) {
        var s = buf.indexOf('<row', start);
        if (s >= 0 && s < e) handleRow(buf.slice(s, e));
        start = e + 6;
      }
      buf = buf.slice(start);
      if (total) { var pct = Math.min(99, Math.floor(seen / total * 100)); if (pct !== lastPct) { lastPct = pct; prog('Reading rows… ' + b.rowsUsed.toLocaleString() + ' unique cases', pct); } }
    });
    if (!header) throw new Error('The sheet appears to be empty.');
    if (!b.rowsUsed) throw new Error('No valid case rows were found (check the Disposition Date column).');
    return b.result(opts.name || 'Dataset');
  }
  return { parseXlsx: parseXlsx, NC: NC, REQ: REQ, partNos: partNos, samePart: samePart };
})();
if (typeof module !== 'undefined') module.exports = KPI_CORE;
