# Quản lý học sinh — 2026-10-12

## Phạm vi và kết quả

Màn `/students` bổ sung một danh sách học sinh thống nhất cho giáo viên và chủ trung tâm. Đây là phần mở rộng nghiệp vụ trong chế độ Impeccable operate, kế thừa nhận diện navy/vàng, tiếng Việt, sidebar và control hiện có. Không thay đổi hệ thống nhận diện chung.

Frontend chính: `frontend/src/pages/StudentsPage.jsx`, `frontend/src/pages/StudentDetailPage.jsx`, `frontend/src/components/StudentForm.jsx`, `frontend/src/services/studentNavigation.js` và `frontend/src/pages/students.css`. Tích hợp route tại `frontend/src/App.jsx`, mục Học sinh tại `frontend/src/components/layout/AppSidebar.jsx`, chọn hồ sơ tại `frontend/src/components/ClassWorkspaceForm.jsx` và liên kết hồ sơ tại `frontend/src/pages/ClassDetailPage.jsx`. Các trường tùy chọn dùng chung `StudentOptionalFields.jsx` và CSS, được tái sử dụng trong `StudentForm`, tạo nhanh của `ClassWorkspaceForm` và `StudentDraft` tại `CreateClassPage`.

## Hành vi của màn

- Một bảng chung hiển thị học sinh, ngày sinh, phụ huynh, điện thoại, lớp của giáo viên và trung tâm. Hồ sơ cá nhân để trống ô trung tâm; cột trung tâm ẩn khi tài khoản không có trung tâm khả dụng.
- Tìm theo tên học sinh, tên phụ huynh, số điện thoại phụ huynh hoặc số điện thoại học sinh; hỗ trợ tìm tên tiếng Việt không dấu. Bộ lọc phạm vi gồm Tất cả, Cá nhân và trung tâm đang có tư cách thành viên hoạt động; không chia thành các danh sách riêng.
- Bộ lọc lớp chỉ áp dụng lớp do giáo viên hiện tại quản lý. Trạng thái Đang có lớp/Chưa có lớp cũng được tính theo các lớp đó. Gõ tên lớp cần chọn một gợi ý để áp dụng lớp cụ thể.
- Phân trang phía server, mặc định 25 dòng, có lựa chọn 50 dòng. Tìm kiếm hoặc đổi bộ lọc đưa về trang đầu; backend điều chỉnh trang vượt phạm vi kết quả.
- `/students` giữ danh sách toàn chiều rộng. Xem hồ sơ mở màn phụ riêng `/students/{id}`; tạo hồ sơ mở `/students/new`. Màn chi tiết gồm thông tin chung, lớp đang học với giáo viên và lịch sử chuyên cần, kể cả buổi thuộc lớp học sinh đã rời; lịch sử có phân trang riêng.
- Nút Cập nhật tại header chi tiết mở biểu mẫu trực tiếp trên cùng route, giữ lớp và lịch sử bên dưới. Lưu cập nhật vẫn ở route hồ sơ; tạo thành công chuyển đến hồ sơ vừa tạo. Bảng danh sách không xuất hiện trên màn chi tiết và không bị thu hẹp bởi panel.
- Quay lại danh sách bảo toàn tìm kiếm, phạm vi, lớp, trạng thái học, trang và số dòng qua `returnTo` được kiểm tra chỉ cho phép đường dẫn nội bộ `/students`. Liên kết cũ `/students?studentId=uuid` chuyển sang route chi tiết và giữ bộ lọc; liên kết từ lớp dùng `/students/{id}`.
- Mobile thu gọn bộ lọc phụ sau nút Bộ lọc, hiển thị số bộ lọc đang áp dụng và tóm tắt lựa chọn; dòng bảng chuyển thành bố cục dễ đọc trên điện thoại. Chi tiết và cập nhật dùng bố cục riêng phù hợp màn hẹp.
- Thay đổi hồ sơ chưa lưu được xác nhận khi hủy sửa hoặc điều hướng. Người dùng có thể tiếp tục nhập hoặc bỏ thay đổi. Tải lỗi có Thử lại; kết quả rỗng cho phép xóa bộ lọc hoặc tạo hồ sơ đầu tiên.
- Số điện thoại học sinh và ghi chú đều tùy chọn ở mọi biểu mẫu tạo/sửa, gồm tạo nhanh trong lớp và tạo học sinh khi tạo lớp. Trường này không làm mất yêu cầu nhập thông tin bắt buộc hiện có. Hồ sơ hiển thị điện thoại bằng liên kết gọi và đầy đủ ghi chú giữ xuống dòng; bảng danh sách chính/bảng lớp hiển thị điện thoại và preview ghi chú tối đa hai dòng.

## Điện thoại và ghi chú

API dùng `phoneNumber` và `notes`. Trống được chuẩn hóa thành null. Điện thoại có nội dung được bỏ khoảng trắng, dấu chấm, ngoặc và gạch nối, sau đó phải có 9–15 chữ số. Ghi chú tối đa 4.000 ký tự, bỏ khoảng trắng ngoài cùng và giữ xuống dòng bên trong.

Database tái sử dụng cột nullable `phone_number`; migration `V20__add_student_notes.sql` bổ sung `notes varchar(4000)`. Flyway sẽ áp dụng khi backend khởi động tiếp theo; phiên này không áp dụng migration vào database thật.

List/detail/create/update của StudentManagement, DTO tạo/thêm học sinh lớp và gợi ý tên đều giữ hai trường mới. Payload cũ không có hai trường vẫn tạo được hồ sơ. Chọn lại hồ sơ có sẵn từ lớp không ghi đè điện thoại/ghi chú; hành vi này có test. Không đổi định danh hay quy tắc xác định trùng hồ sơ.

## Quyền và giới hạn dữ liệu

Backend là nguồn quyết định quyền. Chủ hồ sơ cá nhân được sửa hồ sơ của mình; chỉ chủ trung tâm được sửa thông tin chung của hồ sơ trung tâm. Thành viên hoạt động của trung tâm hiện tại có thể tạo và đọc hồ sơ trung tâm. Hồ sơ cá nhân của người dùng vẫn xuất hiện khi người đó đang là thành viên trung tâm.

Thông tin lớp và lịch sử chuyên cần chỉ thuộc các lớp do giáo viên hiện tại sở hữu theo hợp đồng API lớp hiện có. Không mở rộng quyền xem hoặc thao tác lớp cho chủ trung tâm chỉ vì sở hữu trung tâm. Hồ sơ cũ chưa có người sở hữu chỉ có quyền đọc khi liên quan đến lớp của giáo viên; phần mở rộng này không tự gán chủ sở hữu.

Biểu mẫu lớp cho phép tìm và chọn hồ sơ đã có bằng ID, giữ nguyên phạm vi sở hữu hồ sơ. Cách tạo nhanh hồ sơ mới trong lớp vẫn được giữ như ngoại lệ nghiệp vụ hiện có. Thêm hồ sơ vào lớp không âm thầm chuyển hồ sơ cá nhân thành hồ sơ trung tâm. Phạm vi lưu bị khóa khi sửa; thay đổi thông tin chung áp dụng cho mọi lớp đang dùng cùng hồ sơ.

Không bổ sung xóa vĩnh viễn hồ sơ, chuyển phạm vi, di chuyển dữ liệu sở hữu hoặc quyền lớp rộng hơn. Migration chỉ bổ sung cột ghi chú. Thao tác Gỡ khỏi lớp hiện có là thao tác quan hệ lớp, không phải xóa hồ sơ.

## API

Các endpoint nằm dưới `/api/v1/teachers/{teacherId}`:

| Phương thức | Đường dẫn | Mục đích |
| --- | --- | --- |
| GET | `/students` | Danh sách có `query`, `scope`, `classId`, `enrollment`, `page`, `size` |
| GET | `/students/options` | Trung tâm khả dụng và lớp của giáo viên để lọc/chọn |
| GET | `/students/{studentId}` | Hồ sơ và lịch sử theo `historyPage` |
| POST | `/students` | Tạo hồ sơ cá nhân hoặc trung tâm |
| PUT | `/students/{studentId}` | Sửa thông tin chung trong phạm vi quyền hiện có |
| POST | `/classes/{classId}/students/{studentId}` | Thêm hồ sơ có sẵn vào lớp bằng ID |

Endpoint gợi ý tên hiện có được giữ. Backend kiểm tra quyền, dữ liệu hợp lệ, trùng hồ sơ và phân trang; frontend hiển thị lỗi để người dùng sửa hoặc thử lại.

Lượt chuyển hồ sơ sang màn phụ chỉ thay đổi frontend. Lượt bổ sung điện thoại/ghi chú mở rộng input/output API như mô tả trên, giữ nguyên quyền cá nhân/trung tâm.

Khi liên kết hồ sơ vào lớp, transaction khóa giáo viên trước lớp để tuần tự hóa với thao tác thu hồi tư cách thành viên trung tâm, tránh kiểm tra quyền trên trạng thái thành viên đã thay đổi.

## Nhất quán với tài liệu nền

`PRODUCT.md` xác định sản phẩm quản lý hoạt động dạy học cho giáo viên/chủ trung tâm, giao diện tiếng Việt và quyền theo API. Màn học sinh phù hợp các ràng buộc đó, không bổ sung claim thương mại hoặc mục tiêu chơi cờ trực tuyến.

`DESIGN.md` quy định token chung, sidebar navy, nền sáng, panel trắng có viền, Be Vietnam Pro, control có nhãn và focus rõ. CSS của màn sử dụng các token `--ui-*` và `--workspace-*`, panel bo 12px, input bo 8px, control chính tối thiểu 44px. Chi tiết bố cục và bộ lọc mobile là quyết định riêng của màn, không được nâng thành quy tắc toàn cục.

Drift có trước cần ghi nhận riêng: `DESIGN.md` hiện dùng các tiêu đề tiếng Việt và chưa có YAML frontmatter/các mục canonical theo reference Impeccable document mới. Đây là khác biệt định dạng tài liệu nền, không phải yêu cầu sửa nhận diện hoặc lý do ghi đè tài liệu. `PRODUCT.md` chưa liệt kê route mới trong mô tả capability tổng quát. Hai file nền được giữ nguyên trong phần tài liệu này; không sửa sidecar hay token chung.

## Kiểm chứng và disposition

Evidence hiện tại sau khi bổ sung điện thoại/ghi chú, theo kết quả phiên triển khai:

- Frontend build và 30 test đạt; backend 126 test đạt, không failure.
- `students-review.cjs` với API mock kiểm tra tạo/sửa/reload điện thoại và ghi chú, để trống trường tùy chọn, payload tạo nhanh trong lớp, trường trong biểu mẫu tạo lớp và việc vẫn phải nhập thông tin bắt buộc, desktop/mobile; tất cả đạt theo evidence phiên triển khai.
- Reviewer mới kết luận **ship**, không có phát hiện UI trọng yếu. Đây là verdict UI/source; test được cung cấp từ phiên triển khai, không độc lập chạy lại. Fixture desktop danh sách có ghi chú trống; biểu mẫu tạo lớp mới được kiểm tra qua source/browser checks, không có capture riêng.
- Migration chưa áp dụng vào database thật; không có kiểm chứng production.

Evidence lịch sử sau khi chuyển hồ sơ sang màn phụ:

- Frontend build thành công; 22 test đạt, gồm kiểm tra navigation.
- Browser fixture đạt: quay lại đúng trang danh sách, chi tiết không chứa bảng danh sách, cập nhật giữ route, reload, tạo hồ sơ mới, lỗi, chỉ đọc, xác nhận chưa lưu và mobile.
- Reviewer mới kết luận **ship**, không có phát hiện trọng yếu trong phạm vi tinh chỉnh này.

Evidence lịch sử từ phiên triển khai backend ban đầu, không chạy lại backend trong lượt tinh chỉnh:

- Frontend build thành công; 19 test frontend đạt ở phiên ban đầu, được thay bằng kết quả 30 test hiện tại ở trên.
- Backend: 120 test, không failure/error. Người ghi tài liệu kiểm tra trực tiếp 23 báo cáo Surefire XML: tổng 120 test, 0 failure, 0 error, 0 skipped.
- Kiểm tra cuối sau thay đổi khóa transaction: `ClassHistoryTransactionTest` đạt; frontend build/19 test và browser regression đạt theo xác nhận của phiên triển khai.
- Browser dùng API mock ở desktop 1440px và mobile 390px: bộ lọc, phân trang, tạo/sửa, hồ sơ trùng, quyền thành viên, xác nhận chưa lưu, retry và không tràn trang đều đạt theo kết quả phiên triển khai. Không diễn giải API mock thành kiểm chứng production.
- Reviewer ban đầu kết luận **ship** trong phạm vi verdict-only sau khi sửa vấn đề bảng desktop bị thu hẹp và bộ lọc mobile. Bố cục panel ban đầu đã được thay bằng màn phụ theo yêu cầu sau đó. Disposition không cấp quyền thay đổi hệ thống thiết kế hoặc mở rộng nghiệp vụ.

Ảnh review đã cập nhật theo triển khai cuối, lưu tại:

- [Danh sách desktop](../.impeccable/review/students/desktop.png)
- [Danh sách mobile](../.impeccable/review/students/mobile.png)
- [Hồ sơ desktop](../.impeccable/review/students/detail-desktop.png)
- [Hồ sơ mobile](../.impeccable/review/students/detail-mobile.png)
- [Cập nhật desktop](../.impeccable/review/students/update-desktop.png)
- [Cập nhật mobile](../.impeccable/review/students/update-mobile.png)

Người ghi tài liệu đã đọc code frontend/backend liên quan, `PRODUCT.md`, `DESIGN.md`, reference document và xem ảnh danh sách desktop/hồ sơ mobile ở phiên ban đầu; lượt chuyển route đọc thêm `StudentDetailPage.jsx` và `studentNavigation.js`. Lượt điện thoại/ghi chú cập nhật theo evidence được cung cấp: build/test, browser, sáu ảnh được làm mới và verdict reviewer. Người ghi tài liệu không chạy lại test, không áp dụng migration vào database thật hoặc khẳng định đã kiểm chứng production. Phạm vi ghi file của lượt tài liệu chỉ là tài liệu này; không sửa tài liệu nền hay drift.
