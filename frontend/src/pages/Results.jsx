import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const API = process.env.REACT_APP_API_URL;

const COLORS = [
  "#87d68d",
  "#93b48b",
  "#bcebcb",
  "#8491a3",
  "#10b981",
  "#f59e0b",
];

function Results() {
  const { pollId } = useParams();
  const navigate = useNavigate();

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId]);

  const fetchResults = async () => {
    try {
      const res = await axios.get(`${API}/polls/${pollId}/results`);
      setResults(res.data);
      setError("");
    } catch {
      setError("Erro ao carregar resultados");
    }

    setLoading(false);
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

  if (error || !results) {
    return (
      <div className="card">
        <p className="error">{error || "Resultados não encontrados."}</p>
      </div>
    );
  }

  const isClosed =
    results.status !== "open" || new Date() > new Date(results.closesAt);

  const shareUrl = `${window.location.origin}/vote/${pollId}`;

  return (
    <div className="results-page">
      <div className="card results-card">
        {results.imageUrl && (
          <img
            className="poll-hero-image"
            src={results.imageUrl}
            alt={`Imagem da sondagem ${results.title}`}
          />
        )}

        <div className="results-header">
          <span className={isClosed ? "status-pill closed" : "status-pill open"}>
            {isClosed ? "Sondagem fechada" : "A atualizar em tempo real"}
          </span>

          <h1>{results.title}</h1>

          {results.description && (
            <p style={{ color: "var(--soft-ink)", marginBottom: "1rem" }}>
              {results.description}
            </p>
          )}

          <p style={{ color: "var(--lavender-grey)", marginBottom: "0.5rem" }}>
            {isClosed
              ? "🔒 Esta sondagem está fechada"
              : `⏳ Fecha: ${new Date(results.closesAt).toLocaleString("pt-PT")}`}
          </p>

          <p style={{ marginBottom: "1.5rem" }}>
            <strong>{results.total}</strong> participante
            {results.total !== 1 ? "s" : ""}
            {!isClosed && (
              <span className="live-dot">
                ● a atualizar
              </span>
            )}
          </p>
        </div>

        {results.total > 0 ? (
          <div className="results-chart">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={results.results}
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="option" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value) => [value, "Votos"]} />
                <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
                  {results.results.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ color: "#888", textAlign: "center", padding: "2rem" }}>
            Ainda não há votos nesta sondagem.
          </p>
        )}

        <div className="results-list">
          {results.results.map((r, i) => (
            <div className="result-row" key={r.option}>
              <div
                className="result-dot"
                style={{ background: COLORS[i % COLORS.length] }}
              />

              <span>{r.option}</span>

              <strong>{r.votes} votos</strong>

              <small>{r.percentage}%</small>
            </div>
          ))}
        </div>
      </div>

      {!isClosed && (
        <div className="card">
          <h2>Partilhar sondagem</h2>
          <p style={{ color: "var(--soft-ink)" }}>
            Envia este link para outras pessoas votarem.
          </p>

          <div className="share-box">{shareUrl}</div>

          <button
            className="btn btn-secondary"
            onClick={() => navigator.clipboard.writeText(shareUrl)}
          >
            Copiar link
          </button>
        </div>
      )}

      <div className="page-actions">
        <button className="btn btn-secondary" onClick={() => navigate("/")}>
          ← Dashboard
        </button>

        {!isClosed && (
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/vote/${pollId}`)}
          >
            Votar
          </button>
        )}

        <button
          className="btn btn-ghost"
          onClick={() => navigate(`/share/${pollId}`)}
        >
          Partilhar
        </button>
      </div>
    </div>
  );
}

export default Results;