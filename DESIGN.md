# ChessHub — chuẩn giao diện dùng chung

## Hướng thiết kế

Ảnh concept được duyệt: `.impeccable/review/soft-blue/approved-concept.png`.

Hướng **Xanh dịu**, được người dùng chọn từ ảnh concept ngày 15/10/2026: giao diện sáng, thoáng, hiện đại, ưu tiên thao tác của chủ trung tâm và giáo viên. Sidebar xanh sương rất nhạt, nền trang gần trắng, nội dung xanh than dịu và màu nhấn xanh denim. Giữ tên, biểu tượng quân mã và vàng ở logo ChessHub. Vàng dành cho nhận diện, không dùng làm màu lựa chọn điều hướng.

Nguồn chuẩn: `frontend/src/design-system.css`, nạp sau stylesheet hiện có trong `frontend/src/main.jsx`. CSS từng route quyết định bố cục và thành phần đặc thù, dùng token chung thay cho mã màu riêng. Tên token `--ui-navy` được giữ để tương thích các trang hiện tại; giá trị của nó là xanh denim mới, không phải navy cũ. `frontend/src/pages/landing.css` ánh xạ màu landing sang cùng bộ token này.

## Token

| Vai trò | Token / giá trị |
| --- | --- |
| Thao tác chính, liên kết, focus | `--ui-navy`: `#4e7098` |
| Hover nút chính | `--ui-primary-hover`: `#3d5e84` |
| Nội dung chính | `--ui-text`: `#293d50` |
| Nội dung phụ và placeholder | `--ui-muted`: `#586e85` |
| Nền trang | `--ui-soft`: `#f8fafc` |
| Sidebar và menu nổi điều hướng | `--ui-sidebar`: `#f2f6fa` |
| Nền mục được chọn, icon hỗ trợ | `--ui-selected`: `#e3ecf5` |
| Hover nền sáng | `--ui-hover`: `#eaf1f7` |
| Panel | `--workspace-surface`: `#ffffff` |
| Viền | `--ui-border`: `#dfe8f1` |
| Thành công | `--workspace-success`: `#25735a` |
| Nguy hiểm | `--workspace-danger`: `#a13f4b` |
| Đang chờ / cảnh báo | `--workspace-warning`: `#87491b` |
| Bo panel / control | `12px` / `8px` |

## Typography và khoảng cách

- Be Vietnam Pro tự host cho tiêu đề, nội dung, bảng, control và landing page. Playfair Display dành cho logo. Tiêu đề hero đậm, phần “dạy cờ.” dùng màu nhấn xanh và không in nghiêng.
- Tiêu đề trang 28px, mobile 24px; tiêu đề nhóm 18–20px; nội dung 14px; metadata 12–13px. Line-height nội dung 1.6–1.7.
- Nhịp khoảng cách 4, 8, 12, 16, 20, 24, 32, 48px. Panel padding 24px, mobile 20px; nhóm chức năng cách nhau 24px.
- Header gồm tiêu đề, mô tả ngắn và thao tác liên quan. Không đặt header trong thẻ trang trí riêng.

## Thành phần

- Sidebar sáng dùng chung: nền `--ui-sidebar`, chữ và icon `--ui-text`, mục đang chọn dùng `--ui-selected` với chữ `--ui-navy`. Hover dùng `--ui-hover`; không dùng vạch vàng hoặc mảng navy tối. Nhãn nhóm và thông tin phụ dùng `--ui-muted`.
- Desktop giữ rail 232px, thu gọn còn 76px; ẩn nhãn khi thu gọn, giữ icon và menu nổi. Menu nổi dùng cùng nền sáng. Mobile ≤760px chuyển thành thanh trên với nút mở menu. Tôn trọng reduced motion khi đóng/mở.
- Hồ sơ cuối sidebar dùng nền trong suốt và đường phân cách mảnh. Avatar xanh nhạt. Menu tài khoản là panel trắng; mọi trạng thái hover/focus phải đọc rõ trên nền sáng.
- Panel trắng, viền 1px, không bóng trang trí. Tránh panel lồng panel.
- Primary button cho hành động chính; secondary có viền trung tính; xóa dùng đỏ và giữ xác nhận khi ảnh hưởng quyền hoặc dữ liệu.
- Input có nhãn hiện rõ, bo 8px, chữ 14px. Control chính cao tối thiểu 44px; thao tác phụ trong danh sách tối thiểu 40px.
- Không dùng placeholder trong các form nhập; tên trường nằm ở label, hướng dẫn nằm ngoài input.
- Form học sinh dùng `StudentEntryFields`: chỉ họ tên và ngày sinh bắt buộc cho hồ sơ mới. Thông tin phụ huynh, số điện thoại học sinh và ghi chú không bắt buộc. Ô tên gợi ý hồ sơ trong phạm vi người dùng được phép truy cập; chọn gợi ý giữ ID và lịch sử, không sao chép thành hồ sơ mới.
- Enter chuyển tới trường tiếp theo; ở ghi chú chuyển focus tới nút xác nhận, Enter lần nữa mới xác nhận. Shift+Enter xuống dòng; không can thiệp Enter khi đang gõ bằng IME. Trong bước tạo lớp, học sinh được đưa vào danh sách chờ và lưu cùng lớp khi bấm Tạo lớp.
- Danh sách tách bằng viền mảnh; tên, email và vai trò theo cùng thứ tự. Trạng thái luôn có chữ, không chỉ dùng màu.
- Focus có outline rõ; lỗi dùng `role="alert"`, thành công dùng `role="status"`; tôn trọng reduced motion.
- Loading giữ vùng nội dung; empty state hướng dẫn bước tiếp theo; tìm kiếm không có kết quả cho phép xóa tìm kiếm.

## Trang tổng quan và landing page

- Khối giới thiệu trên trang đăng nhập/đăng ký cũng dùng nền xanh sương, tiêu đề xanh than và nội dung phụ theo token chung để đồng bộ ảnh minh họa đăng ký.

- Tổng quan (Operate): lời chào và thao tác tạo lớp → ba chỉ số hỗ trợ → lịch dạy hôm nay và lớp học. Lịch dạy rộng hơn cột lớp; ≤1100px xếp thành một cột, mobile xếp các chỉ số theo chiều dọc. Header thoáng, không đóng khung và không thêm nhãn trang trí trên tiêu đề panel.
- Landing (Persuade): giữ nội dung và luồng hero → hướng dẫn sử dụng → đối tượng → FAQ → tạo tài khoản. Dùng nền `--ui-soft`, khu hướng dẫn trắng, CTA cuối trang xanh sương. Nút chính xanh denim, chữ trắng; nút và liên kết phụ dùng chữ xanh than hoặc xanh denim.
- Hero dùng ảnh thật chụp màn xếp thế cờ với sidebar sáng tại `frontend/public/images/landing/board.png`. Ảnh chỉ minh họa chức năng, không chứa dữ liệu khách hàng thật. Các ảnh walkthrough được chụp lại từ component thật, cùng bảng màu; không để screenshot navy cũ trong landing.
- Không thêm số liệu quảng cáo, lời chứng thực hoặc chức năng từ ảnh concept. Ảnh concept là tham chiếu bảng màu và phân cấp, dữ liệu nghiệp vụ vẫn theo triển khai thực tế.
- Tạo lại ảnh và kiểm tra bằng `cd frontend` rồi `node tools/palette-review.cjs`; có thể đặt `PALETTE_REVIEW_URL` theo địa chỉ Vite. Công cụ dùng dữ liệu mẫu và chặn API, không ghi backend. Ảnh kiểm tra desktop/mobile nằm tại `.impeccable/review/soft-blue/`.

## Mẫu `/center`

Một màn thống nhất: header → thông tin trung tâm → danh sách có tìm kiếm và lời mời đang chờ. Chủ trung tâm có biểu mẫu mời giáo viên bên cạnh; mobile đặt sau danh sách. Xem lớp mở chi tiết ngay trong trang. Dialog chỉ dùng xác nhận xóa thành viên.

Quyền theo API: chủ trung tâm mời, xem lớp và xóa thành viên khác; giáo viên xem danh sách. Người chưa có trung tâm thấy lời mời nhận được và biểu mẫu tạo trung tâm. Không thêm quyền backend.

## Phạm vi áp dụng

Chuẩn nền và thành phần chung áp dụng cho sidebar, các màn nghiệp vụ, nút chính xác thực, `/center` và landing page. Các control đặc thù như lịch, bàn cờ và bảng điểm giữ cấu trúc nghiệp vụ riêng; màu trạng thái thành công/cảnh báo/nguy hiểm giữ ý nghĩa riêng. Màn mới kế thừa token và mẫu thành phần trên, không quay lại sidebar navy cũ. Không thay đổi quyền hoặc luồng backend khi áp dụng giao diện.
