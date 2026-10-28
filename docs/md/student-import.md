# Nhập học sinh theo lớp

Trong lớp, mở **Học sinh → Nhập Excel**. Tại danh sách học sinh cũng có nút **Nhập Excel**, yêu cầu chọn lớp trước. Lớp cũ cần chủ lớp xác nhận một lần là lớp cá nhân hay trung tâm; không tự chuyển quyền sở hữu hồ sơ cũ. Lớp mới chọn phạm vi ngay khi tạo.

Tại **Tạo lớp mới**, mở **Nhập danh sách → Nhập từ Excel** để xem và xử lý file ngay trong danh sách học sinh chờ. Không cần tạo lớp trước hoặc chuyển sang màn nhập của lớp đã lưu.

## Quy tắc dữ liệu

- Tên học sinh bắt buộc. Ngày sinh và các trường khác được để trống.
- Chỉ có tên: lưu thành viên lớp, không có bản ghi trong `student`.
- Có tên và ít nhất một thông tin bổ sung hợp lệ: tạo/dùng lại hồ sơ theo phạm vi của lớp. Phạm vi được lưu trên lớp, độc lập với trung tâm hiện tại của giáo viên.
- Học sinh trùng tên với thành viên đang học trong lớp bị báo lỗi **Học sinh đã có trong lớp.** So sánh tên không phân biệt hoa thường và khoảng trắng thừa; không có lựa chọn xác nhận là học sinh khác. Trùng tên trong file hoặc danh sách tạo lớp cũng bị báo lỗi. Hồ sơ có sẵn ở ngoài lớp vẫn được dùng lại theo thông tin nhận diện; thiếu ngày sinh thì chọn hồ sơ có sẵn, không tự gộp. Thành viên đã rời lớp có thể được thêm lại; bổ sung thông tin cho thành viên hiện tại dùng thao tác riêng, không phải thêm mới.
- Áp dụng cùng quy tắc khi nhập tay và tạo lớp. Tạo hồ sơ riêng ngoài lớp cần tên và ít nhất một thông tin bổ sung. Tạo trung tâm không tự chuyển hồ sơ cá nhân sang trung tâm.
- Thành viên chưa có hồ sơ vẫn có sĩ số, điểm danh, học phí và tham gia giải đấu. **Bổ sung thông tin** liên kết hồ sơ vào cùng thành viên, giữ nguyên điểm danh. Gỡ khỏi lớp chỉ đánh dấu không còn học; lịch sử vẫn được giữ.

## Excel trước khi tạo lớp

Cập nhật 18/10/2026. Chọn file `.xlsx` tối đa 5 MB. Giao diện đọc sheet đầu, tự gợi ý ghép cột và tự xem trước nếu nhận diện được cột họ tên. Có thể đổi sheet hoặc mở **Điều chỉnh dòng tiêu đề và ghép cột**; sau khi thay đổi cần **Kiểm tra lại**. Tổng số dòng từ file còn lại và học sinh đã có trong danh sách chờ phải nằm trong giới hạn 1.000.

Danh sách xem trước hiển thị gọn số dòng nguồn, tên, trạng thái/lỗi và nút bỏ dòng; phân trang 25 dòng. Mở **Sửa thông tin dòng…** để sửa các trường, xác nhận số điện thoại đang hiển thị khi có cảnh báo, hoặc chọn hồ sơ có sẵn khi server trả về các hồ sơ phù hợp. Sửa dữ liệu xóa lựa chọn hồ sơ và ứng viên cũ của dòng đó; cần kiểm tra lại để lấy kết quả hiện hành. Enter trong ô sửa không gửi biểu mẫu tạo lớp ngoài ý muốn; giữ thao tác nhập bằng IME.

Server kiểm tra quyền và hồ sơ theo phạm vi cá nhân/trung tâm đã chọn; kiểm tra trùng trong file và với danh sách chờ được gửi kèm. Đọc và xem trước chỉ chuẩn bị dữ liệu, không lưu lớp, hồ sơ hay thành viên tạm. Bản nháp giữ trong React state, không lưu ở server.

Chỉ **Đưa … học sinh vào danh sách** khi toàn bộ dòng còn lại đã có kết quả hợp lệ. Dòng lỗi phải được sửa hoặc bỏ tường minh; không tự bỏ qua để nhập một phần. Thay đổi phạm vi, danh sách chờ, dữ liệu dòng, ghép cột hoặc sheet làm kết quả cũ hết hiệu lực; dấu phiên bản tác vụ cũng loại phản hồi bất đồng bộ đã lỗi thời. Sau mỗi thay đổi cần kiểm tra lại tất cả dòng còn lại trước khi áp dụng.

File đang xử lý hoặc chưa áp dụng chặn **Tạo lớp** và đổi phạm vi; có thể **Hủy nhập** để bỏ bản nháp file. Áp dụng chỉ gộp các dòng đã kiểm tra vào danh sách chờ chung cùng học sinh nhập tay/dán tên, giữ ID hồ sơ được dùng lại. Chỉ **Tạo lớp** lưu lớp, lịch và danh sách trong giao dịch hiện có. Thành công quay về trang tổng quan `/homepage`, không chuyển tới màn nhập Excel. Tạo lớp lỗi giữ danh sách chờ để sửa hoặc thử lại. Luồng này không dùng biên nhận nhập từng dòng của lớp đã lưu.

## Excel trong lớp đã lưu

Nhận `.xlsx` tối đa 5 MB, mỗi lần một sheet và tối đa 1.000 dòng học sinh, 100 cột. Chọn dòng tiêu đề trong 100 dòng có dữ liệu đầu tiên. Backend giới hạn sheet đọc ở 1.100 dòng có dữ liệu để dành chỗ cho tiêu đề; file lớn hơn cần tách trước.

Ghép cột vào sáu trường: họ tên, ngày sinh, tên phụ huynh, SĐT phụ huynh, SĐT học sinh, ghi chú. Có gợi ý tên cột và tải file mẫu. Bỏ qua dòng trống và cột không dùng. Xem trước có sửa từng ô và phân trang 25 dòng.

Ngày nhận ô ngày Excel, `dd/MM/yyyy` hoặc `yyyy-MM-dd`. Điện thoại được đọc theo định dạng hiển thị; ô số không giữ số 0 đầu được yêu cầu kiểm tra/sửa hoặc xác nhận. Không tự thêm số 0. Ô công thức tại cột được ghép phải thay bằng giá trị.

Nhập các dòng hợp lệ; mỗi dòng là một giao dịch gồm hồ sơ, thành viên và biên nhận. Biên nhận thành công lưu theo mã lần nhập và số dòng, kèm hash dữ liệu. Thử lại cùng lần nhập trả kết quả đã lưu; thay đổi dòng đã thành công bị từ chối. Dòng lỗi được sửa và thử lại. Tải Excel chứa các dòng cần sửa cùng số dòng gốc và lý do. Không lưu file nguồn lâu dài.

## API và migration

- `POST /api/v1/teachers/{teacherId}/classes/{classId}/scope`: `{centerId: null|UUID}`. Xác nhận một lần; không đổi phạm vi đã xác nhận.
- API lớp trả `membershipId`, `studentId` nullable; `id` trong danh sách lớp là alias của `membershipId`. Mở hồ sơ bằng `studentId`; điểm danh, gỡ và bổ sung dùng ID thành viên. Điểm danh nhận `{membershipId,status}`; `studentId` cũ vẫn được nhận cho hồ sơ đã liên kết.
- `PUT .../classes/{classId}/memberships/{membershipId}`: bổ sung hoặc liên kết hồ sơ. API thêm tay nhận `studentId`, `membershipId`, lựa chọn hồ sơ có sẵn khi cần. `confirmNew` cũ không còn cho phép bỏ qua lỗi trùng.
- Trước khi tạo lớp, dưới `/api/v1/teachers/{teacherId}/classes/students/import`: `POST /read` (multipart `file`, `sheet`, `centerId` tùy chọn); `POST /preview` (`{centerId,rows}`); `GET /template` (`centerId` tùy chọn). `centerId: null` là cá nhân. Ba endpoint kiểm tra quyền phạm vi, không cần `classId` và không có endpoint commit bản nháp. Preview chỉ đọc trả số dòng, hành động/lỗi, ứng viên và dữ liệu học sinh đã chuẩn hóa; frontend gửi cả danh sách chờ để kiểm tra trùng. Dữ liệu chỉ được ghi qua API tạo lớp hiện có.
- Dưới `.../classes/{classId}/students/import`: `POST /read` (multipart `file`, `sheet`); `POST /preview`, `POST /commit` (`{importId,rows}`); `GET /template`; `POST /errors` (`{rows,results}`). Dòng có `rowNumber`, `values`, lựa chọn hồ sơ/thành viên, `confirmNew`, `reuseRowNumber`, và lỗi nguồn `issues` cần xác nhận. Kết quả có hành động, lỗi, ID và các cờ `profileCreated`, `enrolled`.
- V21 thay join table bằng thành viên có ID, tạo thành viên không hoạt động cho lịch sử đã rời lớp và chuyển điểm danh sang thành viên. Triển khai backend và frontend trong cùng đợt vì danh sách lớp chuyển sang ID thành viên. Flyway chạy khi khởi động backend; chưa chạy trên database thật trong quá trình phát triển.

## Kiểm tra

```powershell
mvn -f backend/pom.xml test
npm --prefix frontend test
npm --prefix frontend run build
# PostgreSQL tạm trong bộ nhớ; không kết nối dữ liệu thật:
npm install --prefix backend/target/migration-check --no-audit --no-fund @electric-sql/pglite
node backend/tools/student-membership-migration-check.cjs
# Vite đang chạy, API được giả lập hoàn toàn:
cd frontend
$env:STUDENT_IMPORT_REVIEW_URL='http://127.0.0.1:5184'
node tools/student-import-review.cjs
```

Kiểm tra giao diện desktop 1440px và mobile 390px: ghép cột, sửa lỗi, xác nhận phạm vi, xử lý trùng, giữ mã nhập khi thử lại, tên không kèm ngày sinh và không tràn ngang toàn trang. Ảnh tại `agent/.impeccable/review/student-import/`.

Với nhập trước khi tạo lớp, kiểm tra thêm không ghi dữ liệu ở read/preview, quyền phạm vi, trùng với danh sách chờ, hết hiệu lực kết quả sau sửa/bỏ dòng, chọn lại hồ sơ, Enter trong ô sửa, giới hạn tổng 1.000, áp dụng toàn bộ dòng hợp lệ và quay về tổng quan sau lưu. Reviewer nguồn/ảnh trả **SHIP** cho phần giao diện; API giả lập chỉ là bằng chứng hiển thị, không thay kiểm thử server. Xác minh 2026-10-18: 25 backend tests, 43 frontend tests, build và ba browser regressions đều đạt; xem `agent/specs/001-class-draft-import/implementation.md` cho phạm vi và giới hạn bằng chứng.
