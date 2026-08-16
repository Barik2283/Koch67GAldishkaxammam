(function () {
  "use strict";

  const STORAGE_KEY = "agent-lab-ru:v1";
  let scenario = window.AGENT_LAB_SCENARIOS.find((item) => item.id === "mars");
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const elements = {};
  let state;
  let simulator;
  let activeModal = null;
  let previousFocus = null;
  let resizeObserver = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getScenarioById(id) {
    return window.AGENT_LAB_SCENARIOS.find((item) => item.id === id) || scenario;
  }

  function initialObjectives() {
    return Object.fromEntries(scenario.mission.objectives.map((objective) => [objective.id, false]));
  }

  function createInitialState() {
    return {
      version: 1,
      currentScenario: scenario.id,
      screen: "intro",
      phase: "build",
      activeTab: "agents",
      teacherMode: false,
      selectedAgentId: null,
      agents: [],
      world: { ...scenario.initialState },
      objectives: initialObjectives(),
      countdown: scenario.mission.countdown,
      logs: [],
      run: null,
      activeStep: null,
      hintIndex: 0
    };
  }

  function normalizeState(candidate) {
    const baseScenario = getScenarioById(candidate?.currentScenario || "mars");
    const base = {
      version: 1,
      currentScenario: baseScenario.id,
      screen: "intro",
      phase: "build",
      activeTab: "agents",
      teacherMode: false,
      selectedAgentId: null,
      agents: [],
      world: { ...baseScenario.initialState },
      objectives: Object.fromEntries(baseScenario.mission.objectives.map((o) => [o.id, false])),
      countdown: baseScenario.mission.countdown,
      logs: [],
      run: null,
      activeStep: null,
      hintIndex: 0
    };
    if (!candidate || candidate.version !== 1) return base;
    return {
      ...base,
      ...candidate,
      world: { ...base.world, ...(candidate.world || {}) },
      objectives: { ...base.objectives, ...(candidate.objectives || {}) },
      agents: Array.isArray(candidate.agents) ? candidate.agents.map((agent) => ({
        id: agent.id,
        templateId: agent.templateId,
        name: agent.name || "Агент",
        role: agent.role || "Специалист",
        goal: agent.goal || "",
        input: agent.input || "",
        output: agent.output || "",
        rag: Array.isArray(agent.rag) ? agent.rag : [],
        skills: Array.isArray(agent.skills) ? agent.skills : [],
        tools: Array.isArray(agent.tools) ? agent.tools : []
      })).filter((agent) => baseScenario.agents.some((template) => template.id === agent.templateId)) : [],
      logs: Array.isArray(candidate.logs) ? candidate.logs.slice(-80) : [],
      activeStep: null
    };
  }

  function loadState() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch (_error) {
      return createInitialState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, activeStep: null }));
    } catch (_error) {
      showToast("Не удалось сохранить прогресс в браузере.", "warning");
    }
  }

  function cacheElements() {
    [
      "intro-screen", "mission-screen", "lab-screen", "mission-grid", "component-list", "library-count",
      "library-help", "agent-grid", "empty-architecture", "architecture-canvas", "connections-canvas",
      "selected-agent-label", "mission-copy", "objective-list", "world-state", "countdown-value",
      "teacher-toggle", "teacher-tools", "log-feed", "simulation-status", "simulation-led", "speed-select",
      "pause-button", "next-button", "modal-layer", "agent-modal", "report-modal", "event-modal",
      "agent-form", "agent-id", "agent-name", "agent-role", "agent-goal", "agent-input", "agent-output",
      "assigned-summary", "report-content", "event-list", "toast-region"
    ].forEach((id) => { elements[id] = document.getElementById(id); });
  }

  function showScreen(name) {
    state.screen = name;
    $$(".screen").forEach((screen) => screen.classList.toggle("is-active", screen.id === `${name}-screen`));
    if (name === "lab") {
      window.requestAnimationFrame(() => {
        renderAll();
        drawConnections();
      });
    }
    saveState();
  }

  function renderMissionCards() {
    elements["mission-grid"].innerHTML = window.AGENT_LAB_SCENARIOS.map((mission, index) => `
      <button class="mission-card" type="button" data-scenario="${escapeHtml(mission.id)}" ${mission.available ? "" : "disabled"}
        style="--card-glow:${index === 0 ? "rgba(157,123,255,.24)" : index === 1 ? "rgba(85,212,156,.15)" : index === 2 ? "rgba(69,168,255,.16)" : "rgba(255,200,87,.14)"}">
        <span class="mission-index">МИССИЯ 0${index + 1}</span>
        <span class="mission-icon" aria-hidden="true">${mission.icon}</span>
        <h3>${escapeHtml(mission.title)}</h3>
        <p>${escapeHtml(mission.description)}</p>
        <footer>
          <span>Сложность<b>${mission.difficulty}</b></span>
          ${mission.available ? `<span>${escapeHtml(mission.lesson)} →</span>` : '<span class="soon-badge">Скоро</span>'}
        </footer>
      </button>
    `).join("");
  }

  function currentCollection() {
    if (state.activeTab === "agents") return scenario.agents;
    return scenario[state.activeTab];
  }

  function renderLibrary() {
    const collection = currentCollection();
    const selected = state.agents.find((agent) => agent.id === state.selectedAgentId);
    elements["library-count"].textContent = collection.length;
    $$(".library-tabs button").forEach((button) => {
      const active = button.dataset.tab === state.activeTab;
      button.setAttribute("aria-selected", String(active));
    });

    elements["component-list"].innerHTML = collection.map((item) => {
      const existingAgent = item.type === "agent" && state.agents.some((agent) => agent.templateId === item.id);
      const listName = item.type === "skill" ? "skills" : item.type === "tool" ? "tools" : "rag";
      const assigned = item.type !== "agent" && selected && selected[listName].includes(item.id);
      const action = existingAgent ? "✓" : assigned ? "−" : item.type === "agent" ? "+" : "→";
      return `
        <button class="component-card${existingAgent || assigned ? " is-assigned" : ""}" type="button" draggable="true"
          data-component-id="${escapeHtml(item.id)}" data-type="${escapeHtml(item.type)}"
          aria-label="${assigned ? "Снять" : item.type === "agent" ? "Добавить" : "Назначить"}: ${escapeHtml(item.title)}">
          <span class="component-icon" aria-hidden="true">${item.icon}</span>
          <span class="component-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></span>
          <span class="component-action" aria-hidden="true">${action}</span>
        </button>`;
    }).join("");

    if (state.activeTab === "agents") {
      elements["library-help"].innerHTML = '<span aria-hidden="true">↗</span><p><strong>Добавьте роли в команду.</strong> Нажатие откроет цель и маршруты нового агента.</p>';
    } else if (selected) {
      elements["library-help"].innerHTML = `<span aria-hidden="true">→</span><p>Компоненты назначаются агенту <strong>${escapeHtml(selected.name)}</strong>. Повторное нажатие снимает назначение.</p>`;
    } else {
      elements["library-help"].innerHTML = '<span aria-hidden="true">!</span><p><strong>Выберите агента в центре,</strong> чтобы назначить ему этот компонент.</p>';
    }
  }

  function componentTitle(type, id) {
    const collection = type === "skills" ? scenario.skills : type === "tools" ? scenario.tools : scenario.rag;
    return collection.find((item) => item.id === id)?.title || id;
  }

  function resourcePills(agent, type) {
    const values = agent[type] || [];
    if (!values.length) return '<span class="resource-empty">не назначено</span>';
    return values.slice(0, 2).map((id) => `<span class="resource-pill">${escapeHtml(componentTitle(type, id))}</span>`).join("") + (values.length > 2 ? `<span class="resource-pill">+${values.length - 2}</span>` : "");
  }

  function routeTitle(value) {
    if (!value) return "не задан";
    if (value === "user") return "пользователь";
    return scenario.agents.find((item) => item.id === value)?.title || value;
  }

  function renderAgents() {
    elements["empty-architecture"].hidden = state.agents.length > 0;
    elements["agent-grid"].innerHTML = state.agents.map((agent) => {
      const template = scenario.agents.find((item) => item.id === agent.templateId);
      const selected = agent.id === state.selectedAgentId;
      const active = state.activeStep?.agent === agent.templateId;
      const warning = active && state.activeStep?.tone === "danger";
      return `
        <article class="agent-node${selected ? " is-selected" : ""}${active ? " is-active" : ""}${warning ? " is-warning" : ""}"
          data-agent-id="${escapeHtml(agent.id)}" data-template-id="${escapeHtml(agent.templateId)}" tabindex="0"
          aria-label="Агент ${escapeHtml(agent.name)}. Нажмите, чтобы выбрать.">
          <div class="node-header">
            <div class="node-identity"><span class="node-avatar" aria-hidden="true">${template?.icon || "A"}</span><div><h3>${escapeHtml(agent.name)}</h3><p>${escapeHtml(agent.role)}</p></div></div>
            <button class="node-settings" type="button" data-configure-agent="${escapeHtml(agent.id)}" aria-label="Настроить ${escapeHtml(agent.name)}">⚙</button>
          </div>
          <p class="node-goal${agent.goal ? "" : " is-empty"}">${agent.goal ? escapeHtml(agent.goal) : "Цель не задана — агент не знает, за что отвечает."}</p>
          <div class="resource-rows">
            <div class="resource-row" data-resource="rag"><b>RAG</b><div class="resource-pills">${resourcePills(agent, "rag")}</div></div>
            <div class="resource-row" data-resource="skills"><b>SKILL</b><div class="resource-pills">${resourcePills(agent, "skills")}</div></div>
            <div class="resource-row" data-resource="tools"><b>TOOL</b><div class="resource-pills">${resourcePills(agent, "tools")}</div></div>
          </div>
          <div class="node-route"><span>← <b>${escapeHtml(routeTitle(agent.input))}</b></span><span><b>${escapeHtml(routeTitle(agent.output))}</b> →</span></div>
        </article>
      `;
    }).join("");

    const selected = state.agents.find((agent) => agent.id === state.selectedAgentId);
    elements["selected-agent-label"].textContent = selected ? `Выбран: ${selected.name}` : "Агент не выбран";
    elements["selected-agent-label"].classList.toggle("is-active", Boolean(selected));
    window.requestAnimationFrame(drawConnections);
  }

  function renderMission() {
    elements["mission-copy"].textContent = scenario.description;
    elements["countdown-value"].textContent = state.countdown;
    elements["objective-list"].innerHTML = scenario.mission.objectives.map((objective) => `
      <div class="objective${state.objectives[objective.id] ? " is-complete" : ""}"><i>${state.objectives[objective.id] ? "✓" : ""}</i><span>${escapeHtml(objective.title)}</span></div>
    `).join("");
    const rows = [
      { label: "Кислород", value: state.world.oxygen, display: `${state.world.oxygen}%`, color: "var(--cyan)" },
      { label: "Энергия", value: state.world.energy, display: `${state.world.energy}%`, color: state.world.energy < 30 ? "var(--danger)" : "var(--warning)" },
      { label: "Экипаж", value: (state.world.crewHealthy / state.world.crewTotal) * 100, display: `${state.world.crewHealthy}/${state.world.crewTotal}`, color: "var(--success)" },
      { label: "Связь", value: state.world.communication === "Потеряна" ? 5 : 52, display: state.world.communication, color: "var(--rag)" },
      { label: "Посадка", value: state.world.landing === "Готова" ? 100 : state.world.landing === "Проверена" ? 65 : 12, display: state.world.landing, color: state.world.landing === "Готова" ? "var(--success)" : "var(--event)" }
    ];
    elements["world-state"].innerHTML = rows.map((row) => `
      <div class="state-row"><span>${escapeHtml(row.label)}</span><div class="meter"><i style="--value:${Math.max(0, Math.min(100, row.value))}%;--meter-color:${row.color}"></i></div><b>${escapeHtml(row.display)}</b></div>
    `).join("");
    elements["teacher-toggle"].checked = state.teacherMode;
    elements["teacher-tools"].hidden = !state.teacherMode;
  }

  function renderLogs() {
    if (!state.logs.length) {
      elements["log-feed"].innerHTML = '<div class="log-empty"><span>_</span> Журнал пуст. Соберите систему и запустите проверку.</div>';
      return;
    }
    elements["log-feed"].innerHTML = state.logs.map((entry, index) => `
      <div class="log-entry" data-tone="${escapeHtml(entry.tone || "info")}">
        <span class="log-time">${formatLogTime(index)}</span>
        <span class="log-source">${escapeHtml(entry.source)} → ${escapeHtml(entry.target)}</span>
        <span class="log-message">${escapeHtml(entry.message)}</span>
        <span class="log-state">${escapeHtml(entry.status)}</span>
      </div>
    `).join("");
    elements["log-feed"].scrollTop = elements["log-feed"].scrollHeight;
  }

  function formatLogTime(index) {
    const minutes = Math.floor(index / 2);
    const seconds = (index % 2) * 30;
    return `12:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function setPhase(phase) {
    state.phase = phase;
    $$(".phase-step").forEach((step) => step.classList.toggle("is-current", step.dataset.phase === phase));
  }

  function renderSimulationStatus(status = simulator?.status || "idle") {
    const labels = { idle: "ОЖИДАНИЕ", running: "ВЫПОЛНЕНИЕ", paused: "ПАУЗА", completed: "ЗАВЕРШЕНО" };
    elements["simulation-status"].textContent = labels[status] || "ОЖИДАНИЕ";
    const wrapper = elements["simulation-status"].parentElement;
    wrapper.classList.toggle("is-running", status === "running");
    wrapper.classList.toggle("is-warning", status === "paused");
    elements["pause-button"].disabled = status === "idle" || status === "completed";
    elements["next-button"].disabled = status === "idle" || status === "completed";
    elements["pause-button"].textContent = status === "paused" ? "Продолжить" : "Пауза";
  }

  function renderAll() {
    renderLibrary();
    renderAgents();
    renderMission();
    renderLogs();
    setPhase(state.phase);
    renderSimulationStatus();
  }

  function addAgent(templateId, shouldConfigure = true) {
    if (state.agents.some((agent) => agent.templateId === templateId)) {
      const existing = state.agents.find((agent) => agent.templateId === templateId);
      selectAgent(existing.id);
      showToast("Этот агент уже есть в команде.", "warning");
      return existing;
    }
    const template = scenario.agents.find((item) => item.id === templateId);
    if (!template) return null;
    const agent = {
      id: `${templateId}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      templateId,
      name: template.title,
      role: template.title,
      goal: "",
      input: templateId === "coordinator" ? "user" : (state.agents.some((item) => item.templateId === "coordinator") ? "coordinator" : ""),
      output: templateId === "coordinator" ? "" : (state.agents.some((item) => item.templateId === "coordinator") ? "coordinator" : ""),
      rag: [], skills: [], tools: []
    };
    state.agents.push(agent);
    state.selectedAgentId = agent.id;
    renderAll();
    saveState();
    if (shouldConfigure) openAgentModal(agent.id);
    return agent;
  }

  function selectAgent(agentId) {
    if (!state.agents.some((agent) => agent.id === agentId)) return;
    state.selectedAgentId = agentId;
    renderLibrary();
    renderAgents();
    saveState();
  }

  function toggleAssignment(type, componentId, agentId = state.selectedAgentId) {
    const agent = state.agents.find((item) => item.id === agentId);
    if (!agent) {
      showToast("Сначала выберите агента в рабочей области.", "warning");
      return;
    }
    const listName = type === "skill" ? "skills" : type === "tool" ? "tools" : "rag";
    const list = agent[listName];
    const existingIndex = list.indexOf(componentId);
    if (existingIndex >= 0) {
      list.splice(existingIndex, 1);
      showToast(`Компонент снят с агента «${agent.name}».`);
    } else {
      list.push(componentId);
      showToast(`Компонент назначен агенту «${agent.name}».`, "success");
    }
    renderLibrary();
    renderAgents();
    saveState();
  }

  function handleComponent(componentId, type) {
    if (type === "agent") addAgent(componentId);
    else toggleAssignment(type, componentId);
  }

  function openAgentModal(agentId) {
    const agent = state.agents.find((item) => item.id === agentId);
    if (!agent) return;
    elements["agent-id"].value = agent.id;
    elements["agent-name"].value = agent.name;
    elements["agent-role"].value = agent.role;
    elements["agent-goal"].value = agent.goal;
    const options = [
      { id: "", title: "Не задано" },
      { id: "user", title: "Пользователь" },
      ...state.agents.filter((item) => item.id !== agent.id).map((item) => ({ id: item.templateId, title: item.name }))
    ];
    const optionMarkup = options.map((option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(option.title)}</option>`).join("");
    elements["agent-input"].innerHTML = optionMarkup;
    elements["agent-output"].innerHTML = optionMarkup;
    elements["agent-input"].value = agent.input;
    elements["agent-output"].value = agent.output;
    elements["assigned-summary"].innerHTML = ["rag", "skills", "tools"].map((type) => {
      const label = type === "rag" ? "RAG" : type === "skills" ? "Навыки" : "Инструменты";
      const value = agent[type].map((id) => componentTitle(type, id)).join(", ") || "не назначено";
      return `<p><b>${label}</b>${escapeHtml(value)}</p>`;
    }).join("");
    openModal("agent-modal", "#agent-name");
  }

  function openModal(id, focusSelector) {
    previousFocus = document.activeElement;
    activeModal = elements[id];
    elements["modal-layer"].hidden = false;
    $$(".modal", elements["modal-layer"]).forEach((modal) => { modal.hidden = modal !== activeModal; });
    document.body.style.overflow = "hidden";
    window.setTimeout(() => (focusSelector ? $(focusSelector, activeModal) : $("button, input, select", activeModal))?.focus(), 20);
  }

  function closeModal() {
    if (!activeModal) return;
    activeModal.hidden = true;
    elements["modal-layer"].hidden = true;
    document.body.style.overflow = "";
    activeModal = null;
    previousFocus?.focus?.();
  }

  function showToast(message, tone = "info") {
    if (!elements["toast-region"]) return;
    const toast = document.createElement("div");
    toast.className = `toast toast--${tone}`;
    toast.textContent = message;
    elements["toast-region"].append(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }

  function validationReport(result) {
    const allFindings = [
      ...result.errors.map((text) => ({ tone: "bad", icon: "×", text })),
      ...result.warnings.map((text) => ({ tone: "bad", icon: "!", text })),
      ...result.notes.map((text) => ({ tone: "good", icon: "✓", text }))
    ];
    elements["report-content"].innerHTML = `
      <p class="eyebrow">Проверка архитектуры</p>
      <div class="report-header"><div><h2 id="report-title">Системная проверка</h2><p>${result.errors.length ? "Сначала исправьте критические ошибки." : "Система может стартовать. Предупреждения проявятся в симуляции."}</p></div></div>
      <div class="score-grid">
        ${[["Агенты", result.stats.agents], ["RAG-связи", result.stats.rag], ["Навыки", result.stats.skills], ["Инструменты", result.stats.tools]].map(([label, value]) => `<div class="score-row"><span>${label}</span><b>${value}</b></div>`).join("")}
      </div>
      <div class="finding-list">
        ${allFindings.map((finding) => `<div class="finding is-${finding.tone}"><span>${finding.icon}</span><div>${escapeHtml(finding.text)}</div></div>`).join("") || '<div class="finding is-good"><span>✓</span><div>Базовых ошибок не найдено.</div></div>'}
      </div>
      <div class="report-actions"><button class="button button--primary" type="button" data-close-modal>Вернуться к схеме</button></div>
    `;
    openModal("report-modal");
  }

  function finalReport(run) {
    const score = window.AgentLabValidation.calculateScore(scenario, state, run);
    const complete = run.finalDecision === "Разрешить посадку";
    elements["report-content"].innerHTML = `
      <p class="eyebrow">Разбор архитектуры</p>
      <div class="report-header">
        <div><h2 id="report-title">${complete ? "Миссия завершена" : "Миссия требует доработки"}</h2><p>${complete ? "Команда проверила данные и разрешила посадку." : "Безопасная посадка не подтверждена. Посмотрите, где оборвалась цепочка."}</p></div>
        <div class="score-ring" style="--score:${score.total}"><span><strong>${score.total}</strong><small>из 100</small></span></div>
      </div>
      <div class="score-grid">${score.categories.map((category) => `<div class="score-row"><span>${escapeHtml(category.title)}</span><b>${category.value}/${category.max}</b></div>`).join("")}</div>
      <p class="micro-label">ЧТО ПРОИЗОШЛО</p>
      <div class="finding-list">${score.findings.map((finding) => `<div class="finding is-${finding.good ? "good" : "bad"}"><span>${finding.good ? "✓" : "×"}</span><div>${escapeHtml(finding.text)}</div></div>`).join("")}</div>
      <p class="micro-label">ЧТО ВЫ ПОСТРОИЛИ</p>
      <div class="learning-map">
        <div class="learning-cell"><b>LLM</b><small>рассуждает</small></div>
        <div class="learning-cell"><b>RAG</b><small>даёт знания</small></div>
        <div class="learning-cell"><b>SKILL</b><small>объясняет как</small></div>
        <div class="learning-cell"><b>TOOL</b><small>совершает действие</small></div>
        <div class="learning-cell"><b>AGENT</b><small>достигает цели</small></div>
      </div>
      <div class="report-actions">
        <button class="button button--ghost" type="button" data-action="reset-simulation">Повторить симуляцию</button>
        <button class="button button--primary" type="button" data-close-modal>Вернуться к архитектуре</button>
      </div>
    `;
    openModal("report-modal");
  }

  function referenceReport() {
    elements["report-content"].innerHTML = `
      <p class="eyebrow">Материал преподавателя</p>
      <div class="report-header"><div><h2 id="report-title">Эталонная архитектура</h2><p>Эталон — не единственный ответ. Он показывает минимальный устойчивый контур из пяти специализированных агентов.</p></div></div>
      <div class="finding-list">
        <div class="finding is-good"><span>1</span><div><b>Координатор</b> распределяет работу, разрешает конфликт и проверяет финал.</div></div>
        <div class="finding is-good"><span>2</span><div><b>Инженер</b> получает данные датчиков и управляет энергией.</div></div>
        <div class="finding is-good"><span>3</span><div><b>Медик</b> использует медицинскую базу, диагностику и сканер.</div></div>
        <div class="finding is-good"><span>4</span><div><b>Аналитик</b> проверяет противоречивые данные по истории аварий.</div></div>
        <div class="finding is-good"><span>5</span><div><b>Логист</b> готовит площадку через регламент и ремонтного робота.</div></div>
      </div>
      <div class="report-actions">
        <button class="button button--ghost" type="button" data-close-modal>Только посмотреть</button>
        <button class="button button--primary" type="button" data-action="apply-reference">Применить эталон</button>
      </div>`;
    openModal("report-modal");
  }

  function applyReference() {
    state.agents = scenario.reference.agents.map((reference, index) => {
      const template = scenario.agents.find((item) => item.id === reference.templateId);
      return {
        id: `${reference.templateId}-reference-${index}`,
        templateId: reference.templateId,
        name: template.title,
        role: template.title,
        goal: scenario.goals[reference.templateId],
        input: reference.input,
        output: reference.output,
        rag: [...reference.rag], skills: [...reference.skills], tools: [...reference.tools]
      };
    });
    state.selectedAgentId = state.agents[0].id;
    state.phase = "build";
    resetSimulationState(false);
    closeModal();
    renderAll();
    saveState();
    showToast("Эталонная команда собрана. Теперь запустите проверку.", "success");
  }

  function openEventModal() {
    if (!["running", "paused"].includes(simulator.status)) {
      showToast("Сначала запустите симуляцию.", "warning");
      return;
    }
    const events = [...scenario.events, scenario.finalEvent];
    elements["event-list"].innerHTML = events.map((event) => `
      <button class="event-card" type="button" data-trigger-event="${escapeHtml(event.id)}" ${simulator.triggered.has(event.id) ? "disabled" : ""}>
        <strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(event.description)}</span>
      </button>
    `).join("");
    openModal("event-modal");
  }

  function startSimulation() {
    const result = window.AgentLabValidation.validate(scenario, state);
    if (result.errors.length) {
      validationReport(result);
      return;
    }
    state.world = { ...scenario.initialState };
    state.objectives = initialObjectives();
    state.countdown = scenario.mission.countdown;
    state.logs = [];
    state.run = null;
    state.activeStep = null;
    setPhase("simulate");
    renderAll();
    simulator.start();
    showToast("Система запущена. Следите за движением задачи в журнале.", "success");
    saveState();
  }

  function resetSimulationState(render = true) {
    simulator.stopTimer();
    simulator.status = "idle";
    simulator.queue = [];
    simulator.triggered.clear();
    simulator.run = simulator.emptyRun();
    state.world = { ...scenario.initialState };
    state.objectives = initialObjectives();
    state.countdown = scenario.mission.countdown;
    state.logs = [];
    state.run = null;
    state.activeStep = null;
    setPhase("build");
    if (render) renderAll();
    saveState();
  }

  function resetGame() {
    simulator.stopTimer();
    simulator.status = "idle";
    simulator.queue = [];
    simulator.triggered.clear();
    simulator.segmentFailures.clear();
    simulator.run = simulator.emptyRun();
    state = createInitialState();
    localStorage.removeItem(STORAGE_KEY);
    closeModal();
    showScreen("mission");
    renderAll();
    showToast("Игра сброшена. Можно начать с новой группой.", "success");
  }

  function handleLog(entry) {
    state.logs.push(entry);
    state.logs = state.logs.slice(-80);
    if (entry.stepId === "landing-event") state.countdown = "00:40:00";
    renderLogs();
    renderMission();
    saveState();
  }

  function createSimulator() {
    simulator = new window.AgentLabSimulator({
      scenario,
      getArchitecture: () => state,
      onLog: handleLog,
      onWorldChange: () => { renderMission(); saveState(); },
      onActiveChange: (active) => { state.activeStep = active; renderAgents(); },
      onStatusChange: (status) => renderSimulationStatus(status),
      onFinish: (run) => {
        state.run = run;
        setPhase("result");
        renderMission();
        saveState();
        window.setTimeout(() => finalReport(run), 180);
      }
    });
  }

  function drawConnections() {
    if (state.screen !== "lab") return;
    const container = elements["architecture-canvas"];
    const canvas = elements["connections-canvas"];
    if (!container || !canvas) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext("2d");
    context.scale(ratio, ratio);
    context.clearRect(0, 0, width, height);
    const containerRect = container.getBoundingClientRect();

    state.agents.forEach((agent) => {
      if (!agent.output || agent.output === "user") return;
      const fromNode = $(`[data-agent-id="${CSS.escape(agent.id)}"]`, elements["agent-grid"]);
      const targetAgent = state.agents.find((item) => item.templateId === agent.output);
      const toNode = targetAgent ? $(`[data-agent-id="${CSS.escape(targetAgent.id)}"]`, elements["agent-grid"]) : null;
      if (!fromNode || !toNode || fromNode === toNode) return;
      const from = fromNode.getBoundingClientRect();
      const to = toNode.getBoundingClientRect();
      const start = { x: from.left - containerRect.left + from.width / 2, y: from.top - containerRect.top + from.height / 2 };
      const end = { x: to.left - containerRect.left + to.width / 2, y: to.top - containerRect.top + to.height / 2 };
      const middleY = (start.y + end.y) / 2;
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.bezierCurveTo(start.x, middleY, end.x, middleY, end.x, end.y);
      context.strokeStyle = "rgba(157, 123, 255, .38)";
      context.lineWidth = 1.25;
      context.setLineDash([4, 5]);
      context.stroke();
      context.setLineDash([]);
      const angle = Math.atan2(end.y - middleY, 0.001);
      context.beginPath();
      context.moveTo(end.x, end.y);
      context.lineTo(end.x - 5 * Math.cos(angle - Math.PI / 6), end.y - 5 * Math.sin(angle - Math.PI / 6));
      context.lineTo(end.x - 5 * Math.cos(angle + Math.PI / 6), end.y - 5 * Math.sin(angle + Math.PI / 6));
      context.closePath();
      context.fillStyle = "rgba(157, 123, 255, .65)";
      context.fill();
    });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  function installEventListeners() {
    $("#start-button").addEventListener("click", () => showScreen("mission"));
    $("#back-to-intro").addEventListener("click", () => showScreen("intro"));
    elements["mission-grid"].addEventListener("click", (event) => {
      const card = event.target.closest("[data-scenario]");
      if (!card) return;
      const scenarioId = card.dataset.scenario;
      const scenarioData = window.AGENT_LAB_SCENARIOS.find((s) => s.id === scenarioId);
      if (!scenarioData?.available) return;
      
      state.currentScenario = scenarioId;
      scenario = scenarioData;
      state.world = { ...scenarioData.initialState };
      state.objectives = Object.fromEntries(scenarioData.mission.objectives.map((o) => [o.id, false]));
      state.countdown = scenarioData.mission.countdown;
      state.agents = [];
      state.logs = [];
      state.run = null;
      saveState();
      renderAll();
      showScreen("lab");
    });

    $$(".library-tabs button").forEach((button) => button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      renderLibrary();
      saveState();
    }));
    elements["component-list"].addEventListener("click", (event) => {
      const card = event.target.closest(".component-card");
      if (card) handleComponent(card.dataset.componentId, card.dataset.type);
    });
    elements["component-list"].addEventListener("dragstart", (event) => {
      const card = event.target.closest(".component-card");
      if (!card) return;
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("application/x-agent-lab-component", JSON.stringify({ id: card.dataset.componentId, type: card.dataset.type }));
    });

    elements["architecture-canvas"].addEventListener("dragover", (event) => {
      event.preventDefault();
      elements["architecture-canvas"].classList.add("is-drop-target");
    });
    elements["architecture-canvas"].addEventListener("dragleave", () => elements["architecture-canvas"].classList.remove("is-drop-target"));
    elements["architecture-canvas"].addEventListener("drop", (event) => {
      event.preventDefault();
      elements["architecture-canvas"].classList.remove("is-drop-target");
      try {
        const payload = JSON.parse(event.dataTransfer.getData("application/x-agent-lab-component"));
        const agentNode = event.target.closest(".agent-node");
        if (payload.type === "agent") addAgent(payload.id);
        else toggleAssignment(payload.type, payload.id, agentNode?.dataset.agentId || state.selectedAgentId);
      } catch (_error) {
        showToast("Не удалось распознать компонент.", "danger");
      }
    });

    elements["agent-grid"].addEventListener("click", (event) => {
      const settings = event.target.closest("[data-configure-agent]");
      if (settings) {
        event.stopPropagation();
        openAgentModal(settings.dataset.configureAgent);
        return;
      }
      const node = event.target.closest(".agent-node");
      if (node) selectAgent(node.dataset.agentId);
    });
    elements["agent-grid"].addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && event.target.classList.contains("agent-node")) {
        event.preventDefault();
        selectAgent(event.target.dataset.agentId);
      }
    });

    elements["agent-form"].addEventListener("submit", (event) => {
      event.preventDefault();
      const agent = state.agents.find((item) => item.id === elements["agent-id"].value);
      if (!agent) return;
      agent.name = elements["agent-name"].value.trim();
      agent.role = elements["agent-role"].value.trim();
      agent.goal = elements["agent-goal"].value.trim();
      agent.input = elements["agent-input"].value;
      agent.output = elements["agent-output"].value;
      closeModal();
      renderAll();
      saveState();
      showToast("Настройки агента сохранены.", "success");
    });
    $("#remove-agent").addEventListener("click", () => {
      const id = elements["agent-id"].value;
      state.agents = state.agents.filter((agent) => agent.id !== id);
      if (state.selectedAgentId === id) state.selectedAgentId = state.agents[0]?.id || null;
      closeModal();
      renderAll();
      saveState();
      showToast("Агент удалён из текущей архитектуры.", "warning");
    });

    elements["modal-layer"].addEventListener("click", (event) => {
      if (event.target.closest("[data-close-modal]")) closeModal();
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "apply-reference") applyReference();
      if (action === "reset-simulation") { closeModal(); resetSimulationState(); startSimulation(); }
      const eventButton = event.target.closest("[data-trigger-event]");
      if (eventButton && simulator.triggerEvent(eventButton.dataset.triggerEvent)) {
        closeModal();
        renderMission();
        showToast("Событие добавлено в начало очереди.", "warning");
      }
    });

    $("#validate-button").addEventListener("click", () => validationReport(window.AgentLabValidation.validate(scenario, state)));
    $("#run-button").addEventListener("click", startSimulation);
    elements["teacher-toggle"].addEventListener("change", () => {
      state.teacherMode = elements["teacher-toggle"].checked;
      renderMission();
      saveState();
      showToast(state.teacherMode ? "Режим преподавателя включён." : "Режим преподавателя выключен.");
    });
    $("#event-button").addEventListener("click", openEventModal);
    $("#hint-button").addEventListener("click", () => {
      showToast(scenario.hints[state.hintIndex % scenario.hints.length], "info");
      state.hintIndex += 1;
      saveState();
    });
    $("#reference-button").addEventListener("click", referenceReport);
    $("#reset-button").addEventListener("click", resetGame);
    elements["speed-select"].addEventListener("change", () => simulator.setSpeed(elements["speed-select"].value));
    elements["pause-button"].addEventListener("click", () => simulator.togglePause());
    elements["next-button"].addEventListener("click", () => simulator.stepOnce());
    $("#fullscreen-button").addEventListener("click", toggleFullscreen);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && activeModal) closeModal();
      if (event.key.toLowerCase() === "f" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) toggleFullscreen();
      if (event.key === "Tab" && activeModal) trapFocus(event);
    });
    window.addEventListener("resize", drawConnections);
    elements["architecture-canvas"].addEventListener("scroll", drawConnections, { passive: true });
    resizeObserver = new ResizeObserver(drawConnections);
    resizeObserver.observe(elements["architecture-canvas"]);
  }

  function trapFocus(event) {
    const focusable = $$("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex='-1'])", activeModal);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function installTestingHooks() {
    window.advanceTime = (milliseconds) => simulator.advance(milliseconds);
    window.render_game_to_text = () => JSON.stringify({
      screen: state.screen,
      phase: state.phase,
      coordinateSystem: "DOM architecture grid; origin top-left; x increases right; y increases down",
      mission: scenario.title,
      selectedAgent: state.agents.find((agent) => agent.id === state.selectedAgentId)?.templateId || null,
      agents: state.agents.map((agent, index) => ({
        order: index,
        id: agent.templateId,
        name: agent.name,
        hasGoal: Boolean(agent.goal),
        input: agent.input || null,
        output: agent.output || null,
        rag: [...agent.rag],
        skills: [...agent.skills],
        tools: [...agent.tools]
      })),
      world: { ...state.world, countdown: state.countdown },
      objectives: { ...state.objectives },
      simulation: simulator.snapshot(),
      currentActivity: state.activeStep,
      visibleModal: activeModal?.id || null,
      availableControls: state.screen === "lab"
        ? ["library tabs", "component cards", "validate", "run", "teacher mode", "pause", "next step", "speed", "fullscreen"]
        : state.screen === "mission" ? ["select Mars mission", "back"] : ["start", "fullscreen"]
    });
  }

  function init() {
    cacheElements();
    state = loadState();
    createSimulator();
    renderMissionCards();
    installEventListeners();
    installTestingHooks();
    showScreen(state.screen === "lab" ? "lab" : state.screen === "mission" ? "mission" : "intro");
    renderAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
