# Bài giảng

## Sử dụng

- Sidebar → **Quản lý bài giảng** → **Bài giảng của tôi**: thêm, tìm, sửa và xóa bài cá nhân.
- **Mặc định trung tâm**: thành viên được tìm và dùng bài; chỉ chủ trung tâm được tạo, sửa, xóa.
- Chi tiết lớp → chọn buổi → **Thêm bài giảng**: tìm bài có sẵn hoặc tạo bài mới. Bài tạo trực tiếp được lưu vào thư viện cá nhân và gắn vào buổi trong cùng transaction.
- **Gỡ khỏi tiết** chỉ xóa liên kết giữa buổi và bài, không xóa bài khỏi thư viện.

Không có trường scope và không có luồng duyệt. Bài được xác định bằng người dùng sở hữu hoặc trung tâm sở hữu; người tạo bài mặc định từ tab trung tâm phải là chủ trung tâm. Bài cá nhân của thành viên khác không xuất hiện trong tìm kiếm.

Tên bài giảng và mô tả không bắt buộc, có thể để trống hoặc bỏ qua trong API. Bài không có tên hiển thị tên tệp nếu có, nếu không hiển thị “Bài giảng chưa đặt tên”. Vẫn cần liên kết hoặc tệp nguồn.

## Nguồn tài liệu

- Liên kết HTTPS: Canva, Google Slides, Drive hoặc nguồn khác. Quyền mở nội dung do nguồn ngoài quyết định; ChessHub không tự đồng bộ nội dung hay cấp quyền ở nền tảng nguồn.
- Tệp PDF/PPT/PPTX, tối đa 20 MiB. Nginx cho phép request tới 21 MiB để chứa multipart overhead. Backend kiểm tra tên, dung lượng và dấu hiệu định dạng, không dùng MIME từ trình duyệt. Tệp được tải dưới dạng attachment, không thực thi hoặc render Office trên server. Kiểm tra định dạng không thay cho quét malware.
- Bản đầu lưu tệp bằng PostgreSQL BYTEA để dùng ngay với hạ tầng hiện tại và tồn tại qua restart/triển khai. Backup database bao gồm tệp; dung lượng và chi phí backup tăng theo thư viện. Khi lượng tài liệu tăng, chuyển file sang object storage, giữ metadata/API và liên kết buổi.

## Quyền và vòng đời

Các endpoint nằm dưới `/api/v1/teachers/{teacherId}` nên bộ bảo mật kiểm tra tài khoản đăng nhập khớp đường dẫn. Service tiếp tục kiểm tra quyền sở hữu bài, tư cách thành viên ACTIVE hoặc chủ trung tâm, và quyền sở hữu lớp/buổi. `canEdit` chỉ phục vụ giao diện; backend kiểm tra lại mọi mutation. Tải tệp cũng kiểm tra quyền, trả `Cache-Control: private, no-store`.

- Thành viên ngừng ACTIVE mất quyền đọc bài trung tâm, kể cả bài đã gắn vào buổi. Người đã tải bản sao vẫn giữ file trên thiết bị.
- Sửa một bài áp dụng cho mọi buổi đang dùng bài đó. Bản đầu chưa có phiên bản hoặc snapshot nội dung.
- Xóa bài khỏi thư viện dùng `deleted_at`: bài biến mất khỏi tìm kiếm và không thể gắn mới; các buổi đã dùng vẫn giữ tài liệu. Bài đã xóa chỉ tải được khi tài khoản còn quyền nguồn bài và có buổi của mình gắn bài đó.
- Sửa giờ giữ ID buổi và bài đã gắn. Khi lịch mới bỏ buổi có bài giảng, API trả 409: cần gắn bài sang buổi khác rồi gỡ bài ở buổi cũ trước khi tiếp tục. Các buổi không có bài có thể được xóa như trước.
- Xóa tài khoản/trung tâm là xóa vật lý; FK cascade dọn file và các liên kết thuộc dữ liệu bị xóa.

## API

- `GET /materials?query=...&library=all|mine|center`: tìm trên tên/mô tả, theo quyền hiện tại, tối đa 100 kết quả mới cập nhật. Wildcard `%`/`_` trong từ khóa được hiểu là ký tự thường.
- `POST /materials`: multipart gồm `title`, `description`, một trong `url`/`file`; `centerId` chỉ khi chủ trung tâm tạo bài mặc định.
- `PUT /materials/{id}`: multipart sửa thông tin, có thể thay nguồn. Không gửi nguồn mới thì giữ nguồn cũ. Không chuyển quyền sở hữu qua API sửa.
- `DELETE /materials/{id}`: xóa khỏi thư viện.
- `GET /materials/{id}/file`: PDF trả `application/pdf` và `Content-Disposition: inline` để nút “Xem PDF” mở trong tab mới; các định dạng khác trả `attachment` để nút “Tải tệp” tải xuống. Chrome cần bật “Open PDFs in Chrome” để xem trực tiếp.
- `GET /classes/{classId}/sessions/{sessionId}/materials`: bài của buổi.
- `POST /classes/{classId}/sessions/{sessionId}/materials/{materialId}`: gắn bài đã có, idempotent.
- `POST /classes/{classId}/sessions/{sessionId}/materials`: multipart tạo bài cá nhân và gắn vào buổi, atomic.
- `DELETE /classes/{classId}/sessions/{sessionId}/materials/{materialId}`: gỡ khỏi buổi.

Các đường dẫn trên có tiền tố `/api/v1/teachers/{teacherId}`. Migration: `V16__create_teaching_materials.sql`.

## Kiểm tra

- Backend: `mvn test` gồm kiểm tra quyền, nguồn file/link và giữ liên kết khi đổi giờ.
- Frontend: `npm run build`, `node --test src/components/*.test.js`.
- Local: đã chạy migration trên PostgreSQL 17 và kiểm tra bằng Chrome headless với các tài khoản thử riêng, sau đó xóa tài khoản thử. Các luồng đã kiểm tra: tạo bài từ giao diện, tìm bài trung tâm, chặn sửa/xóa không có quyền, gắn bài/tạo trực tiếp, upload/tải PDF, truy cập chéo tài khoản, xóa khỏi thư viện, giữ ID khi sửa giờ, chặn bỏ buổi có bài và giao diện desktop/mobile.
