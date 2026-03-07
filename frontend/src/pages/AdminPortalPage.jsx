import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  FolderOpen,
  Settings,
  LogOut,
  Search,
  MoreVertical,
  Plus,
  Pencil,
  CheckCircle2,
} from "lucide-react";

const API_BASE = "http://localhost:5000";

function statusStyle(status) {
  const key = (status || "").toLowerCase();
  if (key.includes("completed")) return { background: "#dcfce7", color: "#166534" };
  if (key.includes("received")) return { background: "#dbeafe", color: "#1d4ed8" };
  if (key.includes("fix")) return { background: "#fee2e2", color: "#b91c1c" };
  return { background: "#fef3c7", color: "#92400e" };
}

export default function AdminPortalPage({ user, onLogout }) {
  const [searchForm, setSearchForm] = useState({ fullName: "", phone: "" });
  const [filters, setFilters] = useState({
    status: "",
    currentLevel: "",
    assignedStaffName: "",
    date: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [students, setStudents] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [showDetail, setShowDetail] = useState(false);
  const [editingStaffByUserId, setEditingStaffByUserId] = useState({});

  const adminDisplayName =
    (user?.fullName && user.fullName.trim()) ||
    (user?.email ? user.email.split("@")[0] : "Admin");
  const adminInitials =
    adminDisplayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0].toUpperCase())
      .join("") || "AD";

  const selectedFullName = useMemo(() => {
    if (!selectedStudent) return "";
    return `${selectedStudent.lastName || ""} ${selectedStudent.firstName || ""}`.trim() || selectedStudent.fullName || "";
  }, [selectedStudent]);

  const fetchStudents = async (fullName = "", phone = "", currentFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (fullName.trim()) query.set("fullName", fullName.trim());
      if (phone.trim()) query.set("phone", phone.trim());
      if (currentFilters.status) query.set("status", currentFilters.status);
      if (currentFilters.currentLevel) query.set("currentLevel", currentFilters.currentLevel);
      if (currentFilters.assignedStaffName) query.set("assignedStaffName", currentFilters.assignedStaffName);
      if (currentFilters.date) query.set("date", currentFilters.date);
      const url = `${API_BASE}/api/admin/students${query.toString() ? `?${query.toString()}` : ""}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Khong the lay danh sach sinh vien.");
      setStudents(Array.isArray(data.students) ? data.students : []);
    } catch (e) {
      setError(e.message || "Loi ket noi server.");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/staff-options`);
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStaffOptions(Array.isArray(data.staffNames) ? data.staffNames : []);
        }
      } catch (e) {
      }
    })();
  }, []);

  const handleSearch = async () => {
    await fetchStudents(searchForm.fullName, searchForm.phone, filters);
    setShowDetail(false);
    setSelectedStudent(null);
    setDocuments([]);
  };

  const handleOpenDetail = async (row) => {
    if (showDetail && selectedStudent?.userId === row.userId) {
      setShowDetail(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/student/${row.userId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Khong the lay chi tiet sinh vien.");
      setSelectedStudent(data.student || null);
      setDocuments(data.documents || []);
      setShowDetail(true);
    } catch (e) {
      setError(e.message || "Loi ket noi server.");
      setShowDetail(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStaff = async (row, nextStaffName) => {
    const next = (nextStaffName || "").trim();

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/assign-staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: row.userId,
          assignedStaffName: next,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Khong the cap nhat nhan vien phu trach.");

      await fetchStudents(searchForm.fullName, searchForm.phone, filters);
      setEditingStaffByUserId((prev) => ({ ...prev, [row.userId]: false }));
      if (selectedStudent?.userId === row.userId) {
        const detailRes = await fetch(`${API_BASE}/api/admin/student/${row.userId}`);
        const detailData = await detailRes.json().catch(() => ({}));
        if (detailRes.ok) {
          setSelectedStudent(detailData.student || null);
          setDocuments(detailData.documents || []);
        }
      }
    } catch (e) {
      setError(e.message || "Loi cap nhat nhan vien phu trach.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ap-root">
      <style>{`
        .ap-root { position: fixed; inset: 0; display: grid; grid-template-columns: 250px 1fr; background: #f5f7fb; font-family: Inter, system-ui, sans-serif; color: #0f172a; }
        .ap-side { background: #fff; border-right: 1px solid #e2e8f0; padding: 18px 14px; box-sizing: border-box; display: flex; flex-direction: column; }
        .ap-brand-title { margin: 0; color: #1d4ed8; font-size: 24px; font-weight: 800; }
        .ap-brand-sub { margin-top: 4px; color: #7b8cab; font-size: 12px; }
        .ap-profile { margin-top: 12px; display: flex; gap: 10px; align-items: center; background: #f3f6fc; border-radius: 12px; padding: 10px; }
        .ap-avatar { width: 36px; height: 36px; border-radius: 50%; background: #2563eb; color: #fff; display: grid; place-items: center; font-size: 13px; font-weight: 800; }
        .ap-name { font-size: 14px; font-weight: 700; }
        .ap-role { font-size: 12px; color: #70809c; }
        .ap-menu { margin-top: 8px; display: grid; gap: 2px; }
        .ap-item { height: 38px; border-radius: 11px; display: flex; align-items: center; gap: 10px; padding: 0 10px; color: #4f6386; font-size: 14px; }
        .ap-item.active { background: #eaf0ff; color: #1d4ed8; font-weight: 700; }
        .ap-logout { margin-top: auto; border: none; background: none; color: #4f6386; height: 38px; border-radius: 11px; display: flex; align-items: center; gap: 9px; padding: 0 10px; cursor: pointer; }

        .ap-main { overflow: auto; padding: 20px 24px; box-sizing: border-box; display: flex !important; flex-direction: column !important; align-items: stretch !important; justify-content: flex-start !important; gap: 0; }
        .ap-top { display: flex !important; flex-direction: column !important; width: 100%; }
        .ap-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin: 0 0 12px; }
        .ap-title { margin: 0; font-size: 52px; line-height: 1.05; font-weight: 800; }
        .ap-subtitle { margin-top: 6px; color: #6b7d99; font-size: 19px; }
        .ap-add { border: none; height: 42px; border-radius: 999px; padding: 0 16px; background: #2563eb; color: #fff; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; white-space: nowrap; }
        .ap-toolbar { background: #fff; border: 1px solid #e2e8f0; border-radius: 15px; padding: 10px; display: grid; grid-template-columns: 1.6fr repeat(4, 1fr); gap: 8px; }
        .ap-search-view { height: 42px; border-radius: 999px; border: 1px solid #d8e0ec; background: #f8fbff; display: flex; align-items: center; gap: 8px; padding: 0 12px; }
        .ap-search-view input { border: none; background: transparent; outline: none; width: 100%; font-size: 14px; }
        .ap-pill { height: 42px; border-radius: 999px; border: 1px solid #d8e0ec; display: grid; place-items: center; color: #4f6386; font-size: 13px; }
        .ap-pill select,
        .ap-pill input[type="date"] {
          width: 100%;
          height: 100%;
          border: none;
          background: transparent;
          outline: none;
          color: #4f6386;
          font-size: 13px;
          text-align: center;
          padding: 0 10px;
          border-radius: 999px;
          cursor: pointer;
        }
        .ap-search-row { margin-top: 10px; display: grid; grid-template-columns: 1fr 220px 110px; gap: 8px; }
        .ap-search-row input { height: 40px; border-radius: 10px; border: 1px solid #d8e0ec; padding: 0 12px; font-size: 14px; outline: none; }
        .ap-search-btn { height: 40px; border-radius: 10px; border: none; background: #2563eb; color: #fff; font-weight: 700; cursor: pointer; }
        .ap-error { color: #b91c1c; margin-top: 8px; font-size: 13px; font-weight: 600; }

        .ap-table { margin-top: 30px; background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden; width: 100%; }
        .ap-thead, .ap-tr { display: grid; grid-template-columns: 2.1fr 2fr 1.2fr 1.5fr 90px; align-items: center; column-gap: 16px; padding: 12px 16px; }
        .ap-thead { font-size: 12px; font-weight: 700; color: #5e708d; background: #f8fbff; }
        .ap-tr { border-top: 1px solid #eef2f8; }
        .ap-cell-name { display: flex; align-items: center; gap: 10px; }
        .ap-mini { width: 32px; height: 32px; border-radius: 50%; background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 800; display: grid; place-items: center; }
        .ap-l1 { font-size: 14px; font-weight: 700; }
        .ap-l2 { font-size: 12px; color: #7c8ca8; margin-top: 2px; }
        .ap-staff { display: inline-flex; align-items: center; gap: 8px; }
        .ap-staff-select {
          min-width: 180px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #cfd9e8;
          background: #fff;
          color: #4f6386;
          font-size: 12px;
          padding: 0 10px;
          outline: none;
          cursor: pointer;
        }
        .ap-staff-edit {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid #cfd9e8;
          background: #fff;
          color: #4f6386;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .ap-badge { display: inline-flex; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .ap-act { border: none; background: transparent; cursor: pointer; color: #667998; width: 32px; height: 32px; border-radius: 8px; }
        .ap-empty { padding: 18px 16px; color: #7c8ca8; font-size: 14px; border-top: 1px solid #eef2f8; }
        .ap-foot { border-top: 1px solid #eef2f8; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 16px; color: #7c8ca8; font-size: 12px; }
        .ap-pages { display: inline-flex; gap: 6px; align-items: center; }
        .ap-page { width: 26px; height: 26px; min-width: 26px; border-radius: 50%; border: 1px solid #d8e0ec; display: grid; place-items: center; font-size: 11px; color: #5f7290; }
        .ap-page.active { background: #2563eb; color: #fff; border-color: #2563eb; }

        .ap-detail { margin-top: 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 16px; display: grid; gap: 14px; }
        .ap-detail-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .ap-detail-title { font-size: 18px; font-weight: 800; }
        .ap-back-btn {
          height: 34px;
          border-radius: 8px;
          border: 1px solid #cfd9e8;
          background: #fff;
          color: #4f6386;
          font-size: 13px;
          font-weight: 600;
          padding: 0 12px;
          cursor: pointer;
        }
        .ap-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; color: #334155; font-size: 14px; }
        .ap-doc-list { display: grid; gap: 8px; }
        .ap-doc-item { border: 1px solid #e5ecf6; border-radius: 10px; background: #f8fbff; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
      `}</style>

      <aside className="ap-side">
        <div>
          <h2 className="ap-brand-title">Admin Panel</h2>
          <div className="ap-brand-sub">Study Abroad System</div>
        </div>
        <div className="ap-profile">
          <div className="ap-avatar">{adminInitials}</div>
          <div>
            <div className="ap-name">{adminDisplayName}</div>
            <div className="ap-role">Tai khoan nhan vien</div>
          </div>
        </div>
        <div className="ap-menu">
          <div className="ap-item"><LayoutDashboard size={17} /> Dashboard</div>
          <div className="ap-item active"><Users size={17} /> Students</div>
          <div className="ap-item"><FileText size={17} /> Applications</div>
          <div className="ap-item"><FolderOpen size={17} /> Documents</div>
          <div className="ap-item"><Settings size={17} /> Settings</div>
        </div>
        <button className="ap-logout" onClick={onLogout}><LogOut size={17} /> Log Out</button>
      </aside>

      <main className="ap-main">
        <section className="ap-top">
          <div className="ap-head">
            <div>
              <h1 className="ap-title">Quan ly Sinh vien</h1>
              <div className="ap-subtitle">Quan ly ho so dang ky cua sinh vien va theo doi tinh trang ho so.</div>
            </div>
            <button className="ap-add"><Plus size={16} /> Them moi sinh vien</button>
          </div>
          <div className="ap-toolbar">
            <div className="ap-search-view">
              <Search size={16} color="#7b8cab" />
              <input placeholder="Tim kiem theo ho ten + sdt" value={`${searchForm.fullName}${searchForm.phone ? ` | ${searchForm.phone}` : ""}`} readOnly />
            </div>
            <div className="ap-pill">
              <select
                value={filters.status}
                onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                title="Trang thai"
              >
                <option value="">Trang thai: trống</option>
                <option value="received">Trang thai:Received</option>
                <option value="processing">Trang thai:Processing</option>
                <option value="completed">Trang thai:Completed</option>
              </select>
            </div>
            <div className="ap-pill">
              <select
                value={filters.currentLevel}
                onChange={(e) => setFilters((p) => ({ ...p, currentLevel: e.target.value }))}
                title="Trinh do hien tai"
              >
                <option value="">Trinh do hien tai: trống</option>
                <option value="Bac dai hoc">Bac dai hoc</option>
                <option value="Bac thac si">Bac thac si</option>
                <option value="Bac chuyen tiep">Bac chuyen tiep</option>
                <option value="Bac tien si">Bac tien si</option>
              </select>
            </div>
            <div className="ap-pill">
              <select
                value={filters.assignedStaffName}
                onChange={(e) => setFilters((p) => ({ ...p, assignedStaffName: e.target.value }))}
                title="Nhan vien phu trach"
              >
                <option value="">Nhan vien phu trach: trống</option>
                {staffOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="ap-pill">
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters((p) => ({ ...p, date: e.target.value }))}
                title="Ngay"
              />
            </div>
          </div>
          <div className="ap-search-row">
            <input placeholder="Nhap ho ten sinh vien" value={searchForm.fullName} onChange={(e) => setSearchForm((p) => ({ ...p, fullName: e.target.value }))} />
            <input placeholder="Nhap so dien thoai" value={searchForm.phone} onChange={(e) => setSearchForm((p) => ({ ...p, phone: e.target.value }))} />
            <button className="ap-search-btn" onClick={handleSearch} disabled={loading}>{loading ? "Dang tim..." : "Tim"}</button>
          </div>
          {error && <div className="ap-error">{error}</div>}
        </section>

        <section className="ap-table">
          <div className="ap-thead">
            <div>QUAN LY SINH VIEN</div>
            <div>TRINH DO BANG CAP HIEN TAI</div>
            <div>TRANG THAI</div>
            <div>NHAN VIEN PHU TRACH</div>
            <div>ACTION</div>
          </div>

          {!students.length && <div className="ap-empty">Chua co sinh vien nao trong he thong.</div>}

          {students.map((row) => {
            const rowName = `${row.lastName || ""} ${row.firstName || ""}`.trim() || row.fullName;
            const rowStatus = row.isCompleted ? "Completed" : (row.documentCount > 0 ? "Processing" : "Received");
            return (
              <div className="ap-tr" key={row.userId}>
                <div className="ap-cell-name">
                  <div className="ap-mini">{(rowName || "SV").slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div className="ap-l1">{rowName}</div>
                    <div className="ap-l2">ID: #ST-{String(row.userId || "").padStart(4, "0")}</div>
                  </div>
                </div>
                <div>
                  <div className="ap-l1">{row.currentLevel || "Chua co thong tin"}</div>
                  <div className="ap-l2">{row.phone || "-"}</div>
                </div>
                <div><span className="ap-badge" style={statusStyle(rowStatus)}>{rowStatus}</span></div>
                <div>
                  <div className="ap-staff">
                    {row.assignedStaffName && !editingStaffByUserId[row.userId] ? (
                      <>
                        <span className="ap-l2">{row.assignedStaffName}</span>
                        <button
                          className="ap-staff-edit"
                          onClick={() => setEditingStaffByUserId((prev) => ({ ...prev, [row.userId]: true }))}
                          title="Sua nhan vien phu trach"
                        >
                          <Pencil size={12} />
                        </button>
                      </>
                    ) : (
                      <select
                        className="ap-staff-select"
                        value={row.assignedStaffName || ""}
                        onChange={(e) => handleAssignStaff(row, e.target.value)}
                        title="Chon nhan vien phu trach"
                      >
                        <option value="">Chon nhan vien phu trach</option>
                        {staffOptions.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                        {row.assignedStaffName && !staffOptions.includes(row.assignedStaffName) ? (
                          <option value={row.assignedStaffName}>{row.assignedStaffName}</option>
                        ) : null}
                      </select>
                    )}
                  </div>
                </div>
                <div><button className="ap-act" onClick={() => handleOpenDetail(row)}><MoreVertical size={17} /></button></div>
              </div>
            );
          })}

          <div className="ap-foot">
            <span>Hien thi {students.length ? `1 den ${students.length}` : "0"} ket qua thuc te</span>
            <div className="ap-pages">
              <span className="ap-page active">1</span>
            </div>
          </div>
        </section>

        {showDetail && selectedStudent && (
          <section className="ap-detail">
            <div className="ap-detail-head">
              <div className="ap-detail-title">Thong tin chi tiet ho so</div>
              <button
                className="ap-back-btn"
                onClick={() => {
                  setShowDetail(false);
                  setSelectedStudent(null);
                  setDocuments([]);
                }}
              >
                Quay lai
              </button>
            </div>
            <div className="ap-detail-grid">
              <div>Ho va ten: {selectedFullName || selectedStudent.fullName}</div>
              <div>Email: {selectedStudent.email || "-"}</div>
              <div>So dien thoai: {selectedStudent.phone || "-"}</div>
              <div>Ngay sinh: {selectedStudent.birthday || "-"}</div>
              <div>Quoc tich: {selectedStudent.nationality || "-"}</div>
              <div>Dia chi: {selectedStudent.address || "-"}</div>
              <div>Bang cap hien tai: {selectedStudent.currentLevel || "-"}</div>
              <div>Bang cap mong muon: {selectedStudent.targetLabel || "-"}</div>
              <div>Nhan vien phu trach: {selectedStudent.assignedStaffName || "Chua co thong tin"}</div>
            </div>
            <div className="ap-detail-title">Danh sach tai lieu</div>
            <div className="ap-doc-list">
              {documents.length ? documents.map((doc, idx) => (
                <div className="ap-doc-item" key={`${doc.doc_name}-${idx}`}>
                  <span>{doc.doc_name} - {doc.file_name || "Chua nop"}</span>
                  <CheckCircle2 size={16} color={doc.file_name ? "#16a34a" : "#94a3b8"} />
                </div>
              )) : <div className="ap-l2">Chua co tai lieu.</div>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
