import { useState } from "react";
import { useToast } from "../hooks/useToast";
import ToastStack from "../components/ToastStack";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;
const USER_STORAGE_KEY = "pollnow_user";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const { toasts, removeToast, toast } = useToast();

  const handleSubmit = async () => {
    if (!form.username.trim()) {
      return toast.error("Username obrigatório");
    }

    if (!form.email.trim()) {
      return toast.error("Email obrigatório");
    }

    if (!form.email.includes("@")) {
      return toast.error("Email inválido");
    }

    if (!form.password) {
      return toast.error("Password obrigatória");
    }

    if (form.password.length < 6) {
      return toast.error("A password deve ter pelo menos 6 caracteres");
    }

    if (form.password !== form.confirmPassword) {
      return toast.error("As passwords não coincidem");
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API}/auth/register`, {
        username: form.username,
        email: form.email,
        password: form.password,
      });

      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.data));
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.error || "Erro ao criar conta");
    }

    setLoading(false);
  };

  return (
    <div className="card">
      <h1>Criar conta</h1>

      <label>Username</label>
      <input
        placeholder="Ex: ruben"
        value={form.username}
        onChange={(e) => setForm({ ...form, username: e.target.value })}
      />

      <label>Email</label>
      <input
        type="email"
        placeholder="Ex: ruben@email.com"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      <label>Password</label>
      <input
        type="password"
        placeholder="Mínimo 6 caracteres"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      <label>Confirmar password</label>
      <input
        type="password"
        placeholder="Repete a password"
        value={form.confirmPassword}
        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
      />

      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? "A criar..." : "Criar conta"}
      </button>

      <p style={{ marginTop: "1rem", color: "#666" }}>
        Já tens conta?{" "}
        <Link to="/login" style={{ color: "#4f46e5", fontWeight: 600 }}>
          Entrar
        </Link>
      </p>
      <ToastStack toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default Register;
