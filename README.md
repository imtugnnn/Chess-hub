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

Các migration cũ trong `src/main/resources/db/migration/` không còn được Spring Boot chạy. Hibernate sẽ tạo/cập nhật bảng của các entity mới khi API khởi động.

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

## API chính

- `GET /health`
- `GET /api/v1/users`

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
