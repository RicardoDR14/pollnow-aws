import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API = process.env.REACT_APP_API_URL;
const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function Results() {
  const { pollId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 5000);
    return () => clearInterval(interval);
  }, [pollId]);

  const fetchResults = async () => {
    try {
      const res = await axios.get(`${API}/polls/${pollId}/results`);
      setResults(res.data);
    } catch {
      setError('Erro ao carregar resultados');
    }
    setLoading(false);
  };

  if (loading) return <div className="card"><p>A carregar...</p></div>;
  if (error) return <div className="card"><p className="error">{error}</p></div>;

  const isClosed = results.status !== 'open' || new Date() > new Date(results.closesAt);
  const shareUrl = `${window.location.origin}/vote/${pollId}`;

  return (
    <div>
      <div className="card">
        <h1>{results.title}</h1>
        <p style={{ color: '#888', marginBottom: '0.5rem' }}>
          {isClosed ? '🔒 Sondagem fechada' : `⏳ Fecha: ${new Date(results.closesAt).toLocaleString('pt-PT')}`}
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          <strong>{results.total}</strong> participante{results.total !== 1 ? 's' : ''}
          {!isClosed && <span style={{ color: '#10b981', fontSize: '0.85rem', marginLeft: '0.5rem' }}>● a atualizar</span>}
        </p>

        {/* Gráfico */}
        {results.total > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={results.results} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="option" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value, name) => [value, 'Votos']} />
              <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                {results.results.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
            Ainda não há votos nesta sondagem.
          </p>
        )}

        {/* Tabela de resultados */}
        <div style={{ marginTop: '1.5rem' }}>
          {results.results.map((r, i) => (
            <div key={r.option} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.8rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
              <span style={{ flex: 1 }}>{r.option}</span>
              <span style={{ fontWeight: 600 }}>{r.votes} votos</span>
              <span style={{ color: '#888', minWidth: '40px', textAlign: 'right' }}>{r.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Link partilhável */}
      {!isClosed && (
        <div className="card">
          <h2>Partilhar sondagem</h2>
          <div className="share-box">{shareUrl}</div>
          <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(shareUrl)}>
            Copiar link
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          ← Dashboard
        </button>
        {!isClosed && (
          <button className="btn btn-primary" onClick={() => navigate(`/vote/${pollId}`)}>
            Votar
          </button>
        )}
      </div>
    </div>
  );
}

export default Results;