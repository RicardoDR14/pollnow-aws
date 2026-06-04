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
    <nav className="top-nav">
      <div className="nav-left">
        <Link to="/" className="brand-link">
          <span className="brand-icon">
            <svg viewBox="0 0 64 64" width="55%" height="55%" fill="none">
              <polyline points="14,33 26,46 50,20" stroke="#172033" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span>PollNow</span>
        </Link>

        <Link to="/" className="nav-link">
          Dashboard
        </Link>
      </div>

      <div className="nav-right">
        {user ? (
          <>
            <span className="nav-user">👤 {user.username}</span>
            <button onClick={handleLogout} className="nav-logout">
              Sair
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">
              Entrar
            </Link>
            <Link to="/register" className="nav-register">
              Criar conta
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;