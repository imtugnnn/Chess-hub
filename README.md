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
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

Chỉ cần copy `.env.example` khi chưa có `.env`. File mẫu được lưu trong Git để người khác có thể cấu hình sau khi clone; `.env` riêng của mỗi máy được bỏ qua bởi Git. Cấu hình mặc định đủ để chạy local. Hai biến `GOOGLE_OAUTH_CLIENT_ID` và `GOOGLE_OAUTH_CLIENT_SECRET` có thể để trống nếu chưa dùng đăng nhập Google. `JWT_SECRET` mẫu chỉ dành cho local; khi triển khai, thay bằng giá trị bí mật riêng.

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

### Mời giáo viên vào trung tâm và xem lớp

Chủ trung tâm nhập email để mời. Email đã có tài khoản nhận lời mời trong ứng dụng như trước; không thay đổi mật khẩu của tài khoản đó. Email chưa có tài khoản được tạo tài khoản với mật khẩu tạm ngẫu nhiên, lưu bằng BCrypt và gửi thông tin đăng nhập qua Gmail API. Sau khi đăng nhập bằng mật khẩu tạm, người dùng phải tạo mật khẩu khác (ít nhất 8 ký tự, tối đa 72 byte UTF-8) trước khi gọi các API nghiệp vụ. Sau đó người dùng chấp nhận hoặc từ chối lời mời tại trang Trung tâm. Chức năng ghi nhớ 30 ngày chỉ được cấp sau khi hoàn tất tạo mật khẩu mới.

Chủ trung tâm có nút **Xem lớp học** cạnh từng thành viên đang hoạt động: tên lớp, lịch học và số học sinh. Đây là danh sách lớp của thành viên, bao gồm lớp có trước khi gia nhập; không cấp quyền sửa lớp. Backend kiểm tra quyền chủ trung tâm và tư cách thành viên trên mỗi yêu cầu.

Email sử dụng OAuth của tài khoản Gmail gửi thư. Cấu hình trên backend/Cloud Run (local Docker Compose đọc từ `.env`):

```env
GMAIL_OAUTH_CLIENT_ID=<OAuth client ID của tài khoản gửi>
GMAIL_OAUTH_CLIENT_SECRET=<OAuth client secret>
GMAIL_OAUTH_REFRESH_TOKEN=<refresh token có quyền gmail.send>
INVITATION_MAIL_FROM=<email của tài khoản gửi hoặc alias đã được Gmail cho phép>
```

Không cần thay scope đăng nhập Google của người dùng. Để lấy refresh token gửi mail:

1. Bật Gmail API trong project của OAuth client gửi thư.
2. Thêm scope `https://www.googleapis.com/auth/gmail.send` trong Google Auth Platform → Data Access.
3. Thêm `https://developers.google.com/oauthplayground` vào Authorized redirect URIs của client gửi thư.
4. Mở [OAuth Playground](https://developers.google.com/oauthplayground/), chọn Settings → Use your own OAuth credentials, nhập client ID/secret của bạn. Chọn quyền `gmail.send`, quyền truy cập Offline, rồi Authorize bằng tài khoản gửi thư.
5. Exchange authorization code for tokens, lưu refresh token vào `GMAIL_OAUTH_REFRESH_TOKEN` bằng Cloud Run Secret Manager. Nếu app External còn ở Testing, refresh token dùng scope Gmail có thể hết hạn sau 7 ngày; chuẩn bị trạng thái Production phù hợp trước khi chạy gửi thư lâu dài.

Nếu chưa cấu hình gửi mail hoặc Gmail trả lỗi, request mời người mới thất bại và transaction tạo tài khoản/lời mời được rollback; mời tài khoản hiện có vẫn hoạt động. Không ghi mật khẩu tạm/token vào log hay trả về API. Email được gửi đồng bộ trong transaction; Gmail và database không có transaction chung, nên khi Gmail nhận thư nhưng database commit thất bại, cần gửi lời mời lại. Migration `V11__require_initial_password_change.sql` bổ sung trạng thái bắt buộc đổi mật khẩu. Kiểm thử Gmail dùng HTTP mock, chưa gửi thư thật hoặc chạy migration production.

Tham khảo [Gmail API gửi thư](https://developers.google.com/workspace/gmail/api/guides/sending) và [OAuth refresh token](https://developers.google.com/identity/protocols/oauth2).

### Google OAuth trên Cloud Run

Backend hỗ trợ biến `GOOGLE_OAUTH_REDIRECT_URI` để cố định callback công khai, tránh dùng địa chỉ nội bộ của reverse proxy. Với frontend Cloud Run hiện tại, đặt:

```env
GOOGLE_OAUTH_REDIRECT_URI=https://chesshub-web-881466446251.asia-southeast1.run.app/login/oauth2/code/google
```

Đăng ký chính xác URL này trong **Authorized redirect URIs** của OAuth client có Client ID đang dùng trên backend. Build và deploy image backend có cấu hình này trước khi sử dụng biến mới. Nếu không đặt biến, backend tiếp tục dùng callback mặc định theo URL của request để hỗ trợ local.

### Ghi nhớ đăng nhập bằng mật khẩu

Trang đăng nhập mặc định chọn **Ghi nhớ đăng nhập 30 ngày**. API `POST /api/v1/auth/login` nhận thêm `rememberMe` (boolean); bỏ chọn hoặc không gửi trường này chỉ tạo session thông thường với thời gian không hoạt động tối đa 8 giờ.

Khi chọn ghi nhớ, backend cấp token ngẫu nhiên 256 bit trong cookie `CHESSHUB_REMEMBER` có `HttpOnly`, `SameSite=Lax`, thời hạn 30 ngày và chỉ lưu SHA-256 của token trong database. Token hết hạn sau 30 ngày kể từ lần đăng nhập bằng mật khẩu; việc khôi phục session không gia hạn token. Khi session mất hoặc backend restart, request tiếp theo dùng token hợp lệ để tạo session mới. Đăng xuất thu hồi token của trình duyệt hiện tại và xóa cookie. Token của tài khoản bị xóa được xóa theo khóa ngoại.

Triển khai cả frontend và backend, để Flyway chạy migration `V10__create_remember_login_tokens.sql`, và đặt `SESSION_COOKIE_SECURE=true` trên HTTPS. Người đang đăng nhập cần đăng nhập lại một lần với lựa chọn ghi nhớ để nhận cookie mới. Kiểm thử backend dùng MockMvc và JDBC mock; migration chưa được kiểm tra trên database production.
