import { useState } from "react";
import "../styles/Login.css";

export default function LoginPage() {

    const [role, setRole] = useState("student");
    const [loading, setLoading] = useState(false);

    const handleLogin = () => {
        setLoading(true);

        setTimeout(() => {
            setLoading(false);
        }, 1800);
    };

    return (
        <div className="page">

            {/* NAVBAR */}
            <nav>
                <div className="nav-brand">
                    <div className="nav-logo">🌍</div>
                    <span className="nav-brand-text">Taiwan Study Abroad</span>
                </div>

                <div className="nav-links">
                    <a href="#">Trung tâm trợ giúp</a>
                    <a href="#">Liên hệ hỗ trợ</a>
                </div>
            </nav>

            {/* MAIN */}
            <main>
                <div className="card">

                    <div className="card-head">
                        <h1 className="card-title">Chào mừng bạn quay lại</h1>
                        <p className="card-subtitle">
                            Vui lòng nhập thông tin chi tiết để đăng nhập.
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="tabs">
                        <button
                            className={`tab ${role === "student" ? "tab--active" : ""}`}
                            onClick={() => setRole("student")}
                        >
                            Sinh viên
                        </button>

                        <button
                            className={`tab ${role === "admin" ? "tab--active" : ""}`}
                            onClick={() => setRole("admin")}
                        >
                            Quản trị viên
                        </button>
                    </div>

                    {/* FORM */}
                    <div className="form">

                        <div className="field">
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder={
                                    role === "student"
                                        ? "sinhvien@daihoc.edu.vn"
                                        : "admin@truong.edu.vn"
                                }
                            />
                        </div>

                        <div className="field">
                            <label>Mật khẩu</label>
                            <input
                                type="password"
                                placeholder="Nhập mật khẩu của bạn"
                            />
                        </div>

                        <div className="extras">
                            <label className="checkbox-wrap">
                                <input type="checkbox" />
                                <span>Ghi nhớ tôi</span>
                            </label>

                            <a href="#" className="link">
                                Quên mật khẩu?
                            </a>
                        </div>

                        <button
                            className="btn-primary"
                            onClick={handleLogin}
                            disabled={loading}
                        >
                            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
                        </button>

                    </div>

                    {/* FOOTER */}
                    <div className="card-foot">
                        <p className="register-line">
                            Bạn chưa có tài khoản?
                            <a href="#" className="link"> Đăng ký ngay</a>
                        </p>

                        <div className="divider"></div>

                        <div className="ssl-badge">
                            🔒 Mã hóa bảo mật SSL
                        </div>
                    </div>

                </div>
            </main>

            <footer>© 2023 Study Abroad Systems Inc.</footer>

        </div>
    );
}