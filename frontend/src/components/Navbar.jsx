import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav style={{
      background: '#4f46e5',
      padding: '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      gap: '2rem'
    }}>
      <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '1.2rem' }}>
        🗳️ PollNow
      </Link>
      <Link to="/" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '0.95rem' }}>
        Dashboard
      </Link>
    </nav>
  );
}

export default Navbar;