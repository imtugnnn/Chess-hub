# ChessHub

Codebase mới cho ứng dụng quản lý trung tâm cờ vua. Frontend React và backend Spring Boot được dựng dưới dạng skeleton sạch; các migration SQL cũ được lưu lại để tham chiếu nhưng không còn được chạy.

## Tech stack

- Frontend: React + Vite, tách component, page, service và hook.
- Backend: Java 21 / Spring Boot 3 theo các tầng controller, service, repository / Spring Data JPA (Hibernate).
- Database: PostgreSQL 17 + PostGIS 3.5.
- Kiến trúc: modular monolith, tách rõ controller → service → repository.

PostGIS, ràng buộc lịch giáo viên và dữ liệu mẫu vẫn được định nghĩa trong migration SQL. API nghiệp vụ sẽ được xây lại dần trên cấu trúc mới.

## Phạm vi skeleton hiện tại

- React homepage gọi health check của API qua một custom hook.
- Spring Boot có health check và API đọc danh sách người dùng mẫu qua JPA/Hibernate.
- Hibernate tự đồng bộ các entity mới với database (`ddl-auto=update`).

## Chạy toàn bộ bằng Docker

Docker chạy ba container: `web` (React), `api` (Spring Boot) và `db` (PostgreSQL/PostGIS). Máy chỉ cần cài Java 21 và Node.js khi chạy từng phần ngoài Docker, hoặc chỉ cần mở Docker Desktop khi chạy toàn bộ hệ thống.

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

Flyway chạy các migration trong `backend/src/main/resources/db/migration/` khi API khởi động. Hibernate tiếp tục đồng bộ các entity qua `ddl-auto=update`.

## Chạy backend trực tiếp để phát triển

Giữ database Docker đang chạy, sau đó:

```powershell
docker compose up -d db
cd backend
mvn spring-boot:run
```

Chạy frontend React ngoài Docker ở một terminal khác:

```powershell
cd frontend
npm install
npm run dev
```

### Đăng nhập bằng Google (OAuth 2.0)

Trong [Google Auth Platform → Clients](https://console.cloud.google.com/auth/clients), tạo hoặc chọn dự án, hoàn tất thông tin ứng dụng nếu được yêu cầu, rồi chọn **Create client → Web application**. Thêm **Authorized redirect URI** chính xác là `http://localhost:3000/login/oauth2/code/google`. Sao lưu **Client ID** và **Client Secret** khi tạo client; Google có thể chỉ hiển thị secret lúc này. Nếu ứng dụng đang ở chế độ **Testing**, thêm tài khoản Gmail cần thử vào **Audience → Test users**.

Cấu hình hai biến môi trường sau trước khi chạy API hoặc `docker compose up`:

```powershell
$env:GOOGLE_OAUTH_CLIENT_ID = "<client-id>"
$env:GOOGLE_OAUTH_CLIENT_SECRET = "<client-secret>"
```

Nếu dùng Docker Compose thường xuyên, có thể tạo file `.env` tại thư mục gốc với hai dòng `GOOGLE_OAUTH_CLIENT_ID=<client-id>` và `GOOGLE_OAUTH_CLIENT_SECRET=<client-secret>`. File `.env` đã được thêm vào `.gitignore`; không đưa secret vào mã nguồn hoặc gửi công khai.

Sau khi cấu hình, chạy `docker compose up -d --force-recreate api` để API nhận biến môi trường mới. Nút **Đăng nhập bằng Google** luôn hiển thị tại `http://localhost:4173/login` và chỉ bật khi API đã được cấu hình. Google phải trả về email đã xác minh. Nếu email trùng tài khoản hiện có, tài khoản đó được liên kết với Google và giữ nguyên dữ liệu; tài khoản mới dùng Google sẽ không có mật khẩu. Khi triển khai ở tên miền khác, đăng ký redirect URI tương ứng với API (`https://<api-domain>/login/oauth2/code/google`), đặt `CORS_ORIGIN` bằng origin của frontend và bật `SESSION_COOKIE_SECURE=true` trên HTTPS.

## API chính

- `GET /health`
- `GET /api/v1/users`
- `GET /api/v1/users/{userId}/deletion-eligibility`
- `DELETE /api/v1/users/{userId}` — chỉ xóa cứng tài khoản không còn lớp học, học viên riêng, trung tâm sở hữu hoặc lời mời trung tâm đã tạo.

## Dọn dẹp dữ liệu

Người dùng có thể vào **Cài đặt → Tài khoản & dữ liệu** để kiểm tra trước khi xóa vĩnh viễn tài khoản rỗng. Các tài khoản còn dữ liệu nghiệp vụ sẽ bị chặn để tránh mất lịch sử lớp học, học viên và trung tâm.

Sau một đợt xóa số lượng lớn, PostgreSQL sẽ tự thu hồi vùng trống qua autovacuum. Nếu cần cập nhật thống kê ngay, quản trị viên có thể chạy lệnh bảo trì không phá hủy dữ liệu sau (không chạy `VACUUM FULL` trong giờ hoạt động):

```powershell
docker compose exec db psql -U chesshub -d chesshub -c "VACUUM (ANALYZE) users;"
```

## Cấu trúc

```text
ChessHub/
├── docker-compose.yml
└── backend/
    ├── pom.xml                       # Maven/Spring Boot dependencies
    └── src/main/
        ├── java/vn/chesshub/
        │   ├── controller/            # HTTP API
        │   ├── service/               # nghiệp vụ
        │   ├── repository/            # truy cập dữ liệu JPA
        │   └── entity/                # Hibernate entities
        └── resources/db/migration/   # Flyway schema và dữ liệu demo
└── frontend/
    └── src/
        ├── components/
        ├── pages/
        ├── services/
        └── hooks/
```
