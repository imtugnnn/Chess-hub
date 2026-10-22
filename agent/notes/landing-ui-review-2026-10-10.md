# Landing UI review — 10/10/2026

## Thay đổi đã thực hiện

- Cuộn mượt cho liên kết Cách hoạt động, Câu hỏi, Xem cách hoạt động và Về đầu trang, giữ hash và lịch sử điều hướng native.
- Phạm vi CSS gắn theo lifecycle landing page, không áp dụng cho trang đăng nhập hay các màn quản lý.
- Cuộn ngang mượt để đưa bước đang chọn vào vùng nhìn thấy. Di chuyển focus bằng bàn phím không kéo cả trang theo.
- Khi người dùng bật prefers-reduced-motion, cuộn trực tiếp và tắt chuyển động.

## Đánh giá

Điểm tốt: CTA rõ, màu navy/vàng nhất quán, hình giao diện thật giúp hiểu sản phẩm; luồng vận hành có thứ tự hợp lý và giải Swiss được ghi là hoạt động mở rộng. FAQ giải thích đúng đối tượng và cách tính học phí.

| Ưu tiên | Loại | Vấn đề và bằng chứng | Đề xuất |
| --- | --- | --- | --- |
| P1 | Hỏng | Số bước chưa chọn 11px có tương phản 3.22:1; phần /06 13px chỉ 2.70:1. Đo màu computed trên nền #f4f7fa. | Dùng màu chữ tối hơn từ bảng màu hiện có, đạt 4.5:1 cho chữ nhỏ. |
| P1 | Hỏng | Menu desktop có chiều cao vùng bấm khoảng 16px ở viewport 977px; chữ menu có tương phản khoảng 4.36:1. | Tăng padding để vùng bấm đạt ít nhất 24px, ưu tiên 44px; làm tối màu chữ. |
| P2 | Gu/UX | Ở 375px, hai link Cách hoạt động/Câu hỏi bị ẩn khỏi header; chỉ còn đăng nhập và bắt đầu. | Thêm menu gọn hoặc hàng điều hướng phụ để người xem tới FAQ nhanh. |
| P2 | Gu/UX | Ảnh walkthrough trên mobile vẫn rộng 720px, cao 570px và cần vuốt ngang; ảnh dashboard ở hero khó đọc chữ khi thu nhỏ. | Chụp giao diện thật riêng theo vùng tác vụ hoặc viewport mobile; tập trung vào thao tác chính của từng bước. |
| P2 | Gu/UX | Chú thích/nhãn phụ ở mức 9–11px; ảnh lớn mở PNG trong tab khác. | Tăng nhãn cần đọc lên 12–13px; cân nhắc lightbox có zoom, đóng bằng Escape và quản lý focus. |
| P2 | Hỏng — cần xác minh thêm | Reload trực tiếp URL có hash có lúc về hero trước khi React tạo phần tử đích. | Xử lý hash ban đầu sau khi landing mount và kiểm tra Back/Forward để deep link ổn định. |

Các đề xuất ngoài hiệu ứng cuộn chưa áp dụng trong lần sửa này.

## Kiểm tra

- Browser thực tế ở 977px và 375px: không tràn ngang toàn trang; chọn bước Swiss cập nhật nội dung và thanh bước di chuyển ngang.
- Cách hoạt động: vị trí cuộn từ 6px ngay sau bấm đến 632px khi kết thúc; tiêu đề cách mép trên 24px. Về đầu trang: từ 1670px đến 0px. Câu hỏi cuộn tới phần FAQ; ở viewport cao, vị trí bị giới hạn bởi cuối tài liệu như hành vi native.
- Trang /login: root không còn class chesshub-landing, scroll-behavior là auto.
- Giảm chuyển động: xác minh nhánh CSS và JS; chưa mô phỏng tùy chọn hệ điều hành trong browser.
- npm run build: pass. npm test: 19/19 pass. git diff --check: pass.
- Audit bằng DOM/computed style và screenshot qua cua; không chạy probe Playwright riêng của skill vì phiên này yêu cầu điều khiển browser qua cua.
