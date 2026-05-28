import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;
const USER_STORAGE_KEY = "pollnow_user";

function Home() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [polls, setPolls] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    options: ["", ""],
    closesAt: "",
    authorPhone: "",
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || "null");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    setUser(storedUser);
    setForm((current) => ({
      ...current,
      authorPhone: storedUser.email || "",
    }));

    fetchPolls(storedUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPolls = async (activeUser = user) => {
    if (!activeUser?.userId) return;

    setLoadingPolls(true);
    setError("");

    try {
      const res = await axios.get(`${API}/polls`, {
        headers: {
          "x-user-id": activeUser.userId,
        },
      });

      setPolls(
        res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      );
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao carregar sondagens");
    }

    setLoadingPolls(false);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...form.options];
    newOptions[index] = value;
    setForm({ ...form, options: newOptions });
  };

  const addOption = () => {
    if (form.options.length < 6) {
      setForm({ ...form, options: [...form.options, ""] });
    }
  };

  const removeOption = (index) => {
    if (form.options.length > 2) {
      setForm({
        ...form,
        options: form.options.filter((_, i) => i !== index),
      });
    }
  };

  const validateForm = () => {
    if (!form.title.trim()) return "Título obrigatório";

    const cleanOptions = form.options.map((option) => option.trim()).filter(Boolean);

    if (cleanOptions.length < 2) {
      return "A sondagem precisa de pelo menos 2 opções";
    }

    if (form.options.some((option) => !option.trim())) {
      return "Preenche todas as opções ou remove as vazias";
    }

    const lowerOptions = cleanOptions.map((option) => option.toLowerCase());
    if (new Set(lowerOptions).size !== lowerOptions.length) {
      return "As opções não podem ser repetidas";
    }

    if (!form.closesAt) return "Data de fecho obrigatória";

    const closesAt = new Date(form.closesAt);
    if (Number.isNaN(closesAt.getTime()) || closesAt <= new Date()) {
      return "A data de fecho tem de ser futura";
    }

    if (!form.authorPhone.trim()) {
      return "Email obrigatório para notificação";
    }

    if (!form.authorPhone.includes("@")) {
      return "Email inválido";
    }

    return "";
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setShareUrl("");

    if (!user?.userId) {
      navigate("/login");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      return setError(validationError);
    }

    setLoading(true);

    try {
      const res = await axios.post(
        `${API}/polls`,
        {
          title: form.title,
          description: form.description,
          options: form.options.filter((option) => option.trim()),
          closesAt: new Date(form.closesAt).toISOString(),
          authorPhone: form.authorPhone,
          ownerEmail: user.email,
          ownerUsername: user.username,
        },
        {
          headers: {
            "x-user-id": user.userId,
          },
        },
      );

      const url = `${window.location.origin}/vote/${res.data.pollId}`;
      setShareUrl(url);
      setSuccess("Sondagem criada com sucesso!");

      setForm({
        title: "",
        description: "",
        options: ["", ""],
        closesAt: "",
        authorPhone: user.email || "",
      });

      fetchPolls(user);
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao criar sondagem");
    }

    setLoading(false);
  };

  const getStatusBadge = (poll) => {
    const now = new Date();
    const closes = new Date(poll.closesAt);

    if (poll.status === "notified") {
      return <span className="badge badge-notified">Notificada</span>;
    }

    if (poll.status === "closed" || closes < now) {
      return <span className="badge badge-closed">Fechada</span>;
    }

    return <span className="badge badge-open">Aberta</span>;
  };

  const filteredPolls = polls.filter((poll) => {
    const value = search.toLowerCase();

    return (
      poll.title?.toLowerCase().includes(value) ||
      poll.status?.toLowerCase().includes(value) ||
      poll.description?.toLowerCase().includes(value)
    );
  });

  if (!user) {
    return (
      <div className="card">
        <p>A redirecionar para login...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>Criar nova sondagem</h2>

        <label>Título</label>
        <input
          placeholder="Ex: Melhor dia para reunião?"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <label>Descrição opcional</label>
        <input
          placeholder="Ex: Escolhe a melhor opção para o grupo"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <label>Opções</label>
        {form.options.map((opt, i) => (
          <div className="option-row" key={i}>
            <input
              placeholder={`Opção ${i + 1}`}
              value={opt}
              onChange={(e) => handleOptionChange(i, e.target.value)}
            />
            {form.options.length > 2 && (
              <button className="btn btn-danger" onClick={() => removeOption(i)}>
                ✕
              </button>
            )}
          </div>
        ))}

        {form.options.length < 6 && (
          <button
            className="btn btn-secondary"
            onClick={addOption}
            style={{ marginBottom: "0.8rem" }}
          >
            + Adicionar opção
          </button>
        )}

        <label>Data e hora de fecho</label>
        <input
          type="datetime-local"
          value={form.closesAt}
          onChange={(e) => setForm({ ...form, closesAt: e.target.value })}
        />

        <label>Email para notificação</label>
        <input
          placeholder="Ex: autor@email.com"
          value={form.authorPhone}
          onChange={(e) => setForm({ ...form, authorPhone: e.target.value })}
        />

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        {shareUrl && (
          <div>
            <p className="success">Partilha este link com os votantes:</p>
            <div className="share-box">{shareUrl}</div>
            <button
              className="btn btn-secondary"
              onClick={() => navigator.clipboard.writeText(shareUrl)}
            >
              Copiar link
            </button>
          </div>
        )}

        <br />

        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "A criar..." : "Criar sondagem"}
        </button>
      </div>

      <div className="card">
        <h2>Minhas sondagens</h2>

        <input
          placeholder="Pesquisar por título, descrição ou estado..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loadingPolls && <p style={{ color: "#888" }}>A carregar sondagens...</p>}

        {!loadingPolls && filteredPolls.length === 0 && (
          <p style={{ color: "#888" }}>Nenhuma sondagem encontrada.</p>
        )}

        {filteredPolls.map((poll) => (
          <div className="poll-list-item" key={poll.pollId}>
            <div>
              <h3>{poll.title}</h3>

              {poll.description && (
                <p style={{ color: "#666", marginBottom: "0.4rem" }}>
                  {poll.description}
                </p>
              )}

              <small style={{ color: "#888" }}>
                Fecha: {new Date(poll.closesAt).toLocaleString("pt-PT")}
              </small>

              <br />
              {getStatusBadge(poll)}
            </div>

            <div className="poll-actions">
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/vote/${poll.pollId}`)}
              >
                Votar
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/results/${poll.pollId}`)}
              >
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
