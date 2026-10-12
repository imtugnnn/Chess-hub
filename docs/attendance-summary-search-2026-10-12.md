# Tìm kiếm báo cáo chuyên cần — 2026-10-12

## Phạm vi

Tinh chỉnh `/attendance-summary` để kết quả tìm học sinh ưu tiên tên học sinh, sau đó lớp và các trường phụ; bổ sung tìm theo tên lớp và mặc định sắp xếp học phí cao nhất trước. Kế thừa nhận diện và thành phần hiện có trong `DESIGN.md`; không thay đổi hệ thống thiết kế chung hoặc sửa drift. `PRODUCT.md` và `DESIGN.md` được giữ nguyên.

Triển khai tại `frontend/src/pages/AttendanceSummaryPage.jsx`, `frontend/src/pages/attendanceSummary.css`; helper tại `frontend/src/components/attendanceReport.js`; backend tại `AttendanceSummaryController`.

## Hành vi cuối

- Chỉ hiển thị lớp có `sessionCount > 0` trong tháng được chọn. Backend lọc theo số buổi; frontend cũng kiểm tra điều kiện này cho danh sách, lựa chọn bộ lọc và tổng tiền. Lớp có buổi dự kiến trong tương lai của tháng vẫn được tính. Tháng không có buổi hiển thị trạng thái rỗng phù hợp.
- Danh sách học sinh là hợp của học sinh hiện tại và học sinh có lịch sử điểm danh trong tháng, gồm học sinh đã rời lớp hoặc chỉ có buổi vắng.
- Khi tìm học sinh, nhóm theo `studentId`, mỗi tên chỉ xuất hiện một lần; các lớp nằm bên dưới. Các cột gồm Họ tên/Lớp, Lượt đi học, Giá buổi học, Học phí và Tổng. Header học sinh hiển thị tổng học phí các lớp phù hợp bộ lọc trong tháng; mỗi dòng lớp hiển thị `feePerSession` và `tuitionAmount` riêng.
- Lượt đi học là `attendedDays / (attendedDays + absentSessions)`: PRESENT/LATE tính đi học, ABSENT tính vào mẫu số, chưa điểm danh không tính. Chưa có lượt đã đánh dấu hiển thị `0/0`; API cũ thiếu số buổi vắng hiển thị `N/—`, không tự suy ra mẫu số.
- Input tên lớp hỗ trợ tìm tiếng Việt không dấu. Từ khóa tên lớp kết hợp AND với dropdown lớp và từ khóa học sinh hiện có. Khi từ khóa học sinh trống, màn giữ tổng quan theo lớp.
- Mặc định học phí giảm dần: nhóm học sinh xếp theo tổng học phí, lớp trong nhóm xếp theo học phí; tổng quan lớp dùng tổng sau lọc. Danh sách trong drawer giữ cách sắp xếp tương ứng. Người dùng có thể chọn Tên A–Z.
- Phân trang giữ 6 nhóm học sinh trên desktop, 4 trên mobile, không chia một nhóm sang hai trang; thay đổi bộ lọc đưa về trang đầu. Giữ các trạng thái rỗng, lỗi và Thử lại.

Backend bổ sung `absentSessions` vào DTO học sinh và chỉ trả lớp có buổi trong tháng; không có migration. Giá buổi học vẫn là giá hiện tại của lớp; hạn chế chưa có snapshot giá lịch sử giữ nguyên. Tổng tiền không tạo thêm công thức hay giá lịch sử giả định. Không ghi dữ liệu thật trong lượt kiểm chứng này.

## Kiểm chứng và disposition

Theo evidence phiên triển khai mới nhất, frontend build và 30 test đạt; backend 122 test trên H2 đạt, không failure. Mock UI groups-review ở desktop 1440px/mobile 390px đạt: nhóm một học sinh, mẫu `8/8`, giá buổi `200.000`, học phí `1.600.000`, tổng nhóm `2.650.000`; danh sách/lựa chọn/bộ lọc lớp đủ điều kiện theo tháng; phân trang nguyên nhóm; zero/chưa điểm danh/vắng/học sinh đã rời lớp; lỗi, retry và không tràn trang. Unit test kiểm tra cả tên trùng với ID khác nhau. Các kết quả test do phiên triển khai cung cấp, không được người ghi tài liệu hoặc reviewer độc lập chạy lại.

Reviewer finish mới nhất kết luận **ship**, không có phát hiện trọng yếu trong phạm vi tinh chỉnh sau khi xem controller, helper, page, CSS và bốn ảnh capture. Đây là verdict theo source/screenshot; không xác nhận triển khai hoặc dữ liệu production.

Ảnh review đã được ghi đè theo triển khai mới nhất:

- [Tổng quan desktop](../.impeccable/review/attendance-summary/desktop.png)
- [Tổng quan mobile](../.impeccable/review/attendance-summary/mobile.png)
- [Tìm học sinh desktop](../.impeccable/review/attendance-summary/search-desktop.png)
- [Tìm học sinh mobile](../.impeccable/review/attendance-summary/search-mobile.png)

Tài liệu ghi nhận kết quả được cung cấp từ phiên triển khai và review; lượt cập nhật tài liệu không chạy thêm audit hoặc test. Chỉ sửa file này, không sửa `PRODUCT.md`, `DESIGN.md`, tài liệu khác hoặc code; không sửa drift và không kiểm chứng production.
