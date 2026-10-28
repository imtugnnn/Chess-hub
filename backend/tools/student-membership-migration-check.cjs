// Run against an isolated, in-memory PostgreSQL engine; never connects to a real database.
// npm install --prefix backend/target/migration-check --no-audit --no-fund @electric-sql/pglite
const { PGlite } = require('../target/migration-check/node_modules/@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  for (const state of ['fresh', 'existing', 'custom-pk']) {
    const db = await PGlite.create();
    try {
      await db.exec(`
        CREATE TABLE users (id uuid primary key);
        CREATE TABLE centers (id uuid primary key);
        CREATE TABLE chess_classes (id uuid primary key, teacher_id uuid, student_count integer);
        CREATE TABLE student (id uuid primary key, full_name varchar(255) not null);
        CREATE TABLE class_sessions (id uuid primary key, class_id uuid references chess_classes(id));
        CREATE TABLE session_attendance (id uuid primary key, session_id uuid not null references class_sessions(id), student_id uuid not null references student(id), status varchar(20), CONSTRAINT session_attendance_session_student_key UNIQUE(session_id, student_id));
      `);
      if (state !== 'fresh') {
        await db.exec(`
          CREATE TABLE chess_class_students (chess_class_id uuid not null references chess_classes(id), student_id uuid not null references student(id), CONSTRAINT ${state === 'custom-pk' ? 'hibernate_generated_pk' : 'chess_class_students_pkey'} PRIMARY KEY(chess_class_id, student_id));
          INSERT INTO users VALUES ('10000000-0000-0000-0000-000000000001');
          INSERT INTO chess_classes VALUES ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 2);
          INSERT INTO student VALUES ('30000000-0000-0000-0000-000000000001', 'An'), ('30000000-0000-0000-0000-000000000002', 'Bình');
          INSERT INTO class_sessions VALUES ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
          INSERT INTO chess_class_students VALUES ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001');
          INSERT INTO session_attendance VALUES ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'PRESENT');
        `);
      }
      const migration = fs.readFileSync(path.join(__dirname, '../src/main/resources/db/migration/V21__class_memberships_and_import.sql'), 'utf8');
      await db.exec(migration);
      if (state !== 'fresh') {
        const members = (await db.query('select full_name, active from chess_class_students order by full_name')).rows;
        assert.deepEqual(members, [{ full_name: 'An', active: true }, { full_name: 'Bình', active: false }]);
        const history = (await db.query('select m.full_name, a.status from session_attendance a join chess_class_students m on m.id = a.membership_id')).rows;
        assert.deepEqual(history, [{ full_name: 'Bình', status: 'PRESENT' }]);
        const c = (await db.query('select scope_confirmed, center_id, student_count from chess_classes')).rows[0];
        assert.deepEqual(c, { scope_confirmed: false, center_id: null, student_count: 1 });
        await db.exec("insert into chess_class_students (chess_class_id, full_name) values ('20000000-0000-0000-0000-000000000001', 'Chỉ có tên')");
        assert.equal((await db.query('select count(*)::int as n from student')).rows[0].n, 2);
      }
      console.log(`PASS: V21 PostgreSQL migration (${state}).`);
    } finally { await db.close(); }
  }
})().catch(e => { console.error(e); process.exit(1); });
