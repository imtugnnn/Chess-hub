# Sửa lịch và gỡ học sinh khỏi lớp

- Trong tab **Buổi học**, chọn buổi và bấm **Sửa lịch**. Chỉ buổi chưa bắt đầu, chưa có điểm danh được đổi ngày/giờ. Bài giảng, giải đấu và ID buổi được giữ nguyên.
- **Đổi lịch hàng loạt** mở form lịch lặp trên đường dẫn quản lý lịch cũ. Chọn khoảng ngày, thứ và giờ; **Xem trước thay đổi** liệt kê buổi giữ nguyên, bỏ khỏi lịch và thêm mới. Xác nhận mới lưu.
- Buổi đã bắt đầu, có điểm danh, bài giảng, giải đấu hoặc được sửa riêng luôn được giữ. Lịch chồng giờ bị chặn; bản xem trước không còn khớp dữ liệu yêu cầu xem trước lại.
- Trong tab **Học sinh**, **Gỡ khỏi lớp** chỉ bỏ thành viên khỏi lớp hiện tại. Hồ sơ và các lớp khác không bị xóa. Điểm danh đã có vẫn hiển thị với nhãn **Đã rời lớp**, vẫn sửa được và được tính trong báo cáo tháng. Không tạo điểm danh mới cho người đã rời lớp.
- Ngày/giờ kiểm tra theo `Asia/Ho_Chi_Minh`; khoảng áp dụng tối đa 730 ngày và 500 buổi chưa bắt đầu.

## API

Các đường dẫn dưới đây có tiền tố `/api/v1/teachers/{teacherId}/classes/{classId}` và yêu cầu phiên của chủ lớp cùng CSRF cho thao tác ghi.

- `PATCH /sessions/{sessionId}`: `{date, startTime, endTime}`.
- `POST /schedule/preview`: `{mode: "RECURRING", startDate, endDate, weekdays, startTime, endTime}`; thứ dùng ISO 1–7. Trả `{kept, removed, added, token}`; mỗi buổi có ngày/giờ, ID nếu có và lý do.
- `PUT /schedule`: các trường trên kèm `previewToken` từ lần xem trước. Thay đổi trường nhập phải xem trước lại. `MANUAL` được giữ cho tương thích; không được bỏ buổi có dữ liệu hoặc đã sửa riêng.
- `DELETE /students/{studentId}`: trả `204`, chỉ gỡ quan hệ lớp–học sinh; gọi lại không làm mất dữ liệu.
- Dữ liệu điểm danh bổ sung `fullName`, `parentPhoneNumber`, `leftClass`. Báo cáo tháng bổ sung `leftClass` cho từng học sinh.

## Migration và kiểm thử

Flyway `V17__mark_session_schedule_overrides.sql` thêm cờ `schedule_override`, mặc định `false`. Cờ chỉ nhận diện các lần sửa riêng sau khi triển khai; những lần sửa cũ không có dấu vết được giữ theo dữ liệu liên quan hiện có.

Kiểm thử backend có các ca sửa lịch, token hết hiệu lực, giữ dữ liệu liên quan, báo cáo sau khi gỡ, thêm lại cùng hồ sơ, rollback và cạnh tranh giữa gỡ học sinh với ghi điểm danh. Kiểm thử transaction dùng H2 riêng trong bộ nhớ và tắt Flyway, không kết nối cơ sở dữ liệu người dùng. Migration cần chạy khi khởi động backend trên PostgreSQL.
