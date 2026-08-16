(function () {
  "use strict";

  const component = (id, type, title, description, icon) => ({ id, type, title, description, icon });

  const mars = {
    id: "mars",
    title: "Марсианская станция",
    shortTitle: "Арес-7",
    icon: "🚀",
    difficulty: "★☆☆",
    lesson: "Базовая агентная система",
    description: "До посадки корабля шесть часов. Жизнеобеспечение нестабильно, энергии мало, один член экипажа болен.",
    available: true,
    mission: {
      countdown: "06:00:00",
      objectives: [
        { id: "crew", title: "Сохранить жизнь экипажа" },
        { id: "oxygen", title: "Стабилизировать очистку воздуха" },
        { id: "energy", title: "Сохранить резерв энергии" },
        { id: "landing", title: "Подготовить посадочную площадку" }
      ]
    },
    initialState: {
      oxygen: 64,
      energy: 38,
      crewHealthy: 5,
      crewTotal: 6,
      communication: "Нестабильна",
      landing: "Не готова",
      energyRisk: "Средний"
    },
    agents: [
      component("coordinator", "agent", "Координатор", "Распределяет задачи и разрешает конфликты", "◎"),
      component("engineer", "agent", "Инженер", "Отвечает за оборудование и энергию", "⌁"),
      component("medic", "agent", "Медик", "Защищает здоровье экипажа", "✚"),
      component("analyst", "agent", "Аналитик", "Сопоставляет данные и оценивает риски", "◫"),
      component("logistician", "agent", "Логист", "Управляет запасами и роботами", "◇"),
      component("communications", "agent", "Связист", "Поддерживает канал связи с кораблём", "⌁")
    ],
    rag: [
      component("technical_manual", "rag", "Технический регламент", "Схемы жизнеобеспечения и процедуры ремонта", "▤"),
      component("incident_history", "rag", "История аварий", "Предыдущие отказы и результаты решений", "◷"),
      component("medical_base", "rag", "Медицинская база", "Протоколы диагностики и стабилизации", "+"),
      component("energy_logs", "rag", "Журнал энергосети", "Потребление и прогноз доступной мощности", "≋"),
      component("inventory", "rag", "Складские остатки", "Запчасти, фильтры и расходные материалы", "▦"),
      component("landing_protocols", "rag", "Регламент посадки", "Допуски площадки и аварийные процедуры", "▽")
    ],
    skills: [
      component("diagnostics", "skill", "Диагностика", "Интерпретирует показания оборудования", "⌘"),
      component("repair_planning", "skill", "Планирование ремонта", "Строит безопасную последовательность работ", "↗"),
      component("medical_diagnosis", "skill", "Медицинская диагностика", "Сопоставляет симптомы и протоколы", "✚"),
      component("risk_analysis", "skill", "Анализ рисков", "Сравнивает варианты и неопределённость", "△"),
      component("prioritization", "skill", "Приоритизация", "Разрешает конкуренцию критических целей", "⇅"),
      component("logistics_planning", "skill", "Планирование ресурсов", "Выбирает запчасти и исполнителей", "▦"),
      component("result_validation", "skill", "Проверка результата", "Сверяет итог с целью и ограничениями", "✓")
    ],
    tools: [
      component("sensors", "tool", "Датчики станции", "Получает реальные показания систем", "⌁"),
      component("generator_control", "tool", "Управление энергией", "Меняет режим генераторов и потребителей", "ϟ"),
      component("medical_scanner", "tool", "Медицинский сканер", "Измеряет жизненные показатели пациента", "◉"),
      component("robot_control", "tool", "Управление роботом", "Передаёт команды ремонтному роботу", "⌬"),
      component("comms", "tool", "Канал связи", "Отправляет сообщения экипажу и кораблю", ")))"),
      component("operations_log", "tool", "Операционный журнал", "Фиксирует решения и контрольные значения", "▥")
    ],
    goals: {
      coordinator: "Подготовить станцию к безопасной посадке и согласовать решения команды.",
      engineer: "Поддерживать работоспособность станции и безопасный запас энергии.",
      medic: "Стабилизировать пациента без угрозы для остального экипажа.",
      analyst: "Проверять данные и давать координатору оценку рисков.",
      logistician: "Обеспечить ремонт ресурсами и подготовить площадку.",
      communications: "Сохранять надёжный обмен сообщениями с кораблём."
    },
    reference: {
      agents: [
        { templateId: "coordinator", input: "user", output: "engineer", rag: ["incident_history"], skills: ["prioritization", "result_validation"], tools: ["operations_log", "comms"] },
        { templateId: "engineer", input: "coordinator", output: "coordinator", rag: ["technical_manual", "energy_logs"], skills: ["diagnostics", "repair_planning"], tools: ["sensors", "generator_control"] },
        { templateId: "medic", input: "coordinator", output: "coordinator", rag: ["medical_base"], skills: ["medical_diagnosis"], tools: ["medical_scanner"] },
        { templateId: "analyst", input: "coordinator", output: "coordinator", rag: ["incident_history", "energy_logs", "landing_protocols"], skills: ["risk_analysis", "result_validation"], tools: ["sensors"] },
        { templateId: "logistician", input: "coordinator", output: "coordinator", rag: ["inventory", "landing_protocols"], skills: ["logistics_planning"], tools: ["robot_control"] }
      ]
    },
    baseSteps: [
      { id: "mission", source: "ПОЛЬЗОВАТЕЛЬ", target: "Координатор", agent: "coordinator", kind: "task", text: "Получена общая цель: подготовить станцию к посадке.", status: "МЫСЛИТ", requires: ["agent:coordinator"] },
      { id: "delegate-engineer", source: "Координатор", target: "Инженер", agent: "coordinator", kind: "route", text: "Проверить систему очистки воздуха и энергосеть.", status: "МАРШРУТ", requires: ["agent:coordinator", "agent:engineer", "route:engineer:coordinator"] },
      { id: "engineer-rag", source: "Инженер", target: "RAG", agent: "engineer", component: "technical_manual", kind: "rag", text: "Найдена процедура диагностики очистителя.", failText: "Нет доступа к техническому регламенту: специализированных знаний недостаточно.", status: "ИЩЕТ В RAG", requires: ["rag:engineer:technical_manual"] },
      { id: "engineer-skill", source: "Инженер", target: "Навык", agent: "engineer", component: "diagnostics", kind: "skill", text: "Диагностика: фильтр загрязнён, ресурс — 73 минуты.", failText: "Показания есть, но без навыка диагностики агент не знает, как их интерпретировать.", status: "ИСПОЛЬЗУЕТ НАВЫК", requires: ["skill:engineer:diagnostics"] },
      { id: "engineer-tool", source: "Инженер", target: "Инструмент", agent: "engineer", component: "sensors", kind: "tool", text: "Датчики подтвердили падение производительности очистителя.", failText: "Диагностический контур неполон: действие требует знаний, способа анализа и реальных данных одновременно.", status: "ВЫЗЫВАЕТ TOOL", requires: ["rag:engineer:technical_manual", "skill:engineer:diagnostics", "tool:engineer:sensors"], effect: { oxygen: 4 }, objective: "oxygen" },
      { id: "engineer-result", source: "Инженер", target: "Координатор", agent: "engineer", kind: "route", text: "Передан риск отказа и безопасный план ремонта.", status: "УСПЕХ", requires: ["route:engineer:coordinator", "skill:engineer:repair_planning"] },
      { id: "delegate-analyst", source: "Координатор", target: "Аналитик", agent: "coordinator", kind: "route", text: "Проверить запас энергии до посадки.", status: "МАРШРУТ", requires: ["agent:coordinator", "agent:analyst", "route:analyst:coordinator"] },
      { id: "analyst-energy", source: "Аналитик", target: "Журнал энергосети", agent: "analyst", component: "energy_logs", kind: "rag", text: "Прогноз: базового резерва хватит на 5 часов 20 минут.", failText: "Аналитику недоступны данные об энергопотреблении.", status: "ИЩЕТ В RAG", requires: ["rag:analyst:energy_logs", "skill:analyst:risk_analysis"] },
      { id: "delegate-medic", source: "Координатор", target: "Медик", agent: "coordinator", kind: "route", text: "Оценить состояние заболевшего сотрудника.", status: "МАРШРУТ", requires: ["agent:coordinator", "agent:medic", "route:medic:coordinator"] },
      { id: "medic-check", source: "Медик", target: "Медицинский сканер", agent: "medic", component: "medical_scanner", kind: "tool", text: "Пациент стабилен, но медицинский модуль должен оставаться включён.", failText: "Без сканера медик не может подтвердить состояние пациента.", status: "ВЫЗЫВАЕТ TOOL", requires: ["rag:medic:medical_base", "skill:medic:medical_diagnosis", "tool:medic:medical_scanner"] },
      { id: "delegate-logistician", source: "Координатор", target: "Логист", agent: "coordinator", kind: "route", text: "Проверить площадку и отправить ремонтного робота.", status: "МАРШРУТ", requires: ["agent:coordinator", "agent:logistician", "route:logistician:coordinator"] },
      { id: "landing-prep", source: "Логист", target: "Ремонтный робот", agent: "logistician", component: "robot_control", kind: "tool", text: "Площадка очищена, маяки и створки проверены.", failText: "Логист знает требования, но не может подготовить площадку без полного контура RAG + Skill + Tool.", status: "ВЫЗЫВАЕТ TOOL", requires: ["rag:logistician:landing_protocols", "skill:logistician:logistics_planning", "tool:logistician:robot_control"], effect: { landing: "Проверена" } }
    ],
    events: [
      {
        id: "power_limit",
        title: "Резерв генератора ограничен",
        description: "Генератор сможет работать только три часа. Энергетический риск становится критическим.",
        statePatch: { energy: 30, energyRisk: "Критический" },
        steps: [
          { id: "power-event", source: "СОБЫТИЕ", target: "Команда", kind: "event", text: "Резервный генератор сможет работать только три часа.", status: "СОБЫТИЕ", tone: "danger" },
          { id: "power-response", source: "Координатор", target: "Инженер", agent: "coordinator", kind: "route", text: "Пересчитать энергопотребление и отключить некритические контуры.", status: "МАРШРУТ", requires: ["agent:coordinator", "agent:engineer"] },
          { id: "power-action", source: "Инженер", target: "Управление энергией", agent: "engineer", component: "generator_control", kind: "tool", text: "Некритические контуры отключены. Резерв увеличен.", failText: "План экономии готов, но выполнить его без управления энергией невозможно.", status: "ВЫЗЫВАЕТ TOOL", requires: ["tool:engineer:generator_control", "skill:engineer:repair_planning"], effect: { energy: 6 }, objective: "energy" }
        ]
      },
      {
        id: "medical_conflict",
        title: "Медицинская чрезвычайная ситуация",
        description: "Модулю нужно 12 кВт. Медик требует включить его, инженер предупреждает о риске для энергосети.",
        statePatch: { crewHealthy: 5 },
        steps: [
          { id: "medical-event", source: "СОБЫТИЕ", target: "Медик + Инженер", kind: "event", text: "Пациенту срочно требуется медицинский модуль мощностью 12 кВт.", status: "КОНФЛИКТ", tone: "danger" },
          { id: "medic-request", source: "Медик", target: "Координатор", agent: "medic", kind: "route", text: "Запрос: включить медицинский модуль немедленно.", status: "ЗАПРОС", requires: ["agent:medic", "route:medic:coordinator"] },
          { id: "engineer-warning", source: "Инженер", target: "Координатор", agent: "engineer", kind: "route", text: "Предупреждение: нагрузка приблизит энергию к критическому минимуму.", status: "ПРЕДУПРЕЖДЕНИЕ", requires: ["agent:engineer", "route:engineer:coordinator"] },
          { id: "resolve-conflict", source: "Координатор", target: "Команда", agent: "coordinator", kind: "conflict", text: "Приоритет жизни принят: модуль включить на 18 минут, затем повторная проверка.", failText: "КОНФЛИКТ НЕ РАЗРЕШЁН: нет полного контура участников и координатора с приоритизацией.", status: "РЕШЕНИЕ", requires: ["agent:coordinator", "agent:medic", "agent:engineer", "skill:coordinator:prioritization"], effect: { energy: -9, crewHealthy: 1 }, objective: "crew" }
        ]
      }
    ],
    finalEvent: {
      id: "landing_final",
      title: "Финальный заход на посадку",
      description: "До посадки 40 минут. Связь с Землёй потеряна, один датчик противоречит остальным.",
      statePatch: { communication: "Потеряна" },
      steps: [
        { id: "landing-event", source: "СОБЫТИЕ", target: "Координатор", kind: "event", text: "Корабль начал заход. Один датчик выдаёт противоречивые данные.", status: "ФИНАЛ", tone: "danger" },
        { id: "landing-analysis", source: "Координатор", target: "Аналитик", agent: "analyst", component: "incident_history", kind: "rag", text: "История аварий: одиночный датчик давал ложный пик при пылевой буре.", failText: "Нет проверяемого контекста для оценки противоречивого датчика.", status: "ИЩЕТ В RAG", requires: ["agent:analyst", "rag:analyst:incident_history", "skill:analyst:risk_analysis"] },
        { id: "landing-verify", source: "Аналитик", target: "Инженер", agent: "engineer", component: "sensors", kind: "tool", text: "Инженер подтвердил показания по двум независимым датчикам.", failText: "Независимая проверка датчиков невозможна.", status: "ПРОВЕРКА", requires: ["agent:engineer", "tool:engineer:sensors"] },
        { id: "landing-decision", source: "Координатор", target: "Корабль", agent: "coordinator", kind: "decision", text: "ПОСАДКА РАЗРЕШЕНА: площадка готова, риски проверены.", failText: "ПОСАДКА ОТМЕНЕНА: архитектура не смогла проверить данные и согласовать решение.", status: "РЕШЕНИЕ", requires: ["agent:coordinator", "skill:coordinator:result_validation", "tool:coordinator:comms"], requiresSegmentSuccess: true, effect: { landing: "Готова" }, objective: "landing" }
      ]
    },
    hints: [
      "Кто должен принять решение, если медик и инженер защищают разные критические цели?",
      "Данные датчика — ещё не диагноз. Какой навык нужен инженеру, чтобы понять показания?",
      "Если агент знает, что делать, каким компонентом он изменит реальный мир?",
      "Проверьте, кому специалисты возвращают результат. Работа без маршрута теряется.",
      "Финальное решение надёжно только тогда, когда оно проверено по независимым данным."
    ],
    scoring: {
      categories: [
        { id: "specialization", title: "Специализация", max: 20 },
        { id: "knowledge", title: "Знания / RAG", max: 15 },
        { id: "skills", title: "Навыки", max: 15 },
        { id: "tools", title: "Инструменты", max: 15 },
        { id: "routing", title: "Маршрутизация", max: 15 },
        { id: "errorHandling", title: "Обработка ошибок", max: 10 },
        { id: "coordination", title: "Координация", max: 10 }
      ]
    }
  };

  const future = [
    { id: "store", title: "Интернет-магазин", icon: "🛒", difficulty: "★★☆", lesson: "События и инструменты", description: "Волна заказов, дефицит товара и жалобы клиентов.", available: false },
    { id: "newsroom", title: "Редакция новостей", icon: "📰", difficulty: "★★☆", lesson: "Проверка результата", description: "Противоречивые источники и жёсткий дедлайн публикации.", available: false },
    { id: "ai_company", title: "ИИ-отдел компании", icon: "🏢", difficulty: "★★★", lesson: "Реальная бизнес-система", description: "Лиды, продажи, отчёты и неполные данные CRM.", available: false }
  ];

  window.AGENT_LAB_SCENARIOS = [mars, ...future];
})();
