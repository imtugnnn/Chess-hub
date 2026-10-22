# Nhập học sinh

Chỉ họ tên và ngày sinh bắt buộc cho hồ sơ mới. Thông tin phụ huynh và các trường liên hệ/ghi chú là tùy chọn. Nếu có nhập số điện thoại, backend vẫn kiểm tra định dạng. Số điện thoại phụ huynh trống được chuẩn hóa thành chuỗi rỗng để tương thích cột NOT NULL hiện có; tên phụ huynh trống là null. Không cần migration.

`StudentEntryFields` dùng chung trong trang hồ sơ học sinh, form thêm vào lớp và bước nhập học sinh khi tạo lớp. Nhập từ hai ký tự để tìm hồ sơ theo API danh sách đã phân quyền. Có thể chọn bằng chuột hoặc phím mũi tên và Enter; không tự gộp chỉ vì tên trùng. Khi chọn hồ sơ, các thông tin được điền và chỉ đọc; đổi tên để bắt đầu hồ sơ mới.

- Thêm vào lớp: chọn gợi ý thì dùng API thêm hồ sơ theo ID; nhập mới thì backend tạo hồ sơ và ghi danh trong cùng giao dịch.
- Tạo lớp: xác nhận học sinh thu gọn thành mục trong danh sách chờ; bấm Tạo lớp mới ghi hồ sơ/lớp. Payload có `studentId` cho hồ sơ đã chọn. Backend kiểm tra quyền trước khi sử dụng ID, không cập nhật hồ sơ cũ bằng dữ liệu nhập kèm.
- Trang tạo hồ sơ: chọn hồ sơ có sẵn chuyển nút thành Mở hồ sơ để tránh tạo bản sao.

Enter kiểm tra trường hiện tại rồi chuyển focus xuống trường dưới; Enter ở ghi chú chọn nút xác nhận, Enter lần nữa mới xác nhận. Shift+Enter xuống dòng ghi chú, Enter trong IME không bị can thiệp. Trường tùy chọn có thể bỏ qua bằng Enter. Khi thêm vào lớp thành công, form được xóa và trả focus về tên để nhập tiếp.

Các form trong `frontend/src` không còn thuộc tính placeholder. Input date/time vẫn có định dạng gợi ý gốc của trình duyệt.

Kiểm tra: `npm test` (40 test); Maven chọn `StudentManagementServiceTest,StudentControllerTest,ClassHistoryTransactionTest` (26 test); `node tools/student-entry-review.cjs` kiểm tra dữ liệu giả, keyboard, gợi ý/tái sử dụng ID và không tràn ngang mobile. Không ghi dữ liệu thật. Đặt `STUDENT_ENTRY_REVIEW_URL` nếu Vite không dùng cổng 5177.
