# Quy tắc dành cho agent

## Nơi lưu tài liệu và dữ liệu do AI tạo

- Chỉ dùng một thư mục gốc `agent/` để lưu thông tin phục vụ agent: kế hoạch, ghi chú triển khai, audit/review, ngữ cảnh sản phẩm/thiết kế, log, kết quả kiểm tra, ảnh QA, nguồn sơ đồ và dữ liệu tạm của công cụ. Mọi thư mục tài liệu riêng của agent phải nằm bên trong `agent/`.
- Đọc `agent/PRODUCT.md` và `agent/DESIGN.md` khi cần ngữ cảnh sản phẩm hoặc giao diện. Dữ liệu Impeccable nằm trong `agent/.impeccable/`, báo cáo trong `agent/impeccable/`, sơ đồ và dữ liệu tạo sơ đồ trong `agent/design/`, ghi chú trong `agent/notes/`.
- Không tạo lại `.impeccable/`, `DESIGN.md`, `PRODUCT.md` ở gốc hay các thư mục công cụ như `docs/impeccable/`, `docs/design/`. Nếu skill/công cụ mặc định ghi vào các vị trí đó, cấu hình hoặc sửa đường dẫn đầu ra sang `agent/` trước khi chạy.
- `docs/` chỉ dành cho tài liệu dự án được bàn giao cho người đọc, kể cả khi AI được yêu cầu soạn chúng. Chỉ có ba thư mục con: `docs/word/` chứa `.doc`, `.docx`; `docs/md/` chứa `.md`; `docs/images/` chứa ảnh (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.avif`, `.bmp`, `.tif`, `.tiff`, `.ico`). Không đặt file trực tiếp trong `docs/`; không đưa JSON, HTML, script, log hoặc báo cáo nội bộ của agent vào đó.
- Ảnh chụp kiểm tra mới phải lưu trong `agent/`; chỉ đưa ảnh dùng trong tài liệu bàn giao vào `docs/images/`.
- Khi di chuyển file, giữ nguyên dữ liệu và cập nhật liên kết, đường dẫn trong script, cấu hình và quy tắc ignore liên quan. Không ghi đè file đã tồn tại ở đích.
- `AGENTS.md` ở gốc là điểm vào để agent tự tìm thấy quy tắc này; `README.md` ở gốc là tài liệu giới thiệu dự án. Mã nguồn ứng dụng, test, tài nguyên chạy ứng dụng và cấu hình bắt buộc vẫn ở vị trí chức năng của chúng; quy tắc này áp dụng cho tài liệu/dữ liệu phụ trợ của AI.
