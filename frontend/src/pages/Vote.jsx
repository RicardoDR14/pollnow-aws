import { useState, useEffect } from "react";
import { useToast } from "../hooks/useToast";
import ToastStack from "../components/ToastStack";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;
const VOTES_STORAGE_KEY = "pollnow_votes";
const VOTER_ID_KEY = "pollnow_voter_id";

function getOrCreateVoterId() {
  let voterId = localStorage.getItem(VOTER_ID_KEY);

  if (!voterId) {
    voterId = crypto.randomUUID();
    localStorage.setItem(VOTER_ID_KEY, voterId);
  }

  return voterId;
}

function getStoredVotes() {
  return JSON.parse(localStorage.getItem(VOTES_STORAGE_KEY) || "{}");
}

function Vote() {
  const { pollId } = useParams();
  const navigate = useNavigate();

  const [poll, setPoll] = useState(null);
  const [selected, setSelected] = useState("");
  const [previousVote, setPreviousVote] = useState("");
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const { toasts, removeToast, toast } = useToast();

  useEffect(() => {
    const storedVotes = getStoredVotes();
    const storedVote = storedVotes[pollId];

    if (storedVote?.option) {
      setPreviousVote(storedVote.option);
      setSelected(storedVote.option);
    }

    fetchPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId]);

  const fetchPoll = async () => {
    try {
      const res = await axios.get(`${API}/polls/${pollId}`);
      setPoll(res.data);
    } catch {
      toast.error("Sondagem não encontrada.");
    }

    setLoading(false);
  };

  const handleVote = async () => {
    if (!selected) {
      return toast.error("Seleciona uma opção");
    }

    setVoting(true);

    try {
      const voterId = getOrCreateVoterId();

      await axios.post(`${API}/polls/${pollId}/vote`, {
        option: selected,
        voterId,
      });

      const storedVotes = getStoredVotes();

      localStorage.setItem(
        VOTES_STORAGE_KEY,
        JSON.stringify({
          ...storedVotes,
          [pollId]: {
            option: selected,
            voterId,
            updatedAt: new Date().toISOString(),
          },
        }),
      );

      setPreviousVote(selected);
      toast.success("Voto guardado com sucesso!");
      setTimeout(() => navigate(`/results/${pollId}`), 700);
    } catch (err) {
      toast.error(err.response?.data?.error || "Erro ao registar voto");
    }

    setVoting(false);
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem 1.8rem" }}>
        <div className="share-spinner" />
        <p style={{ color: "var(--soft-ink)", marginTop: "1rem" }}>
          A carregar...
        </p>
      </div>
    );
  }

  if (!loading && !poll) {
    return (
      <div className="card">
        <p className="error">Sondagem não encontrada.</p>
        <ToastStack toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  const isClosed =
    poll.status !== "open" || new Date() > new Date(poll.closesAt);

  return (
    <div className="vote-page">
      <div className="card vote-card">
        {poll.imageUrl && (
          <img
            className="poll-hero-image"
            src={poll.imageUrl}
            alt={`Imagem da sondagem ${poll.title}`}
          />
        )}

        <div className="vote-header">
          <span className={isClosed ? "status-pill closed" : "status-pill open"}>
            {isClosed ? "Fechada" : "Aberta para votação"}
          </span>

          <h1>{poll.title}</h1>

          {poll.description && (
            <p style={{ color: "var(--soft-ink)", marginBottom: "1rem" }}>
              {poll.description}
            </p>
          )}

          <p style={{ color: "var(--lavender-grey)", marginBottom: "1.5rem" }}>
            Fecha: {new Date(poll.closesAt).toLocaleString("pt-PT")}
          </p>
        </div>

        {isClosed && (
          <div className="closed-warning">
            🔒 Esta sondagem já está fechada. Já não é possível votar ou alterar o voto.
          </div>
        )}

        {!isClosed && previousVote && (
          <div className="vote-warning">
            ⚠️ Já votaste nesta sondagem. Podes alterar o teu voto enquanto a sondagem estiver aberta.
            <br />
            <strong>Voto atual:</strong> {previousVote}
          </div>
        )}

        {!isClosed && (
          <div>
            <div className="vote-options">
              {poll.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`vote-option ${selected === opt ? "selected" : ""}`}
                  onClick={() => setSelected(opt)}
                >
                  <span>{opt}</span>

                  {previousVote === opt && (
                    <small>voto atual</small>
                  )}
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary"
              onClick={handleVote}
              disabled={voting}
            >
              {voting
                ? "A guardar..."
                : previousVote
                  ? "Alterar voto"
                  : "Votar"}
            </button>
          </div>
        )}

        <div className="vote-footer-actions">
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/results/${pollId}`)}
          >
            Ver resultados
          </button>

          <button
            className="btn btn-ghost"
            onClick={() => navigate(`/share/${pollId}`)}
          >
            Partilhar
          </button>
        </div>

        <ToastStack toasts={toasts} removeToast={removeToast} />
      </div>
    </div>
  );
}

export default Vote;