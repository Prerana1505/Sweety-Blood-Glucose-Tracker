
import { useState } from "react";
import { authAPI } from "./services/api";
import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [token, setToken] = useState(
        localStorage.getItem("token")
    );

    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user")) || null;
        } catch {
            return null;
        }
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");
        setLoading(true);

        try {
            if (isLogin) {
                const data = await authAPI.login({
                    email,
                    password
                });

                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));

                setToken(data.token);
                setUser(data.user);

            } else {
                await authAPI.register({
                    name,
                    email,
                    password
                });

                setSuccess("Registration successful! Please log in.");
                setIsLogin(true);
                setName("");
                setPassword("");
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setToken(null);
        setUser(null);
        setEmail("");
        setPassword("");
    };

    if (token) {
        return (
            <Dashboard
                token={token}
                user={user}
                onLogout={handleLogout}
            />
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">

                <div className="brand">
                    <div className="brand-icon">♥</div>
                    <h1>Sweety</h1>
                    <p>Take control of your glucose health.</p>
                </div>

                <div className="auth-tabs">
                    <button
                        className={isLogin ? "active" : ""}
                        onClick={() => {
                            setIsLogin(true);
                            setError("");
                            setSuccess("");
                        }}
                    >
                        Login
                    </button>

                    <button
                        className={!isLogin ? "active" : ""}
                        onClick={() => {
                            setIsLogin(false);
                            setError("");
                            setSuccess("");
                        }}
                    >
                        Register
                    </button>
                </div>

                <h2>
                    {isLogin ? "Welcome Back!" : "Create Your Account"}
                </h2>

                <p className="subtitle">
                    {isLogin
                        ? "Login to track your glucose readings."
                        : "Register to start tracking your health."}
                </p>

                {error && (
                    <div className="message error">{error}</div>
                )}

                {success && (
                    <div className="message success">{success}</div>
                )}

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                placeholder="Enter your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={8}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                    >
                        {loading
                            ? "Please wait..."
                            : isLogin
                                ? "Login"
                                : "Create Account"}
                    </button>
                </form>

                <p className="switch-text">
                    {isLogin
                        ? "Don't have an account?"
                        : "Already have an account?"}

                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError("");
                            setSuccess("");
                        }}
                    >
                        {isLogin ? "Register" : "Login"}
                    </button>
                </p>
            </div>
        </div>
    );
}

export default App;
