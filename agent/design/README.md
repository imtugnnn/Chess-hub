# Sơ đồ thiết kế ChessHub

Báo cáo chính: [bản Markdown](../../docs/md/design.md) và [bản Word](../../docs/word/ChessHub_Software_Design_Specification.docx).

Phiên bản System Design 1.1 sử dụng [sơ đồ kiến trúc chi tiết theo tầng](../../docs/images/chesshub-software-architecture.svg). Các ảnh Calibri được bàn giao trong `docs/images/chesshub-*`; sơ đồ HTML dưới đây giữ bản tương tác trước đó để tra cứu.

| Sơ đồ | Nội dung |
| --- | --- |
| [Kiến trúc triển khai](architecture.html) | React, Nginx, Spring Boot, PostgreSQL, Stockfish và các tích hợp Google |
| [Phụ thuộc package](packages.html) | Frontend và các package Java |
| [Thiết kế lớp](classes.html) | Các lớp tham gia quản lý lịch học |
| [Trình tự đổi lịch](schedule-sequence.html) | Xem trước và áp dụng lịch lặp |
| [ERD đầy đủ](database.html) | 18 bảng, 119 cột và các quan hệ từ SQL/JPA |

Mở tệp HTML bằng trình duyệt để đọc, phóng to và tra nguồn. Nội dung sơ đồ bằng tiếng Việt; nút điều khiển của trình xem dùng tiếng Anh. ERD có nhiều quan hệ giữa các nhóm nên nên dùng chức năng focus khi đọc từng bảng.

Các tệp JSON cùng tên giữ nguồn sơ đồ; PNG/SVG là ảnh xuất để sử dụng trong tài liệu. [Từ điển dữ liệu](data-dictionary.json) ghi kiểu SQL gốc, nullability, vai trò khóa, ràng buộc và nguồn. Bảng nối `chess_class_students` và liên kết `class_sessions.class_id` có bằng chứng từ JPA; báo cáo phân biệt rõ với ràng buộc khai báo trong Flyway.

Nguồn mã được chốt tại `b7fab523739b79af2e26fba0e92e533fa7cd3b6e`. Cả năm sơ đồ đã qua các bước validate, deliver, provenance check và browser check của Archify. Bằng chứng ERD hiện hành nằm trong `review-6/`; các sơ đồ còn lại có receipt cùng tên ngay tại thư mục này.
