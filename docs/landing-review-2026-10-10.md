# Đánh giá landing page ChessHub và đề xuất luồng sản phẩm

Ngày đánh giá: 10/10/2026. Phạm vi: đánh giá và đặc tả hướng cải tiến; chưa sửa landing page.

## Kết luận

Giữ nhận diện navy–vàng, font Be Vietnam Pro và Playfair Display. Ưu tiên chuyển từ bốn ô tính năng độc lập sang một khu giới thiệu luồng có ảnh chụp giao diện thật. Mục tiêu: khách truy cập hiểu mình sẽ làm gì sau khi đăng ký và thấy đầu ra của từng thao tác.

## Căn cứ

- Đã chạy frontend và xem trực tiếp hero, phần tính năng trên bản local qua trình duyệt.
- Đọc `frontend/src/pages/LandingPage.jsx`, `landing.css`, các trang đăng ký, tạo lớp, chi tiết lớp, tổng hợp điểm danh và tạo giải Swiss.
- Xem ảnh giao diện lớp trong `docs/impeccable/workspace-desktop-2026-10-06.jpg`. Đây là ảnh QA cũ có dữ liệu thử nghiệm và công cụ mô phỏng lỗi; dùng làm căn cứ về giao diện, cần chụp lại trước khi đưa lên landing.
- Chưa chụp đủ các màn hình nghiệp vụ trong phiên này. Các trang nghiệp vụ yêu cầu đăng nhập; không dựng ảnh giả thay cho sản phẩm.
- Chưa xác nhận trực quan ở viewport điện thoại: công cụ đổi viewport vẫn trả ảnh kích thước desktop. Các gợi ý mobile bên dưới là đặc tả cần kiểm tra khi triển khai.

## Đánh giá hiện tại

### Những điểm nên giữ

- Hero đọc rõ, tiêu đề có nét riêng, CTA tạo tài khoản nổi bật và không bị nhiều nút cạnh tranh.
- Bảng màu và font nhất quán với giao diện lớp; font đã có bản tiếng Việt lưu local.
- Trang tương đối gọn, FAQ trả lời những câu hỏi đúng giai đoạn bắt đầu.
- Không đưa lời chứng thực hay số lượng khách hàng chưa được chứng minh.
- Có focus-visible và hỗ trợ giảm chuyển động trong CSS.

### Các vấn đề theo mức ưu tiên

| Ưu tiên | Vấn đề | Hướng sửa |
| --- | --- | --- |
| Cao | Landing nói theo dõi khoản đã thu/cần thu và hiển thị “Đã đóng”, trong khi trang tổng hợp hiện tính học phí tạm tính theo chuyên cần | Dùng “Tổng hợp học phí tạm tính”; hiển thị số buổi đã học, đơn giá, số tiền; bỏ các trạng thái thu tiền chưa được xác nhận |
| Cao | Hero và bốn preview là UI minh họa riêng, khác cấu trúc sản phẩm có sidebar và workspace | Dùng ảnh chụp đúng component/màn hình đang chạy, với dữ liệu demo được ghi rõ |
| Cao | Bốn tính năng được trình bày ngang cấp, chưa giải thích cách bắt đầu hoặc quan hệ điểm danh → học phí | Đưa luồng thực hành vào ngay sau hero; CTA phụ dẫn tới luồng |
| Vừa | Giải Swiss bị thu nhỏ thành một bảng mẫu giống các phần mềm quản lý chung | Cho thấy ảnh cặp đấu và kết quả vòng, giải thích đây là hoạt động bổ sung của lớp |
| Vừa | Hero chỉ gọi giáo viên, dù sản phẩm còn dành cho chủ trung tâm | Đề xuất kicker “Dành cho giáo viên và trung tâm cờ vua”; mô tả giáo viên độc lập có thể bắt đầu ngay |
| Vừa | Footer chưa có liên kết chính sách; đăng ký có nút điều khoản/chính sách chưa gắn hành động trong component | Bổ sung nội dung và đích đến thực tế khi có tài liệu; không thêm liên kết rỗng |
| Vừa | “Bắt đầu miễn phí” là cam kết chưa có chính sách giá được xác nhận trong PRODUCT.md | Thống nhất CTA “Tạo tài khoản giáo viên” cho tới khi chính sách miễn phí được xác nhận |
| Thấp | Icon tính năng trộn ký tự Unicode, dấu tick, quân cờ; nhiều chữ preview nhỏ | Dùng hệ icon hiện có và tăng diện tích ảnh sản phẩm; không đổi thư viện chỉ để đổi icon |

Không cần đổi framework, đổi font hoặc thêm hiệu ứng trang trí lớn. Điểm yếu chính là bằng chứng sản phẩm và cách kể luồng.

## Tham khảo thị trường

Các nhận xét dưới đây là lựa chọn thiết kế cho ChessHub dựa trên nội dung tham khảo, không phải chứng minh hiệu quả chuyển đổi.

| Website | Điểm tham khảo | Áp dụng cho ChessHub |
| --- | --- | --- |
| [Teachworks](https://www.teachworks.com/) | Hero nói về giảm việc vận hành, có đường dẫn dùng thử và tham quan sản phẩm; phân chia lịch, học sinh, billing và báo cáo | Giữ thông điệp dành thời gian dạy cờ; đổi CTA phụ thành “Xem cách hoạt động”, dẫn tới walkthrough |
| [Class Manager](https://classmanager.com/gb) | Đưa giao diện lớp/lịch vào phần đầu và mô tả các công việc như điểm danh, thanh toán, quản lý học sinh | Dùng hình sản phẩm làm bằng chứng cho từng lợi ích; giữ palette của ChessHub; không sao chép các cam kết thanh toán |
| [Chess.com Classroom](https://www.chess.com/classroom) | Giới thiệu một công cụ chuyên biệt để chia sẻ bàn cờ giữa huấn luyện viên và học sinh | Làm nổi bật ngữ cảnh cờ vua bằng giải Swiss của ChessHub; không quảng bá bàn cờ tương tác nếu sản phẩm chưa có |

## Đặc tả thanh trượt đề xuất

Tiêu đề: **Một lớp cờ, từ buổi học đầu tiên đến báo cáo cuối tháng.**

Mô tả: “Xem cách tạo lớp, quản lý học sinh, điểm danh và tổng hợp học phí trong ChessHub.”

Luồng giới thiệu gồm 6 bước theo yêu cầu. Bước 6 gắn nhãn “Mở rộng: giải nội bộ”, vì tạo giải không phụ thuộc vào việc hoàn thành báo cáo học phí.

| Bước | Nội dung ngắn | Ảnh giao diện cần dùng | Điểm cần làm rõ trong ảnh |
| --- | --- | --- | --- |
| 01 · Tạo tài khoản | Tạo tài khoản giáo viên để bắt đầu quản lý lớp của bạn. | `/register` | Form đăng ký; để trống mật khẩu, không thể hiện thông tin đăng nhập thật |
| 02 · Tạo lớp | Đặt tên lớp, đơn giá mỗi buổi và lịch dạy. | `/classes/new` | Tên lớp, học phí mỗi buổi, lịch định kỳ; ảnh đủ rộng để đọc |
| 03 · Thêm học sinh | Thêm học sinh ngay khi tạo lớp hoặc bổ sung sau. | `/classes/{id}?tab=students` | Danh sách học sinh và form thêm; dùng cùng một lớp mẫu với các slide khác |
| 04 · Điểm danh | Mở buổi học, chọn có mặt, muộn hoặc vắng và lưu. | `/classes/{id}?sessionId={id}` | Buổi đang chọn, các trạng thái và nút lưu; ảnh sau khi lưu cho thấy kết quả |
| 05 · Tổng hợp học phí | Xem số buổi đã học và học phí tạm tính theo tháng. | `/attendance-summary` | Tháng, bảng theo lớp và chi tiết học sinh; công thức: buổi đã học × đơn giá |
| 06 · Tổ chức giải Swiss | Chọn người chơi, xem cặp đấu và cập nhật kết quả từng vòng. | `/classes/{id}/tournaments/new`, `/tournaments/{id}` | Ưu tiên ảnh giải đã tạo có cặp đấu, kết quả và bảng xếp hạng |

### Bố cục và tương tác

- Đặt ngay sau hero, thay phần bốn card hiện tại để tránh lặp nội dung.
- Desktop: hàng bước có số và nhãn; bên dưới là mô tả ngắn bên trái, một ảnh lớn bên phải. Bước đang chọn có màu và dấu chỉ rõ, không chỉ dựa vào màu.
- Giữ tất cả nhãn bước dễ tìm; cho phép chọn trực tiếp, có nút trước/sau và chỉ báo “04 / 06”. Không bắt khách xem từ đầu để tới nội dung muốn tìm.
- Mặc định điều khiển thủ công. Không tự chuyển ảnh lúc khách đang đọc; chuyển cảnh nhẹ, hỗ trợ prefers-reduced-motion.
- Keyboard: các bước bấm được; focus rõ; nút trước/sau có tên dễ hiểu; nếu dùng tablist thì triển khai đúng phím mũi tên/Home/End.
- Mobile: tiêu đề và mô tả phía trên ảnh; hàng bước cuộn ngang, bước hiện tại luôn nhìn thấy. Có nút trước/sau, hỗ trợ vuốt như thao tác bổ sung.
- Không ép cả screenshot desktop thu nhỏ tới mức chữ không đọc được. Chụp viewport mobile của sản phẩm hoặc crop vùng tác vụ thật; có “Xem ảnh lớn”.
- Ảnh có kích thước cố định theo cùng tỷ lệ để tránh nhảy layout; dùng WebP, tải slide đầu sớm và tải phần còn lại khi cần. Giữ alt mô tả nội dung ảnh.

### Quy tắc ảnh

- Dùng ảnh chụp giao diện hiện tại, không dùng ảnh AI để tái tạo chữ hay bảng số liệu.
- Tạo bộ dữ liệu demo nhất quán: cùng giáo viên mẫu, lớp và học sinh xuyên suốt luồng. Ghi “Giao diện thật · Dữ liệu minh họa”.
- Thay tên, số điện thoại và thông tin phụ huynh bằng dữ liệu demo trước khi chụp; không đưa thông tin cá nhân thật vào ảnh marketing.
- Giữ tỷ lệ tự nhiên, tránh nghiêng phối cảnh và khung laptop nặng khiến bảng khó đọc.
- Chỉ thêm một chú thích tập trung vào thao tác chính mỗi slide; không bọc ảnh trong nhiều lớp card.
- Ảnh QA ngày 06/10 là tài liệu tham chiếu, chưa phải bộ ảnh hoàn chỉnh để xuất bản.

## Bố cục trang đề xuất

1. Header gọn: Cách hoạt động · Câu hỏi · Đăng nhập · Tạo tài khoản.
2. Hero: giữ headline hiện tại; thay preview giả bằng ảnh workspace thật; CTA phụ “Xem cách hoạt động”.
3. Walkthrough 6 bước theo đặc tả trên.
4. Đoạn ngắn dành cho giáo viên độc lập và trung tâm, chỉ nêu khả năng đã có.
5. FAQ: bổ sung “Học phí được tính như thế nào?” và “Có bắt buộc tổ chức giải không?”.
6. CTA cuối trang: “Tạo lớp cờ đầu tiên của bạn”, nút tạo tài khoản.
7. Footer: thương hiệu, đăng nhập, trợ giúp, chính sách có đích thật khi đã có nội dung.

## Tiêu chí nghiệm thu khi triển khai

- 6 bước đổi đúng ảnh và nội dung; mọi nút có chức năng; CTA đăng ký/đăng nhập giữ route hiện tại.
- Các slide thể hiện cùng dữ liệu demo, không gợi ý đã thu tiền khi chỉ mới tính học phí.
- Swiss xuất hiện như lựa chọn mở rộng, không phải điều kiện kết thúc luồng lớp học.
- Kiểm tra ở desktop nhỏ và mobile: không tràn ngang toàn trang; ảnh đọc được hoặc mở lớn được.
- Điều khiển bằng keyboard, focus-visible và chế độ giảm chuyển động hoạt động.
- Không đưa dữ liệu nhạy cảm, công cụ QA hay mật khẩu vào screenshot.
- Build frontend và chạy kiểm tra hiện có sau khi thay đổi code.

