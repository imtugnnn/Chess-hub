# Chuẩn giao diện và màn trung tâm — 12/10/2026

Mode của `/center`: Operate. Người dùng ưu tiên: chủ trung tâm quản lý giáo viên, giáo viên xem thành viên và xử lý lời mời nhận được.

## Thay đổi

- Ghi chuẩn thiết kế vào `agent/DESIGN.md`; nạp `design-system.css` tại entry chính để thống nhất token, tiêu đề trang, panel, button, input và focus.
- Bỏ tab Thành viên/Lời mời; đưa thông tin trung tâm, tìm kiếm, thành viên, lời mời đang chờ và biểu mẫu mời giáo viên về cùng màn.
- Danh sách bên trái, biểu mẫu bên phải trên desktop; mobile chuyển về một cột theo thứ tự nội dung.
- Xem lớp ngay trong trang; giữ xác nhận xóa và nội dung giải thích hậu quả. Giữ API và quyền hiện có.
- Có trạng thái tải, lỗi kèm thử lại, tìm kiếm không có kết quả và danh sách lời mời rỗng.

## Kiểm tra

- `npm run build`: đạt.
- `npm test`: 19/19 đạt.
- `frontend/tools/center-review.cjs`: kiểm tra bằng Playwright/Edge headless với toàn bộ API được mô phỏng. Đạt tìm kiếm tên/email, không có kết quả, avatar, xem/đóng lớp, gửi lời mời, hủy/xác nhận xóa, quyền giáo viên, người chưa có trung tâm, lỗi/thử lại và trang tổng quan.
- Desktop 1440px và mobile 390px: đã xem ảnh, sửa avatar và icon tìm kiếm; không tràn ngang mobile, không có lỗi JavaScript.
- Ảnh `center-desktop.png`, `center-mobile.png` và `center-before.png` dùng dữ liệu mẫu. Chưa kiểm tra việc giao email hoặc ghi dữ liệu backend thật.

## Chạy lại kiểm tra cục bộ

Script review dùng gói Playwright trong runtime Codex của máy hiện tại và Edge đã cài. Chạy Vite trên cổng 5174, sau đó trong `frontend/` chạy `node tools/center-review.cjs`. Thêm `--no-capture` để chỉ kiểm tra chức năng. Script không đăng nhập hoặc thao tác với tài khoản thật.

Landing và đăng ký đang có thay đổi từ trước phiên này; không sửa các file đó trong lần thiết kế này.
