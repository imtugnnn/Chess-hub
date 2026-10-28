# Cấu trúc và dependency của ChessHub

Rà soát ngày 2026-10-19 từ mã nguồn và cấu hình hiện có. Đây là tài liệu bảo trì dự án; báo cáo thiết kế và ảnh kiểm tra được lưu trong `agent/.impeccable/`.

## Cấu trúc hiện tại

| Thư mục/file | Vai trò |
| --- | --- |
| `frontend/` | Một package npm `chesshub-web`, React/Vite; `src` chia thành pages, components, services, hooks |
| `backend/` | Một module Maven `vn.chesshub:chesshub-api`; controller → service → repository/entity, cấu hình trong config |
| `docs/` | Tài liệu sử dụng, nghiệp vụ, kỹ thuật và bảo trì ChessHub |
| `agent/specs/` | Spec Kit: spec, plan, tasks, contracts, verification theo tính năng |
| `agent/.impeccable/reports/` | Ghi chú cài công cụ, audit, critique và lịch sử review thiết kế |
| `agent/.impeccable/review/` | Ảnh và kết quả kiểm tra UI theo màn hình |
| `agent/.agents/`, `agent/.codex/`, `agent/.specify/` | Skill, cấu hình agent, template/script Spec Kit; toàn bộ `agent/` được Git/Docker bỏ qua |
| `frontend/tools/`, `backend/tools/` | Công cụ review giao diện và kiểm tra migration; không phải mã thừa chỉ vì không được app import |

Dự án không phải npm workspace nhiều package. Backend đang tổ chức theo tầng; frontend theo loại thành phần. Không cần đổi cấu trúc Java hoặc di chuyển hàng loạt component để giải quyết việc lưu nhầm tài liệu.

## Dependency

- Runtime frontend: `react`, `react-dom`, `chess.js`, `react-chessboard` đều được mã ứng dụng sử dụng.
- Công cụ phát triển: `vite`, `@vitejs/plugin-react`; đã chuyển sang `devDependencies`.
- `esbuild` được `src/App.test.js` import trực tiếp; đã bổ sung vào `devDependencies` theo phiên bản 0.28.2 đang cài. Không nâng phiên bản các package hiện có trong lần dọn này.
- Backend dùng Spring Web, JPA, Security, OAuth2; Flyway/PostgreSQL cho dữ liệu; POI cho Excel. Dependency test cung cấp JUnit/Mockito, Spring Security test và H2.
- `spring-boot-starter-mail` cung cấp Jakarta Mail dùng tạo MIME trong `InvitationMailService` và test. Dù gửi thư qua Gmail HTTP API, dependency này vẫn đang được dùng.
- `postgres-socket-factory` phục vụ kết nối Cloud SQL qua JDBC runtime. Không có tham chiếu trực tiếp trong Java hoặc cấu hình local; giữ lại vì URL datasource được truyền qua biến môi trường khi triển khai. Cần đối chiếu cấu hình Cloud Run trước khi kết luận có thể bỏ.
- Chưa có bằng chứng đủ chắc để xóa dependency khai báo nào.

## File đã dọn

- Xóa `frontend/src/components/AppHeader.jsx`, `frontend/src/components/WeeklyTimeFields.jsx`, `frontend/src/hooks/useHealth.js`: không có đường import từ app, test, fixture hay công cụ; tìm theo tên cũng không có nơi sử dụng khác.
- Xóa ba thư mục rỗng ở root: `index.html/`, `js/`, `styles.css/`. Entry HTML thật nằm ở `frontend/index.html`.
- Di chuyển toàn bộ `docs/impeccable/` sang `agent/.impeccable/reports/`.
- Di chuyển báo cáo/ảnh review landing sang `agent/.impeccable/reports/landing/`; review Trung tâm sang `agent/.impeccable/reports/center/`. Tổng cộng 23 file, giữ nguyên bằng chứng và cập nhật tham chiếu đường dẫn.
- Script `frontend/tools/center-review.cjs` ghi ảnh mới vào `agent/.impeccable/review/center/` và tự tạo thư mục đầu ra.
- `AGENTS.md` dẫn đến quy tắc chi tiết trong `agent/AGENTS.md`. Từ lần hợp nhất workspace AI, toàn bộ `agent/` được Git và Docker bỏ qua, bao gồm cả báo cáo và ảnh kiểm tra.

## Các điểm còn cần cân nhắc

- `nginx.conf` ở root không được Docker Compose hay Dockerfile hiện tại tham chiếu; bản được build sử dụng là `frontend/nginx.conf`. Giữ file root vì chưa đối chiếu các lệnh triển khai ngoài repository.
- Frontend còn nhiều lớp CSS toàn cục nạp nối tiếp: `styles.css`, `ui-refresh.css`, `class-workspace.css`, `design-system.css`, `motion.css`, `pastel-theme.css`, `home-reference.css`, cùng CSS layout. Tất cả đang được import; không thể kết luận file nào thừa chỉ từ tên. Cần kiểm tra từng selector trên các route/trạng thái trước khi hợp nhất.
- Một số selector cũ như `recurring-session-times` và export `getHealth` không còn nơi gọi trong mã frontend hiện tại. Chưa dọn selector/export trong các file dùng chung ở lần này.
- Script browser review vẫn phụ thuộc Playwright từ đường dẫn runtime Codex của máy; nhiều script cũng cố định Edge/cổng Vite. Đây là hạn chế tái lập trên máy khác, không phải bằng chứng script đã hết dùng. Một số script hỗ trợ `PLAYWRIGHT_MODULE` nhưng chưa đồng nhất.
- Maven POM viết nhiều phần tử trên một dòng; chưa có cấu hình formatter/linter chung cho Java/JS/CSS. Không format lại mã nghiệp vụ trong lần dọn cấu trúc này.

## Kiểm chứng

- Quét import từ entry app, test, fixture và công cụ; tìm tham chiếu tên file toàn repository (không tính output build/runtime).
- `npm ls --depth=0`: dependency trực tiếp khớp bản đang cài.
- `npm test`: 47/47 đạt.
- `npm run build`: đạt; còn cảnh báo chunk JavaScript chính khoảng 507 kB trước gzip.
- `node --check tools/center-review.cjs`: đạt. Chưa chạy lại browser review của Trung tâm.
- Không sửa backend; không chạy lại suite Java hay xác minh cấu hình Cloud Run bên ngoài repository.
