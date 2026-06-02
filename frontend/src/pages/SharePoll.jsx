import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

function SharePoll() {
  const { pollId } = useParams();
  const navigate = useNavigate();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const voteUrl = `${window.location.origin}/vote/${pollId}`;

  useEffect(() => {
    fetchPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId]);

  const fetchPoll = async () => {
    try {
      const res = await axios.get(`${API}/polls/${pollId}`);
      setPoll(res.data);
    } catch {
      setError("Não foi possível carregar esta sondagem.");
    }

    setLoading(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(voteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Não foi possível copiar o link.");
    }
  };

  const downloadQrCode = () => {
    const canvas = document.getElementById(`share-qr-${pollId}`);

    if (!canvas) {
      setError("QR Code não encontrado.");
      return;
    }

    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");

    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `pollnow-${pollId}-qr.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  if (loading) {
    return (
      <div className="share-page">
        <div className="share-shell" style={{ textAlign: "center" }}>
          <div className="share-brand" style={{ justifyContent: "center", marginBottom: "1.4rem" }}>
            <span className="share-logo">☑</span>
            <div>
              <h1 style={{ margin: 0 }}>PollNow</h1>
            </div>
          </div>
          <div className="share-spinner" />
          <p style={{ color: "var(--soft-ink)", marginTop: "1rem" }}>A carregar página de partilha…</p>
        </div>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="share-page">
        <div className="share-shell">
          <h1>PollNow</h1>
          <p className="error">{error}</p>
          <button className="btn btn-secondary" onClick={() => navigate("/")}>
            Voltar ao dashboard
          </button>
        </div>
      </div>
    );
  }

  const isClosed =
    poll.status !== "open" || new Date() > new Date(poll.closesAt);

  return (
    <div className="share-page">
      <div className="share-shell">
        <div className="share-brand">
          <span className="share-logo">☑</span>
          <div>
            <h1>PollNow</h1>
            <p>Partilha rápida da sondagem</p>
          </div>
        </div>

        <div className="share-card">
          <div className="share-info">
            <span className={isClosed ? "status-pill closed" : "status-pill open"}>
              {isClosed ? "Fechada" : "Aberta para votação"}
            </span>

            <h2>{poll.title}</h2>

            {poll.description && <p>{poll.description}</p>}

            <small>
              Fecha: {new Date(poll.closesAt).toLocaleString("pt-PT")}
            </small>
          </div>

          <div className="qr-panel">
            <QRCodeCanvas
              id={`share-qr-${pollId}`}
              value={voteUrl}
              size={230}
              includeMargin
            />

            <div className="share-url-box">{voteUrl}</div>

            {copied && <p className="success">Link copiado!</p>}

            <div className="share-actions">
              <button className="btn btn-primary" onClick={copyLink}>
                Copiar link
              </button>

              <button className="btn btn-secondary" onClick={downloadQrCode}>
                Baixar QR
              </button>
            </div>
          </div>
        </div>

        <div className="share-footer-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/vote/${pollId}`)}>
            Abrir votação
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/results/${pollId}`)}
          >
            Ver resultados
          </button>

          <button className="btn btn-ghost" onClick={() => navigate("/")}>
            Voltar ao dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default SharePoll;