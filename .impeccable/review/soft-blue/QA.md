# Xanh dịu — kiểm tra 15/10/2026

Tham chiếu được người dùng chọn: `approved-concept.png`. Áp dụng bảng màu và phân cấp, giữ dữ liệu và chức năng thực tế.

- `npm run build`: đạt.
- `node tools/palette-review.cjs` với `PALETTE_REVIEW_URL=http://127.0.0.1:5176`: đạt.
- Màu computed của sidebar, nền trang, mục đang chọn và nút chính khớp token.
- Menu thu gọn, flyout sáng, menu mobile và FAQ: đạt.
- Không tràn ngang ở dashboard 1440/1024/390px và landing 1440/390px.
- Không có lỗi JavaScript trong các trang được kiểm tra.
- Xem ảnh desktop/mobile; chỉnh hero để không cắt bàn cờ và không ngắt tiêu đề thành ba dòng trên desktop. Lượt xác nhận cuối đạt.
- Các ảnh landing được chụp từ component thật với dữ liệu mẫu, không ghi backend.

Phạm vi: kiểm tra trực quan và tương tác liên quan đến bảng màu; không kiểm tra tích hợp backend.
