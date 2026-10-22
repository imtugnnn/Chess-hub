# Swiss trong ChessHub

## Điểm và phân hạng

Chỉ vòng đã chốt được tính: thắng 1, hòa ½, thua 0. Bye được 1 điểm nhưng không phải trận thắng, không có đối thủ và không cập nhật màu đã chơi.

Giải mới mặc định dùng **Buchholz → Sonneborn–Berger → số trận thắng**. Người tạo giải chọn từ 1 đến 3 tiêu chí và đổi thứ tự ưu tiên. Các giải đang có giữ nguyên tiêu chí đã lưu, bao gồm số trận Trắng nếu đã chọn.

- **Buchholz (BH):** tổng điểm hiện tại của các đối thủ thật đã gặp.
- **Sonneborn–Berger (SB):** tổng điểm hiện tại của đối thủ đã thắng, cộng nửa điểm hiện tại của đối thủ đã hòa.
- **Số trận thắng:** không tính bye.
- **Số trận Trắng:** không tính bye.

BH/SB dùng tổng điểm của đối thủ có tính bye; lượt bye của chính người chơi không thêm đối thủ giả. Mỗi lần gặp lại cùng một đối thủ được tính riêng. Không áp dụng đối thủ ảo hay hiệu chỉnh điểm cho ván không chơi. Đây là quy ước của ChessHub cho giải lớp học, không phải tuyên bố tuân thủ một bộ quy tắc thi đấu chính thức.

Điểm được lưu theo nửa điểm, SB theo phần tư điểm, tránh làm tròn sai. Tất cả hệ số được tính lại từ các vòng đã chốt khi đọc bảng xếp hạng. Người bằng điểm và toàn bộ tiêu chí đã chọn được đồng hạng (ví dụ 1, 1, 3); seed chỉ dùng để giữ thứ tự ổn định giữa những người đồng hạng.

## Chia cặp và màu quân

Seed ban đầu vẫn được xáo ngẫu nhiên, không được xem là rating. Khi số người lẻ, chọn người có ít lần bye nhất, rồi chọn người đứng thấp nhất trong nhóm đó. Việc chọn bye được thực hiện trước khi tối ưu các bàn còn lại.

`SwissPairing` so sánh **tổng chi phí toàn vòng**, theo thứ tự ưu tiên tuyệt đối:

1. Số bàn tái đấu ít nhất.
2. Tổng số lần các cặp tái đấu đã gặp nhau ít nhất.
3. Số người phải nhận cùng màu từ 3 lượt đã chơi liên tiếp ít nhất (bỏ qua bye).
4. Tổng chênh điểm giữa các cặp ít nhất.
5. Tổng độ lệch Trắng–Đen sau vòng mới ít nhất.
6. Số người nhận lại màu của lượt đã chơi gần nhất ít nhất.

Hai cách phân màu của mỗi cặp được so sánh trước; tìm kiếm quay lui có cắt nhánh tiếp tục tìm bộ ghép tốt hơn thay vì dừng ở bộ hợp lệ đầu tiên. Các bàn được sắp theo tổng điểm hai người giảm dần. Khi mọi chi phí bằng nhau, thứ tự seed giữ kết quả ổn định.

Tìm kiếm có giới hạn **100.000 trạng thái cần mở rộng** để giữ thời gian phản hồi. Luôn có bộ ghép đầy đủ ban đầu; khi đạt giới hạn, dùng bộ tốt nhất đã tìm thấy và ghi `pairingSearchLimited=true`. Không tự chuyển sang ghép liền nhau và không suy diễn rằng không còn đối thủ mới chỉ vì đã hết ngân sách tìm kiếm.

## Ghi chú của vòng

API vòng trả thêm `pairingNote` và `pairingSearchLimited`. Ghi chú nêu số bàn tái đấu, số người vi phạm chuỗi màu và tình trạng chưa chứng minh tối ưu nếu tìm kiếm đạt giới hạn. Ghi chú được lưu cùng vòng để xem lại; các vòng cũ trước cập nhật không được chia lại hay suy diễn ghi chú.

Migration `V15__add_swiss_pairing_notes.sql` bổ sung hai cột trên `tournament_rounds`; Flyway chạy khi backend khởi động. Triển khai backend và frontend cùng nhau để có lựa chọn BH/SB và các cột xếp hạng mới.

## Kiểm tra thay đổi

Test backend bao phủ tối ưu cả vòng so với lời giải đầu tiên, hạn chế chuỗi màu, cân bằng Trắng–Đen, phương án đầy đủ khi hết ngân sách, bye/tái đấu, BH/SB theo vòng đã chốt, đồng hạng và ghi chú vòng. UI được kiểm tra bằng API giả lập cục bộ: lựa chọn/tối đa 3 tiêu chí, đổi thứ tự, payload tạo giải, cột BH/SB, chuyển vòng và bố cục 375/1440px. Không ghi dữ liệu thật khi kiểm tra UI.

Probe cũng phát hiện các vấn đề có sẵn ngoài phần bổ sung: tương phản chữ phụ của cặp đấu/khối tổng quan, hover và scrollbar sidebar, checkbox gốc, nút gửi form rộng hơn ô nhập nằm trong card. Chúng không được thay đổi trong bản sửa thuật toán này. Lỗi WebSocket HMR và favicon trong probe đến từ máy chủ proxy kiểm thử. Các nhãn hệ số mới được sửa tương phản và kích thước chữ; bảng xếp hạng cuộn bên trong khi màn hẹp, không làm toàn trang tràn ngang. Migration chưa chạy trên database thật trong phiên làm việc này.
