# Impeccable cho ChessHub

Đã cài ở scope project cho Codex ngày 2026-10-06 từ checkout local `../impeccable`, commit `cf3d2fa07`: skill 4.5.0, engine 0.1.11. Engine Windows được tải từ release chính thức và launcher kiểm tra SHA-256 trước khi chạy. Dùng installer chính thức của Impeccable với local bundle chứa bản phân phối Codex.

## Thành phần

- `.agents/skills/impeccable/SKILL.md`: skill và các playbook.
- `.agents/skills/impeccable/agents/`: bốn định nghĩa agent asset producer, finish reviewer, documenter và manual edit applier.
- `.codex/hooks.json`: manifest hook kiểm tra UI.
- `PRODUCT.md`: bối cảnh sản phẩm đã xác nhận.
- `.impeccable/config.json`: buildPath code theo lựa chọn của người dùng.
- `.impeccable/live/config.json`: HTML shell `frontend/index.html`; detector CSP không phát hiện policy trong source được quét. Live chưa được khởi chạy hoặc inject vào source.

Các agent là vai trò do Codex gọi theo workflow, không phải bốn tiến trình chạy nền. Audit ban đầu không yêu cầu tạo asset hay finish review của bản dựng mới.

## Dùng trong chat Codex

Skill mới có thể được nhận từ lượt tiếp theo. Ví dụ:

```text
$impeccable audit frontend
$impeccable harden form đăng ký
$impeccable adapt bộ chọn giờ
$impeccable polish trang quản lý lớp
$impeccable live
```

Theo README của Impeccable, mở `/hooks` và chấp nhận project hook nếu Codex yêu cầu trust. Manifest đã được cài, nhưng trạng thái enabled của engine không chứng minh Codex đã chấp nhận hoặc thực thi hook.

## Dùng engine trong PowerShell

Chạy từ root ChessHub:

```powershell
& ./.agents/skills/impeccable/scripts/impeccable.cmd detect frontend/src
& ./.agents/skills/impeccable/scripts/impeccable.cmd hook-admin status
```

Engine binary được gitignore. Người clone mới sẽ được launcher tải bản engine được pin khi chạy lần đầu, cần mạng và quyền ghi.

## Kết quả lần chạy đầu

- Init hoàn thành và xác nhận nhóm ưu tiên chủ trung tâm/giáo viên.
- Mặc định code-first đã được ghi lại.
- Source detector chạy thành công, trả 6 warnings; xem `detector-findings.json`.
- Source audit tại `audit-2026-10-06.md`.
- `npm run build` tại frontend thành công.

Audit chưa kiểm tra bằng trình duyệt; chưa sửa UI hoặc triển khai ứng dụng.
