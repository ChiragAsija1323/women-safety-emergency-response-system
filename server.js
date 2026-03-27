// ============================================
// server.js - Women Safety & Emergency Response System v6
// NEW: Dashboard counts, JOIN queries, CSV export
// Full CRUD: Read, Insert, Edit, Delete
// ============================================

const express = require('express');
const mysql   = require('mysql2');
const path    = require('path');
const cors    = require('cors');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
// Prevent browser caching of static files during development
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    next();
});
app.use(express.static('public'));

// ============================================
// DATABASE CONNECTION — update these!
// ============================================
const db = mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',        // XAMPP default = no password
    database: process.env.DB_NAME     || 'women_safety'
});
// ✅ For XAMPP: Start Apache + MySQL in XAMPP Control Panel,
//    import women_safety.sql via phpMyAdmin, then run: node server.js
// ✅ For production: set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME env vars

db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        return;
    }
    console.log('✅ Connected to MySQL database!');
    console.log('🚀 Open http://localhost:' + PORT);
});

// ============================================
// HELPER: Get column names for a table (lowercase)
// ============================================
function getColumnNames(table, callback) {
    db.query(`DESCRIBE \`${table}\``, (err, cols) => {
        if (err) return callback([]);
        callback(cols.map(c => c.Field));          // preserve original casing
    });
}

// HELPER: Build a safe expression using only columns that exist
// cols = actual column array (original casing), candidates = preferred names (lowercase match)
function coalesce(cols, candidates, alias, tAlias) {
    const colsLower = cols.map(c => c.toLowerCase());
    const existing  = candidates.filter(c => colsLower.includes(c.toLowerCase()));
    if (!existing.length) return `'N/A' AS \`${alias}\``;
    // Use original casing from cols
    const realCols = existing.map(c => cols[colsLower.indexOf(c.toLowerCase())]);
    if (realCols.length === 1) return `\`${tAlias}\`.\`${realCols[0]}\` AS \`${alias}\``;
    return `COALESCE(${realCols.map(c => `\`${tAlias}\`.\`${c}\``).join(', ')}, 'N/A') AS \`${alias}\``;
}

// HELPER: Pick first existing column name (returns the actual column name or fallback)
function pickCol(cols, candidates, fallback) {
    const colsLower = cols.map(c => c.toLowerCase());
    const found = candidates.find(c => colsLower.includes(c.toLowerCase()));
    if (!found) return fallback;
    return cols[colsLower.indexOf(found.toLowerCase())];
}

// HELPER: Auto-detect Primary Key
function getPrimaryKey(table, callback) {
    const dbName = db.config.database;
    db.query(
        `SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND CONSTRAINT_NAME='PRIMARY' LIMIT 1`,
        [dbName, table],
        (err, results) => {
            if (err || !results.length) {
                db.query(`DESCRIBE \`${table}\``, (e2, cols) => {
                    callback(!e2 && cols.length ? cols[0].Field : null);
                });
                return;
            }
            callback(results[0].COLUMN_NAME);
        }
    );
}

// HELPER: Get full column metadata
function getColumns(table, callback) {
    db.query(`DESCRIBE \`${table}\``, (err, cols) => {
        callback(err ? null : cols.map(c => ({
            name: c.Field, type: c.Type,
            nullable: c.Null === 'YES', key: c.Key, extra: c.Extra
        })));
    });
}

const ALLOWED = ['USER','INCIDENT','RESPONDER','EMERGENCY_CONTACT','LOCATION','RESPONDER_CONTACT','EMERGENCY_CONTACT_PHONE'];

// ============================================
// STATIC FILES
// ============================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ============================================
// ★ DASHBOARD — live counts + chart data
// ============================================
app.get('/dashboard', (req, res) => {
    Promise.all([
        new Promise(r => getColumnNames('INCIDENT',  cols => r(cols))),
        new Promise(r => getColumnNames('USER',      cols => r(cols))),
        new Promise(r => getColumnNames('RESPONDER', cols => r(cols))),
    ]).then(([iCols, uCols, rCols]) => {

        // incidentsByStatus
        const statusCol = pickCol(iCols, ['Status','status'], null);
        const incidentsByStatusQ = statusCol
            ? `SELECT COALESCE(\`${statusCol}\`,'Unknown') AS label, COUNT(*) AS value FROM INCIDENT GROUP BY \`${statusCol}\` ORDER BY value DESC LIMIT 6`
            : `SELECT 'Unknown' AS label, COUNT(*) AS value FROM INCIDENT`;

        // respondersByType
        const rTypeCol = pickCol(rCols, ['OrganizationType','organization_type','organizationtype','org_type','type'], null);
        const respondersByTypeQ = rTypeCol
            ? `SELECT COALESCE(\`${rTypeCol}\`,'Unknown') AS label, COUNT(*) AS value FROM RESPONDER GROUP BY \`${rTypeCol}\` ORDER BY value DESC LIMIT 6`
            : `SELECT 'Unknown' AS label, COUNT(*) AS value FROM RESPONDER`;

        // incidentsPerUser
        const uIdCol   = pickCol(uCols, ['UserID','user_id'], uCols[0]);
        const uNameCol = pickCol(uCols, ['Name','name','username','full_name'], null);
        const iUserCol = pickCol(iCols, ['UserID','user_id'], null);
        const uLabel   = uNameCol
            ? `COALESCE(u.\`${uNameCol}\`, CONCAT('User ',u.\`${uIdCol}\`), 'Unknown')`
            : `CONCAT('User ', u.\`${uIdCol}\`)`;
        const incidentsPerUserQ = iUserCol
            ? `SELECT ${uLabel} AS label, COUNT(i.\`${iUserCol}\`) AS value FROM USER u LEFT JOIN INCIDENT i ON u.\`${uIdCol}\` = i.\`${iUserCol}\` GROUP BY u.\`${uIdCol}\` ORDER BY value DESC LIMIT 5`
            : `SELECT ${uLabel} AS label, 0 AS value FROM USER u GROUP BY u.\`${uIdCol}\` LIMIT 5`;

        const queries = {
            totalUsers:        'SELECT COUNT(*) AS cnt FROM USER',
            totalIncidents:    'SELECT COUNT(*) AS cnt FROM INCIDENT',
            totalResponders:   'SELECT COUNT(*) AS cnt FROM RESPONDER',
            totalContacts:     'SELECT COUNT(*) AS cnt FROM EMERGENCY_CONTACT',
            totalLocations:    'SELECT COUNT(*) AS cnt FROM LOCATION',
            incidentsByStatus: incidentsByStatusQ,
            respondersByType:  respondersByTypeQ,
            incidentsPerUser:  incidentsPerUserQ,
        };

        const result = {};
        const keys   = Object.keys(queries);
        let   done   = 0;

        keys.forEach(key => {
            db.query(queries[key], (err, rows) => {
                if (err) {
                    console.error(`Dashboard query error [${key}]:`, err.message);
                    result[key] = key.startsWith('total') ? [{ cnt: 0 }] : [];
                } else {
                    result[key] = rows;
                }
                done++;
                if (done === keys.length) res.json(result);
            });
        });
    });
});

// ============================================
// ============================================================
// ★ JOIN QUERY ROUTES
// Simple hardcoded-schema queries. No dynamic DESCRIBE magic.
// Each route runs its own SQL and returns its own columns.
// ============================================================

// Shared helpers
function execJoin(res, label, sql) {
    console.log(`\n===== [${label}] =====\n${sql.replace(/\s+/g,' ').trim()}\n`);
    db.query(sql, (err, rows) => {
        if (err) {
            console.error(`[${label}] SQL ERROR:`, err.message);
            return res.status(500).json({ error: err.message });
        }
        // Strip columns where EVERY row has a null/undefined value
        let cleanRows = rows;
        if (rows.length > 0) {
            const allCols = Object.keys(rows[0]);
            const activeCols = allCols.filter(col =>
                rows.some(row => row[col] !== null && row[col] !== undefined)
            );
            if (activeCols.length < allCols.length) {
                cleanRows = rows.map(row => {
                    const clean = {};
                    activeCols.forEach(c => { clean[c] = row[c]; });
                    return clean;
                });
            }
        }
        console.log(`[${label}] ${cleanRows.length} rows, cols: [${cleanRows.length ? Object.keys(cleanRows[0]).join(', ') : '—'}]`);
        res.json(cleanRows);
    });
}

// ── JOIN 1: Incidents ↔ Responders ──────────────────────────────────────────
// ── Utility: describe a table, return col array (never throws) ──────────────
function descCols(table) {
    return new Promise(resolve => {
        db.query(`DESCRIBE \`${table}\``, (err, rows) => {
            if (err) { console.warn('[DESCRIBE]', table, err.message); resolve([]); }
            else resolve(rows.map(r => r.Field));
        });
    });
}
// Pick first matching col (case-insensitive); return null if none found
function pick(cols, candidates) {
    const lo = cols.map(c => c.toLowerCase());
    for (const c of candidates) {
        const i = lo.indexOf(c.toLowerCase());
        if (i !== -1) return cols[i];
    }
    return null;
}
// SELECT fragment: returns SQL expression string, or null if column doesn't exist
// Callers must filter out null entries before joining into SQL
function sel(tAlias, col, alias) {
    return col ? `\`${tAlias}\`.\`${col}\` AS \`${alias}\`` : null;
}
// Join a list of SELECT fragments, skipping any nulls
function selList(...parts) {
    return parts.filter(Boolean).join(',\n                ');
}

// ── JOIN 1: Incidents ↔ Responders ──────────────────────────────────────────
app.get('/join/incident-responders', async (req, res) => {
    try {
        const [iC, rC, irC] = await Promise.all([
            descCols('INCIDENT'), descCols('RESPONDER'), descCols('INCIDENT_RESPONDER')
        ]);
        const iPK   = pick(iC,  ['IncidentID','incident_id','id']) || iC[0];
        const rPK   = pick(rC,  ['ResponderID','responder_id','id']) || rC[0];
        const irIFK = pick(irC, ['IncidentID','incident_id']) || irC[0];
        const irRFK = pick(irC, ['ResponderID','responder_id']) || irC[1] || irC[0];
        const sql = `
            SELECT
                ${selList(
                    `i.\`${iPK}\` AS \`incident_id\``,
                    sel('i', pick(iC,['IncidentType','incident_type','Type','type','description','title','details']), 'incident_desc'),
                    sel('i', pick(iC,['Status','status']), 'status'),
                    sel('i', pick(iC,['DateTime','incident_date','date','created_at','reported_at']), 'incident_date'),
                    `r.\`${rPK}\` AS \`responder_id\``,
                    sel('r', pick(rC,['ResponderName','responder_name','name','full_name']), 'responder_name'),
                    sel('r', pick(rC,['OrganizationType','organization_type','org_type','type']), 'org_type'),
                    sel('ir',pick(irC,['AssignedAt','assigned_at','created_at','response_date']), 'assigned_at')
                )}
            FROM \`INCIDENT\` i
            INNER JOIN \`INCIDENT_RESPONDER\` ir ON i.\`${iPK}\`   = ir.\`${irIFK}\`
            INNER JOIN \`RESPONDER\`          r  ON ir.\`${irRFK}\` = r.\`${rPK}\`
            ORDER BY i.\`${iPK}\``;
        execJoin(res, 'JOIN1 Incident↔Responder', sql);
    } catch(e) { res.status(500).json({error: e.message}); }
});

// ── JOIN 2: Users ↔ Locations ────────────────────────────────────────────────
app.get('/join/user-locations', async (req, res) => {
    try {
        const [uC, lC] = await Promise.all([descCols('USER'), descCols('LOCATION')]);

        console.log('[JOIN2] USER cols   :', uC);
        console.log('[JOIN2] LOCATION cols:', lC);

        const uPK    = pick(uC, ['UserID','user_id','id']) || uC[0];
        const uLocFK = pick(uC, ['LocationID','location_id']);  // FK on USER side
        const lPK    = pick(lC, ['LocationID','location_id','id']) || lC[0];

        // USER.LocationID = LOCATION.LocationID (direct FK match)
        const joinCond = `u.\`${uLocFK || uPK}\` = l.\`${lPK}\``;
        console.log('[JOIN2] joinCond:', joinCond);

        const sql = `
            SELECT
                ${selList(
                    `u.\`${uPK}\` AS \`user_id\``,
                    sel('u', pick(uC,['Name','name','UserName','username','full_name']), 'user_name'),
                    sel('u', pick(uC,['PhoneNumber','phone_number','Phone','phone','mobile','MobileNumber']), 'phone'),
                    sel('u', pick(uC,['Email','email','EmailAddress']), 'email'),
                    sel('u', pick(uC,['Role','role','UserRole','user_role']), 'role'),
                    `l.\`${lPK}\` AS \`location_id\``,
                    sel('l', pick(lC,['Area','area','Latitude','latitude','lat','location_name','place']), 'area'),
                    sel('l', pick(lC,['City','city','Longitude','longitude','lng','Address','address']), 'city')
                )}
            FROM \`USER\` u
            INNER JOIN \`LOCATION\` l ON ${joinCond}
            ORDER BY u.\`${uPK}\``;
        execJoin(res, 'JOIN2 User↔Location', sql);
    } catch(e) { res.status(500).json({error: e.message}); }
});

// ── JOIN 3: Responders ↔ Contacts ────────────────────────────────────────────
app.get('/join/responder-contacts', async (req, res) => {
    try {
        const [rC, rcC] = await Promise.all([descCols('RESPONDER'), descCols('RESPONDER_CONTACT')]);
        const rPK  = pick(rC,  ['ResponderID','responder_id','id']) || rC[0];
        // rcFK = the FK column in RESPONDER_CONTACT that points to RESPONDER
        const rcFK = pick(rcC, ['ResponderID','responder_id']) || rcC[0];
        // rcPK = RESPONDER_CONTACT's own PK (different from the FK)
        const rcPK = pick(rcC, ['ContactID','contact_id']) || rcC.find(c => c !== rcFK) || null;

        const rcPKSel = rcPK ? `rc.\`${rcPK}\` AS \`contact_id\`` : null;

        const sql = `
            SELECT
                ${selList(
                    `r.\`${rPK}\` AS \`responder_id\``,
                    sel('r',  pick(rC,  ['ResponderName','responder_name','name','full_name']), 'responder_name'),
                    sel('r',  pick(rC,  ['OrganizationType','organization_type','org_type','type']), 'org_type'),
                    rcPKSel,
                    sel('rc', pick(rcC, ['Phone','phone','PhoneNumber','phone_number','ContactPhone','contact_number','mobile']), 'contact_phone'),
                    sel('rc', pick(rcC, ['ContactType','contact_type','Type','type']), 'contact_type')
                )}
            FROM \`RESPONDER\` r
            INNER JOIN \`RESPONDER_CONTACT\` rc ON r.\`${rPK}\` = rc.\`${rcFK}\`
            ORDER BY r.\`${rPK}\``;
        execJoin(res, 'JOIN3 Responder↔Contact', sql);
    } catch(e) { res.status(500).json({error: e.message}); }
});

// ── JOIN 4: Users ↔ Emergency Contacts ───────────────────────────────────────
app.get('/join/user-emergency-contacts', async (req, res) => {
    try {
        const [uC, ecC, ecpC] = await Promise.all([
            descCols('USER'), descCols('EMERGENCY_CONTACT'), descCols('EMERGENCY_CONTACT_PHONE')
        ]);
        const uPK   = pick(uC,   ['UserID','user_id','id']) || uC[0];
        const ecPK  = pick(ecC,  ['ContactID','contact_id','EmergencyContactID','id']) || ecC[0];
        const ecFK  = pick(ecC,  ['UserID','user_id']) || ecC.find(c=>c!==ecPK) || ecC[1];
        const ecpPK = pick(ecpC, ['PhoneID','phone_id','id']) || ecpC[0];
        const ecpFK = pick(ecpC, ['ContactID','contact_id','EmergencyContactID','emergency_contact_id']) || ecpC.find(c=>c!==ecpPK) || ecpC[1];
        const sql = `
            SELECT
                ${selList(
                    `u.\`${uPK}\`  AS \`user_id\``,
                    sel('u',   pick(uC,  ['Name','name','UserName','username','full_name']), 'user_name'),
                    sel('u',   pick(uC,  ['Role','role','UserRole','user_role']), 'user_role'),
                    `ec.\`${ecPK}\` AS \`contact_id\``,
                    sel('ec',  pick(ecC, ['ContactName','contact_name','Name','name','full_name']), 'emergency_contact_name'),
                    sel('ec',  pick(ecC, ['Relationship','relationship','relation','RelationType','relation_type']), 'relationship'),
                    `ecp.\`${ecpPK}\` AS \`phone_id\``,
                    sel('ecp', pick(ecpC,['PhoneNumber','phone_number','Phone','phone','contact_number','mobile','ContactPhone']), 'contact_phone')
                )}
            FROM \`USER\` u
            INNER JOIN \`EMERGENCY_CONTACT\`       ec  ON u.\`${uPK}\`  = ec.\`${ecFK}\`
            INNER JOIN \`EMERGENCY_CONTACT_PHONE\` ecp ON ec.\`${ecPK}\` = ecp.\`${ecpFK}\`
            ORDER BY u.\`${uPK}\``;
        execJoin(res, 'JOIN4 User↔EmergencyContact', sql);
    } catch(e) { res.status(500).json({error: e.message}); }
});

// ── /debug-join : hit all 4 APIs and show results side by side ──────────────
app.get('/debug-join', (req, res) => {
    const joins = [
        { key: 'incident-responders',      label: 'JOIN1' },
        { key: 'user-locations',           label: 'JOIN2' },
        { key: 'responder-contacts',       label: 'JOIN3' },
        { key: 'user-emergency-contacts',  label: 'JOIN4' },
    ];
    const html = joins.map(j =>
        `<h3>${j.label}: /join/${j.key}</h3>
         <div id="${j.key}" style="background:#111;color:#0f0;padding:10px;font-family:monospace;font-size:12px">Loading…</div>
         <script>
           fetch('/join/${j.key}?_='+Date.now()).then(r=>r.json()).then(d=>{
             const el = document.getElementById('${j.key}');
             if(!Array.isArray(d)){el.style.color='red';el.textContent=JSON.stringify(d);return;}
             el.textContent = d.length+' rows\\nColumns: '+
               (d[0]?Object.keys(d[0]).join(', '):'(empty)')+
               '\\n\\n'+JSON.stringify(d.slice(0,3),null,2);
           }).catch(e=>{ document.getElementById('${j.key}').textContent='ERROR: '+e.message; });
         </script>`
    ).join('<hr>');
    res.send(`<!DOCTYPE html><html><head><title>JOIN Debug</title></head><body style="background:#1a1a1a;color:#fff;padding:20px;font-family:sans-serif">
      <h1>🔍 JOIN Debug — All 4 Queries Live</h1>
      <p>Each box shows columns + first 3 rows from the actual DB query.</p>
      ${html}
    </body></html>`);
});

// ============================================
// DEBUG: Show all table columns (remove after testing)
// ============================================
app.get('/debug-columns', (req, res) => {
    const tables = ['USER','INCIDENT','RESPONDER','INCIDENT_RESPONDER',
                    'LOCATION','RESPONDER_CONTACT','EMERGENCY_CONTACT','EMERGENCY_CONTACT_PHONE'];
    const result = {};
    let done = 0;
    tables.forEach(t => {
        db.query(`DESCRIBE \`${t}\``, (err, cols) => {
            result[t] = err ? `ERROR: ${err.message}` : cols.map(c => c.Field);
            done++;
            if (done === tables.length) res.json(result);
        });
    });
});

// ============================================
// CRUD TABLE ROUTES
// ============================================
app.get('/users',                     (req, res) => fetchTable(res, 'USER'));
app.get('/incidents',                 (req, res) => fetchTable(res, 'INCIDENT'));
app.get('/responders',                (req, res) => fetchTable(res, 'RESPONDER'));
app.get('/emergency-contacts',        (req, res) => fetchTable(res, 'EMERGENCY_CONTACT'));
app.get('/locations',                 (req, res) => fetchTable(res, 'LOCATION'));
app.get('/responder-contacts',        (req, res) => fetchTable(res, 'RESPONDER_CONTACT'));
app.get('/emergency-contact-phones',  (req, res) => fetchTable(res, 'EMERGENCY_CONTACT_PHONE'));

// ── One-time fix: correct USER.LocationID values to match LOCATION table IDs ──
// USER has 301-306 but LOCATION has 101-106 — this corrects the mismatch
app.get('/fix-location-ids', (req, res) => {
    const updates = [
        'UPDATE `USER` SET `LocationID` = 101 WHERE `UserID` = 1',
        'UPDATE `USER` SET `LocationID` = 102 WHERE `UserID` = 2',
        'UPDATE `USER` SET `LocationID` = 103 WHERE `UserID` = 3',
        'UPDATE `USER` SET `LocationID` = 104 WHERE `UserID` = 4',
        'UPDATE `USER` SET `LocationID` = 105 WHERE `UserID` = 5',
        'UPDATE `USER` SET `LocationID` = 106 WHERE `UserID` = 6',
    ];
    let done = 0, errors = [];
    updates.forEach(sql => {
        db.query(sql, (err) => {
            if (err) errors.push(err.message);
            done++;
            if (done === updates.length) {
                if (errors.length) return res.json({ success: false, errors });
                res.json({ success: true, message: 'USER.LocationID updated to 101–106 to match LOCATION table.' });
            }
        });
    });
});

function fetchTable(res, table) {
    db.query(`SELECT * FROM \`${table}\``, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
}

// Primary key endpoint
app.get('/pk/:table', (req, res) => {
    const t = req.params.table.toUpperCase();
    if (!ALLOWED.includes(t)) return res.status(400).json({ error: 'Unknown table' });
    getPrimaryKey(t, pk => pk ? res.json({ pk }) : res.status(500).json({ error: 'PK not found' }));
});

// Column metadata endpoint
app.get('/columns/:table', (req, res) => {
    const t = req.params.table.toUpperCase();
    if (!ALLOWED.includes(t)) return res.status(400).json({ error: 'Unknown table' });
    getColumns(t, cols => cols ? res.json(cols) : res.status(500).json({ error: 'Cannot get columns' }));
});

// ============================================
// INSERT
// ============================================
app.post('/insert/:table', (req, res) => {
    const table = req.params.table.toUpperCase();
    if (!ALLOWED.includes(table)) return res.status(400).json({ error: 'Unknown table' });
    const data   = req.body;
    const fields = Object.keys(data).filter(k => data[k] !== '' && data[k] !== null);
    if (!fields.length) return res.status(400).json({ error: 'No data provided' });
    const query  = `INSERT INTO \`${table}\` (${fields.map(f=>`\`${f}\``).join(',')}) VALUES (${fields.map(()=>'?').join(',')})`;
    db.query(query, fields.map(f => data[f]), (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, insertId: result.insertId });
    });
});

// ============================================
// UPDATE
// ============================================
app.put('/update/:table/:id', (req, res) => {
    const table = req.params.table.toUpperCase();
    if (!ALLOWED.includes(table)) return res.status(400).json({ error: 'Unknown table' });
    const fields = Object.keys(req.body);
    if (!fields.length) return res.status(400).json({ error: 'No data' });
    getPrimaryKey(table, pk => {
        if (!pk) return res.status(500).json({ error: 'PK not found' });
        const q = `UPDATE \`${table}\` SET ${fields.map(f=>`\`${f}\`=?`).join(',')} WHERE \`${pk}\`=?`;
        db.query(q, [...fields.map(f=>req.body[f]), req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// ============================================
// DELETE
// ============================================
app.delete('/delete/:table/:id', (req, res) => {
    const table = req.params.table.toUpperCase();
    if (!ALLOWED.includes(table)) return res.status(400).json({ error: 'Unknown table' });
    getPrimaryKey(table, pk => {
        if (!pk) return res.status(500).json({ error: 'PK not found' });
        db.query(`DELETE FROM \`${table}\` WHERE \`${pk}\`=?`, [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// ============================================
// START
// ============================================
app.listen(PORT, () => {
    console.log('\n🛡️  Women Safety & Emergency Response System v6');
    console.log('✨ Dashboard + JOINs + CSV Export + Full CRUD');
    console.log('🌐 http://localhost:' + PORT + '\n');
});
