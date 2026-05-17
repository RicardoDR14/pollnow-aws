import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

function Home() {
  const navigate = useNavigate();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  const [form, setForm] = useState({
    title: '',
    options: ['', ''],
    closesAt: '',
    authorPhone: ''
  });

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      const res = await axios.get(`${API}/polls`);
      setPolls(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch {
      setError('Erro ao carregar sondagens');
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...form.options];
    newOptions[index] = value;
    setForm({ ...form, options: newOptions });
  };

  const addOption = () => {
    if (form.options.length < 6) {
      setForm({ ...form, options: [...form.options, ''] });
    }
  };

  const removeOption = (index) => {
    if (form.options.length > 2) {
      setForm({ ...form, options: form.options.filter((_, i) => i !== index) });
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!form.title.trim()) return setError('Título obrigatório');
    if (form.options.some(o => !o.trim())) return setError('Preenche todas as opções');
    if (!form.closesAt) return setError('Data de fecho obrigatória');
    if (!form.authorPhone.trim()) return setError('Email obrigatório para notificação');

    setLoading(true);
    try {
      const res = await axios.post(`${API}/polls`, {
        title: form.title,
        options: form.options.filter(o => o.trim()),
        closesAt: new Date(form.closesAt).toISOString(),
        authorPhone: form.authorPhone
      });

      const url = `${window.location.origin}/vote/${res.data.pollId}`;
      setShareUrl(url);
      setSuccess('Sondagem criada com sucesso!');
      setForm({ title: '', options: ['', ''], closesAt: '', authorPhone: '' });
      fetchPolls();
    } catch {
      setError('Erro ao criar sondagem');
    }
    setLoading(false);
  };

  const getStatusBadge = (poll) => {
    const now = new Date();
    const closes = new Date(poll.closesAt);
    if (poll.status === 'notified') return <span className="badge badge-notified">Notificada</span>;
    if (poll.status === 'closed' || closes < now) return <span className="badge badge-closed">Fechada</span>;
    return <span className="badge badge-open">Aberta</span>;
  };

  return (
    <div>
      {/* Formulário de criação */}
      <div className="card">
        <h2>Criar nova sondagem</h2>

        <label>Título</label>
        <input
          placeholder="Ex: Melhor dia para reunião?"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
        />

        <label>Opções</label>
        {form.options.map((opt, i) => (
          <div className="option-row" key={i}>
            <input
              placeholder={`Opção ${i + 1}`}
              value={opt}
              onChange={e => handleOptionChange(i, e.target.value)}
            />
            {form.options.length > 2 && (
              <button className="btn btn-danger" onClick={() => removeOption(i)}>✕</button>
            )}
          </div>
        ))}
        {form.options.length < 6 && (
          <button className="btn btn-secondary" onClick={addOption} style={{ marginBottom: '0.8rem' }}>
            + Adicionar opção
          </button>
        )}

        <label>Data e hora de fecho</label>
        <input
          type="datetime-local"
          value={form.closesAt}
          onChange={e => setForm({ ...form, closesAt: e.target.value })}
        />

        <label>Email para notificação</label>
        <input
          placeholder="Ex: autor@email.com"
          value={form.authorPhone}
          onChange={e => setForm({ ...form, authorPhone: e.target.value })}
        />

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        {shareUrl && (
          <div>
            <p className="success">Partilha este link com os votantes:</p>
            <div className="share-box">{shareUrl}</div>
            <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(shareUrl)}>
              Copiar link
            </button>
          </div>
        )}

        <br />
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'A criar...' : 'Criar sondagem'}
        </button>
      </div>

      {/* Lista de sondagens */}
      <div className="card">
        <h2>Sondagens criadas</h2>
        {polls.length === 0 && <p style={{ color: '#888' }}>Ainda não há sondagens.</p>}
        {polls.map(poll => (
          <div className="poll-list-item" key={poll.pollId}>
            <div>
              <h3>{poll.title}</h3>
              <small style={{ color: '#888' }}>
                Fecha: {new Date(poll.closesAt).toLocaleString('pt-PT')}
              </small>
              <br />
              {getStatusBadge(poll)}
            </div>
            <div className="poll-actions">
              <button className="btn btn-secondary" onClick={() => navigate(`/results/${poll.pollId}`)}>
                Ver resultados
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;