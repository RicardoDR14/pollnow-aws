import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import ToastStack from "../components/ToastStack";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;
const USER_STORAGE_KEY = "pollnow_user";

const MAX_IMAGE_SIZE_BYTES = 1.5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function Home() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [polls, setPolls] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [editingPoll, setEditingPoll] = useState(null);
  const [shareUrl, setShareUrl] = useState("");
  const { toasts, removeToast, toast } = useToast();

  const [pollImage, setPollImage] = useState({
    file: null,
    previewUrl: "",
    base64: "",
    contentType: "",
  });

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

  useEffect(() => {
    return () => {
      if (pollImage.previewUrl) {
        URL.revokeObjectURL(pollImage.previewUrl);
      }
    };
  }, [pollImage.previewUrl]);

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

    try {
      const res = await axios.get(`${API}/polls`, {
        headers: getAuthHeaders(activeUser),
      });

      setPolls(
        res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      );
    } catch (err) {
      toast.error(err.response?.data?.error || "Erro ao carregar sondagens");
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

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;

        if (typeof result !== "string") {
          reject(new Error("Imagem inválida"));
          return;
        }

        const base64 = result.split(",")[1];
        resolve(base64);
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Formato inválido. Usa JPG, PNG ou WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("A imagem deve ter no máximo 1.5MB.");
      event.target.value = "";
      return;
    }

    try {
      const base64 = await readFileAsBase64(file);

      if (pollImage.previewUrl) {
        URL.revokeObjectURL(pollImage.previewUrl);
      }

      setPollImage({
        file,
        previewUrl: URL.createObjectURL(file),
        base64,
        contentType: file.type,
      });
    } catch {
      toast.error("Não foi possível carregar a imagem.");
      event.target.value = "";
    }
  };

  const removeImage = () => {
    if (pollImage.previewUrl) {
      URL.revokeObjectURL(pollImage.previewUrl);
    }

    setPollImage({
      file: null,
      previewUrl: "",
      base64: "",
      contentType: "",
    });
  };

  const resetForm = () => {
    setEditingPoll(null);
    setForm({
      ...emptyForm,
      authorPhone: user?.email || "",
    });
    setShareUrl("");
    removeImage();
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

  const openPendingShareWindow = () => {
    const pendingShareWindow = window.open("about:blank", "_blank");

    if (pendingShareWindow) {
      pendingShareWindow.document.write(`<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PollNow</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
      color: #172033;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background:
        radial-gradient(circle at top left, rgba(188,235,203,0.75), transparent 32rem),
        radial-gradient(circle at top right, rgba(135,214,141,0.35), transparent 28rem),
        linear-gradient(180deg, #f7fff6, #eef7f1 48%, #f8fbfa);
    }
    .shell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.4rem;
      text-align: center;
      padding: 2rem;
    }
    .logo {
      width: 64px;
      height: 64px;
      border-radius: 20px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #87d68d, #bcebcb);
      box-shadow: 0 10px 26px rgba(23,32,51,0.07);
      font-size: 2rem;
    }
    h1 { font-size: 1.7rem; letter-spacing: -0.04em; }
    p { color: #4a5568; font-size: 1rem; }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(135,214,141,0.3);
      border-top-color: #87d68d;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="shell">
    <div class="logo">☑</div>
    <h1>PollNow</h1>
    <div class="spinner"></div>
    <p>A preparar página de partilha…</p>
  </div>
</body>
</html>`);
      pendingShareWindow.document.close();
    }

    return pendingShareWindow;
  };

  const handleSubmit = async () => {
    setShareUrl("");

    if (!user?.userId) {
      navigate("/login");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      return toast.error(validationError);
    }

    let pendingShareWindow = null;

    if (!editingPoll) {
      pendingShareWindow = openPendingShareWindow();
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

        toast.success("Sondagem editada com sucesso!");
        resetForm();
        fetchPolls(user);
      } else {
        const payload = {
          title: form.title,
          description: form.description,
          options: form.options.filter((option) => option.trim()),
          closesAt: new Date(form.closesAt).toISOString(),
          authorPhone: form.authorPhone,
          ownerEmail: user.email,
          ownerUsername: user.username,
        };

        if (pollImage.base64) {
          payload.image = pollImage.base64;
          payload.imageContentType = pollImage.contentType;
        }

        const res = await axios.post(`${API}/polls`, payload, {
          headers: getAuthHeaders(),
        });

        const pollShareUrl = getShareUrl(res.data.pollId);
        setShareUrl(pollShareUrl);

        toast.success(
          pollImage.base64
            ? "Sondagem criada com imagem! A página de partilha foi aberta."
            : "Sondagem criada com sucesso! A página de partilha foi aberta.",
        );

        if (pendingShareWindow) {
          pendingShareWindow.location.href = getSharePath(res.data.pollId);
        } else {
          toast.success(
            "O browser bloqueou a nova janela; usa o botão de partilha.",
          );
        }

        resetForm();
        fetchPolls(user);
      }
    } catch (err) {
      if (pendingShareWindow) {
        pendingShareWindow.close();
      }

      toast.error(err.response?.data?.error || "Erro ao guardar sondagem");
    }

    setLoading(false);
  };

  const startEditPoll = (poll) => {
    setShareUrl("");
    setEditingPoll(poll);
    removeImage();

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

    try {
      await axios.delete(`${API}/polls/${poll.pollId}`, {
        headers: getAuthHeaders(),
      });

      toast.success("Sondagem eliminada com sucesso!");
      fetchPolls(user);
    } catch (err) {
      toast.error(err.response?.data?.error || "Erro ao eliminar sondagem");
    }
  };

  const closePoll = async (poll) => {
    const confirmed = window.confirm(
      `Queres fechar a sondagem "${poll.title}" agora?`,
    );

    if (!confirmed) return;

    try {
      await axios.patch(
        `${API}/polls/${poll.pollId}/close`,
        {},
        {
          headers: getAuthHeaders(),
        },
      );

      toast.success("Sondagem fechada com sucesso!");
      fetchPolls(user);
    } catch (err) {
      toast.error(err.response?.data?.error || "Erro ao fechar sondagem");
    }
  };

  const copyShareLink = async (pollId) => {
    try {
      await navigator.clipboard.writeText(getVoteUrl(pollId));
      toast.success("Link público de votação copiado!");
    } catch {
      toast.error("Não foi possível copiar o link.");
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

      <section className="stack-strip">
  <span>Serverless stack</span>
  <div>
    <strong>Netlify</strong>
    <strong>API Gateway</strong>
    <strong>Lambda</strong>
    <strong>DynamoDB</strong>
    <strong>S3</strong>
    <strong>SNS</strong>
    <strong>EventBridge</strong>
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

        <div className="image-upload-box">
          <div>
            <label>Imagem opcional da sondagem</label>
            <p>
              Usa uma imagem para identificar melhor a poll, como uma foto,
              logótipo, cartaz ou imagem da organização.
            </p>
          </div>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            disabled={Boolean(editingPoll)}
          />

          {editingPoll && (
            <small className="muted-text">
              A alteração de imagem está disponível apenas na criação da poll
              nesta fase.
            </small>
          )}

          {pollImage.previewUrl && (
            <div className="image-preview-card">
              <img src={pollImage.previewUrl} alt="Preview da poll" />

              <div>
                <strong>{pollImage.file?.name}</strong>
                <small>
                  {pollImage.file
                    ? `${Math.round(pollImage.file.size / 1024)} KB`
                    : ""}
                </small>

                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={removeImage}
                >
                  Remover imagem
                </button>
              </div>
            </div>
          )}
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
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div className="share-spinner" />
            <p style={{ color: "var(--soft-ink)", marginTop: "0.75rem" }}>
              A carregar sondagens...
            </p>
          </div>
        )}

        {!loadingPolls && filteredPolls.length === 0 && (
  <div className="empty-state">
    <div className="empty-icon">☑</div>
    <h3>
      {search
        ? "Nenhuma sondagem corresponde à pesquisa."
        : "Ainda não tens sondagens."}
    </h3>
    <p>
      {search
        ? "Experimenta procurar por outro título, descrição ou estado."
        : "Cria a tua primeira poll, adiciona opções, define uma data de fecho e partilha com QR Code."}
    </p>
    {!search && (
      <button
        className="btn btn-primary"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        Criar primeira sondagem
      </button>
    )}
  </div>
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
                  {poll.imageUrl && (
                    <img
                      className="poll-card-image"
                      src={poll.imageUrl}
                      alt={`Imagem da sondagem ${poll.title}`}
                    />
                  )}

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

      <ToastStack toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default Home;