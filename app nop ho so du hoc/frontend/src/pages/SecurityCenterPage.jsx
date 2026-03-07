import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  CircleCheckBig,
  Filter,
  HelpCircle,
  LockKeyhole,
  Save,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

const RESOURCE_COLUMNS = [
  { key: "finance", label: "Tài chính", description: "Thu chi, hóa đơn" },
  { key: "visa_documents", label: "Visa & Hồ sơ ", description: "Passport, COE" },
  { key: "student_data", label: "Dữ liệu học sinh", description: "Thông tin cá nhân" },
];

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("vi-VN").format(date);
}

function initialsOf(name) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "SC"
  );
}

function badgeStyle(label) {
  const text = (label || "").toLowerCase();
  if (text.includes("kế tóan") || text.includes("tài chính")) {
    return { background: "#f3e8ff", color: "#7c3aed" };
  }
  if (text.includes("xử lý") || text.includes("visa")) {
    return { background: "#ffedd5", color: "#c2410c" };
  }
  return { background: "#dbeafe", color: "#1d4ed8" };
}

function normalizePermissions(permissions) {
  const map = new Map((permissions || []).map((item) => [item.resource, item]));
  return RESOURCE_COLUMNS.map((resource) => {
    const current = map.get(resource.key) || {};
    return {
      resource: resource.key,
      label: resource.label,
      view: Boolean(current.view),
      edit: Boolean(current.edit),
      delete: Boolean(current.delete),
      approve: Boolean(current.approve),
    };
  });
}

export default function SecurityCenterPage({ apiBaseUrl = "http://localhost:5000/api/security" }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [permissionsByUserId, setPermissionsByUserId] = useState({});
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dirtyUserIds, setDirtyUserIds] = useState([]);

  const visibleResources = useMemo(
    () => (department ? RESOURCE_COLUMNS.filter((resource) => resource.key === department) : RESOURCE_COLUMNS),
    [department]
  );

  const requestJson = async (path, init) => {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Không thể kết nối Security Center.");
    }
    return data;
  };

  const loadUsers = async (nextSearch = search, nextDepartment = department) => {
    const query = new URLSearchParams();
    if (nextSearch.trim()) query.set("search", nextSearch.trim());
    if (nextDepartment.trim()) query.set("department", nextDepartment.trim());

    const userData = await requestJson(`/users${query.toString() ? `?${query.toString()}` : ""}`);
    const foundUsers = Array.isArray(userData.users) ? userData.users : [];
    setUsers(foundUsers);

    const permissionPairs = await Promise.all(
      foundUsers.map(async (user) => {
        const permissionData = await requestJson(`/permissions/${user.id}`);
        return [user.id, normalizePermissions(permissionData.permissions)];
      })
    );

    setPermissionsByUserId(Object.fromEntries(permissionPairs));
  };

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const requestData = await requestJson("/pending-requests");
      setPendingRequests(Array.isArray(requestData.requests) ? requestData.requests : []);
      await loadUsers();
    } catch (nextError) {
      setPendingRequests([]);
      setUsers([]);
      setPermissionsByUserId({});
      setError(nextError.message || "Khong the tai du lieu bao mat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleRequestAction = async (requestId, action) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await requestJson(action === "approve" ? "/approve" : "/reject", {
        method: "POST",
        body: JSON.stringify({ requestId }),
      });
      setPendingRequests((current) => current.filter((item) => item.id !== requestId));
      setMessage(action === "approve" ? "Đã phê duyệt yêu cầu truy cập." : "Đã từ chối yêu cầu truy cập.");
      await loadUsers();
    } catch (nextError) {
      setError(nextError.message || "Không thể cập nhật yêu cầu truy cập.");
    } finally {
      setSaving(false);
    }
  };

  const applySearch = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await loadUsers();
    } catch (nextError) {
      setError(nextError.message || "Không thể lọc người dùng.");
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = (userId, resource, action, checked) => {
    setPermissionsByUserId((current) => {
      const nextPermissions = normalizePermissions(current[userId]).map((permission) =>
        permission.resource === resource ? { ...permission, [action]: checked } : permission
      );
      return { ...current, [userId]: nextPermissions };
    });

    setDirtyUserIds((current) => (current.includes(userId) ? current : [...current, userId]));
  };

  const saveChanges = async () => {
    if (!dirtyUserIds.length) {
      setMessage("Không có thay đổi cần lưu.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await Promise.all(
        dirtyUserIds.map((userId) =>
          requestJson(`/permissions/${userId}`, {
            method: "PUT",
            body: JSON.stringify({ permissions: permissionsByUserId[userId] || [] }),
          })
        )
      );
      setDirtyUserIds([]);
      setMessage("Đã lưu thay đổi phân quyền.");
    } catch (nextError) {
      setError(nextError.message || "Không thể lưu thay đổi phân quyền.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sc-page">
      <style>{`
        .sc-page { display: grid; gap: 22px; padding-bottom: 12px; }
        .sc-topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; background: rgba(255,255,255,0.92); border: 1px solid #dbe4f2; border-radius: 20px; padding: 14px 18px; box-shadow: 0 14px 28px rgba(15,23,42,0.04); }
        .sc-topbar-left { display: flex; align-items: center; gap: 14px; }
        .sc-topbar-icon { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; color: #2563eb; background: #eaf1ff; }
        .sc-topbar-title { margin: 0; font-size: 28px; font-weight: 800; color: #172033; }
        .sc-topbar-sub { margin-top: 5px; color: #7a89a2; font-size: 14px; }
        .sc-topbar-right { display: flex; align-items: center; gap: 10px; }
        .sc-search-shell { width: 280px; height: 40px; border-radius: 999px; border: 1px solid #e4ebf5; background: #f8fbff; display: inline-flex; align-items: center; gap: 8px; padding: 0 14px; color: #7b8cab; }
        .sc-search-shell input { width: 100%; border: none; outline: none; background: transparent; color: #334155; font-size: 13px; }
        .sc-icon-btn { width: 36px; height: 36px; border-radius: 999px; border: none; background: #f3f6fc; color: #60708b; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
        .sc-card { background: rgba(255,255,255,0.96); border: 1px solid #dbe4f2; border-radius: 22px; box-shadow: 0 16px 36px rgba(15,23,42,0.05); overflow: hidden; }
        .sc-section-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 22px 24px 8px; }
        .sc-title-wrap { display: flex; align-items: flex-start; gap: 10px; }
        .sc-section-accent { width: 4px; min-width: 4px; height: 20px; border-radius: 999px; background: #2563eb; margin-top: 4px; }
        .sc-title { margin: 0; font-size: 18px; font-weight: 800; }
        .sc-subtitle { margin: 5px 0 0; color: #71809a; font-size: 13px; }
        .sc-pill { padding: 6px 10px; border-radius: 999px; background: #fff1e6; color: #d46b08; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .sc-alert { display: flex; gap: 10px; align-items: center; padding: 12px 16px; border-radius: 16px; font-size: 14px; font-weight: 600; }
        .sc-alert.error { color: #b54708; background: #fff7ed; border: 1px solid #fed7aa; }
        .sc-alert.success { color: #067647; background: #ecfdf3; border: 1px solid #abefc6; }
        .sc-table-wrap, .sc-matrix-wrap { overflow-x: auto; padding: 0 20px 18px; }
        .sc-table, .sc-matrix { width: 100%; min-width: 840px; border-collapse: collapse; }
        .sc-table th, .sc-table td, .sc-matrix th, .sc-matrix td { padding: 14px 12px; border-top: 1px solid #edf1f7; text-align: left; vertical-align: top; }
        .sc-table th, .sc-matrix th { color: #60708b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; }
        .sc-user { display: flex; align-items: center; gap: 12px; }
        .sc-avatar { width: 34px; height: 34px; border-radius: 999px; display: grid; place-items: center; background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 800; flex-shrink: 0; }
        .sc-role-badge { display: inline-flex; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .sc-actions, .sc-toolbar, .sc-search-row { display: flex; gap: 12px; align-items: center; }
        .sc-btn-primary, .sc-btn-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 38px; padding: 0 16px; border-radius: 12px; border: 1px solid transparent; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .sc-btn-primary { color: #fff; background: linear-gradient(135deg, #2563eb, #3b82f6); box-shadow: 0 10px 18px rgba(37,99,235,0.2); }
        .sc-btn-secondary { color: #475467; background: #f8fafc; border-color: #d0d9e6; }
        .sc-btn-primary:disabled, .sc-btn-secondary:disabled { opacity: .6; cursor: not-allowed; }
        .sc-empty { text-align: center; color: #7c8aa5; padding: 20px 12px; }
        .sc-filter, .sc-search { display: inline-flex; align-items: center; gap: 8px; min-height: 42px; padding: 0 14px; border-radius: 14px; border: 1px solid #d8e1ef; background: #f8fbff; color: #66748d; }
        .sc-filter select, .sc-search input { border: none; background: transparent; outline: none; color: #172033; font-size: 14px; width: 100%; }
        .sc-search-row { justify-content: space-between; padding: 0 24px 16px; }
        .sc-search { flex: 1; }
        .sc-user-name { font-size: 14px; font-weight: 700; color: #172033; }
        .sc-user-role { margin-top: 2px; font-size: 12px; color: #7c8aa5; }
        .sc-head-sub { margin-top: 4px; font-size: 10px; color: #7c8aa5; text-transform: none; letter-spacing: 0; }
        .sc-permission { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; }
        .sc-check { display: inline-flex; align-items: center; gap: 6px; color: #60708b; font-size: 13px; }
        .sc-check input { width: 14px; height: 14px; accent-color: #2563eb; }
        .sc-note { color: #8a97ac; font-size: 12px; }
        .sc-footer { padding: 0 24px 20px; color: #7c8aa5; font-size: 12px; }
        .sc-cell-muted { color: #7c8aa5; font-size: 12px; }
        @media (max-width: 960px) {
          .sc-topbar, .sc-section-header, .sc-toolbar, .sc-search-row, .sc-actions { flex-direction: column; align-items: stretch; }
          .sc-btn-primary, .sc-btn-secondary, .sc-filter, .sc-search, .sc-search-shell { width: 100%; }
          .sc-topbar-title { font-size: 24px; }
        }
      `}</style>

      <section className="sc-topbar">
        <div className="sc-topbar-left">
          <div className="sc-topbar-icon">
            <LockKeyhole size={20} />
          </div>
          <div>
            <h1 className="sc-topbar-title">Trung tâm Bảo mật</h1>
            <div className="sc-topbar-sub">Phê duyệt yêu cầu truy cập và thiết lập quyền hạn cho từng vai trò.</div>
          </div>
        </div>
        <div className="sc-topbar-right">
          <label className="sc-search-shell">
            <Search size={15} />
            <input placeholder="Tìm kiếm nhân viên..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <button type="button" className="sc-icon-btn" aria-label="Thông báo"><Bell size={16} /></button>
          <button type="button" className="sc-icon-btn" aria-label="Hỗ trợ"><HelpCircle size={16} /></button>
        </div>
      </section>

      {error ? <div className="sc-alert error"><AlertCircle size={16} /><span>{error}</span></div> : null}
      {message ? <div className="sc-alert success"><CircleCheckBig size={16} /><span>{message}</span></div> : null}

      <section className="sc-card">
        <div className="sc-section-header">
          <div className="sc-title-wrap">
            <span className="sc-section-accent" />
            <div>
              <h2 className="sc-title">1. Phê duyệt Quyền truy cập</h2>
              <p className="sc-subtitle">Xử lý các yêu cầu đang chờ phê duyệt.</p>
            </div>
          </div>
          <span className="sc-pill">{pendingRequests.length} Yêu cầu mới</span>
        </div>
        <div className="sc-table-wrap">
          <table className="sc-table">
            <thead>
              <tr>
                <th>Người yêu cầu</th>
                <th>Email</th>
                <th>Vai trò yêu cầu</th>
                <th>Ngày yêu cầu</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {!pendingRequests.length ? (
                <tr>
                  <td colSpan={5} className="sc-empty">{loading ? "Đang tải danh sách yêu cầu..." : "Không có yêu cầu chờ xử lý."}</td>
                </tr>
              ) : (
                pendingRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div className="sc-user">
                        <div className="sc-avatar">{initialsOf(request.name)}</div>
                        <span className="sc-user-name">{request.name}</span>
                      </div>
                    </td>
                    <td className="sc-cell-muted">{request.email}</td>
                    <td><span className="sc-role-badge" style={badgeStyle(request.requestedRoleName)}>{request.requestedRoleName}</span></td>
                    <td className="sc-cell-muted">{formatDate(request.requestDate)}</td>
                    <td>
                      <div className="sc-actions">
                        <button type="button" className="sc-btn-secondary" disabled={saving} onClick={() => handleRequestAction(request.id, "reject")}>
                          <X size={14} /> Từ chối
                        </button>
                        <button type="button" className="sc-btn-primary" disabled={saving} onClick={() => handleRequestAction(request.id, "approve")}>
                          <Check size={14} /> Phê duyệt
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sc-card">
        <div className="sc-section-header">
          <div className="sc-title-wrap">
            <span className="sc-section-accent" />
            <div>
              <h2 className="sc-title">2. Phân quyền Người dùng</h2>
              <p className="sc-subtitle">Quản lý quyền theo phòng ban và lưu thay đổi theo từng nhân viên.</p>
            </div>
          </div>
          <div className="sc-toolbar">
            <label className="sc-filter">
              <Filter size={14} />
              <select value={department} onChange={(event) => setDepartment(event.target.value)}>
                <option value="">Tất cả phòng ban</option>
                {RESOURCE_COLUMNS.map((resource) => (
                  <option key={resource.key} value={resource.key}>{resource.label}</option>
                ))}
              </select>
            </label>
            <button type="button" className="sc-btn-primary" disabled={saving} onClick={saveChanges}>
              <Save size={14} /> {saving ? "Đang lưu..." : `Lưu thay đổi${dirtyUserIds.length ? ` (${dirtyUserIds.length})` : ""}`}
            </button>
          </div>
        </div>

        <div className="sc-search-row">
          <label className="sc-search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm nhân viên để phân quyền..." />
          </label>
          <div className="sc-note">Thay đổi sẽ được cập nhật sau khi nhấn "Lưu thay đổi"</div>
          <button type="button" className="sc-btn-secondary" onClick={applySearch}>Áp dụng bộ lọc</button>
        </div>

        <div className="sc-matrix-wrap">
          <table className="sc-matrix">
            <thead>
              <tr>
                <th>Nhân viên / Vai trò</th>
                {visibleResources.map((resource) => (
                  <th key={resource.key}>
                    <div>{resource.label}</div>
                    <div className="sc-head-sub">{resource.description}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!users.length ? (
                <tr>
                  <td colSpan={visibleResources.length + 1} className="sc-empty">Không có nhân viên phù hợp với bộ lọc hiện tại.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="sc-user">
                        <div className="sc-avatar">{initialsOf(user.name)}</div>
                        <div>
                          <div className="sc-user-name">{user.name}</div>
                          <div className="sc-user-role">{user.roleName || "Nhân viên hệ thống"}</div>
                        </div>
                      </div>
                    </td>
                    {visibleResources.map((resource) => {
                      const permission =
                        (permissionsByUserId[user.id] || []).find((item) => item.resource === resource.key) || {
                          resource: resource.key,
                          view: false,
                          edit: false,
                          delete: false,
                          approve: false,
                        };

                      return (
                        <td key={`${user.id}-${resource.key}`}>
                          <div className="sc-permission">
                            {["view", "edit", "delete", "approve"].map((action) => (
                              <label key={action} className="sc-check">
                                <input
                                  type="checkbox"
                                  checked={Boolean(permission[action])}
                                  onChange={(event) => updatePermission(user.id, resource.key, action, event.target.checked)}
                                />
                                <span>{action === "view" ? "Xem" : action === "edit" ? "Sửa" : action === "delete" ? "Xóa" : "Duyệt"}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="sc-footer"><ShieldCheck size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />Hiển thị {users.length} nhân viên khả dụng.</div>
      </section>
    </div>
  );
}
