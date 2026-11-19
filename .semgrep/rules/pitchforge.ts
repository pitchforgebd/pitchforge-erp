// Semgrep test cases for pitchforge.yml. Not compiled or linted (see .semgrepignore / eslint ignores).
// Each `ruleid:` line must be reported by that rule; each `ok:` line must not be.

declare const db: { query(sql: string, params?: unknown[]): unknown; unsafe(sql: string): unknown };
declare const sql: { raw(s: string): unknown };
declare const id: string;
declare const amount: string;
declare const pageSize: string;

// ruleid: pitchforge.no-dangerously-set-inner-html
const html = { dangerouslySetInnerHTML: { __html: '<b>x</b>' } };

// ruleid: pitchforge.no-browser-storage
localStorage.setItem('session', 'abc');
// ruleid: pitchforge.no-browser-storage
window.sessionStorage.getItem('user');

// ruleid: pitchforge.no-string-built-sql
db.query(`SELECT * FROM core.user WHERE id = '${id}'`);
// ruleid: pitchforge.no-string-built-sql
db.query('SELECT * FROM core.user WHERE id = ' + id);
// ruleid: pitchforge.no-string-built-sql
sql.raw(id);
// ok: pitchforge.no-string-built-sql
db.query('SELECT * FROM core.user WHERE id = $1', [id]);

// ruleid: pitchforge.no-secret-in-next-public
const s = process.env.NEXT_PUBLIC_SESSION_SECRET;
// ok: pitchforge.no-secret-in-next-public
const mode = process.env.NEXT_PUBLIC_APP_NAME;

// ruleid: pitchforge.no-float-money-parse
const a = parseFloat(amount);
// ok: pitchforge.no-float-money-parse
const p = parseFloat(pageSize);

export { html, s, mode, a, p };
