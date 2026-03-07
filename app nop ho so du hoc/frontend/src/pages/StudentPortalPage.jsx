import { useMemo, useState } from "react";
import "../styles/StudentPortal.css";

const REQUIRED_DOCS = [
    "Ho chieu (Passport)",
    "Bang tot nghiep (Degree Certificate)",
    "Bang diem (Academic Transcripts)",
    "Anh chan dung",
];

const CURRENT_EDUCATION_OPTIONS = [
    "Bac dai hoc",
    "Bac thac si",
    "Bac chuyen tiep",
    "Bac tien si",
];

const TARGET_PROGRAM_OPTIONS = [
    "Bac dai hoc - Nhom hoc sinh lop 12",
    "Bac dai hoc - Nhom da tot nghiep THPT",
    "Bac thac si - Nhom sinh vien nam cuoi",
    "Bac thac si - Nhom sinh vien da tot nghiep",
    "Bac chuyen tiep",
    "Bac tien si",
];

export default function StudentPortalPage({ user, onLogout }) {
    const [step, setStep] = useState(1);
    const [profile, setProfile] = useState({
        firstName: "",
        lastName: "",
        email: user?.email || "",
        phone: "",
        birthday: "",
        nationality: "",
        currentEducation: "",
        targetEducation: "",
        address: "",
    });
    const [files, setFiles] = useState([]);

    const isStep1Done = useMemo(() => {
        return profile.firstName && profile.lastName && profile.email && profile.phone;
    }, [profile]);

    const isStep2Done = files.length >= 2;

    const handleProfileChange = (key, value) => {
        setProfile((prev) => ({ ...prev, [key]: value }));
    };

    const handleFileUpload = (event, docName) => {
        const selected = event.target.files?.[0];
        if (!selected) return;

        const sizeMb = `${(selected.size / (1024 * 1024)).toFixed(1)} MB`;
        setFiles((prev) => {
            const filtered = prev.filter((f) => f.docName !== docName);
            return [...filtered, { docName, fileName: selected.name, size: sizeMb }];
        });
    };

    const removeFile = (docName) => {
        setFiles((prev) => prev.filter((f) => f.docName !== docName));
    };

    return (
        <div className="portal-root">
            <aside className="portal-sidebar">
                <div className="brand">GlobalStudy</div>
                <div className="user-box">
                    <div className="avatar">A</div>
                    <div>
                        <div className="user-name">{user?.fullName || "Student"}</div>
                        <div className="user-role">Tai khoan sinh vien</div>
                    </div>
                </div>
                <div className="menu-item">Bang dieu khien</div>
                <div className="menu-item active">Ho so cua toi</div>
                <div className="menu-item">Don ung tuyen</div>
                <div className="menu-item">Tai lieu</div>
                <div className="menu-item">Trung tam du hoc</div>
                <button className="logout-btn" onClick={onLogout}>Dang xuat</button>
            </aside>

            <main className="portal-main">
                <div className="topbar">Tao ho so</div>

                <section className="stepper">
                    <div className="step-item">
                        <div className={`step ${step >= 1 ? "on" : ""}`}>1</div>
                        <div className="step-label">Thong tin ca nhan</div>
                    </div>
                    <div className={`line ${step >= 2 ? "on" : ""}`}></div>
                    <div className="step-item">
                        <div className={`step ${step >= 2 ? "on" : ""}`}>2</div>
                        <div className="step-label">Tai lieu</div>
                    </div>
                    <div className={`line ${step >= 3 ? "on" : ""}`}></div>
                    <div className="step-item">
                        <div className={`step ${step >= 3 ? "on" : ""}`}>3</div>
                        <div className="step-label">Kiem tra lai</div>
                    </div>
                </section>

                {step === 1 && (
                    <section className="card">
                        <h2>Thong tin ca nhan</h2>
                        <p>Dien day du thong tin chi tiet cua ban.</p>
                        <div className="grid2">
                            <input placeholder="Ho" value={profile.firstName} onChange={(e) => handleProfileChange("firstName", e.target.value)} />
                            <input placeholder="Ten" value={profile.lastName} onChange={(e) => handleProfileChange("lastName", e.target.value)} />
                            <input placeholder="Email" value={profile.email} onChange={(e) => handleProfileChange("email", e.target.value)} />
                            <input placeholder="So dien thoai" value={profile.phone} onChange={(e) => handleProfileChange("phone", e.target.value)} />
                            <input placeholder="Ngay sinh (dd/mm/yyyy)" value={profile.birthday} onChange={(e) => handleProfileChange("birthday", e.target.value)} />
                            <select value={profile.nationality} onChange={(e) => handleProfileChange("nationality", e.target.value)}>
                                <option value="">Chon quoc tich</option>
                                <option value="Viet Nam">Viet Nam</option>
                                <option value="Dai Loan">Dai Loan</option>
                                <option value="Khac">Khac</option>
                            </select>
                            <select value={profile.currentEducation} onChange={(e) => handleProfileChange("currentEducation", e.target.value)}>
                                <option value="">Chon trinh do hien tai</option>
                                {CURRENT_EDUCATION_OPTIONS.map((item) => (
                                    <option key={item} value={item}>{item}</option>
                                ))}
                            </select>
                            <select value={profile.targetEducation} onChange={(e) => handleProfileChange("targetEducation", e.target.value)}>
                                <option value="">Chon trinh do mong muon</option>
                                {TARGET_PROGRAM_OPTIONS.map((item) => (
                                    <option key={item} value={item}>{item}</option>
                                ))}
                            </select>
                        </div>
                        <input className="full" placeholder="Dia chi" value={profile.address} onChange={(e) => handleProfileChange("address", e.target.value)} />
                        <div className="actions">
                            <button className="secondary" onClick={() => setStep(1)}>Quay lai</button>
                            <button className="primary" disabled={!isStep1Done} onClick={() => setStep(2)}>Tiep theo</button>
                        </div>
                    </section>
                )}

                {step === 2 && (
                    <section className="card">
                        <h2>Tai tai lieu</h2>
                        <p>Vui long tai len cac tai lieu can thiet.</p>
                        <div className="docs">
                            {REQUIRED_DOCS.map((doc) => {
                                const file = files.find((f) => f.docName === doc);
                                return (
                                    <div className="doc-item" key={doc}>
                                        <div className="doc-title">{doc}</div>
                                        {!file ? (
                                            <label className="upload">
                                                Chon tep tin
                                                <input type="file" onChange={(e) => handleFileUpload(e, doc)} />
                                            </label>
                                        ) : (
                                            <div className="uploaded">
                                                <span>{file.fileName} ({file.size})</span>
                                                <button onClick={() => removeFile(doc)}>Xoa</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="actions">
                            <button className="secondary" onClick={() => setStep(1)}>Quay lai</button>
                            <button className="primary" disabled={!isStep2Done} onClick={() => setStep(3)}>Tiep theo</button>
                        </div>
                    </section>
                )}

                {step === 3 && (
                    <section className="card">
                        <h2>Kiem tra lai</h2>
                        <p>Rao soat toan bo thong tin truoc khi gui.</p>
                        <div className="review">
                            <div><strong>Ho va ten:</strong> {profile.firstName} {profile.lastName}</div>
                            <div><strong>Email:</strong> {profile.email}</div>
                            <div><strong>So dien thoai:</strong> {profile.phone}</div>
                            <div><strong>Ngay sinh:</strong> {profile.birthday}</div>
                            <div><strong>Quoc tich:</strong> {profile.nationality}</div>
                            <div><strong>Dia chi:</strong> {profile.address}</div>
                        </div>
                        <h3>Danh sach tai lieu</h3>
                        <div className="review-files">
                            {files.map((f) => (
                                <div key={f.docName}>{f.docName}: {f.fileName} ({f.size})</div>
                            ))}
                        </div>
                        <div className="actions">
                            <button className="secondary" onClick={() => setStep(2)}>Quay lai</button>
                            <button className="primary">Gui ho so</button>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
