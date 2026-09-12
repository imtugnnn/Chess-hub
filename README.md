# ChessHub

Ứng dụng quản lý trung tâm cờ vua với bốn giao diện tách biệt: phụ huynh, học viên, giáo viên và trung tâm. Frontend hiện là bản MVP responsive; backend là API TypeScript kết nối PostgreSQL/PostGIS.

## Tech stack

- Frontend MVP: HTML, CSS, JavaScript thuần, chạy tốt trên máy tính và điện thoại.
- Backend: Node.js 22+ / TypeScript / Fastify 5.
- Database: PostgreSQL 17 + PostGIS 3.5.
- Xác thực: email/mật khẩu băm bằng `pgcrypto`, access token JWT hết hạn sau 1 giờ.
- Kiến trúc: modular monolith. Một API và một database là đủ cho quy mô một trung tâm; chưa cần microservice, Redis hay message queue.

PostGIS được dùng để tính khoảng cách bằng mét và kiểm tra geofence ở máy chủ. Database cũng có ràng buộc chặn giáo viên bị xếp hai buổi trùng giờ.

## Chức năng đã dựng

| Vai trò | Giao diện và API chính |
|---|---|
| Phụ huynh | Chuyển hồ sơ nhiều con, lịch tuần/tháng, chuyên cần, học phí, giải đấu, xin nghỉ |
| Học viên | Lịch tuần/tháng, nội dung buổi học, tự điểm danh bằng vị trí, chuyên cần, giải đấu |
| Giáo viên | Lịch dạy, điểm danh thủ công, cập nhật chủ đề/mục tiêu/tài liệu, danh sách học viên |
| Trung tâm | Lịch toàn trung tâm, tạo/sửa buổi học, tạo lớp, phân công giáo viên, quản lý học viên |

## Quy tắc điểm danh vị trí

`POST /api/v1/sessions/:sessionId/check-in` chỉ ghi nhận khi:

- Tài khoản học viên hoặc phụ huynh có quyền với học viên đó.
- Học viên đang được ghi danh trong lớp của buổi học.
- Buổi học không bị hủy và đang trong cửa sổ điểm danh.
- Vị trí được lấy trong vòng 120 giây, độ chính xác GPS không quá 30 m.
- Khoảng cách do PostGIS tính không vượt quá bán kính cấu hình của địa điểm: từ `10–30 m`, mặc định `30 m`.
- Chưa tồn tại kết quả điểm danh của học viên trong buổi đó.

Tọa độ, độ chính xác và khoảng cách được lưu để kiểm tra khi có khiếu nại. GPS trên web vẫn có thể bị giả lập; nếu điểm danh có giá trị cao, nên bổ sung QR đổi theo phút, BLE tại cơ sở hoặc device attestation cho ứng dụng native.

## Chạy toàn bộ bằng Docker

Docker chạy ba container: `web` (giao diện), `api` (Fastify) và `db` (PostgreSQL/PostGIS). Máy chỉ cần cài và mở Docker Desktop.

Tại thư mục `ChessHub`, chạy:

```powershell
docker compose up --build -d
docker compose ps
```

Sau khi cả ba dịch vụ ở trạng thái `healthy` hoặc `running`:

- Giao diện: `http://localhost:4173`
- API health check: `http://localhost:3000/health`
- PostgreSQL: `localhost:5432`

Xem log API:

```powershell
docker compose logs -f api
```

Dừng dự án nhưng giữ nguyên dữ liệu:

```powershell
docker compose down
```

Chỉ dùng lệnh sau khi muốn xóa toàn bộ database và tạo lại từ đầu:

```powershell
docker compose down -v
```

Khi API khởi động, các migration và dữ liệu demo được áp dụng tự động. Bộ chọn “Giao diện” trên thanh đầu trang dùng để xem bốn vai trò.

## Chạy backend trực tiếp để phát triển

Giữ database Docker đang chạy, sau đó:

```powershell
docker compose up -d db
cd backend
Copy-Item .env.example .env
npm install
npm run db:setup
npm run dev
```

## Tài khoản demo

Mật khẩu chung chỉ dành cho local: `ChessHub@123`.

- `admin@chesshub.vn`
- `teacher@chesshub.vn`
- `parent@chesshub.vn`
- `student@chesshub.vn`

Đăng nhập API:

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/auth/login `
  -ContentType 'application/json' `
  -Body '{"email":"student@chesshub.vn","password":"ChessHub@123"}'

$login.access_token
```

Để nút điểm danh trên frontend gọi API thật, lưu token vào trình duyệt bằng `localStorage.setItem('chesshub-token', '<token>')`. Ở production, màn hình đăng nhập sẽ thực hiện bước này và nên lưu token bằng cookie `HttpOnly` nếu triển khai dạng web.

## API chính

- `POST /api/v1/auth/login`
- `GET /api/v1/me`
- `GET /api/v1/students/:studentId/schedule?from=...&to=...`
- `POST /api/v1/sessions/:sessionId/check-in`
- `GET /api/v1/teacher/sessions?from=...&to=...`
- `PATCH /api/v1/teacher/sessions/:sessionId/content`
- `PUT /api/v1/teacher/sessions/:sessionId/attendance`
- `POST /api/v1/center/classes`
- `POST /api/v1/center/sessions`
- `PUT /api/v1/center/sessions/:sessionId`
- `GET /api/v1/center/calendar?from=...&to=...`

## Cấu trúc

```text
ChessHub/
├── index.html, styles.css, app.js   # frontend đa vai trò
├── docker-compose.yml               # PostgreSQL + PostGIS
└── backend/
    ├── migrations/                  # schema và dữ liệu demo
    ├── src/server.ts                # API, RBAC và truy vấn dữ liệu
    ├── src/geofence.ts              # luật điểm danh thuần, dễ kiểm thử
    └── src/geofence.test.ts         # kiểm tra biên 30 m
```
