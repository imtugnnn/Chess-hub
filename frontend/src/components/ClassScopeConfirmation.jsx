import { useEffect, useState } from 'react';
import { confirmClassScope, getStudentOptions } from '../services/api';

export function ClassScopeConfirmation({ teacherId, classId, onConfirmed }) {
  const [centers, setCenters] = useState([]);
  const [scope, setScope] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    getStudentOptions(teacherId).then(options => { if (live) { setCenters(options.centers); setLoaded(true); setError(''); } })
      .catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [teacherId, retry]);
  async function confirm(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await confirmClassScope(teacherId, classId, scope === 'personal' ? null : scope); await onConfirmed(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <form className="management-card workspace-form" onSubmit={confirm}>
    <div><h2>Xác nhận phạm vi của lớp</h2><p>Chọn một lần trước khi thêm học sinh. Hồ sơ mới sẽ thuộc cá nhân của chủ lớp hoặc trung tâm đã chọn. Hồ sơ cũ được giữ nguyên quyền sở hữu.</p></div>
    <label>Lớp thuộc<select value={scope} onChange={e => setScope(e.target.value)} required disabled={!loaded || busy}>
      <option value="">Chọn phạm vi</option><option value="personal">Cá nhân</option>{centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select></label>
    {error && <p role="alert" className="management-message">{error} {!loaded && <button type="button" className="secondary-button" onClick={() => setRetry(r => r + 1)}>Thử lại</button>}</p>}
    <div className="management-actions"><button className="primary-button" disabled={busy || !loaded || !scope}>{busy ? 'Đang lưu…' : 'Xác nhận phạm vi'}</button></div>
  </form>;
}
