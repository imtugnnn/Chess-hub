INSERT INTO centers (id, name) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Trung tâm Cờ vua ChessHub')
ON CONFLICT (id) DO NOTHING;

INSERT INTO locations (id, center_id, name, address, position, checkin_radius_m) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Cơ sở 1', '01 Nguyễn Huệ, Quận 1, TP.HCM', ST_SetSRID(ST_MakePoint(106.704050, 10.773130), 4326)::geography, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, center_id, email, password_hash, full_name, role) VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'admin@chesshub.vn', crypt('ChessHub@123', gen_salt('bf', 12)), 'Quản lý Trung tâm', 'CENTER_ADMIN'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'teacher@chesshub.vn', crypt('ChessHub@123', gen_salt('bf', 12)), 'Hoàng Nam', 'TEACHER'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'parent@chesshub.vn', crypt('ChessHub@123', gen_salt('bf', 12)), 'Lan Phương', 'PARENT'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'student@chesshub.vn', crypt('ChessHub@123', gen_salt('bf', 12)), 'Nguyễn Minh Anh', 'STUDENT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO teachers (id, center_id, user_id, phone) VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '0901234567')
ON CONFLICT (id) DO NOTHING;

INSERT INTO students (id, center_id, user_id, student_code, full_name, date_of_birth) VALUES
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'MA1026', 'Nguyễn Minh Anh', '2014-05-12'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', NULL, 'GH0826', 'Nguyễn Gia Huy', '2018-03-08')
ON CONFLICT (id) DO NOTHING;

INSERT INTO guardian_students (guardian_user_id, student_id) VALUES
  ('30000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

INSERT INTO classes (id, center_id, name, level, tuition_per_session, status) VALUES
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Cờ chiến thuật U12', 'U12', 140000, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO class_teachers (class_id, teacher_id) VALUES
  ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

INSERT INTO enrollments (class_id, student_id) VALUES
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

INSERT INTO class_sessions (
  id, class_id, teacher_id, location_id, starts_at, ends_at, topic, objectives, materials
) VALUES
  (
    '70000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '2026-09-14 18:00:00+07', '2026-09-14 19:30:00+07',
    'Đòn chiến thuật kép',
    'Nhận biết và vận dụng đòn nĩa, ghim trong ván đấu.',
    '["Bộ bài tập chiến thuật số 4", "Bàn cờ cá nhân"]'::jsonb
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '2026-09-17 18:00:00+07', '2026-09-17 19:30:00+07',
    'Thực hành tàn cuộc xe',
    'Thực hiện đúng kỹ thuật chiếu hết bằng vua và xe.',
    '["Phiếu thế cờ tàn cuộc"]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO class_sessions (id, class_id, teacher_id, location_id, starts_at, ends_at, topic, objectives, materials) VALUES
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '2026-09-14T18:00:00+07:00', '2026-09-14T19:30:00+07:00', 'Chiến thuật ghim quân', 'Nhận diện và vận dụng đòn ghim trong ván đấu', '["Bài tập 01", "Ván mẫu.pdf"]'::jsonb),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '2026-09-17T18:00:00+07:00', '2026-09-17T19:30:00+07:00', 'Chiến thuật xiên', 'Thực hành đòn xiên trên bàn cờ', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;
