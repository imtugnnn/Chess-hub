# Rà soát và chỉnh luồng landing page

## Nhận xét

Luồng cũ trình bày cùng thông tin ba lần: hàng nút lớn, dòng Bước và bộ đếm. Phần khung màu kem ở hero và vùng nền dư quanh ảnh khiến ảnh bị tách khỏi tổng thể. Các chú thích và link mở PNG chiếm thêm chỗ trong khi mục tiêu chính là hiểu cách dùng và tạo tài khoản.

## Đã sửa

- Thay hàng sáu nút lớn bằng thanh nối sáu chấm; mỗi chấm có vùng bấm 44×44px, tên truy cập rõ ràng, trạng thái được chọn và hỗ trợ phím trái/phải/Home/End.
- Bỏ nhãn Bước và bộ đếm; giữ tên thao tác đang xem bên cạnh bộ điều khiển trước/tạm dừng/tiếp theo.
- Tự chuyển ảnh sau 6 giây, quay vòng từ Swiss về tài khoản. Chọn ảnh thủ công dừng tự chuyển để người xem đọc; có thể bật lại bằng nút Play.
- Dừng timer khi phần luồng ra ngoài viewport, tab ẩn, hover hoặc focus trong nội dung. Không tự chuyển khi người dùng bật giảm chuyển động. Thu hồi timer/listener/observer khi unmount.
- Bỏ khung kem, viền, góc xoay, nền letterbox và giới hạn tỷ lệ ảnh gây khoảng trống dư. Giữ nguyên nội dung và màu của screenshot sản phẩm thật.
- Xóa các chú thích được yêu cầu và mọi link mở ảnh ở hero/walkthrough. Hero chỉ còn ảnh không có thao tác mở to.
- Mobile hiển thị trọn ảnh thay cho khung ảnh 720px bị cắt và phải vuốt ngang.

## Những điểm nên cân nhắc tiếp

1. Ảnh toàn màn hình trên điện thoại vẫn khó đọc chi tiết. Chụp ảnh thật theo vùng thao tác hoặc viewport mobile sẽ rõ hơn.
2. Header mobile đang ẩn Cách hoạt động/Câu hỏi; nên có menu gọn để truy cập nhanh.
3. Tiêu đề và CTA hiện rõ; giữ bảng màu navy/vàng và tránh thêm nhãn trang trí hoặc lời chứng thực chưa có bằng chứng.

## Xác minh

- Build thành công; 19/19 tests hiện có đạt; git diff --check đạt.
- Browser: desktop và 375px không tràn ngang; sáu vùng bấm 44×44px; chọn Tạo lớp cập nhật ảnh/nội dung; phím ArrowRight chuyển sang Thêm học sinh và đưa focus đúng nút.
- Autoplay thực tế chuyển từ Tạo lớp sang các ảnh sau khi bật lại; chọn thủ công đổi trạng thái về tạm dừng.
- DOM không còn figcaption hoặc link tới /images/landing/.
- Kiểm tra mã cho tab visibility, intersection và reduced-motion; chưa mô phỏng tùy chọn giảm chuyển động của hệ điều hành.
- Review theo brief cụ thể bằng source và browser, không phải báo cáo critique hai agent. Engine context của impeccable không có sẵn và không ghi được cache; dùng agent/PRODUCT.md, CSS/component hiện có, ảnh người dùng và hướng dẫn craft-floor/animate. Không chạy detector/overlay của engine.
