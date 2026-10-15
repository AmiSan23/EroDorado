// =====================================================
//  character_data.js  — dipakai bersama oleh index.html & backup_recovery.html
//  Format file/backup : grouped  element > role > rank > [karakter]
//  Format localStorage : flat (array), supaya halaman lain tetap jalan
// =====================================================
const ELEMENT_ORDER = ["Fire", "Wind", "Water", "Light", "Dark"];
const ROLE_ORDER    = ["Fighter", "Assassin", "Defender", "Support", "Healer"];
const RANK_ORDER    = ["SSRr", "SSR", "SR", "R"];
const WEAR_KEYS     = ["bracelet", "bikini", "hat", "sandals"];
const SKILL_KEYS    = ["skillOneLevel", "skillTwoLevel", "skillThreeLevel", "skillFourLevel"];
const orderIdx = (list, v) => { const i = list.indexOf(v); return i === -1 ? 99 : i; };

// Power bisa "162K", "1.2M", atau "56.890" (titik = pemisah ribuan)
function parsePower(p) {
    let s = String(p).toUpperCase().replace(/,/g, '').replace(/\s/g, '');
    if (s.endsWith('K')) return parseFloat(s) * 1000;
    if (s.endsWith('M')) return parseFloat(s) * 1000000;
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return parseFloat(s) || 0;
}

// Info skill boleh berisi <b>, <i>, <br>; sisanya di-escape
function safeInfo(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/&lt;(\/?)(b|i)&gt;/gi, '<$1$2>')
        .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
}

// grouped -> flat
function flattenGrouped(grouped) {
    const out = [];
    for (const [element, roles] of Object.entries(grouped)) {
        for (const [role, ranks] of Object.entries(roles)) {
            for (const [rank, list] of Object.entries(ranks)) {
                for (const c of list) {
                    const sk = c.skills || [];
                    const lv = i => (typeof sk[i] === 'object' && sk[i] !== null) ? sk[i].lv : sk[i]; // dukung format lama [2,1,1,2]
                    const flat = {
                        name: c.name, rank, element, role,
                        level: c.level ?? 1,
                        intimacy: c.intimacy ?? 1,
                        star: c.star ?? 1,
                        skillOneLevel: lv(0) ?? 1,
                        skillTwoLevel: lv(1) ?? 1,
                        skillThreeLevel: lv(2) ?? 0,
                        skillFourLevel: lv(3) ?? 0,
                        skillInfo: [0, 1, 2, 3].map(i => (typeof sk[i] === 'object' && sk[i]?.info) || ''),
                        cardLevel: c.card?.lv ?? 0,
                        cardStar: c.card?.star ?? 0,
                        power: c.power ?? "0",
                        shards: c.shards?.cur ?? 0,
                        shardMax: c.shards?.max ?? 0
                    };
                    const wear = c.wear || {};
                    WEAR_KEYS.forEach(k => flat[k] = wear[k] ?? 'e'); // 'e' = kosong (kompatibel halaman lain)
                    if (c.skillProgress) flat.skillProgress = c.skillProgress;
                    out.push(flat);
                }
            }
        }
    }
    return out;
}

// flat -> grouped
function groupCharacters(flat) {
    const g = {};
    flat.forEach(c => {
        const compact = {
            name: c.name,
            star: c.star,
            skills: SKILL_KEYS.map((k, i) => ({ lv: c[k], info: c.skillInfo?.[i] || '' })),
            power: c.power,
            level: c.level,
            shards: { cur: parseInt(c.shards) || 0, max: parseInt(c.shardMax) || 0 },
            card: { lv: c.cardLevel, star: c.cardStar },
            intimacy: c.intimacy,
            wear: Object.fromEntries(WEAR_KEYS.map(k => [k, (c[k] && c[k] !== 'e') ? c[k] : null]))
        };
        if (c.skillProgress) compact.skillProgress = c.skillProgress;
        ((g[c.element] ??= {})[c.role] ??= {})[c.rank] ??= [];
        g[c.element][c.role][c.rank].push(compact);
    });
    return g;
}

// Cetak JSON rapi: 1 karakter = 1 baris
function stringifyGrouped(g) {
    const L = ['{'];
    const els = Object.keys(g).sort((a, b) => orderIdx(ELEMENT_ORDER, a) - orderIdx(ELEMENT_ORDER, b));
    els.forEach((el, i) => {
        L.push(`  ${JSON.stringify(el)}: {`);
        const roles = Object.keys(g[el]).sort((a, b) => orderIdx(ROLE_ORDER, a) - orderIdx(ROLE_ORDER, b));
        roles.forEach((ro, j) => {
            L.push(`    ${JSON.stringify(ro)}: {`);
            const ranks = Object.keys(g[el][ro]).sort((a, b) => orderIdx(RANK_ORDER, a) - orderIdx(RANK_ORDER, b));
            ranks.forEach((rk, k) => {
                L.push(`      ${JSON.stringify(rk)}: [`);
                const list = [...g[el][ro][rk]].sort((a, b) => parsePower(b.power) - parsePower(a.power));
                list.forEach((c, m) => L.push(`        ${JSON.stringify(c)}${m < list.length - 1 ? ',' : ''}`));
                L.push(`      ]${k < ranks.length - 1 ? ',' : ''}`);
            });
            L.push(`    }${j < roles.length - 1 ? ',' : ''}`);
        });
        L.push(`  }${i < els.length - 1 ? ',' : ''}`);
    });
    L.push('}');
    return L.join('\n');
}

// Terima format lama (array flat) maupun baru (object bertingkat)
function normalizeImported(parsed) {
    return Array.isArray(parsed) ? parsed : flattenGrouped(parsed);
}

// Pastikan field tambahan selalu ada
function migrate(list) {
    list.forEach(char => {
        if (!char.skillProgress) char.skillProgress = { tracked: false, skill: 'skillTwo', current: 0, max: 1000 };
        if (!Array.isArray(char.skillInfo)) char.skillInfo = ['', '', '', ''];
        WEAR_KEYS.forEach(k => { if (char[k] === undefined || char[k] === null) char[k] = 'e'; });
    });
    return list;
}

if (typeof module !== 'undefined') module.exports = { flattenGrouped, groupCharacters, stringifyGrouped, normalizeImported, migrate, parsePower, safeInfo };
