import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;
const USER_STORAGE_KEY = "pollnow_user";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (!form.identifier.trim()) {
      return setError("Email ou username obrigatório");
    }

    if (!form.password) {
      return setError("Password obrigatória");
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API}/auth/login`, {
        identifier: form.identifier,
        password: form.password,
      });

      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.data));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao iniciar sessão");
    }

    setLoading(false);
  };

  return (
    <div className="card">
      <h1>Entrar no PollNow</h1>

      <label>Email ou username</label>
      <input
        placeholder="Ex: ruben@email.com"
        value={form.identifier}
        onChange={(e) => setForm({ ...form, identifier: e.target.value })}
      />

      <label>Password</label>
      <input
        type="password"
        placeholder="A tua password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      {error && <p className="error">{error}</p>}

      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? "A entrar..." : "Entrar"}
      </button>

      <p style={{ marginTop: "1rem", color: "#666" }}>
        Ainda não tens conta?{" "}
        <Link to="/register" style={{ color: "#4f46e5", fontWeight: 600 }}>
          Criar conta
        </Link>
      </p>
    </div>
  );
}

export default Login;
