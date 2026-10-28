# Quy tắc dành cho agent

Đọc và tuân thủ [agent/AGENTS.md](agent/AGENTS.md) trước khi làm việc trong repository.

Chỉ tạo hoặc chỉnh sửa tài liệu, cấu hình, skill và dữ liệu phụ trợ AI trong `agent/`. Không tạo lại các thư mục AI ở gốc. Mã nguồn ứng dụng và tài liệu bàn giao vẫn ở vị trí chức năng được quy định trong file trên.

`AGENTS.md` này là điểm vào được giữ trong Git. Quy tắc chi tiết và workspace AI nằm trong `agent/`, được bỏ qua bởi Git và Docker. Nếu chưa có `agent/AGENTS.md` sau khi clone, áp dụng quy tắc trong đoạn trên và chỉ tạo ngữ cảnh AI mới bên trong `agent/`.