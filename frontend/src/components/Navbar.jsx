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
          <span className="brand-icon">☑</span>
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