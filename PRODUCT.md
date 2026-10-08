# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Chủ trung tâm và giáo viên cờ vua là hai nhóm người dùng ưu tiên, được người dùng xác nhận khi khởi tạo Impeccable. Giáo viên độc lập cũng có thể quản lý lớp riêng, theo nội dung hiện có tại `frontend/src/pages/LandingPage.jsx`.

## Product Purpose

ChessHub giúp quản lý hoạt động dạy học cờ vua: trung tâm, lớp học, học viên, lịch dạy, chuyên cần, tài liệu và giải đấu nội bộ. Đây là ứng dụng quản lý nghiệp vụ dạy học; không coi nền tảng chơi cờ trực tuyến là mục tiêu đã được xác nhận.

## Operating Context

Người dùng đăng nhập bằng email/mật khẩu hoặc Google. Giáo viên tạo và quản lý lớp, thiết lập buổi học, theo dõi lịch và điểm danh, sử dụng tài liệu và tổ chức giải đấu. Chủ trung tâm quản lý thành viên và lời mời giáo viên. Chi tiết quyền và dữ liệu phải tuân theo API hiện có.

Giao diện tiếng Việt, frontend React/Vite, backend Java 21/Spring Boot, database PostgreSQL/PostGIS. Dự án hỗ trợ phát triển cục bộ bằng Docker Compose hoặc chạy từng phần. Frontend đang hoạt động nằm trong `frontend/`, entry là `frontend/index.html` và `frontend/src/main.jsx`.

## Capabilities and Constraints

- Các route nghiệp vụ được định nghĩa trong `frontend/src/App.jsx`: lớp học, lịch, chuyên cần, cài đặt, trung tâm, tài liệu và giải đấu.
- Route nghiệp vụ yêu cầu phiên đăng nhập; tài khoản dùng mật khẩu tạm phải đổi mật khẩu trước khi tiếp tục.
- Backend quyết định phân quyền và điều kiện xóa dữ liệu; chỉnh UI phải giữ các ràng buộc đó.
- Phạm vi khởi tạo Impeccable là ghi nhận sản phẩm và kiểm tra UI hiện có. Việc thay đổi nhận diện hay thiết kế lại cần yêu cầu riêng.
- Chưa xác nhận tiêu chuẩn accessibility cụ thể, yêu cầu dark mode hoặc lợi thế cạnh tranh độc quyền. Không tự thêm các cam kết đó.

## Brand Commitments

Giữ tên ChessHub và ngôn ngữ tiếng Việt hiện có. Brand component hiện tại nằm tại `frontend/src/components/Brand.jsx`. Chưa có yêu cầu đổi thương hiệu.

## Evidence on Hand

- `README.md`: stack, vận hành local, đăng nhập, quản lý tài khoản và trung tâm.
- `frontend/src/App.jsx` và `frontend/src/pages/`: route và chức năng giao diện thực tế.
- `docs/class-schedule-and-student-history.md`, `docs/materials.md`, `docs/swiss.md`: tài liệu nghiệp vụ.
- `backend/src/main/`: triển khai API và ràng buộc nghiệp vụ.
- Người dùng xác nhận ưu tiên chủ trung tâm và giáo viên trong phiên khởi tạo ngày 2026-10-06.
- Chưa có xác nhận về số lượng khách hàng, hiệu quả định lượng, lời chứng thực hoặc giá bán; không tạo các claim này khi thiết kế.
