# ChessHub — chuẩn giao diện dùng chung

## Hướng thiết kế

Giao diện quản trị nhẹ, rõ ràng, ưu tiên thao tác của chủ trung tâm và giáo viên. Giữ nhận diện ChessHub: navy, vàng ở logo, nền sáng và font tiếng Việt tự host. Các trang giới thiệu có thể dùng hình ảnh và font display; màn nghiệp vụ dùng cùng hệ thống điều hướng, typography và control.

Nguồn chuẩn: `frontend/src/design-system.css`, nạp sau stylesheet hiện có. CSS từng route quyết định bố cục và thành phần đặc thù, dùng token chung thay cho mã màu riêng.

## Token

| Vai trò | Token / giá trị |
| --- | --- |
| Thao tác chính, lựa chọn, focus | `--ui-navy`: `#234b87` |
| Nội dung chính | `--ui-text`: `#27354a` |
| Nội dung phụ và placeholder | `--ui-muted`: `#52647c` |
| Nền trang | `--ui-soft`: `#f0f4f9` |
| Panel | `--workspace-surface`: `#ffffff` |
| Viền | `--ui-border`: `#dce3ec` |
| Thành công | `--workspace-success`: `#25735a` |
| Nguy hiểm | `--workspace-danger`: `#a13f4b` |
| Đang chờ / cảnh báo | `--workspace-warning`: `#87491b` |
| Bo panel / control | `12px` / `8px` |

## Typography và khoảng cách

- Be Vietnam Pro cho tiêu đề, nội dung, bảng và control nghiệp vụ. Playfair Display dành cho logo và phần giới thiệu.
- Tiêu đề trang 28px, mobile 24px; tiêu đề nhóm 18–20px; nội dung 14px; metadata 12–13px. Line-height nội dung 1.6–1.7.
- Nhịp khoảng cách 4, 8, 12, 16, 20, 24, 32, 48px. Panel padding 24px, mobile 20px; nhóm chức năng cách nhau 24px.
- Header gồm tiêu đề, mô tả ngắn và thao tác liên quan. Không đặt header trong thẻ trang trí riêng.

## Thành phần

- Sidebar navy dùng chung, thu gọn bằng menu trên mobile.
- Panel trắng, viền 1px, không bóng trang trí. Tránh panel lồng panel.
- Primary button cho hành động chính; secondary có viền trung tính; xóa dùng đỏ và giữ xác nhận khi ảnh hưởng quyền hoặc dữ liệu.
- Input có nhãn hiện rõ, bo 8px, chữ 14px. Control chính cao tối thiểu 44px; thao tác phụ trong danh sách tối thiểu 40px.
- Danh sách tách bằng viền mảnh; tên, email và vai trò theo cùng thứ tự. Trạng thái luôn có chữ, không chỉ dùng màu.
- Focus có outline rõ; lỗi dùng `role="alert"`, thành công dùng `role="status"`; tôn trọng reduced motion.
- Loading giữ vùng nội dung; empty state hướng dẫn bước tiếp theo; tìm kiếm không có kết quả cho phép xóa tìm kiếm.

## Mẫu `/center`

Một màn thống nhất: header → thông tin trung tâm → danh sách có tìm kiếm và lời mời đang chờ. Chủ trung tâm có biểu mẫu mời giáo viên bên cạnh; mobile đặt sau danh sách. Xem lớp mở chi tiết ngay trong trang. Dialog chỉ dùng xác nhận xóa thành viên.

Quyền theo API: chủ trung tâm mời, xem lớp và xóa thành viên khác; giáo viên xem danh sách. Người chưa có trung tâm thấy lời mời nhận được và biểu mẫu tạo trung tâm. Không thêm quyền backend.

## Phạm vi áp dụng

Chuẩn nền và thành phần chung áp dụng cho các màn nghiệp vụ, nút chính xác thực và `/center`. Landing giữ bố cục, hình ảnh và nhận diện hiện có; các control đặc thù như lịch và bảng điểm giữ cấu trúc nghiệp vụ riêng. Màn mới dùng token và mẫu thành phần trên.
