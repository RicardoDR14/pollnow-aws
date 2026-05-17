import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;
const STORAGE_KEY = 'pollnow_voted';

function Vote() {
  const { pollId } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState('');
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  useEffect(() => {
    const voted = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (voted.includes(pollId)) setAlreadyVoted(true);
    fetchPoll();
  }, [pollId]);

  const fetchPoll = async () => {
    try {
      const res = await axios.get(`${API}/polls/${pollId}`);
      setPoll(res.data);
    } catch {
      setError('Sondagem não encontrada');
    }
    setLoading(false);
  };

  const handleVote = async () => {
    if (!selected) return setError('Seleciona uma opção');
    setVoting(true);
    setError('');
    try {
      await axios.post(`${API}/polls/${pollId}/vote`, { option: selected });
      const voted = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...voted, pollId]));
      navigate(`/results/${pollId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registar voto');
    }
    setVoting(false);
  };

  if (loading) return <div className="card"><p>A carregar...</p></div>;
  if (error && !poll) return <div className="card"><p className="error">{error}</p></div>;

  const isClosed = poll.status !== 'open' || new Date() > new Date(poll.closesAt);

  return (
    <div className="card">
      <h1>{poll.title}</h1>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>
        Fecha: {new Date(poll.closesAt).toLocaleString('pt-PT')}
      </p>

      {alreadyVoted && (
        <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          ⚠️ Já votaste nesta sondagem.
          <button className="btn btn-secondary" style={{ marginLeft: '1rem' }} onClick={() => navigate(`/results/${pollId}`)}>
            Ver resultados
          </button>
        </div>
      )}

      {isClosed && (
        <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          🔒 Esta sondagem já está fechada.
        </div>
      )}

      {!alreadyVoted && !isClosed && (
        <div>
          {poll.options.map(opt => (
            <div
              key={opt}
              onClick={() => setSelected(opt)}
              style={{
                padding: '1rem',
                border: `2px solid ${selected === opt ? '#4f46e5' : '#e5e7eb'}`,
                borderRadius: '8px',
                marginBottom: '0.8rem',
                cursor: 'pointer',
                background: selected === opt ? '#eef2ff' : 'white',
                fontWeight: selected === opt ? 600 : 400,
                transition: 'all 0.15s'
              }}
            >
              {opt}
            </div>
          ))}

          {error && <p className="error">{error}</p>}

          <button className="btn btn-primary" onClick={handleVote} disabled={voting}>
            {voting ? 'A votar...' : 'Votar'}
          </button>
        </div>
      )}

      <br />
      <button className="btn btn-secondary" onClick={() => navigate(`/results/${pollId}`)}>
        Ver resultados
      </button>
    </div>
  );
}

export default Vote;