import { useState } from "react";
import "../styles/Login.css";

export default function LoginPage({ onLoginSuccess }) {
    const API_BASE = "http://localhost:5000/api/auth";
    const [role, setRole] = useState("student");
    const [mode, setMode] = useState("login");
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const resetFeedback = () => {
        setMessage("");
        setError("");
    };

    const switchMode = (nextMode) => {
        setMode(nextMode);
        resetFeedback();
    };

    const handleSubmit = async () => {
        resetFeedback();

        if (!email || !password || (mode === "register" && !fullName)) {
            setError("Vui long nhap day du thong tin.");
            return;
        }

        setLoading(true);
        try {
            const endpoint = mode === "register" ? "register" : "login";
            const payload =
                mode === "register"
                    ? { fullName, email, password, role }
                    : { email, password, role };

            const response = await fetch(`${API_BASE}/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) {
                setError(data.message || "Thao tac that bai.");
                return;
            }

            setMessage(data.message || "Thao tac thanh cong.");
            if (mode === "register") {
                setMode("login");
                setPassword("");
            } else if (data.user && onLoginSuccess) {
                onLoginSuccess(data.user);
            }
        } catch (apiErr) {
            setError("Khong the ket noi server. Vui long kiem tra backend.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <nav>
                <div className="nav-brand">
                    <div className="nav-logo">🌍</div>
                    <span className="nav-brand-text">Taiwan Study Abroad</span>
                </div>

                <div className="nav-links">
                    <a href="#">Trung tam tro giup</a>
                    <a href="#">Lien he ho tro</a>
                </div>
            </nav>

            <main>
                <div className="card">
                    <div className="card-head">
                        <h1 className="card-title">
                            {mode === "login" ? "Chao mung ban quay lai" : "Tao tai khoan moi"}
                        </h1>
                        <p className="card-subtitle">
                            {mode === "login"
                                ? "Vui long nhap thong tin chi tiet de dang nhap."
                                : "Nhap thong tin de tao tai khoan va bat dau dang nhap."}
                        </p>
                    </div>

                    <div className="tabs">
                        <button
                            className={`tab ${role === "student" ? "tab--active" : ""}`}
                            onClick={() => setRole("student")}
                        >
                            Sinh vien
                        </button>

                        <button
                            className={`tab ${role === "admin" ? "tab--active" : ""}`}
                            onClick={() => setRole("admin")}
                        >
                            Quan tri vien
                        </button>
                    </div>

                    <div className="form">
                        {mode === "register" && (
                            <div className="field">
                                <label>Ho va ten</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Nguyen Van A"
                                />
                            </div>
                        )}

                        <div className="field">
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={
                                    role === "student"
                                        ? "sinhvien@daihoc.edu.vn"
                                        : "admin@truong.edu.vn"
                                }
                            />
                        </div>

                        <div className="field">
                            <label>Mat khau</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Nhap mat khau cua ban"
                            />
                        </div>

                        {mode === "login" && (
                            <div className="extras">
                                <label className="checkbox-wrap">
                                    <input type="checkbox" />
                                    <span>Ghi nho toi</span>
                                </label>

                                <a href="#" className="link">
                                    Quen mat khau?
                                </a>
                            </div>
                        )}

                        {error && <p className="auth-message auth-error">{error}</p>}
                        {message && <p className="auth-message auth-success">{message}</p>}

                        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                            {loading
                                ? mode === "login"
                                    ? "Dang dang nhap..."
                                    : "Dang tao tai khoan..."
                                : mode === "login"
                                  ? "Dang nhap"
                                  : "Tao tai khoan"}
                        </button>
                    </div>

                    <div className="card-foot">
                        {mode === "login" ? (
                            <p className="register-line">
                                Ban chua co tai khoan?
                                <button className="link link-button" onClick={() => switchMode("register")}>
                                    Dang ky ngay
                                </button>
                            </p>
                        ) : (
                            <p className="register-line">
                                Ban da co tai khoan?
                                <button className="link link-button" onClick={() => switchMode("login")}>
                                    Dang nhap
                                </button>
                            </p>
                        )}

                        <div className="divider"></div>
                        <div className="ssl-badge">🔒 Ma hoa bao mat SSL</div>
                    </div>
                </div>
            </main>

            <footer>© 2026 Study Abroad Systems Inc.</footer>
        </div>
    );
}
