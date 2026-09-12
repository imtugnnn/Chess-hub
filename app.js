const students = [
  {
    id: "minh-anh",
    name: "Nguyễn Minh Anh",
    shortName: "Minh Anh",
    initials: "MA",
    level: "U12 • Hệ số 1280",
    className: "Cờ chiến thuật U12",
    teacher: "Thầy Hoàng Nam",
    room: "Phòng Mã Trắng • Cơ sở 1",
    sessions: 16,
    price: 140000,
    paid: false,
    attendance: { present: 14, late: 1, excused: 1, absent: 0 },
    nextClass: { day: "14", month: "THG 9", weekday: "Thứ Hai", time: "18:00 — 19:30" },
    recent: [
      { date: "10/09/2026", day: "Thứ Năm", className: "Cờ chiến thuật U12", teacher: "Thầy Hoàng Nam", status: "present" },
      { date: "07/09/2026", day: "Thứ Hai", className: "Cờ chiến thuật U12", teacher: "Thầy Hoàng Nam", status: "late" },
      { date: "03/09/2026", day: "Thứ Năm", className: "Cờ chiến thuật U12", teacher: "Thầy Hoàng Nam", status: "present" },
      { date: "31/08/2026", day: "Thứ Hai", className: "Cờ chiến thuật U12", teacher: "Thầy Hoàng Nam", status: "excused" },
      { date: "27/08/2026", day: "Thứ Năm", className: "Cờ chiến thuật U12", teacher: "Thầy Hoàng Nam", status: "present" },
    ],
    tournament: { name: "Cúp Măng Non Mùa Thu 2026", round: "Bán kết", opponent: "Trần Gia Bảo", rank: "Top 4", active: true }
  },
  {
    id: "gia-huy",
    name: "Nguyễn Gia Huy",
    shortName: "Gia Huy",
    initials: "GH",
    level: "U8 • Căn bản 2",
    className: "Nền tảng cờ vua U8",
    teacher: "Cô Thu Hà",
    room: "Phòng Tượng Xanh • Cơ sở 1",
    sessions: 12,
    price: 120000,
    paid: true,
    attendance: { present: 11, late: 0, excused: 1, absent: 0 },
    nextClass: { day: "13", month: "THG 9", weekday: "Chủ Nhật", time: "09:00 — 10:30" },
    recent: [
      { date: "06/09/2026", day: "Chủ Nhật", className: "Nền tảng cờ vua U8", teacher: "Cô Thu Hà", status: "present" },
      { date: "30/08/2026", day: "Chủ Nhật", className: "Nền tảng cờ vua U8", teacher: "Cô Thu Hà", status: "present" },
      { date: "23/08/2026", day: "Chủ Nhật", className: "Nền tảng cờ vua U8", teacher: "Cô Thu Hà", status: "excused" },
      { date: "16/08/2026", day: "Chủ Nhật", className: "Nền tảng cờ vua U8", teacher: "Cô Thu Hà", status: "present" },
    ],
    tournament: { name: "Festival Cờ Vua Thiếu Nhi 2026", round: "Đã hoàn thành", opponent: "—", rank: "Hạng 7", active: false }
  }
];

const statusMap = {
  present: ["Có mặt", "badge-success"],
  late: ["Đi muộn", "badge-warning"],
  excused: ["Vắng có phép", "badge-blue"],
  absent: ["Vắng không phép", "badge-danger"]
};

const navigation = {
  parent: [
    ["dashboard", "home", "Tổng quan"], ["schedule", "calendar", "Lịch học"],
    ["attendance", "check", "Chuyên cần"], ["tuition", "wallet", "Học phí"], ["tournament", "trophy", "Giải đấu"]
  ],
  student: [
    ["dashboard", "home", "Tổng quan"], ["schedule", "calendar", "Lịch học"],
    ["checkin", "location", "Điểm danh"], ["attendance", "check", "Chuyên cần"], ["tournament", "trophy", "Giải đấu"]
  ],
  teacher: [
    ["teacherDashboard", "home", "Tổng quan"], ["teachingSchedule", "calendar", "Lịch dạy"],
    ["rollcall", "check", "Điểm danh"], ["lessonContent", "wallet", "Nội dung học"], ["students", "user", "Học viên"]
  ],
  center: [
    ["centerDashboard", "home", "Tổng quan"], ["centerCalendar", "calendar", "Lịch trung tâm"],
    ["classes", "trophy", "Lớp học"], ["teachers", "user", "Giáo viên"], ["students", "check", "Học viên"]
  ]
};

const state = {
  view: location.hash.replace("#", "") || "dashboard",
  role: getStoredRole(),
  studentId: getStoredStudent(),
  attendanceFilter: "all",
  weekOffset: 0,
  scheduleMode: "week"
};

function getStoredRole() {
  try {
    const role = localStorage.getItem("chesshub-role") || "parent";
    return ["parent", "student", "teacher", "center"].includes(role) ? role : "parent";
  }
  catch { return "parent"; }
}

function getStoredStudent() {
  try { return localStorage.getItem("chesshub-student") || students[0].id; }
  catch { return students[0].id; }
}

function storeStudent(id) {
  try { localStorage.setItem("chesshub-student", id); } catch { /* file:// privacy modes can block storage */ }
}

function currentStudent() {
  return students.find((student) => student.id === state.studentId) || students[0];
}

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
}

function calculateTuition(student) {
  return student.sessions * student.price;
}

function attendanceTotal(student) {
  return Object.values(student.attendance).reduce((sum, count) => sum + count, 0);
}

function attendanceRate(student) {
  const total = attendanceTotal(student);
  return total ? Math.round(((student.attendance.present + student.attendance.late) / total) * 100) : 0;
}

function badge(status) {
  const [label, className] = statusMap[status];
  return `<span class="badge ${className}">${label}</span>`;
}

function icon(id) {
  return `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
}

function renderDashboard(student) {
  const total = attendanceTotal(student);
  const rate = attendanceRate(student);
  const nextSessions = [
    { day: student.nextClass.day, month: student.nextClass.month, name: student.className, detail: `${student.teacher} • ${student.room.split(" • ")[0]}`, time: student.nextClass.time, color: "" },
    { day: student.id === "minh-anh" ? "17" : "20", month: "THG 9", name: student.className, detail: `${student.teacher} • ${student.room.split(" • ")[0]}`, time: student.nextClass.time, color: "green" },
    { day: "27", month: "THG 9", name: "Đấu tập cuối tháng", detail: "Thi đấu Swiss • Sảnh lớn", time: "08:30 — 11:00", color: "blue" }
  ];

  return `<div class="dashboard-grid fade-in">
    <div class="main-column">
      <article class="card next-class">
        <span class="label"><i class="pulse"></i> BUỔI HỌC TIẾP THEO</span>
        <h2>${student.className}</h2>
        <div class="class-meta">
          <span>${icon("calendar")} ${student.nextClass.weekday}, ${student.nextClass.day}/09/2026</span>
          <span>${icon("clock")} ${student.nextClass.time}</span>
          <span>${icon("location")} ${student.room}</span>
        </div>
        <div class="next-actions">
          <button class="button button-primary" data-view="schedule">Xem lịch học</button>
          ${state.role === "student" ? `<button class="button button-secondary" data-action="check-in">Điểm danh ngay</button>` : `<button class="button button-secondary" data-action="absence">Xin nghỉ</button>`}
        </div>
      </article>

      <div class="stats-grid">
        <article class="card stat-card"><div class="stat-top"><span class="stat-icon">${icon("check")}</span><span class="trend">+4%</span></div><strong>${rate}%</strong><p>Tỷ lệ chuyên cần</p></article>
        <article class="card stat-card"><div class="stat-top"><span class="stat-icon gold">${icon("calendar")}</span></div><strong>${student.sessions}</strong><p>Buổi trong tháng</p></article>
        <article class="card stat-card"><div class="stat-top"><span class="stat-icon blue">${icon("trophy")}</span></div><strong>${student.tournament.rank}</strong><p>Giải gần nhất</p></article>
      </div>

      <article class="card card-pad">
        <div class="section-head"><div><h2>Lịch sắp tới</h2><p>Những hoạt động cần nhớ trong tháng 9</p></div><button class="text-button" data-view="schedule">Xem tất cả ${icon("arrow")}</button></div>
        <div class="schedule-list">
          ${nextSessions.map((item) => `<div class="schedule-row"><div class="date-box"><strong>${item.day}</strong><small>${item.month}</small></div><div class="schedule-line ${item.color}"></div><div class="schedule-info"><strong>${item.name}</strong><span>${item.detail}</span></div><div class="schedule-time"><strong>${item.time.split(" — ")[0]}</strong><small>${item.time.split(" — ")[1]}</small></div></div>`).join("")}
        </div>
      </article>
    </div>

    <aside class="side-column">
      <article class="card attendance-card">
        <div class="section-head"><div><h2>Chuyên cần</h2><p>Tháng 9/2026</p></div><button class="text-button" data-view="attendance">Chi tiết</button></div>
        <div class="attendance-visual"><div class="ring" style="--value:${rate}"><span>${rate}%</span></div><div class="attendance-legend">
          <div class="legend-row"><span><i class="dot"></i>Có mặt</span><strong>${student.attendance.present}/${total}</strong></div>
          <div class="legend-row"><span><i class="dot late"></i>Đi muộn</span><strong>${student.attendance.late}</strong></div>
          <div class="legend-row"><span><i class="dot absent"></i>Vắng</span><strong>${student.attendance.excused + student.attendance.absent}</strong></div>
        </div></div>
      </article>

      ${state.role === "parent" ? `<article class="card fee-card">
        <div class="fee-top"><small>HỌC PHÍ THÁNG 9</small><strong>${formatMoney(calculateTuition(student))}</strong><span class="badge ${student.paid ? "badge-success" : "badge-warning"}">${student.paid ? "Đã thanh toán" : "Chờ thanh toán"}</span></div>
        <div class="fee-bottom"><div class="fee-detail"><span>${student.sessions} buổi × ${formatMoney(student.price)}</span><b>${formatMoney(calculateTuition(student))}</b></div><button class="button ${student.paid ? "button-outline" : "button-green"}" data-view="tuition">${student.paid ? "Xem biên nhận" : "Xem hướng dẫn thanh toán"}</button></div>
      </article>` : `<article class="card card-pad"><div class="section-head"><div><h2>Nội dung buổi tới</h2><p>${student.className}</p></div></div><div class="checkin-panel"><div class="checkin-radius">30<br>m</div><div><h3>Đòn chiến thuật kép</h3><p>Ôn đòn nĩa, ghim và mang bộ bài tập số 4.</p></div></div></article>`}

      <article class="card mini-tournament">
        <div class="section-head"><div><h2>${student.tournament.active ? "Trận sắp tới" : "Giải gần nhất"}</h2><p>${student.tournament.name}</p></div></div>
        ${student.tournament.active ? `<div class="tournament-match"><div class="player-mini"><span class="avatar">${student.initials}</span><strong>${student.shortName}</strong></div><span class="versus">VS</span><div class="player-mini"><span class="avatar" style="background:linear-gradient(135deg,#6184aa,#345a80)">GB</span><strong>${student.tournament.opponent}</strong></div></div>` : `<div class="empty-state" style="padding:16px 0 2px"><div class="empty-icon">♜</div><h3>${student.tournament.rank}</h3><p>Đã hoàn thành 5 ván đấu</p></div>`}
      </article>
    </aside>
  </div>`;
}

function renderSchedule(student) {
  const minOffset = student.id === "minh-anh" ? -1 : 0;
  const maxOffset = student.id === "minh-anh" ? 1 : 2;
  const base = (student.id === "minh-anh" ? 14 : 7) + state.weekOffset * 7;
  const firstClassDay = student.id === "minh-anh" ? 0 : 6;
  const events = [
    { day: firstClassDay, name: student.className, time: student.nextClass.time, room: student.room.split(" • ")[0], color: "" },
    ...(student.id === "minh-anh" ? [
      { day: 3, name: student.className, time: student.nextClass.time, room: student.room.split(" • ")[0], color: "gold" },
      { day: 6, name: "Đấu tập nội bộ", time: "08:30 — 10:30", room: "Sảnh thi đấu", color: "" }
    ] : [])
  ];
  const weekdays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];
  const dateRange = `${String(base).padStart(2,"0")}/09 — ${String(base + 6).padStart(2,"0")}/09/2026`;
  const desktopCalendar = state.scheduleMode === "month"
    ? `<div class="month-grid">${weekdays.map((day) => `<div class="month-weekday">${day}</div>`).join("")}${[31,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,1,2,3,4].map((day, index) => {
        const muted = index === 0 || index > 30;
        const hasClass = !muted && (day === Number(student.nextClass.day) || (student.id === "minh-anh" && [17,21,24,27].includes(day)) || (student.id === "gia-huy" && [20,27].includes(day)));
        return `<div class="month-cell ${muted ? "muted" : ""} ${day === 12 && !muted ? "today" : ""}"><span>${day}</span>${hasClass ? `<small class="month-dot">${day === 27 ? "Đấu tập" : student.className}</small>` : ""}</div>`;
      }).join("")}</div>`
    : `<div class="calendar-grid">${weekdays.map((day, index) => {
        const event = events.find((item) => item.day === index && state.weekOffset === 0);
        return `<div class="calendar-day ${index === firstClassDay && state.weekOffset === 0 ? "today" : ""}"><div class="day-head"><small>${day}</small><strong>${base + index}</strong></div>${event ? `<div class="calendar-event ${event.color}"><strong>${event.name}</strong><span>${event.time}<br>${event.room}</span></div>` : ""}</div>`;
      }).join("")}</div>`;

  return `<div class="fade-in">
    <div class="view-intro"><div><h2>Lịch học của ${student.shortName}</h2><p>Theo dõi lịch học, lịch đấu tập và gửi yêu cầu xin nghỉ. Các buổi bị hủy sẽ không tính vào chuyên cần và học phí.</p></div><div class="view-actions"><div class="mode-toggle"><button class="${state.scheduleMode === "week" ? "active" : ""}" data-schedule-mode="week">Theo tuần</button><button class="${state.scheduleMode === "month" ? "active" : ""}" data-schedule-mode="month">Theo tháng</button></div></div></div>
    <article class="card">
      <div class="week-toolbar"><div><h3>${state.scheduleMode === "week" ? "Tuần học" : "Tháng 9/2026"}</h3><p>${state.scheduleMode === "week" ? dateRange : "6 buổi học • 1 buổi đấu tập"}</p></div>${state.scheduleMode === "week" ? `<div class="week-arrows"><button data-action="week-prev" aria-label="Tuần trước" ${state.weekOffset <= minOffset ? "disabled" : ""}>${icon("arrow")}</button><button data-action="week-next" aria-label="Tuần sau" ${state.weekOffset >= maxOffset ? "disabled" : ""}>${icon("arrow")}</button></div>` : ""}</div>
      ${desktopCalendar}
      <div class="mobile-schedule">${state.weekOffset === 0 ? events.map((event) => `<article class="card session-card"><div class="date-box"><strong>${base + event.day}</strong><small>THG 9</small></div><div class="schedule-info"><strong>${event.name}</strong><span>${weekdays[event.day]} • ${event.time}<br>${event.room}</span></div>${event.day === 0 ? `<button class="text-button" data-action="absence">Xin nghỉ</button>` : badge("present")}</article>`).join("") : `<div class="empty-state"><div class="empty-icon">♟</div><h3>Chưa có lịch học</h3><p>Trung tâm chưa xếp lịch cho tuần này.</p></div>`}</div>
    </article>
  </div>`;
}

function renderAttendance(student) {
  const total = attendanceTotal(student);
  const rate = attendanceRate(student);
  const rows = student.recent.filter((item) => state.attendanceFilter === "all" || item.status === state.attendanceFilter);
  return `<div class="fade-in">
    <div class="view-intro"><div><h2>Kết quả chuyên cần</h2><p>Lịch sử điểm danh được giáo viên cập nhật sau mỗi buổi học. Phụ huynh có thể gửi phản hồi nếu thông tin chưa chính xác.</p></div></div>
    <div class="attendance-summary">
      <article class="card big-stat"><div class="ring" style="--value:${rate}"><span>${rate}%</span></div><div><h3>Duy trì rất tốt!</h3><p>${student.shortName} đã tham gia ${student.attendance.present + student.attendance.late}/${total} buổi hợp lệ.</p></div></article>
      <article class="card metric-card"><span>Có mặt</span><strong>${student.attendance.present}</strong><small>buổi học</small></article>
      <article class="card metric-card"><span>Đi muộn</span><strong>${student.attendance.late}</strong><small>buổi học</small></article>
      <article class="card metric-card"><span>Vắng</span><strong>${student.attendance.excused + student.attendance.absent}</strong><small>buổi học</small></article>
    </div>
    <article class="card card-pad">
      <div class="section-head"><div><h2>Lịch sử điểm danh</h2><p>Cập nhật gần nhất ngày 10/09/2026</p></div></div>
      <div class="filter-row">${[["all","Tất cả"],["present","Có mặt"],["late","Đi muộn"],["excused","Vắng có phép"],["absent","Vắng không phép"]].map(([value,label]) => `<button class="filter-chip ${state.attendanceFilter === value ? "active" : ""}" data-filter="${value}">${label}</button>`).join("")}</div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Ngày học</th><th>Lớp học</th><th>Giáo viên</th><th>Trạng thái</th></tr></thead><tbody>${rows.length ? rows.map((row) => `<tr><td><strong>${row.date}</strong><small>${row.day}</small></td><td>${row.className}</td><td>${row.teacher}</td><td>${badge(row.status)}</td></tr>`).join("") : `<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">♙</div><h3>Không có kết quả</h3><p>Hãy chọn một trạng thái khác.</p></div></td></tr>`}</tbody></table></div>
    </article>
  </div>`;
}

function renderTuition(student) {
  const amount = calculateTuition(student);
  return `<div class="fade-in">
    <div class="view-intro"><div><h2>Học phí & thanh toán</h2><p>Học phí được tính theo số buổi hợp lệ trong tháng. Buổi hủy bởi trung tâm không được đưa vào hóa đơn.</p></div></div>
    <div class="tuition-layout">
      <div>
        <article class="card invoice-card">
          <div class="invoice-head"><div><small>HÓA ĐƠN HIỆN TẠI</small><h3>Học phí tháng 09/2026</h3></div><span class="badge ${student.paid ? "badge-success" : "badge-warning"}">${student.paid ? "Đã thanh toán" : "Hạn 20/09/2026"}</span></div>
          <div class="invoice-body">
            <div class="invoice-line"><span>Lớp học</span><strong>${student.className}</strong></div>
            <div class="invoice-line"><span>Số buổi hợp lệ</span><strong>${student.sessions} buổi</strong></div>
            <div class="invoice-line"><span>Đơn giá mỗi buổi</span><strong>${formatMoney(student.price)}</strong></div>
            <div class="invoice-line"><span>Giảm trừ / ưu đãi</span><strong>0 ₫</strong></div>
            <div class="invoice-total"><div><span>TỔNG THANH TOÁN</span><strong>${formatMoney(amount)}</strong></div><div class="invoice-actions"><button class="button button-outline" data-action="invoice-detail">Chi tiết</button>${student.paid ? `<button class="button button-green" data-action="receipt">Xem biên nhận</button>` : `<button class="button button-green" data-action="copy-payment">Sao chép nội dung</button>`}</div></div>
          </div>
        </article>
        <article class="card card-pad history-list">
          <div class="section-head"><div><h2>Lịch sử học phí</h2><p>03 tháng gần nhất</p></div></div>
          <div class="table-wrap"><table class="data-table"><thead><tr><th>Kỳ học phí</th><th>Số buổi</th><th>Số tiền</th><th>Trạng thái</th></tr></thead><tbody>
            <tr><td><strong>Tháng 08/2026</strong><small>Thanh toán 18/08/2026</small></td><td>14 buổi</td><td>${formatMoney(14 * student.price)}</td><td>${badge("present").replace("Có mặt","Đã thanh toán")}</td></tr>
            <tr><td><strong>Tháng 07/2026</strong><small>Thanh toán 15/07/2026</small></td><td>12 buổi</td><td>${formatMoney(12 * student.price)}</td><td>${badge("present").replace("Có mặt","Đã thanh toán")}</td></tr>
          </tbody></table></div>
        </article>
      </div>
      <aside><article class="card bank-card"><h3>Chuyển khoản ngân hàng</h3><p>Vui lòng ghi đúng nội dung để trung tâm xác nhận nhanh và chính xác.</p><div class="bank-detail"><div><span>Ngân hàng</span><strong>MB Bank</strong></div><div><span>Số tài khoản</span><strong>0123 456 789</strong></div><div><span>Chủ tài khoản</span><strong>TRUNG TAM CO VUA CHESSHUB</strong></div><div><span>Nội dung</span><strong>HP09 ${student.id === "minh-anh" ? "MA1026" : "GH0826"}</strong></div></div><button class="button button-primary" style="width:100%" data-action="copy-payment">${icon("copy")} Sao chép nội dung</button></article></aside>
    </div>
  </div>`;
}

function renderTournament(student) {
  return `<div class="fade-in">
    <article class="card tournament-hero"><div><span class="badge badge-warning">${student.tournament.active ? "ĐANG DIỄN RA" : "ĐÃ KẾT THÚC"}</span><h2>${student.tournament.name}</h2><p>${student.tournament.active ? `${student.shortName} đã vượt qua vòng bảng và sẽ thi đấu bán kết vào 08:30, Chủ Nhật 27/09 tại sảnh thi đấu trung tâm.` : `${student.shortName} đã hoàn thành giải với tinh thần thi đấu tích cực và 3 trận thắng.`}</p></div><div class="rank-medal"><div><small>THÀNH TÍCH</small><strong>${student.tournament.rank}</strong></div></div></article>
    <article class="card bracket-card">
      <div class="section-head"><div><h2>Sơ đồ thi đấu</h2><p>Cúp loại trực tiếp • Nhóm U12</p></div><span class="badge badge-muted">Cập nhật 10/09</span></div>
      <div class="bracket">
        <div class="round"><div class="round-title">Tứ kết</div><div class="match-box"><div class="match-player winner current"><span>${student.shortName}</span><strong>1</strong></div><div class="match-player"><span>Lê Nhật Minh</span><em>0</em></div></div><div class="match-box"><div class="match-player winner"><span>Trần Gia Bảo</span><strong>1</strong></div><div class="match-player"><span>Phạm Tuấn Kiệt</span><em>0</em></div></div></div>
        <div class="round"><div class="round-title">Bán kết</div><div class="match-box"><div class="match-player current"><span>${student.shortName}</span><em>—</em></div><div class="match-player"><span>${student.tournament.opponent === "—" ? "Trần Gia Bảo" : student.tournament.opponent}</span><em>—</em></div></div></div>
        <div class="round"><div class="round-title">Chung kết</div><div class="match-box"><div class="empty-match">Chờ kết quả bán kết</div></div></div>
      </div>
    </article>
  </div>`;
}

function renderCheckIn(student) {
  return `<div class="fade-in"><div class="view-intro"><div><h2>Điểm danh buổi học</h2><p>Ứng dụng chỉ gửi vị trí sau khi bạn đồng ý. Máy chủ xác nhận khoảng cách tối đa 30 m, độ chính xác GPS và khung giờ của buổi học.</p></div></div><div class="management-grid"><article class="card card-pad"><div class="checkin-panel"><div class="checkin-radius">30<br>m</div><div><h3>${student.className}</h3><p>${student.nextClass.weekday}, ${student.nextClass.day}/09 • ${student.nextClass.time}<br>${student.room}</p></div></div><div class="invoice-line"><span>Nội dung</span><strong>Đòn chiến thuật kép</strong></div><div class="invoice-line"><span>Giáo viên</span><strong>${student.teacher}</strong></div><div class="invoice-line"><span>Cửa sổ điểm danh</span><strong>17:30 — 20:15</strong></div><button class="button button-green" style="width:100%;margin-top:20px" data-action="check-in">${icon("location")} Kiểm tra vị trí & điểm danh</button></article><aside class="card card-pad"><div class="section-head"><div><h2>Lưu ý</h2><p>Bảo vệ tính chính xác</p></div></div><div class="schedule-list"><div class="schedule-info"><strong>Bật định vị chính xác</strong><span>Độ sai lệch GPS phải từ 30 m trở xuống.</span></div><div class="schedule-info"><strong>Không lưu hành trình</strong><span>Chỉ vị trí tại thời điểm bấm điểm danh được ghi nhận.</span></div><div class="schedule-info"><strong>Mỗi buổi một kết quả</strong><span>Không thể gửi trùng điểm danh cho cùng buổi.</span></div></div></aside></div></div>`;
}

const teacherSessions = [
  { time: "09:00", end: "10:30", name: "Nền tảng cờ vua U8", room: "Phòng Tượng Xanh", students: 12, marked: 12 },
  { time: "18:00", end: "19:30", name: "Cờ chiến thuật U12", room: "Phòng Mã Trắng", students: 16, marked: 0 },
  { time: "19:45", end: "21:00", name: "Thi đấu nâng cao", room: "Sảnh lớn", students: 10, marked: 0 }
];

function renderTeacherDashboard() {
  return `<div class="fade-in"><div class="center-stats"><article class="card stat-card"><span class="stat-icon">${icon("calendar")}</span><strong>3</strong><p>Buổi dạy hôm nay</p></article><article class="card stat-card"><span class="stat-icon gold">${icon("user")}</span><strong>38</strong><p>Học viên phụ trách</p></article><article class="card stat-card"><span class="stat-icon blue">${icon("check")}</span><strong>12/38</strong><p>Đã điểm danh</p></article><article class="card stat-card"><span class="stat-icon">${icon("clock")}</span><strong>18:00</strong><p>Buổi tiếp theo</p></article></div><div class="management-grid"><article class="card card-pad"><div class="section-head"><div><h2>Lịch dạy hôm nay</h2><p>Thứ Bảy, 12/09/2026</p></div><button class="text-button" data-view="teachingSchedule">Xem lịch ${icon("arrow")}</button></div><div class="schedule-list">${teacherSessions.map((item, index) => `<div class="schedule-row"><div class="date-box"><strong>${item.time}</strong><small>${item.end}</small></div><div class="schedule-line ${index === 1 ? "green" : ""}"></div><div class="schedule-info"><strong>${item.name}</strong><span>${item.room} • ${item.students} học viên</span></div><span class="badge ${item.marked ? "badge-success" : "badge-warning"}">${item.marked ? "Đã điểm danh" : "Chưa bắt đầu"}</span></div>`).join("")}</div></article><aside class="card card-pad"><div class="section-head"><div><h2>Việc cần làm</h2><p>Trong ngày</p></div></div><div class="schedule-list"><div class="schedule-info"><strong>Soạn nội dung buổi U12</strong><span>Trước 17:30 hôm nay</span></div><div class="schedule-info"><strong>Hoàn tất nhận xét lớp U8</strong><span>Còn 4 học viên</span></div></div><button class="button button-green" style="width:100%;margin-top:18px" data-view="lessonContent">Cập nhật nội dung</button></aside></div></div>`;
}

function renderTeachingSchedule() {
  return `<div class="fade-in"><div class="view-intro"><div><h2>Lịch dạy của thầy Nam</h2><p>Lịch được trung tâm phân công. Mọi thay đổi sẽ được đồng bộ tới học viên và phụ huynh.</p></div></div><article class="card card-pad"><div class="section-head"><div><h2>Tuần 14 — 20/09</h2><p>7 buổi • 62 học viên</p></div></div><div class="schedule-list">${teacherSessions.concat(teacherSessions.slice(1)).map((item, index) => `<div class="schedule-row"><div class="date-box"><strong>${14 + index}</strong><small>THG 9</small></div><div class="schedule-line ${index % 2 ? "green" : "blue"}"></div><div class="schedule-info"><strong>${item.name}</strong><span>${item.room} • ${item.students} học viên</span></div><div class="schedule-time"><strong>${item.time}</strong><small>${item.end}</small></div></div>`).join("")}</div></article></div>`;
}

const classStudents = [
  ["Nguyễn Minh Anh", "MA", "present"], ["Trần Gia Bảo", "GB", "present"], ["Lê Nhật Minh", "NM", "late"],
  ["Phạm Tuấn Kiệt", "TK", "present"], ["Vũ Hoàng Long", "HL", "excused"], ["Đỗ Khánh An", "KA", "present"]
];

function renderRollcall() {
  return `<div class="fade-in"><div class="view-intro"><div><h2>Điểm danh lớp U12</h2><p>Buổi 18:00 — 19:30 • Phòng Mã Trắng. Kết quả lưu theo từng học viên và chỉ có một bản ghi mỗi buổi.</p></div><div class="view-actions"><button class="button button-green" data-action="save-rollcall">Lưu điểm danh</button></div></div><article class="card card-pad"><div class="table-wrap"><table class="data-table"><thead><tr><th>Học viên</th><th>Mã học viên</th><th>Trạng thái</th><th>Ghi nhận</th></tr></thead><tbody>${classStudents.map(([name, initials, status], index) => `<tr><td><div class="student-line"><span class="avatar">${initials}</span><strong>${name}</strong></div></td><td>CH${String(1026 + index).padStart(4,"0")}</td><td><select class="attendance-select"><option value="present" ${status === "present" ? "selected" : ""}>Có mặt</option><option value="late" ${status === "late" ? "selected" : ""}>Đi muộn</option><option value="excused" ${status === "excused" ? "selected" : ""}>Vắng có phép</option><option value="absent">Vắng không phép</option></select></td><td>${status === "present" ? `<span class="badge badge-success">Tự điểm danh</span>` : `<span class="badge badge-muted">Giáo viên</span>`}</td></tr>`).join("")}</tbody></table></div></article></div>`;
}

function renderLessonContent() {
  return `<div class="fade-in"><div class="view-intro"><div><h2>Nội dung buổi học</h2><p>Chuẩn bị chủ đề, mục tiêu và tài liệu. Nội dung sẽ hiển thị cho học viên trước buổi học.</p></div></div><article class="card lesson-card"><div class="lesson-card-top"><div><span class="badge badge-warning">SẮP DIỄN RA</span><h3 style="margin-top:10px">Cờ chiến thuật U12 • 14/09</h3></div><button class="button button-outline" data-action="edit-content">Chỉnh sửa</button></div><p><strong>Đòn chiến thuật kép</strong><br>Nhận biết và vận dụng đòn nĩa, ghim trong ván đấu thực hành.</p><div class="lesson-meta"><span>${icon("clock")} 18:00 — 19:30</span><span>${icon("location")} Phòng Mã Trắng</span><span>📎 Bộ bài tập số 4</span></div></article><article class="card lesson-card"><div class="lesson-card-top"><div><span class="badge badge-muted">BẢN NHÁP</span><h3 style="margin-top:10px">Thi đấu nâng cao • 15/09</h3></div><button class="button button-outline" data-action="edit-content">Soạn nội dung</button></div><p>Chưa có chủ đề và mục tiêu cho buổi học này.</p></article></div>`;
}

function renderCenterDashboard() {
  return `<div class="fade-in"><div class="center-stats"><article class="card stat-card"><span class="stat-icon">${icon("user")}</span><strong>126</strong><p>Học viên hoạt động</p></article><article class="card stat-card"><span class="stat-icon gold">${icon("calendar")}</span><strong>18</strong><p>Lớp đang mở</p></article><article class="card stat-card"><span class="stat-icon blue">${icon("check")}</span><strong>92%</strong><p>Chuyên cần tháng</p></article><article class="card stat-card"><span class="stat-icon">${icon("wallet")}</span><strong>84%</strong><p>Đã thu học phí</p></article></div><div class="management-grid"><article class="card card-pad"><div class="section-head"><div><h2>Hoạt động hôm nay</h2><p>8 buổi học tại 2 cơ sở</p></div><button class="text-button" data-view="centerCalendar">Mở lịch ${icon("arrow")}</button></div><div class="schedule-list">${teacherSessions.map((item, index) => `<div class="schedule-row"><div class="date-box"><strong>${item.time}</strong><small>${item.end}</small></div><div class="schedule-line ${index % 2 ? "green" : "blue"}"></div><div class="schedule-info"><strong>${item.name}</strong><span>${index === 1 ? "Thầy Hoàng Nam" : "Cô Thu Hà"} • ${item.room}</span></div><span class="badge badge-success">${item.students} HV</span></div>`).join("")}</div></article><aside class="card card-pad"><div class="section-head"><div><h2>Cảnh báo vận hành</h2><p>Cần xử lý</p></div></div><div class="schedule-list"><div class="schedule-info"><strong>3 hóa đơn quá hạn</strong><span>Tổng giá trị 5.280.000 ₫</span></div><div class="schedule-info"><strong>1 buổi thiếu nội dung</strong><span>Lớp Thi đấu nâng cao</span></div></div></aside></div></div>`;
}

function renderCenterCalendar() {
  return `<div class="fade-in"><div class="view-intro"><div><h2>Lịch toàn trung tâm</h2><p>Sắp lịch theo lớp, giáo viên và địa điểm. Cơ sở dữ liệu tự chặn các buổi dạy trùng giờ của cùng giáo viên.</p></div><div class="view-actions"><button class="button button-green" data-action="create-session">+ Tạo buổi học</button></div></div><article class="card card-pad"><div class="table-wrap"><table class="data-table"><thead><tr><th>Ngày giờ</th><th>Lớp học</th><th>Giáo viên</th><th>Địa điểm</th><th>Nội dung</th><th>Trạng thái</th></tr></thead><tbody>${teacherSessions.map((item, index) => `<tr><td><strong>${14 + index}/09/2026</strong><small>${item.time} — ${item.end}</small></td><td>${item.name}</td><td>${index === 1 ? "Hoàng Nam" : "Thu Hà"}</td><td>${item.room}</td><td>${index === 2 ? "Chưa cập nhật" : "Chiến thuật buổi " + (index + 1)}</td><td><span class="badge ${index === 2 ? "badge-warning" : "badge-success"}">${index === 2 ? "Bản nháp" : "Đã xếp lịch"}</span></td></tr>`).join("")}</tbody></table></div></article></div>`;
}

function renderClasses() {
  return `<div class="fade-in"><div class="view-intro"><div><h2>Quản lý lớp học</h2><p>Phân công giáo viên, ghi danh học viên và thiết lập đơn giá theo buổi.</p></div><div class="view-actions"><button class="button button-green" data-action="create-class">+ Tạo lớp</button></div></div><div class="stats-grid"><article class="card lesson-card"><span class="badge badge-success">ĐANG HỌC</span><h3 style="margin-top:12px">Cờ chiến thuật U12</h3><p>Thầy Hoàng Nam • 16 học viên<br>Thứ 2 & Thứ 5 • 18:00</p></article><article class="card lesson-card"><span class="badge badge-success">ĐANG HỌC</span><h3 style="margin-top:12px">Nền tảng cờ vua U8</h3><p>Cô Thu Hà • 12 học viên<br>Chủ Nhật • 09:00</p></article><article class="card lesson-card"><span class="badge badge-muted">BẢN NHÁP</span><h3 style="margin-top:12px">Khai cuộc nâng cao</h3><p>Chưa phân công • 4 học viên<br>Chưa xếp lịch</p></article></div></div>`;
}

function renderPeople() {
  const teacherMode = state.view === "teachers";
  const people = teacherMode ? [["Hoàng Nam","HN","3 lớp","Đang hoạt động"],["Thu Hà","TH","2 lớp","Đang hoạt động"],["Minh Quang","MQ","2 lớp","Đang hoạt động"]] : [["Nguyễn Minh Anh","MA","U12 • 2 lớp","94% chuyên cần"],["Trần Gia Bảo","GB","U12 • 1 lớp","96% chuyên cần"],["Lê Nhật Minh","NM","U10 • 2 lớp","89% chuyên cần"]];
  return `<div class="fade-in"><div class="view-intro"><div><h2>${teacherMode ? "Đội ngũ giáo viên" : "Danh sách học viên"}</h2><p>${teacherMode ? "Theo dõi phân công và trạng thái hoạt động." : "Tra cứu lớp học và chuyên cần của học viên."}</p></div>${state.role === "center" ? `<div class="view-actions"><button class="button button-green" data-action="add-person">+ Thêm ${teacherMode ? "giáo viên" : "học viên"}</button></div>` : ""}</div><article class="card card-pad"><div class="table-wrap"><table class="data-table"><thead><tr><th>${teacherMode ? "Giáo viên" : "Học viên"}</th><th>${teacherMode ? "Phân công" : "Lớp hiện tại"}</th><th>Trạng thái</th></tr></thead><tbody>${people.map(([name,initials,detail,status]) => `<tr><td><div class="student-line"><span class="avatar">${initials}</span><strong>${name}</strong></div></td><td>${detail}</td><td><span class="badge badge-success">${status}</span></td></tr>`).join("")}</tbody></table></div></article></div>`;
}

const renderers = {
  dashboard: renderDashboard, schedule: renderSchedule, attendance: renderAttendance, tuition: renderTuition,
  tournament: renderTournament, checkin: renderCheckIn, teacherDashboard: renderTeacherDashboard,
  teachingSchedule: renderTeachingSchedule, rollcall: renderRollcall, lessonContent: renderLessonContent,
  centerDashboard: renderCenterDashboard, centerCalendar: renderCenterCalendar, classes: renderClasses,
  teachers: renderPeople, students: renderPeople
};
const titles = {
  dashboard: ["TỔNG QUAN", "Chào buổi chiều!"], schedule: ["LỊCH HỌC", "Lịch học & hoạt động"], attendance: ["CHUYÊN CẦN", "Theo dõi quá trình học"], tuition: ["HỌC PHÍ", "Học phí & thanh toán"], tournament: ["GIẢI ĐẤU", "Hành trình thi đấu"], checkin: ["ĐIỂM DANH", "Xác nhận có mặt"], teacherDashboard: ["GIÁO VIÊN", "Chào buổi chiều, thầy Nam!"], teachingSchedule: ["LỊCH DẠY", "Lịch dạy được phân công"], rollcall: ["ĐIỂM DANH", "Điểm danh lớp học"], lessonContent: ["NỘI DUNG HỌC", "Kế hoạch từng buổi"], centerDashboard: ["TRUNG TÂM", "Tổng quan vận hành"], centerCalendar: ["LỊCH TRUNG TÂM", "Sắp xếp buổi học"], classes: ["LỚP HỌC", "Quản lý lớp học"], teachers: ["GIÁO VIÊN", "Đội ngũ trung tâm"], students: ["HỌC VIÊN", "Danh sách học viên"]
};

function renderNavigation() {
  const items = navigation[state.role];
  const markup = items.map(([view, iconName, label]) => `<button class="nav-item ${view === state.view ? "active" : ""}" data-view="${view}">${icon(iconName)}<span>${label}</span></button>`).join("");
  document.querySelector("#side-nav").innerHTML = markup;
  document.querySelector("#bottom-nav").innerHTML = items.map(([view, iconName, label]) => `<button class="${view === state.view ? "active" : ""}" data-view="${view}">${icon(iconName)}<span>${label}</span></button>`).join("");
}

function renderStudentMenu() {
  const menu = document.querySelector("#student-menu");
  menu.innerHTML = students.map((student) => `<button class="student-option ${student.id === state.studentId ? "selected" : ""}" data-student="${student.id}"><span class="avatar">${student.initials}</span><span><strong>${student.name}</strong><small>${student.level}</small></span></button>`).join("");
}

function render() {
  const roleViews = navigation[state.role].map(([view]) => view);
  if (!renderers[state.view] || !roleViews.includes(state.view)) state.view = roleViews[0];
  const student = currentStudent();
  const accounts = {
    parent: ["Lan Phương", "Phụ huynh", "LP"], student: [student.name, "Học viên", student.initials],
    teacher: ["Hoàng Nam", "Giáo viên", "HN"], center: ["Quản lý Trung tâm", "Trung tâm", "QT"]
  };
  renderNavigation();
  document.querySelector("#app-content").innerHTML = renderers[state.view](student);
  document.querySelector("#eyebrow").textContent = titles[state.view][0];
  document.querySelector("#page-title").textContent = titles[state.view][1];
  document.querySelector("#role-select").value = state.role;
  document.querySelector("#account-name").textContent = accounts[state.role][0];
  document.querySelector("#account-role").textContent = accounts[state.role][1];
  document.querySelector(".account-mini .avatar").textContent = accounts[state.role][2];
  document.querySelector("#student-name").textContent = student.name;
  document.querySelector("#student-avatar").textContent = student.initials;
  document.querySelector(".student-picker").hidden = state.role !== "parent";
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === state.view));
  renderStudentMenu();
  document.title = `${titles[state.view][1]} — ChessHub`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function navigate(view) {
  state.view = view;
  location.hash = view;
  render();
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function showDialog(content) {
  const dialog = document.querySelector("#app-dialog");
  document.querySelector("#dialog-content").innerHTML = content;
  dialog.showModal();
}

function absenceDialog() {
  const student = currentStudent();
  showDialog(`<span class="dialog-kicker">GỬI YÊU CẦU</span><h2>Xin nghỉ buổi học</h2><p>Yêu cầu sẽ được gửi tới ${student.teacher}. Giáo viên sẽ xác nhận lại trên ứng dụng.</p><div class="field"><label for="absence-session">Buổi học</label><select id="absence-session"><option>${student.nextClass.weekday}, ${student.nextClass.day}/09 • ${student.nextClass.time}</option></select></div><div class="field"><label for="absence-reason">Lý do</label><textarea id="absence-reason" required placeholder="Ví dụ: Gia đình có việc riêng..."></textarea></div><div class="dialog-actions"><button class="button button-outline" value="cancel">Để sau</button><button class="button button-green" type="button" data-action="submit-absence">Gửi yêu cầu</button></div>`);
}

async function copyPayment() {
  const student = currentStudent();
  const content = `HP09 ${student.id === "minh-anh" ? "MA1026" : "GH0826"}`;
  try { await navigator.clipboard.writeText(content); showToast(`Đã sao chép: ${content}`); }
  catch { showToast(`Nội dung chuyển khoản: ${content}`); }
}

function haversineMeters(latitude1, longitude1, latitude2, longitude2) {
  const radians = (value) => value * Math.PI / 180;
  const earthRadius = 6_371_000;
  const deltaLatitude = radians(latitude2 - latitude1);
  const deltaLongitude = radians(longitude2 - longitude1);
  const a = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(radians(latitude1)) * Math.cos(radians(latitude2)) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

function checkInWithLocation() {
  if (!navigator.geolocation) return showToast("Thiết bị không hỗ trợ định vị");
  showToast("Đang lấy vị trí chính xác của thiết bị…");
  navigator.geolocation.getCurrentPosition(async ({ coords, timestamp }) => {
    const distance = haversineMeters(coords.latitude, coords.longitude, 10.773130, 106.704050);
    const token = (() => { try { return localStorage.getItem("chesshub-token"); } catch { return null; } })();

    if (coords.accuracy > 30) {
      return showDialog(`<span class="dialog-kicker">CHƯA THỂ ĐIỂM DANH</span><h2>Vị trí chưa đủ chính xác</h2><p>Độ sai lệch hiện tại là ${Math.round(coords.accuracy)} m. Hãy bật định vị chính xác và thử lại.</p><div class="dialog-actions"><button class="button button-green" value="cancel">Đã hiểu</button></div>`);
    }
    if (distance > 30) {
      return showDialog(`<span class="dialog-kicker">NGOÀI PHẠM VI</span><h2>Cách trung tâm ${Math.round(distance)} m</h2><p>Bạn cần ở trong bán kính 30 m quanh Cơ sở 1 để điểm danh.</p><div class="dialog-actions"><button class="button button-green" value="cancel">Đã hiểu</button></div>`);
    }

    if (token) {
      try {
        const response = await fetch("http://localhost:3000/api/v1/sessions/70000000-0000-0000-0000-000000000001/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude, accuracy_m: coords.accuracy, captured_at: new Date(timestamp).toISOString() })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.code || "CHECKIN_FAILED");
        return showDialog(`<span class="dialog-kicker">ĐIỂM DANH THÀNH CÔNG</span><h2>Đã ghi nhận có mặt</h2><p>Khoảng cách được máy chủ xác nhận: ${result.distance_m} m.</p><div class="dialog-actions"><button class="button button-green" value="cancel">Hoàn tất</button></div>`);
      } catch (error) {
        return showToast(`API chưa ghi nhận: ${error.message}`);
      }
    }

    showDialog(`<span class="dialog-kicker">VỊ TRÍ HỢP LỆ • BẢN DEMO</span><h2>Bạn đang trong phạm vi</h2><p>Khoảng cách ước tính ${Math.round(distance)} m, độ chính xác ${Math.round(coords.accuracy)} m. Khi đăng nhập backend, máy chủ sẽ kiểm tra lại trước khi ghi điểm danh.</p><div class="dialog-actions"><button class="button button-green" value="cancel">Hoàn tất</button></div>`);
  }, () => showDialog(`<span class="dialog-kicker">CẦN QUYỀN VỊ TRÍ</span><h2>Không lấy được vị trí</h2><p>Hãy cho phép ChessHub truy cập vị trí khi đang dùng ứng dụng, sau đó thử lại.</p><div class="dialog-actions"><button class="button button-green" value="cancel">Đã hiểu</button></div>`), {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 12000
  });
}

document.querySelector("#role-select").addEventListener("change", (event) => {
  state.role = event.target.value;
  state.view = navigation[state.role][0][0];
  state.weekOffset = 0;
  try { localStorage.setItem("chesshub-role", state.role); } catch { /* optional preference */ }
  location.hash = state.view;
  render();
});

document.addEventListener("click", (event) => {
  const viewTarget = event.target.closest("[data-view]");
  if (viewTarget) { navigate(viewTarget.dataset.view); return; }

  const studentTarget = event.target.closest("[data-student]");
  if (studentTarget) {
    state.studentId = studentTarget.dataset.student;
    state.weekOffset = 0;
    storeStudent(state.studentId);
    document.querySelector(".student-picker-button").setAttribute("aria-expanded", "false");
    document.querySelector("#student-menu").hidden = true;
    render();
    showToast(`Đang xem hồ sơ ${currentStudent().shortName}`);
    return;
  }

  const filterTarget = event.target.closest("[data-filter]");
  if (filterTarget) { state.attendanceFilter = filterTarget.dataset.filter; render(); return; }

  const modeTarget = event.target.closest("[data-schedule-mode]");
  if (modeTarget) { state.scheduleMode = modeTarget.dataset.scheduleMode; state.weekOffset = 0; render(); return; }

  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) {
    if (!event.target.closest(".student-picker")) {
      document.querySelector(".student-picker-button").setAttribute("aria-expanded", "false");
      document.querySelector("#student-menu").hidden = true;
    }
    return;
  }

  const action = actionTarget.dataset.action;
  if (action === "student-menu") {
    const menu = document.querySelector("#student-menu");
    menu.hidden = !menu.hidden;
    actionTarget.setAttribute("aria-expanded", String(!menu.hidden));
  }
  if (action === "absence") absenceDialog();
  if (action === "check-in") checkInWithLocation();
  if (action === "submit-absence") {
    const reason = document.querySelector("#absence-reason").value.trim();
    if (!reason) { document.querySelector("#absence-reason").focus(); return; }
    document.querySelector("#app-dialog").close();
    showToast("Đã gửi yêu cầu xin nghỉ tới giáo viên");
  }
  if (action === "week-prev" || action === "week-next") {
    const student = currentStudent();
    const minOffset = student.id === "minh-anh" ? -1 : 0;
    const maxOffset = student.id === "minh-anh" ? 1 : 2;
    state.weekOffset = Math.min(maxOffset, Math.max(minOffset, state.weekOffset + (action === "week-prev" ? -1 : 1)));
    render();
  }
  if (action === "copy-payment") copyPayment();
  if (action === "notifications") showDialog(`<span class="dialog-kicker">THÔNG BÁO MỚI</span><h2>Lịch học tuần tới</h2><p>Lịch học của ${currentStudent().shortName} không thay đổi. Trung tâm sẽ thông báo trước nếu có điều chỉnh.</p><div class="dialog-actions"><button class="button button-green" value="cancel">Đã hiểu</button></div>`);
  if (action === "invoice-detail") showDialog(`<span class="dialog-kicker">CÁCH TÍNH HỌC PHÍ</span><h2>${currentStudent().sessions} buổi hợp lệ</h2><p>Chỉ các buổi học đã diễn ra hoặc được xếp lịch hợp lệ trong tháng mới được tính. Buổi trung tâm hủy sẽ tự động được loại trừ.</p><div class="dialog-actions"><button class="button button-green" value="cancel">Đã hiểu</button></div>`);
  if (action === "receipt") showDialog(`<span class="dialog-kicker">BIÊN NHẬN ĐIỆN TỬ</span><h2>Thanh toán thành công</h2><p>Trung tâm đã nhận ${formatMoney(calculateTuition(currentStudent()))} học phí tháng 09/2026 của ${currentStudent().name}.</p><div class="dialog-actions"><button class="button button-green" value="cancel">Đóng</button></div>`);
  if (action === "save-rollcall") showToast("Đã lưu điểm danh cho 6 học viên");
  if (action === "edit-content") showDialog(`<span class="dialog-kicker">NỘI DUNG BUỔI HỌC</span><h2>Soạn kế hoạch giảng dạy</h2><div class="field"><label>Chủ đề</label><textarea style="min-height:52px">Đòn chiến thuật kép</textarea></div><div class="field"><label>Mục tiêu</label><textarea>Nhận biết và vận dụng đòn nĩa, ghim trong ván đấu.</textarea></div><div class="dialog-actions"><button class="button button-outline" value="cancel">Hủy</button><button class="button button-green" type="button" data-action="save-generic">Lưu nội dung</button></div>`);
  if (action === "create-session") showDialog(`<span class="dialog-kicker">LỊCH TRUNG TÂM</span><h2>Tạo buổi học</h2><div class="field"><label>Lớp học</label><select><option>Cờ chiến thuật U12</option><option>Nền tảng cờ vua U8</option></select></div><div class="field"><label>Ngày và thời gian</label><select><option>21/09/2026 • 18:00 — 19:30</option></select></div><div class="field"><label>Nội dung</label><textarea placeholder="Chủ đề, mục tiêu buổi học…"></textarea></div><div class="dialog-actions"><button class="button button-outline" value="cancel">Hủy</button><button class="button button-green" type="button" data-action="save-generic">Tạo buổi học</button></div>`);
  if (action === "create-class" || action === "add-person") showDialog(`<span class="dialog-kicker">QUẢN LÝ TRUNG TÂM</span><h2>Thêm thông tin mới</h2><p>Biểu mẫu demo thể hiện luồng thao tác. Backend đã có endpoint tạo lớp và kiểm tra dữ liệu theo trung tâm.</p><div class="field"><label>Tên</label><textarea style="min-height:52px" placeholder="Nhập tên…"></textarea></div><div class="dialog-actions"><button class="button button-outline" value="cancel">Hủy</button><button class="button button-green" type="button" data-action="save-generic">Lưu</button></div>`);
  if (action === "save-generic") { document.querySelector("#app-dialog").close(); showToast("Đã lưu thay đổi"); }
});

window.addEventListener("hashchange", () => {
  const view = location.hash.replace("#", "");
  if (renderers[view] && view !== state.view) { state.view = view; render(); }
});

console.assert(calculateTuition({ sessions: 16, price: 140000 }) === 2240000, "Tuition calculation failed");
console.assert(attendanceRate({ attendance: { present: 7, late: 1, excused: 1, absent: 1 } }) === 80, "Attendance calculation failed");
console.assert(haversineMeters(10.773130, 106.704050, 10.773130, 106.704050) === 0, "Distance calculation failed");
console.assert(new Set(Object.values(navigation).map((items) => items.map(([view]) => view).join(","))).size === 4, "Role navigation must differ");
render();
