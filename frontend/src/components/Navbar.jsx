import { Link, useNavigate } from "react-router-dom";

const USER_STORAGE_KEY = "pollnow_user";

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || "null");

  const handleLogout = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    navigate("/login");
    window.location.reload();
  };

  return (
    <nav
      style={{
        background: "#4f46e5",
        padding: "1rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "2rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
        <Link
          to="/"
          style={{
            color: "white",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "1.2rem",
          }}
        >
          🗳️ PollNow
        </Link>

        <Link
          to="/"
          style={{
            color: "rgba(255,255,255,0.85)",
            textDecoration: "none",
            fontSize: "0.95rem",
          }}
        >
          Dashboard
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {user ? (
          <>
            <span style={{ color: "white", fontSize: "0.9rem" }}>
              👤 {user.username}
            </span>
            <button
              onClick={handleLogout}
              style={{
                background: "rgba(255,255,255,0.15)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.35)",
                borderRadius: "8px",
                padding: "0.45rem 0.8rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Sair
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              style={{
                color: "white",
                textDecoration: "none",
                fontSize: "0.95rem",
              }}
            >
              Entrar
            </Link>
            <Link
              to="/register"
              style={{
                background: "white",
                color: "#4f46e5",
                textDecoration: "none",
                borderRadius: "8px",
                padding: "0.45rem 0.8rem",
                fontWeight: 700,
                fontSize: "0.95rem",
              }}
            >
              Criar conta
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
