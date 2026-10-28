// Isolated in-memory PostgreSQL; never connects to a real database.
const { PGlite } = require('../target/migration-check/node_modules/@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const db = await PGlite.create();
  try {
    await db.exec('CREATE TABLE chess_classes (id uuid PRIMARY KEY)');
    await db.exec(fs.readFileSync(path.join(__dirname, '../src/main/resources/db/migration/V22__tuition_payments.sql'), 'utf8'));
    const c = '10000000-0000-0000-0000-000000000001';
    const p = '20000000-0000-0000-0000-000000000001';
    const s = '30000000-0000-0000-0000-000000000001';
    const actor = '40000000-0000-0000-0000-000000000001';
    const op = '50000000-0000-0000-0000-000000000001';
    await db.query('INSERT INTO chess_classes VALUES ($1)', [c]);
    await db.query('INSERT INTO tuition_payments(id,class_id,identity_id,report_month,collected,amount,revision,updated_by,updated_by_name,updated_at) VALUES ($1,$2,$3,$4,true,800000,1,$5,$6,now())', [p,c,s,'2026-10',actor,'Giáo viên']);
    await db.query('INSERT INTO tuition_payment_events(id,payment_id,collected,expected_revision,expected_tuition,previous_amount,amount,actor_id,actor_name,created_at) VALUES ($1,$2,true,0,800000,0,800000,$3,$4,now())', [op,p,actor,'Giáo viên']);
    await assert.rejects(db.query('INSERT INTO tuition_payments SELECT gen_random_uuid(),class_id,identity_id,report_month,collected,amount,revision,updated_by,updated_by_name,updated_at FROM tuition_payments'), /unique/i);
    await assert.rejects(db.query('UPDATE tuition_payments SET amount=-1'), /check/i);
    await assert.rejects(db.query('INSERT INTO tuition_payment_events SELECT * FROM tuition_payment_events'), /unique/i);
    assert.equal((await db.query('SELECT amount FROM tuition_payments')).rows[0].amount, '800000');
    await db.query('DELETE FROM chess_classes WHERE id=$1', [c]);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM tuition_payments')).rows[0].n, 0);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM tuition_payment_events')).rows[0].n, 0);
    console.log('PASS: V22 on isolated PostgreSQL: schema, amount, unique scope/operation, cascade cleanup.');
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
