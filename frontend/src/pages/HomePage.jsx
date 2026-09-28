import { AppPageHeader } from "../components/layout/AppPageHeader";
import { AppSidebar } from "../components/layout/AppSidebar";

export function Homepage({ teacherId, teacherName, onLogout, onNavigate }) {
  const firstName = teacherName.split(" ").at(-1);
  return <div className="app-shell"><AppSidebar activeSection="home" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard" id="tong-quan">
      <AppPageHeader breadcrumb="Tổng quan" title={<>Chào mừng, {firstName}! <span aria-hidden="true">♟</span></>} description="Quản lý lớp học, lịch dạy và điểm danh của bạn từ thanh điều hướng." actions={<button className="secondary-button" onClick={() => onNavigate("/classes/new")}>＋ Tạo lớp mới</button>} />
    </main>
  </div>;
}

