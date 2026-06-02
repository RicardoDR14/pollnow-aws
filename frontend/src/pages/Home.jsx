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
  const [editingPoll, setEditingPoll] = useState(null);
  const [expandedQrPollId, setExpandedQrPollId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  const emptyForm = {
    title: "",
    description: "",
    options: ["", ""],
    closesAt: "",
    authorPhone: "",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const storedUser = JSON.parse(
      localStorage.getItem(USER_STORAGE_KEY) || "null",
    );

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

  const getAuthHeaders = (activeUser = user) => ({
    "x-user-id": activeUser?.userId,
  });

  const getVoteUrl = (pollId) => `${window.location.origin}/vote/${pollId}`;
  const getSharePath = (pollId) => `/share/${pollId}`;
  const getShareUrl = (pollId) => `${window.location.origin}/share/${pollId}`;

  const openShareWindow = (pollId) => {
    window.open(getSharePath(pollId), "_blank", "noopener,noreferrer");
  };

  const fetchPolls = async (activeUser = user) => {
    if (!activeUser?.userId) return;

    setLoadingPolls(true);
    setError("");

    try {
      const res = await axios.get(`${API}/polls`, {
        headers: getAuthHeaders(activeUser),
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

  const resetForm = () => {
    setEditingPoll(null);
    setForm({
      ...emptyForm,
      authorPhone: user?.email || "",
    });
    setShareUrl("");
  };

  const validateForm = () => {
    if (!form.title.trim()) return "Título obrigatório";

    const cleanOptions = form.options
      .map((option) => option.trim())
      .filter(Boolean);

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
    if (Number.isNaN(closesAt.getTime())) {
      return "Data de fecho inválida";
    }

    if (!editingPoll && closesAt <= new Date()) {
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

    let pendingShareWindow = null;

    if (!editingPoll) {
      pendingShareWindow = window.open("about:blank", "_blank");
      if (pendingShareWindow) {
        pendingShareWindow.document.write(
          "<p style='font-family: Arial; padding: 24px;'>A preparar página de partilha...</p>",
        );
      }
    }

    setLoading(true);

    try {
      if (editingPoll) {
        await axios.put(
          `${API}/polls/${editingPoll.pollId}`,
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
            headers: getAuthHeaders(),
          },
        );

        setSuccess("Sondagem editada com sucesso!");
        resetForm();
        fetchPolls(user);
      } else {
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
            headers: getAuthHeaders(),
          },
        );

        const pollShareUrl = getShareUrl(res.data.pollId);
        setShareUrl(pollShareUrl);
        setSuccess(
          "Sondagem criada com sucesso! A página de partilha foi aberta.",
        );

        if (pendingShareWindow) {
          pendingShareWindow.location.href = getSharePath(res.data.pollId);
        } else {
          setSuccess(
            "Sondagem criada com sucesso! O browser bloqueou a nova janela; usa o botão de partilha.",
          );
        }

        resetForm();
        fetchPolls(user);
      }
    } catch (err) {
      if (pendingShareWindow) {
        pendingShareWindow.close();
      }

      setError(err.response?.data?.error || "Erro ao guardar sondagem");
    }

    setLoading(false);
  };

  const startEditPoll = (poll) => {
    setError("");
    setSuccess("");
    setShareUrl("");
    setEditingPoll(poll);

    const localDate = new Date(poll.closesAt);
    const timezoneOffset = localDate.getTimezoneOffset() * 60000;
    const localDateTime = new Date(localDate.getTime() - timezoneOffset)
      .toISOString()
      .slice(0, 16);

    setForm({
      title: poll.title || "",
      description: poll.description || "",
      options: poll.options?.length ? poll.options : ["", ""],
      closesAt: localDateTime,
      authorPhone: poll.ownerEmail || user.email || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deletePoll = async (poll) => {
    const confirmed = window.confirm(
      `Tens a certeza que queres eliminar a sondagem "${poll.title}"? Esta ação não pode ser desfeita.`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await axios.delete(`${API}/polls/${poll.pollId}`, {
        headers: getAuthHeaders(),
      });

      setSuccess("Sondagem eliminada com sucesso!");
      fetchPolls(user);
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao eliminar sondagem");
    }
  };

  const closePoll = async (poll) => {
    const confirmed = window.confirm(
      `Queres fechar a sondagem "${poll.title}" agora?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await axios.patch(
        `${API}/polls/${poll.pollId}/close`,
        {},
        {
          headers: getAuthHeaders(),
        },
      );

      setSuccess("Sondagem fechada com sucesso!");
      fetchPolls(user);
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao fechar sondagem");
    }
  };

  const copyShareLink = async (pollId) => {
    try {
      await navigator.clipboard.writeText(getVoteUrl(pollId));
      setSuccess("Link público de votação copiado!");
    } catch {
      setError("Não foi possível copiar o link.");
    }
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

  const openPolls = polls.filter(
    (poll) => poll.status === "open" && new Date(poll.closesAt) >= new Date(),
  ).length;

  const closedPolls = polls.length - openPolls;

  if (!user) {
    return (
      <div className="card">
        <p>A redirecionar para login...</p>
      </div>
    );
  }

  return (
    <div>
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">Dashboard PollNow</span>
          <h1>Cria, partilha e acompanha sondagens em tempo real.</h1>
          <p>
            Gere as tuas polls num espaço privado, partilha por QR Code e
            acompanha os resultados sem complicações.
          </p>
        </div>

        <div className="hero-stats">
          <div>
            <strong>{polls.length}</strong>
            <span>Total</span>
          </div>
          <div>
            <strong>{openPolls}</strong>
            <span>Abertas</span>
          </div>
          <div>
            <strong>{closedPolls}</strong>
            <span>Fechadas</span>
          </div>
        </div>
      </section>

      <div className={`card form-card ${editingPoll ? "editing-card" : ""}`}>
        <div className="card-heading-row">
          <div>
            <span className="section-kicker">
              {editingPoll ? "Modo edição" : "Nova sondagem"}
            </span>
            <h2>{editingPoll ? "Editar sondagem" : "Criar nova sondagem"}</h2>
          </div>

          {editingPoll && <span className="edit-pill">A editar</span>}
        </div>

        {editingPoll && (
          <div className="editing-notice">
            <strong>Sondagem selecionada:</strong> {editingPoll.title}
            <br />
            <small>
              Estás a alterar uma poll existente. Para voltar ao modo normal,
              clica em “Cancelar edição”.
            </small>
          </div>
        )}

        <div className="form-grid">
          <div className="form-field">
            <label>Título</label>
            <input
              placeholder="Ex: Melhor dia para reunião?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="form-field">
            <label>Descrição opcional</label>
            <input
              placeholder="Ex: Escolhe a melhor opção para o grupo"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
        </div>

        <label>Opções</label>
        {form.options.map((opt, i) => (
          <div className="option-row" key={i}>
            <input
              placeholder={`Opção ${i + 1}`}
              value={opt}
              onChange={(e) => handleOptionChange(i, e.target.value)}
            />
            {form.options.length > 2 && (
              <button
                className="btn btn-danger"
                onClick={() => removeOption(i)}
              >
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

        <div className="form-grid">
          <div className="form-field">
            <label>Data e hora de fecho</label>
            <input
              type="datetime-local"
              value={form.closesAt}
              onChange={(e) => setForm({ ...form, closesAt: e.target.value })}
            />
          </div>

          <div className="form-field">
            <label>Email para notificação</label>
            <input
              placeholder="Ex: autor@email.com"
              value={form.authorPhone}
              onChange={(e) =>
                setForm({ ...form, authorPhone: e.target.value })
              }
            />
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        {shareUrl && (
          <div className="share-inline">
            <p>Última página de partilha criada:</p>
            <div className="share-box">{shareUrl}</div>
          </div>
        )}

        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? "A guardar..."
              : editingPoll
                ? "Guardar alterações"
                : "Criar sondagem"}
          </button>

          {editingPoll && (
            <button className="btn btn-secondary" onClick={resetForm}>
              Cancelar edição
            </button>
          )}
        </div>
      </div>

      <div className="card polls-card">
        <div className="card-heading-row">
          <div>
            <span className="section-kicker">Gestão</span>
            <h2>Minhas sondagens</h2>
          </div>
        </div>

        <input
          className="search-input"
          placeholder="Pesquisar por título, descrição ou estado..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loadingPolls && (
          <p style={{ color: "#8491a3" }}>A carregar sondagens...</p>
        )}

        {!loadingPolls && filteredPolls.length === 0 && (
          <p style={{ color: "#8491a3" }}>Nenhuma sondagem encontrada.</p>
        )}

        <div className="poll-grid">
          {filteredPolls.map((poll) => {
            const isClosed =
              poll.status === "closed" ||
              poll.status === "notified" ||
              new Date(poll.closesAt) < new Date();

            return (
              <article className="poll-card" key={poll.pollId}>
                <div className="poll-main">
                  <div className="poll-topline">
                    {getStatusBadge(poll)}
                    <small>
                      {new Date(poll.closesAt).toLocaleString("pt-PT")}
                    </small>
                  </div>

                  <h3>{poll.title}</h3>

                  {poll.description && <p>{poll.description}</p>}
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
                    Resultados
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => openShareWindow(poll.pollId)}
                  >
                    Partilhar
                  </button>

                  <button
                    className="btn btn-ghost"
                    onClick={() => copyShareLink(poll.pollId)}
                  >
                    Copiar link
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => startEditPoll(poll)}
                  >
                    Editar
                  </button>

                  {!isClosed && (
                    <button
                      className="btn btn-success"
                      onClick={() => closePoll(poll)}
                    >
                      Fechar
                    </button>
                  )}

                  <button
                    className="btn btn-danger"
                    onClick={() => deletePoll(poll)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Home;
