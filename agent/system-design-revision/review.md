# Rà soát bản sửa System Design

## Giá trị

Sơ đồ cũ gộp Spring Boot vào một khối nên chưa giải thích đường gọi nội bộ. Bản mới thể hiện ranh giới trình duyệt, proxy, backend và dữ liệu; trong backend tách presentation, application/domain và persistence/integration. Người đọc có thể phân biệt kiểm soát phiên với quyền đối tượng, JPA với JDBC, và phân tích Stockfish phía client với Swiss phía server.

## Chi phí

Thay đổi giới hạn ở tài liệu và vector/ảnh minh họa. Nội dung nghiệp vụ hiện có được ánh xạ vào 12 mục của mẫu System Design, giữ 18 bảng và 119 cột. Calibri được áp dụng cho body, styles, theme, header/footer và chữ trong hình. Template tham chiếu không bị thay đổi. Word được dùng để cập nhật trường và kiểm tra phân trang; nguồn tạo ảnh và bằng chứng ở cùng thư mục này.

## Ảnh hưởng

Sơ đồ thể hiện đúng nhánh một số controller gọi repository trực tiếp, service dùng JDBC, HttpSession/CSRF, Google OAuth có điều kiện và Gmail adapter. Không đưa CQRS, MediatR, Swagger, SQL Server hoặc thanh toán từ ảnh mẫu vào ChessHub khi chưa có mã triển khai tương ứng. Các khối mô tả trách nhiệm trong monolith, không phải các dịch vụ triển khai độc lập.

## Bằng chứng và kiểm tra

- Revision mã nguồn: `b7fab523739b79af2e26fba0e92e533fa7cd3b6e`.
- Nguồn liên quan được ghi tại `architecture-evidence.json`.
- Bản Word cuối có 32 trang; đã kiểm tra toàn bộ ảnh trang, mục lục 63 đích, liên kết hình và font Calibri.
- So sánh bản kết xuất cuối với bản đã đọc: chỉ trang 10 đổi raster sau chuẩn hóa Word; trang đó đã được đọc lại.
- Không thay đổi mã ứng dụng hoặc chạy lại application tests cho thay đổi tài liệu này.

Quyết định: sửa tài liệu và hình theo yêu cầu là cần thiết, chi phí bảo trì được giữ trong nguồn tài liệu/ảnh; các câu hỏi sản phẩm còn mở được giữ tại mục 11 của báo cáo.
