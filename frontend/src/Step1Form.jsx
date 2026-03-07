import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  UserCircle,
  FileText,
  FolderOpen,
  GraduationCap,
  LogOut,
  Bell,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Check,
  ShieldCheck,
  Pencil,
} from "lucide-react";

const CURRENT_LEVEL_OPTIONS = ["Bac dai hoc", "Bac thac si", "Bac chuyen tiep", "Bac tien si"];
const TARGET_LEVEL_OPTIONS = [
  "Bac dai hoc - Nhom hoc sinh lop 12",
  "Bac dai hoc - Nhom da tot nghiep THPT",
  "Bac thac si - Nhom sinh vien nam cuoi",
  "Bac thac si - Nhom sinh vien da tot nghiep",
  "Bac chuyen tiep",
  "Bac tien si",
];

const TARGET_CHECKLISTS = {
  "Bac dai hoc - Nhom hoc sinh lop 12": [
    "Giay xac nhan hoc sinh ban goc",
    "Ket qua hoc tap lop 10, 11, hoc ky 1 lop 12 (co dau)",
    "10 anh 4x6 nen trang",
    "Can cuoc cong dan photo",
    "Ho chieu photo (neu co)",
    "Chung chi ngoai ngu Anh/Trung (neu co)",
    "Ho chieu",
    "Anh the",
    "Giay xac nhan hoc sinh",
    "Ket qua hoc tap",
    "Ban sao giay khai sinh",
    "CCCD photo cong chung",
    "Video gioi thieu ban than",
    "CV",
  ],
  "Bac dai hoc - Nhom da tot nghiep THPT": [
    "Bang THPT ban goc",
    "Hoc ba THPT ban goc",
    "10 anh 4x6 nen trang",
    "Can cuoc cong dan photo",
    "Ho chieu photo (neu co)",
    "Chung chi ngoai ngu Anh/Trung (neu co)",
    "Ho chieu",
    "Anh the",
    "Bang THPT",
    "Hoc ba",
    "Ban sao giay khai sinh",
    "CCCD photo cong chung",
    "Video gioi thieu ban than",
    "CV",
  ],
  "Bac thac si - Nhom sinh vien nam cuoi": [
    "Giay xac nhan sinh vien nam cuoi ban goc",
    "Bang diem Dai hoc den thoi diem nop ho so ban goc",
    "10 anh 4x6 nen trang",
    "Can cuoc cong dan photo",
    "Ho chieu photo (neu co)",
    "Chung chi ngoai ngu Anh/Trung (neu co)",
    "Ho chieu",
    "Anh the",
    "Bang THPT",
    "Hoc ba",
    "Ban sao giay khai sinh",
    "CCCD photo cong chung",
    "Video gioi thieu ban than",
    "CV",
  ],
  "Bac thac si - Nhom sinh vien da tot nghiep": [
    "Bang Dai hoc ban goc",
    "Bang diem Dai hoc ban goc",
    "10 anh 4x6 nen trang",
    "Can cuoc cong dan photo",
    "Ho chieu photo (neu co)",
    "Chung chi ngoai ngu Anh/Trung (neu co)",
    "Anh the",
    "Ho chieu",
    "Bang Dai hoc",
    "Bang diem",
    "Ban sao giay khai sinh",
    "CCCD photo cong chung",
    "Video gioi thieu ban than",
    "CV",
  ],
  "Bac chuyen tiep": [
    "Giay xac nhan sinh vien ban goc",
    "Bang diem Dai hoc den thoi diem nop ho so ban goc",
    "Bang THPT ban goc",
    "Hoc ba THPT ban goc",
    "10 anh 4x6 nen trang",
    "Can cuoc cong dan photo",
    "Ho chieu photo (neu co)",
    "Chung chi ngoai ngu Anh/Trung (neu co)",
    "Anh the",
    "Ho chieu",
    "Giay xac nhan sinh vien",
    "Bang diem den thoi diem hien tai",
    "Ban sao giay khai sinh",
    "CCCD photo cong chung",
    "Video gioi thieu ban than",
    "CV",
  ],
  "Bac tien si": [
    "Bang Thac si ban goc",
    "Bang diem Thac si ban goc",
    "10 anh 4x6 nen trang",
    "Can cuoc cong dan photo",
    "Ho chieu photo (neu co)",
    "Chung chi ngoai ngu Anh/Trung (neu co)",
    "Anh the",
    "Ho chieu",
    "Bang Thac si",
    "Bang diem Thac si",
    "CCCD photo cong chung",
    "Video gioi thieu ban than",
    "CV",
  ],
};

function normalizeDocName(value) {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
    .replace(/\bban goc\b/g, "")
    .replace(/\bphoto\b/g, "")
    .replace(/\bneu co\b/g, "")
    .replace(/\bco dau\b/g, "")
    .trim();
}

function uniqueDocs(list) {
  const seen = new Set();
  const result = [];
  for (const item of list) {
    const key = normalizeDocName(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export default function Step1Form({ user, onLogout }) {
  const API_BASE = "http://localhost:5000/api/student";
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: user?.email || "",
    phone: "",
    birthday: "",
    nationality: "",
    currentLevel: "",
    targetLabel: "",
    address: "",
  });
  const [uploadedDocs, setUploadedDocs] = useState({
    
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isStep1Locked, setIsStep1Locked] = useState(false);
  const [allowStep1Edit, setAllowStep1Edit] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setLoadingProfile(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/profile/${user.id}`);
        const data = await res.json();
        if (data.profile) {
          setFormData((prev) => ({
            ...prev,
            firstName: data.profile.first_name || "",
            lastName: data.profile.last_name || "",
            email: data.profile.email || prev.email,
            phone: data.profile.phone || "",
            birthday: data.profile.birthday || "",
            nationality: data.profile.nationality || "",
            currentLevel: data.profile.current_level || "",
            targetLabel: data.profile.target_label || "",
            address: data.profile.address || "",
          }));
          const hasSavedStep1 =
            !!data.profile.first_name ||
            !!data.profile.last_name ||
            !!data.profile.email ||
            !!data.profile.phone ||
            !!data.profile.target_label;
          setIsStep1Locked(hasSavedStep1);
          setAllowStep1Edit(false);
          const docsMap = {};
          (data.documents || []).forEach((d) => {
            docsMap[d.doc_name] = { name: d.file_name, size: d.file_size };
          });
          setUploadedDocs(docsMap);

          if (data.profile.is_completed === 1) {
            setIsCompleted(true);
            setCurrentStep(3);
          } else if ((data.documents || []).length > 0) {
            setCurrentStep(2);
          } else {
            setCurrentStep(1);
          }
        }
      } catch (e) {
      } finally {
        setLoadingProfile(false);
      }
    };
    loadProfile();
  }, [user?.id]);

  const goToStep2 = async () => {
    if (isStep1Locked && !allowStep1Edit) {
      setCurrentStep(2);
      return;
    }

    if (!formData.lastName || !formData.firstName || !formData.email || !formData.phone) {
      alert("Vui long nhap day du Ho, Ten, Email va So dien thoai.");
      return;
    }
    if (!formData.targetLabel) {
      alert("Vui long chon Trinh do bang cap mong muon.");
      return;
    }
    if (!user?.id) {
      alert("Ban can dang nhap lai de luu thong tin vao he thong.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          birthday: formData.birthday,
          nationality: formData.nationality,
          currentLevel: formData.currentLevel,
          targetLabel: formData.targetLabel,
          address: formData.address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Khong the luu thong tin ca nhan.");
      }

      setCurrentStep(2);
      setIsStep1Locked(true);
      setAllowStep1Edit(false);
    } catch (e) {
      alert(e.message || "Luu thong tin that bai. Vui long thu lai.");
    }
  };

  const handleUpload = (key, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const size = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    setUploadedDocs((prev) => ({ ...prev, [key]: { name: file.name, size } }));
  };

  const displayName =
    (user?.fullName && user.fullName.trim()) ||
    (user?.email ? user.email.split("@")[0] : "Student");
  const accountLabel = user?.role === "student" ? "Tai khoan sinh vien" : "Tai khoan nhan vien";
  const fullName = `${formData.lastName} ${formData.firstName}`.trim() || displayName;

  const requiredDocs = useMemo(() => {
    const source = TARGET_CHECKLISTS[formData.targetLabel] || [];
    return uniqueDocs(source);
  }, [formData.targetLabel]);

  const isStep2Complete = requiredDocs.length > 0 && requiredDocs.every((doc) => uploadedDocs[doc]);
  const hasStep1Data =
    !!formData.lastName &&
    !!formData.firstName &&
    !!formData.email &&
    !!formData.phone &&
    !!formData.targetLabel;

  const goToStep3 = async () => {
    if (!isStep2Complete) {
      alert("Vui long tai day du tai lieu bat buoc.");
      return;
    }
    try {
      const documents = requiredDocs.map((doc) => ({
        docName: doc,
        fileName: uploadedDocs[doc]?.name || "",
        fileSize: uploadedDocs[doc]?.size || "",
      }));
      await fetch(`${API_BASE}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, documents }),
      });
      await fetch(`${API_BASE}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, isCompleted: 1 }),
      });
      setCurrentStep(3);
    } catch (e) {
      alert("Khong the luu tai lieu. Thu lai.");
    }
  };

  const jumpToStep = (targetStep) => {
    if (targetStep === 1) {
      setCurrentStep(1);
      return;
    }
    if (targetStep === 2) {
      if (!hasStep1Data) {
        alert("Vui long hoan tat thong tin ca nhan truoc.");
        return;
      }
      setCurrentStep(2);
      return;
    }
    if (targetStep === 3) {
      if (!hasStep1Data) {
        alert("Vui long hoan tat thong tin ca nhan truoc.");
        return;
      }
      if (!isStep2Complete) {
        alert("Vui long tai day du tai lieu truoc.");
        return;
      }
      setCurrentStep(3);
    }
  };

  const unlockStep1FromReview = () => {
    setAllowStep1Edit(true);
    setIsStep1Locked(false);
    setCurrentStep(1);
  };

  const handleFinalize = async () => {
    if (!user?.id) {
      alert("Khong tim thay thong tin nguoi dung dang nhap.");
      return;
    }
    if (isFinalizing) return;
    setIsFinalizing(true);
    try {
      await fetch(`${API_BASE}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isCompleted: 1 }),
      });
      setIsCompleted(true);
      alert("Ho so da duoc hoan tat va luu vao he thong.");
    } catch (e) {
      alert("Khong the hoan tat ho so. Thu lai.");
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="global-study-app">
      <style>{`
        .global-study-app {
          display: flex;
          min-height: 100vh;
          font-family: "Inter", system-ui, sans-serif;
          background: #f5f7fb;
          color: #111827;
        }
        .sidebar {
          width: 250px;
          min-width: 250px;
          background: #fff;
          border-right: 1px solid #e2e8f0;
          padding: 20px 14px;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #2563eb;
          font-weight: 700;
          font-size: 28px;
          margin-bottom: 22px;
        }
        .user-card {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f3f6fc;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 12px;
        }
        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
        }
        .user-info .name { font-size: 14px; font-weight: 700; display: block; }
        .user-info .role { font-size: 12px; color: #70809c; }
        .nav-menu {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 2px;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          color: #4f6386;
          margin-bottom: 0;
          font-size: 14px;
          line-height: 1.2;
          white-space: nowrap;
          cursor: pointer;
          user-select: none;
        }
        .nav-item.active {
          background: #eaf0ff;
          color: #2255d7;
          font-weight: 700;
        }
        .nav-item:hover {
          background: #f3f7ff;
        }
        .logout {
          border: none;
          background: none;
          color: #4f6386;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          cursor: pointer;
          margin-top: auto;
          margin-bottom: 12px;
        }

        .main-content {
          flex: 1;
          min-width: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .top-header {
          height: 72px;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 26px;
          width: 100%;
          box-sizing: border-box;
        }
        .top-header h1 {
          margin: 0;
          font-size: 34px;
          font-weight: 800;
        }
        .header-actions { display:flex; align-items:center; gap:12px; color:#4f6386; font-size:14px; }
        .notif-btn { position:relative; display:flex; cursor:pointer; }
        .notif-dot { position:absolute; top:-2px; right:-2px; width:8px; height:8px; border-radius:50%; background:#ef4444; border:2px solid #fff; }
        .header-divider {
          width: 1px;
          height: 20px;
          background: #e2e8f0;
        }
        .header-help {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .content-shell {
          padding: 18px 0 26px;
          width: 90%;
          box-sizing: border-box;
        }

        .stepper {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 18px 16px 14px;
          margin-bottom: 18px;
          width: 100%;
          max-width: none;
          box-sizing: border-box;
        }
        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .step-circle {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 2px solid #cdd6e5;
          color: #8897ae;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          background: #fff;
        }
        .step-item.active .step-circle {
          background: #2563eb;
          border-color: #2563eb;
          color: #fff;
        }
        .step-label {
          font-size: 13px;
          color: #8a99b1;
        }
        .step-item.active .step-label {
          color: #2563eb;
          font-weight: 600;
        }
        .step-item.done .step-circle {
          background: #22c55e;
          border-color: #22c55e;
          color: #fff;
        }
        .step-item.done .step-label {
          color: #16a34a;
          font-weight: 600;
        }
        .completion-note {
          margin: 8px 24px 0;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #16a34a;
          font-weight: 700;
          font-size: 14px;
        }
        .step-divider.active {
          background: #2563eb;
        }
        .step-divider {
          flex: 0.18;
          height: 2px;
          background: #e2e8f0;
          margin: 0 12px 20px;
        }

        .form-container {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          overflow: hidden;
          width: 100%;
          max-width: none;
          box-sizing: border-box;
        }
        .form-title {
          padding: 24px;
          border-bottom: 1px solid #e8edf5;
        }
        .form-title h2 {
          margin: 0 0 8px;
          font-size: 38px;
        }
        .form-title p {
          margin: 0;
          color: #4f6386;
          font-size: 20px;
        }

        .grid-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px 18px;
          padding: 24px 24px 14px;
        }
        .input-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
        }
        .input-box label {
          font-size: 16px;
          color: #2f3f5d;
        }
        .input-box input,
        .input-box select {
          height: 52px;
          border: 1px solid #dbe3ef;
          border-radius: 13px;
          background: #f7f9fc;
          padding: 0 14px;
          font-size: 20px;
          color: #1f2a3d;
          outline: none;
        }
        .input-box input:focus,
        .input-box select:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          background: #fff;
        }
        select { appearance: none; }
        .select-chevron {
          position: absolute;
          right: 14px;
          bottom: 16px;
          pointer-events: none;
          color: #6b7d99;
        }
        .full-width { grid-column: span 2; }

        .form-footer {
          display: flex;
          justify-content: space-between;
          border-top: 1px solid #e8edf5;
          padding: 14px 24px;
        }
        .btn-prev,
        .btn-next {
          height: 44px;
          border-radius: 12px;
          border: none;
          padding: 0 18px;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-prev {
          background: #eef2f8;
          color: #4b6083;
        }
        .btn-next {
          background: #2563eb;
          color: #fff;
        }
        .upload-list {
          padding: 24px;
          display: grid;
          gap: 14px;
        }
        .upload-passport {
          border: 1px solid #e1e8f4;
          border-radius: 14px;
          background: #f9fbff;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
        }
        .upload-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .upload-icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #e6eeff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
        }
        .upload-title {
          font-size: 18px;
          font-weight: 700;
        }
        .upload-sub {
          color: #6c80a2;
          font-size: 13px;
        }
        .file-pill {
          border: 1px solid #dfe6f1;
          border-radius: 12px;
          background: #fff;
          padding: 10px 12px;
          min-width: 180px;
        }
        .file-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .file-name {
          font-size: 15px;
        }
        .file-size {
          font-size: 12px;
          color: #6d80a2;
        }
        .btn-edit-doc {
          height: 36px;
          border: 1px solid #d7e1f0;
          border-radius: 10px;
          padding: 0 12px;
          background: #fff;
          color: #32517f;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .btn-edit-doc:hover {
          border-color: #2563eb;
          color: #2563eb;
        }
        .upload-box {
          border: 2px dashed #dbe4f2;
          border-radius: 16px;
          background: #fbfcff;
          min-height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 20px;
        }
        .upload-box-inner {
          display: grid;
          gap: 10px;
          justify-items: center;
        }
        .upload-btn {
          height: 42px;
          min-width: 132px;
          border: none;
          border-radius: 21px;
          padding: 0 20px;
          background: #2563eb;
          color: #fff;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .upload-note {
          font-size: 12px;
          color: #7b8eab;
        }
        .upload-hidden {
          display: none;
        }
        .doc-card {
          border: 2px dashed #dbe4f2;
          border-radius: 16px;
          background: #fbfcff;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .doc-card.done {
          border-style: solid;
          border-color: #e1e8f4;
          background: #f9fbff;
        }
        .doc-left {
          display: grid;
          gap: 6px;
        }
        .doc-name {
          font-size: 12px;
          color: #6d80a2;
        }

        @media (max-width: 1100px) {
          .global-study-app { flex-direction: column; }
          .sidebar { width: auto; border-right: none; border-bottom: 1px solid #e2e8f0; }
          .grid-inputs { grid-template-columns: 1fr; }
          .full-width { grid-column: span 1; }
        }
      `}</style>

      <aside className="sidebar">
        <div className="brand"><GraduationCap size={24} /> GlobalStudy</div>
        <div className="user-card">
          <img src="https://ui-avatars.com/api/?name=Alex+Smith&background=random" className="avatar" alt="User" />
          <div className="user-info">
            <span className="name">{displayName}</span>
            <span className="role">{accountLabel}</span>
          </div>
        </div>
        <nav className="nav-menu">
          <div className="nav-item"><LayoutDashboard size={18} /> Bang dieu khien</div>
          <div className={`nav-item ${currentStep === 1 ? "active" : ""}`} onClick={() => jumpToStep(1)}><UserCircle size={18} /> Ho so cua toi</div>
          <div className="nav-item"><FileText size={18} /> Don ung tuyen</div>
          <div className={`nav-item ${currentStep === 2 ? "active" : ""}`} onClick={() => jumpToStep(2)}><FolderOpen size={18} /> Tai lieu</div>
          <div className={`nav-item ${currentStep === 3 ? "active" : ""}`} onClick={() => jumpToStep(3)}><ShieldCheck size={18} /> Kiem tra lai</div>
          <div className="nav-item"><GraduationCap size={18} /> Truong dai hoc</div>
        </nav>
        <button className="logout" onClick={onLogout}><LogOut size={18} /> Dang xuat</button>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <h1>Tao ho so</h1>
          <div className="header-actions"><div className="notif-btn"><Bell size={20} /><span className="notif-dot"></span></div><div className="header-divider"></div><HelpCircle size={19} /> Tro giup</div>
        </header>

        <div className="content-shell">
          <div className="stepper">
            <div className={`step-item ${currentStep === 1 ? "active" : currentStep > 1 ? "done" : ""}`}>
              <div className="step-circle">{currentStep > 1 ? <Check size={16} /> : "1"}</div>
              <span className="step-label">Thong tin ca nhan</span>
            </div>
            <div className={`step-divider ${currentStep > 1 ? "active" : ""}`}></div>
            <div className={`step-item ${currentStep === 2 ? "active" : (isStep2Complete && currentStep >= 2) ? "done" : ""}`}>
              <div className="step-circle">{(isStep2Complete && currentStep >= 2) ? <Check size={16} /> : "2"}</div>
              <span className="step-label">Tai lieu</span>
            </div>
            <div className={`step-divider ${currentStep > 2 ? "active" : ""}`}></div>
            <div className={`step-item ${currentStep === 3 && !isCompleted ? "active" : isCompleted ? "done" : ""}`}>
              <div className="step-circle">{isCompleted ? <Check size={16} /> : "3"}</div>
              <span className="step-label">{isCompleted ? "Hoan tat" : "Kiem tra lai"}</span>
            </div>
          </div>

          {loadingProfile && (
            <section className="form-container">
              <div className="form-title">
                <h2>Dang tai du lieu...</h2>
                <p>Vui long cho trong giay lat.</p>
              </div>
            </section>
          )}

          {!loadingProfile && currentStep === 1 && (
            <section className="form-container">
              <div className="form-title">
                <h2>Thong tin ca nhan</h2>
                <p>Dien day du thong tin chi tiet cua ban.</p>
              </div>

              <div className="grid-inputs">
                <div className="input-box">
                  <label>Ho</label>
                  <input
                    name="lastName"
                    placeholder="Nguyen"
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={isStep1Locked}
                  />
                </div>
                <div className="input-box">
                  <label>Ten</label>
                  <input
                    name="firstName"
                    placeholder="Van A"
                    value={formData.firstName}
                    onChange={handleChange}
                    disabled={isStep1Locked}
                  />
                </div>
                <div className="input-box">
                  <label>Dia chi Email</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="nguyen.vana@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isStep1Locked}
                  />
                </div>
                <div className="input-box">
                  <label>So dien thoai</label>
                  <input
                    name="phone"
                    placeholder="+84 912 345 678"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isStep1Locked}
                  />
                </div>
                <div className="input-box">
                  <label>Ngay sinh</label>
                  <input
                    name="birthday"
                    placeholder="mm/dd/yyyy"
                    value={formData.birthday}
                    onChange={handleChange}
                    disabled={isStep1Locked}
                  />
                </div>
                <div className="input-box">
                  <label>Quoc tich</label>
                  <input
                    name="nationality"
                    placeholder="Nhap quoc tich"
                    value={formData.nationality}
                    onChange={handleChange}
                    disabled={isStep1Locked}
                  />
                </div>
                <div className="input-box">
                  <label>Trinh do bang cap hien tai</label>
                  <select name="currentLevel" value={formData.currentLevel} onChange={handleChange} disabled={isStep1Locked}>
                    <option value="">Chon trinh do hien tai</option>
                    {CURRENT_LEVEL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown className="select-chevron" size={16} />
                </div>
                <div className="input-box">
                  <label>Trinh do bang cap mong muon</label>
                  <select name="targetLabel" value={formData.targetLabel} onChange={handleChange} disabled={isStep1Locked}>
                    <option value="">Chon trinh do mong muon</option>
                    {TARGET_LEVEL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown className="select-chevron" size={16} />
                </div>
                <div className="input-box full-width">
                  <label>Dia chi</label>
                  <input
                    name="address"
                    placeholder="So nha, Duong, Phuong/Xa, Quan/Huyen, Tinh/Thanh pho"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={isStep1Locked}
                  />
                </div>
              </div>

              <div className="form-footer">
                <button className="btn-prev">Quay lai</button>
                <button className="btn-next" onClick={goToStep2}>
                  Tiep theo <ArrowRight size={18} />
                </button>
              </div>
            </section>
          )}

          {!loadingProfile && currentStep === 2 && (
            <section className="form-container">
              <div className="form-title">
                <h2>Tai tai lieu</h2>
                <p>Checklist duoc sinh tu dong theo nhom ban da chon.</p>
              </div>

              <div className="upload-list">
                {requiredDocs.map((docName, index) => {
                  const uploaded = uploadedDocs[docName];
                  return (
                    <div className={`doc-card ${uploaded ? "done" : ""}`} key={docName}>
                      <div className="doc-left">
                        <div className="upload-title">{index + 1}. {docName}</div>
                        <div className="upload-sub">Tai lieu theo nhom da chon.</div>
                        <div className="doc-name">Goi y: {fullName}_{docName}</div>
                      </div>
                      {uploaded ? (
                        <div className="file-actions">
                          <div className="file-pill">
                            <div className="file-name">{uploaded.name}</div>
                            <div className="file-size">{uploaded.size}</div>
                          </div>
                          <label className="btn-edit-doc">
                            <Pencil size={14} />
                            Chinh sua
                            <input className="upload-hidden" type="file" onChange={(e) => handleUpload(docName, e)} />
                          </label>
                        </div>
                      ) : (
                        <label className="upload-btn">
                          Chon tep tin
                          <input className="upload-hidden" type="file" onChange={(e) => handleUpload(docName, e)} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="form-footer">
                <button className="btn-prev" onClick={() => setCurrentStep(1)}>Quay lai</button>
                <button className="btn-next" onClick={goToStep3}>Tiep theo <ArrowRight size={18} /></button>
              </div>
            </section>
          )}

          {!loadingProfile && currentStep === 3 && (
            <section className="form-container">
              <div className="form-title">
                <h2>Kiem tra lai</h2>
                <p>Vui long ra soat toan bo thong tin truoc khi gui ho so.</p>
              </div>
              {isCompleted && (
                <div className="completion-note">
                  <Check size={16} />
                  Hoan tat
                </div>
              )}

              <div className="upload-list">
                <div className="doc-card done">
                  <div className="doc-left">
                    <div className="upload-title">Thong tin ca nhan</div>
                    <div className="upload-sub">Ho va ten: {fullName}</div>
                    <div className="upload-sub">Email: {formData.email}</div>
                    <div className="upload-sub">So dien thoai: {formData.phone}</div>
                    <div className="upload-sub">Ngay sinh: {formData.birthday}</div>
                    <div className="upload-sub">Quoc tich: {formData.nationality}</div>
                    <div className="upload-sub">Dia chi: {formData.address}</div>
                    <div className="upload-sub">Bang cap hien tai: {formData.currentLevel}</div>
                    <div className="upload-sub">Bang cap mong muon: {formData.targetLabel}</div>
                  </div>
                  <button className="btn-prev" onClick={unlockStep1FromReview}><Pencil size={14} /> Chinh sua</button>
                </div>

                <div className="doc-card done">
                  <div className="doc-left">
                    <div className="upload-title">Danh sach tai lieu</div>
                    {requiredDocs.map((doc) => (
                      <div className="upload-sub" key={doc}>
                        {doc}: {uploadedDocs[doc]?.name || "Chua co file"}
                      </div>
                    ))}
                  </div>
                  <button className="btn-prev" onClick={() => setCurrentStep(2)}><Pencil size={14} /> Chinh sua</button>
                </div>
              </div>

              <div className="form-footer">
                <button className="btn-prev" onClick={() => setCurrentStep(2)}>Quay lai</button>
                <button className="btn-next" onClick={handleFinalize} disabled={isFinalizing}>
                  {isFinalizing ? "Dang xu ly..." : "Ho so da hoan tat"}
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
