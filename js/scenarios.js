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

  const store = {
    id: "store",
    title: "Интернет-магазин",
    shortTitle: "E-Shop",
    icon: "🛒",
    difficulty: "★★☆",
    lesson: "События и очереди задач",
    description: "Волна заказов, дефицит товара и жалобы клиентов. Нужно настроить обработку событий и конкуренцию ресурсов.",
    available: true,
    mission: {
      countdown: "08:00:00",
      objectives: [
        { id: "orders", title: "Обработать все заказы" },
        { id: "inventory", title: "Предотвратить дефицит товаров" },
        { id: "customers", title: "Минимизировать жалобы клиентов" },
        { id: "revenue", title: "Достичь целевой выручки" }
      ]
    },
    initialState: {
      ordersPending: 12,
      inventoryLevel: 45,
      customerSatisfaction: 78,
      revenue: 24000,
      targetRevenue: 50000,
      warehouseStatus: "Норма",
      supportQueue: 0
    },
    agents: [
      component("storeManager", "agent", "Менеджер магазина", "Координирует работу отделов и принимает решения", "◎"),
      component("warehouseWorker", "agent", "Кладовщик", "Управляет запасами и отгрузкой", "▦"),
      component("salesAgent", "agent", "Продавец", "Обрабатывает заказы и консультации", "✚"),
      component("supportAgent", "agent", "Поддержка", "Решает проблемы клиентов", "◫"),
      component("analyst", "agent", "Аналитик", "Прогнозирует спрос и риски", "△"),
      component("marketingAgent", "agent", "Маркетолог", "Управляет акциями и продвижением", "◇")
    ],
    rag: [
      component("productCatalog", "rag", "Каталог товаров", "Цены, описания и наличие товаров", "▤"),
      component("orderHistory", "rag", "История заказов", "Данные о прошлых покупках и возвратах", "◷"),
      component("inventoryDB", "rag", "База склада", "Текущие остатки и пороги заказа", "≋"),
      component("customerProfiles", "rag", "Профили клиентов", "История взаимодействий и предпочтения", "+"),
      component("pricingRules", "rag", "Правила ценообразования", "Скидки, наценки и акции", "▦"),
      component("slaDocs", "rag", "SLA поддержки", "Стандарты времени ответа и решения", "▽")
    ],
    skills: [
      component("orderProcessing", "skill", "Обработка заказов", "Валидация и подтверждение заказов", "⌘"),
      component("inventoryCheck", "skill", "Проверка наличия", "Сопоставление заказа с остатками", "↗"),
      component("conflictResolution", "skill", "Решение конфликтов", "Работа с претензиями и возвратами", "✚"),
      component("demandForecasting", "skill", "Прогноз спроса", "Анализ трендов и сезонности", "△"),
      component("prioritization", "skill", "Приоритизация", "Очередь заказов по важности", "⇅"),
      component("upselling", "skill", "Допродажи", "Предложение сопутствующих товаров", "▦"),
      component("resultValidation", "skill", "Проверка результата", "Сверка итогов с планом", "✓")
    ],
    tools: [
      component("orderSystem", "tool", "Система заказов", "Приём и статус заказов", "⌁"),
      component("warehouseRobot", "tool", "Робот-кладовщик", "Перемещение товаров на складе", "⌬"),
      component("crmSystem", "tool", "CRM-система", "Данные клиентов и коммуникация", "◉"),
      component("analyticsDashboard", "tool", "Дашборд аналитики", "Метрики продаж и удовлетворённости", "ϟ"),
      component("emailGateway", "tool", "Email-шлюз", "Рассылка уведомлений клиентам", "))"),
      component("paymentGateway", "tool", "Платёжный шлюз", "Обработка платежей", "▥")
    ],
    goals: {
      storeManager: "Обеспечить выполнение плана продаж при высоком уровне сервиса.",
      warehouseWorker: "Поддерживать точность учёта и своевременную отгрузку.",
      salesAgent: "Максимально конвертировать запросы в заказы.",
      supportAgent: "Решать проблемы клиентов в рамках SLA.",
      analyst: "Предсказывать всплески спроса и риски дефицита.",
      marketingAgent: "Привлекать клиентов и увеличивать средний чек."
    },
    reference: {
      agents: [
        { templateId: "storeManager", input: "user", output: "salesAgent", rag: ["orderHistory", "pricingRules"], skills: ["prioritization", "resultValidation"], tools: ["analyticsDashboard", "emailGateway"] },
        { templateId: "warehouseWorker", input: "storeManager", output: "storeManager", rag: ["inventoryDB", "productCatalog"], skills: ["inventoryCheck"], tools: ["warehouseRobot"] },
        { templateId: "salesAgent", input: "storeManager", output: "storeManager", rag: ["productCatalog", "customerProfiles"], skills: ["orderProcessing", "upselling"], tools: ["orderSystem", "crmSystem"] },
        { templateId: "supportAgent", input: "storeManager", output: "storeManager", rag: ["customerProfiles", "slaDocs", "orderHistory"], skills: ["conflictResolution"], tools: ["crmSystem", "emailGateway"] },
        { templateId: "analyst", input: "storeManager", output: "storeManager", rag: ["orderHistory", "inventoryDB"], skills: ["demandForecasting", "resultValidation"], tools: ["analyticsDashboard"] },
        { templateId: "marketingAgent", input: "storeManager", output: "storeManager", rag: ["customerProfiles", "pricingRules"], skills: ["upselling"], tools: ["emailGateway", "crmSystem"] }
      ]
    },
    baseSteps: [
      { id: "mission", source: "ПОЛЬЗОВАТЕЛЬ", target: "Менеджер магазина", agent: "storeManager", kind: "task", text: "Получена цель: обработать волну заказов и выполнить план.", status: "МЫСЛИТ", requires: ["agent:storeManager"] },
      { id: "delegate-sales", source: "Менеджер магазина", target: "Продавец", agent: "storeManager", kind: "route", text: "Начать обработку очереди заказов.", status: "МАРШРУТ", requires: ["agent:storeManager", "agent:salesAgent", "route:salesAgent:storeManager"] },
      { id: "sales-order", source: "Продавец", target: "Система заказов", agent: "salesAgent", component: "orderSystem", kind: "tool", text: "Заказ валидирован и подтверждён клиенту.", failText: "Без системы заказов продавец не может оформить покупку.", status: "ВЫЗЫВАЕТ TOOL", requires: ["rag:salesAgent:productCatalog", "skill:salesAgent:orderProcessing", "tool:salesAgent:orderSystem"], effect: { ordersPending: -2, revenue: 3500 }, objective: "orders" },
      { id: "delegate-warehouse", source: "Менеджер магазина", target: "Кладовщик", agent: "storeManager", kind: "route", text: "Проверить остатки для отгрузки.", status: "МАРШРУТ", requires: ["agent:storeManager", "agent:warehouseWorker", "route:warehouseWorker:storeManager"] },
      { id: "warehouse-check", source: "Кладовщик", target: "База склада", agent: "warehouseWorker", component: "inventoryDB", kind: "rag", text: "Остатки проверены: товар в наличии.", failText: "Кладовщику недоступна база склада.", status: "ИЩЕТ В RAG", requires: ["rag:warehouseWorker:inventoryDB", "skill:warehouseWorker:inventoryCheck"] },
      { id: "warehouse-ship", source: "Кладовщик", target: "Робот-кладовщик", agent: "warehouseWorker", component: "warehouseRobot", kind: "tool", text: "Товар собран и передан в доставку.", failText: "Кладовщик знает где товар, но не может отгрузить без робота.", status: "ВЫЗЫВАЕТ TOOL", requires: ["rag:warehouseWorker:inventoryDB", "skill:warehouseWorker:inventoryCheck", "tool:warehouseWorker:warehouseRobot"], effect: { inventoryLevel: -3 }, objective: "inventory" },
      { id: "delegate-analyst", source: "Менеджер магазина", target: "Аналитик", agent: "storeManager", kind: "route", text: "Оценить риск дефицита.", status: "МАРШРУТ", requires: ["agent:storeManager", "agent:analyst", "route:analyst:storeManager"] },
      { id: "analyst-forecast", source: "Аналитик", target: "Дашборд аналитики", agent: "analyst", component: "analyticsDashboard", kind: "tool", text: "Прогноз: через 2 часа возможен дефицит популярных товаров.", failText: "Аналитику недоступны данные для прогноза.", status: "ВЫЗЫВАЕТ TOOL", requires: ["rag:analyst:orderHistory", "skill:analyst:demandForecasting", "tool:analyst:analyticsDashboard"] }
    ],
    events: [
      {
        id: "order_spike",
        title: "Всплеск заказов",
        description: "После рассылки поступило в 3 раза больше заказов. Очередь растёт.",
        statePatch: { ordersPending: 35, supportQueue: 5 },
        steps: [
          { id: "spike-event", source: "СОБЫТИЕ", target: "Команда", kind: "event", text: "Всплеск заказов: очередь выросла до 35.", status: "СОБЫТИЕ", tone: "danger" },
          { id: "spike-prioritize", source: "Менеджер магазина", target: "Продавец", agent: "storeManager", kind: "route", text: "Приоритизировать VIP-клиентов и крупные заказы.", status: "МАРШРУТ", requires: ["agent:storeManager", "agent:salesAgent", "skill:storeManager:prioritization"] },
          { id: "spike-process", source: "Продавец", target: "Система заказов", agent: "salesAgent", component: "orderSystem", kind: "tool", text: "Обработано 15 заказов за цикл.", failText: "Продавец не справляется с очередью без полного контура.", status: "ВЫЗЫВАЕТ TOOL", requires: ["tool:salesAgent:orderSystem", "skill:salesAgent:orderProcessing"], effect: { ordersPending: -15, revenue: 12000 }, objective: "orders" }
        ]
      },
      {
        id: "inventory_shortage",
        title: "Дефицит товара",
        description: "Популярный товар закончился. Клиенты ждут поставку.",
        statePatch: { inventoryLevel: 12, warehouseStatus: "Дефицит" },
        steps: [
          { id: "shortage-event", source: "СОБЫТИЕ", target: "Кладовщик + Менеджер", kind: "event", text: "Критический остаток: 12 единиц.", status: "КОНФЛИКТ", tone: "danger" },
          { id: "warehouse-alert", source: "Кладовщик", target: "Менеджер магазина", agent: "warehouseWorker", kind: "route", text: "Запрос: срочно заказать у поставщика.", status: "ЗАПРОС", requires: ["agent:warehouseWorker", "route:warehouseWorker:storeManager"] },
          { id: "manager-decision", source: "Менеджер магазина", target: "Команда", agent: "storeManager", kind: "conflict", text: "Решение: заказать срочную поставку, предложить клиентам аналоги.", failText: "КОНФЛИКТ НЕ РАЗРЕШЁН: нет координатора с приоритизацией.", status: "РЕШЕНИЕ", requires: ["agent:storeManager", "agent:warehouseWorker", "skill:storeManager:prioritization"], effect: { inventoryLevel: 20, warehouseStatus: "Норма", customerSatisfaction: -5 }, objective: "inventory" }
        ]
      }
    ],
    finalEvent: {
      id: "revenue_final",
      title: "Финальный отчёт",
      description: "Конец рабочего дня. Нужно сверить выручку с планом и подготовить отчёт.",
      statePatch: {},
      steps: [
        { id: "final-event", source: "СОБЫТИЕ", target: "Менеджер магазина", kind: "event", text: "День завершён. Сверка с планом.", status: "ФИНАЛ", tone: "danger" },
        { id: "final-analyze", source: "Менеджер магазина", target: "Аналитик", agent: "analyst", component: "analyticsDashboard", kind: "tool", text: "Выручка: 52000. План перевыполнен на 4%.", failText: "Нет данных для финального отчёта.", status: "ПРОВЕРКА", requires: ["agent:analyst", "tool:analyst:analyticsDashboard", "skill:analyst:resultValidation"] },
        { id: "final-report", source: "Менеджер магазина", target: "Команда", agent: "storeManager", kind: "decision", text: "ПЛАН ВЫПОЛНЕН: выручка выше цели, клиенты довольны.", failText: "ПЛАН НЕ ВЫПОЛНЕН: архитектура не смогла обеспечить обработку заказов.", status: "РЕШЕНИЕ", requires: ["agent:storeManager", "skill:storeManager:resultValidation", "tool:storeManager:emailGateway"], requiresSegmentSuccess: true, effect: { revenue: 2000 }, objective: "revenue" }
      ]
    },
    hints: [
      "Кто должен приоритезировать заказы при всплеске спроса?",
      "Какой навык нужен кладовщику для проверки остатков?",
      "Если товар закончился, кто принимает решение о заказе?",
      "Проверьте, кому продавец возвращает результат обработки заказа.",
      "Финальный отчёт требует независимой проверки аналитика."
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

  const newsroom = {
    id: "newsroom",
    title: "Редакция новостей",
    shortTitle: "NewsRoom",
    icon: "📰",
    difficulty: "★★☆",
    lesson: "Проверка фактов и дедлайны",
    description: "Противоречивые источники, жёсткий дедлайн публикации и проверка контента.",
    available: true,
    mission: {
      countdown: "04:00:00",
      objectives: [
        { id: "publish", title: "Опубликовать выпуск вовремя" },
        { id: "accuracy", title: "Проверить все факты" },
        { id: "sources", title: "Использовать надёжные источники" },
        { id: "engagement", title: "Набрать целевое количество просмотров" }
      ]
    },
    initialState: {
      articlesReady: 3,
      articlesTotal: 8,
      factCheckScore: 65,
      deadline: "04:00:00",
      views: 0,
      targetViews: 10000,
      credibility: "Средняя",
      conflicts: 0
    },
    agents: [
      component("editorInChief", "agent", "Главный редактор", "Принимает финальные решения и координирует", "◎"),
      component("journalist", "agent", "Журналист", "Пишет статьи и собирает информацию", "✚"),
      component("factChecker", "agent", "Фактчекер", "Проверяет достоверность информации", "◫"),
      component("researcher", "agent", "Исследователь", "Ищет источники и данные", "△"),
      component("seoSpecialist", "agent", "SEO-специалист", "Оптимизирует заголовки и контент", "◇"),
      component("socialManager", "agent", "SMM-менеджер", "Продвигает публикации в соцсетях", "▦")
    ],
    rag: [
      component("styleGuide", "rag", "Гайдлайн редакции", "Стандарты стиля и оформления", "▤"),
      component("sourceDB", "rag", "База источников", "Рейтинг надёжности источников", "◷"),
      component("archive", "rag", "Архив публикаций", "Прошлые статьи и исправления", "+"),
      component("trendData", "rag", "Данные трендов", "Популярные темы и ключевые слова", "≋"),
      component("legalDocs", "rag", "Юридические документы", "Требования к контенту и ограничения", "▽"),
      component("audienceProfiles", "rag", "Профили аудитории", "Предпочтения читателей по сегментам", "▦")
    ],
    skills: [
      component("writing", "skill", "Написание статей", "Создание качественного контента", "⌘"),
      component("factVerification", "skill", "Проверка фактов", "Сопоставление утверждений с источниками", "↗"),
      component("sourceEvaluation", "skill", "Оценка источников", "Определение надёжности источника", "✚"),
      component("seoOptimization", "skill", "SEO-оптимизация", "Подбор ключевых слов и мета-тегов", "△"),
      component("conflictResolution", "skill", "Разрешение противоречий", "Работа с конфликтующими данными", "⇅"),
      component("headlineCrafting", "skill", "Создание заголовков", "Привлекательные и точные заголовки", "▦"),
      component("resultValidation", "skill", "Проверка результата", "Финальная вычитка перед публикацией", "✓")
    ],
    tools: [
      component("cms", "tool", "CMS-система", "Публикация и управление статьями", "⌁"),
      component("searchEngine", "tool", "Поисковый движок", "Поиск информации в сети", "⌬"),
      component("analyticsTool", "tool", "Аналитика просмотров", "Метрики трафика и вовлечённости", "◉"),
      component("socialScheduler", "tool", "Планировщик соцсетей", "Отложенный постинг", "ϟ"),
      component("plagiarismChecker", "tool", "Антиплагиат", "Проверка уникальности текста", "◉"),
      component("notificationSystem", "tool", "Система уведомлений", "Оповещения редакции", "▥")
    ],
    goals: {
      editorInChief: "Обеспечить своевременную публикацию качественного выпуска.",
      journalist: "Создавать интересные и точные статьи.",
      factChecker: "Не допустить публикации непроверенной информации.",
      researcher: "Находить надёжные источники для каждой статьи.",
      seoSpecialist: "Максимизировать органический трафик.",
      socialManager: "Привлекать аудиторию из социальных сетей."
    },
    reference: {
      agents: [
        { templateId: "editorInChief", input: "user", output: "journalist", rag: ["styleGuide", "legalDocs"], skills: ["conflictResolution", "resultValidation"], tools: ["cms", "notificationSystem"] },
        { templateId: "journalist", input: "editorInChief", output: "editorInChief", rag: ["sourceDB", "archive"], skills: ["writing", "headlineCrafting"], tools: ["cms", "searchEngine"] },
        { templateId: "factChecker", input: "editorInChief", output: "editorInChief", rag: ["sourceDB", "archive", "legalDocs"], skills: ["factVerification", "sourceEvaluation"], tools: ["searchEngine", "plagiarismChecker"] },
        { templateId: "researcher", input: "editorInChief", output: "editorInChief", rag: ["sourceDB", "trendData"], skills: ["sourceEvaluation"], tools: ["searchEngine"] },
        { templateId: "seoSpecialist", input: "editorInChief", output: "editorInChief", rag: ["trendData", "audienceProfiles"], skills: ["seoOptimization"], tools: ["analyticsTool"] },
        { templateId: "socialManager", input: "editorInChief", output: "editorInChief", rag: ["audienceProfiles", "trendData"], skills: ["headlineCrafting"], tools: ["socialScheduler", "analyticsTool"] }
      ]
    },
    baseSteps: [
      { id: "mission", source: "ПОЛЬЗОВАТЕЛЬ", target: "Главный редактор", agent: "editorInChief", kind: "task", text: "Получена цель: подготовить выпуск из 8 статей к дедлайну.", status: "МЫСЛИТ", requires: ["agent:editorInChief"] },
      { id: "delegate-journalist", source: "Главный редактор", target: "Журналист", agent: "editorInChief", kind: "route", text: "Написать статью по горячей теме.", status: "МАРШРУТ", requires: ["agent:editorInChief", "agent:journalist", "route:journalist:editorInChief"] },
      { id: "journalist-write", source: "Журналист", target: "CMS-система", agent: "journalist", component: "cms", kind: "tool", text: "Черновик статьи создан.", failText: "Журналист не может опубликовать без CMS.", status: "ВЫЗЫВАЕТ TOOL", requires: ["rag:journalist:sourceDB", "skill:journalist:writing", "tool:journalist:cms"], effect: { articlesReady: 1 }, objective: "publish" },
      { id: "delegate-factchecker", source: "Главный редактор", target: "Фактчекер", agent: "editorInChief", kind: "route", text: "Проверить факты в статье.", status: "МАРШРУТ", requires: ["agent:editorInChief", "agent:factChecker", "route:factChecker:editorInChief"] },
      { id: "factcheck-verify", source: "Фактчекер", target: "Поисковый движок", agent: "factChecker", component: "searchEngine", kind: "tool", text: "Факты подтверждены независимыми источниками.", failText: "Фактчекеру недоступен поиск для проверки.", status: "ВЫЗЫВАЕТ TOOL", requires: ["rag:factChecker:sourceDB", "skill:factChecker:factVerification", "tool:factChecker:searchEngine"], effect: { factCheckScore: 8 }, objective: "accuracy" },
      { id: "delegate-researcher", source: "Главный редактор", target: "Исследователь", agent: "editorInChief", kind: "route", text: "Найти дополнительные источники.", status: "МАРШРУТ", requires: ["agent:editorInChief", "agent:researcher", "route:researcher:editorInChief"] },
      { id: "research-find", source: "Исследователь", target: "База источников", agent: "researcher", component: "sourceDB", kind: "rag", text: "Найдены 3 надёжных источника по теме.", failText: "Исследователю недоступна база источников.", status: "ИЩЕТ В RAG", requires: ["rag:researcher:sourceDB", "skill:researcher:sourceEvaluation"] },
      { id: "delegate-seo", source: "Главный редактор", target: "SEO-специалист", agent: "editorInChief", kind: "route", text: "Оптимизировать заголовок статьи.", status: "МАРШРУТ", requires: ["agent:editorInChief", "agent:seoSpecialist", "route:seoSpecialist:editorInChief"] },
      { id: "seo-optimize", source: "SEO-специалист", target: "Аналитика просмотров", agent: "seoSpecialist", component: "analyticsTool", kind: "tool", text: "Заголовок оптимизирован под поисковые запросы.", failText: "SEO-специалисту недоступна аналитика.", status: "ВЫЗЫВАЕТ TOOL", requires: ["rag:seoSpecialist:trendData", "skill:seoSpecialist:seoOptimization", "tool:seoSpecialist:analyticsTool"], effect: { views: 500 }, objective: "engagement" }
    ],
    events: [
      {
        id: "conflicting_sources",
        title: "Противоречивые источники",
        description: "Два источника дают противоположную информацию. Нужна проверка.",
        statePatch: { conflicts: 1, factCheckScore: 55 },
        steps: [
          { id: "conflict-event", source: "СОБЫТИЕ", target: "Фактчекер + Журналист", kind: "event", text: "Обнаружено противоречие в источниках.", status: "КОНФЛИКТ", tone: "danger" },
          { id: "factchecker-alert", source: "Фактчекер", target: "Главный редактор", agent: "factChecker", kind: "route", text: "Запрос: приостановить публикацию до проверки.", status: "ЗАПРОС", requires: ["agent:factChecker", "route:factChecker:editorInChief"] },
          { id: "editor-resolve", source: "Главный редактор", target: "Команда", agent: "editorInChief", kind: "conflict", text: "Решение: проверить по независимым источникам, задержать выпуск на 15 минут.", failText: "КОНФЛИКТ НЕ РАЗРЕШЁН: нет координатора с разрешением противоречий.", status: "РЕШЕНИЕ", requires: ["agent:editorInChief", "agent:factChecker", "skill:editorInChief:conflictResolution"], effect: { conflicts: -1, factCheckScore: 12, deadline: "-00:15:00" }, objective: "accuracy" }
        ]
      },
      {
        id: "deadline_pressure",
        title: "Давление дедлайна",
        description: "До публикации 30 минут. Не все статьи готовы.",
        statePatch: { deadline: "00:30:00" },
        steps: [
          { id: "deadline-event", source: "СОБЫТИЕ", target: "Команда", kind: "event", text: "До дедлайна 30 минут. Готово 6 из 8 статей.", status: "СОБЫТИЕ", tone: "danger" },
          { id: "deadline-prioritize", source: "Главный редактор", target: "Журналист", agent: "editorInChief", kind: "route", text: "Завершить две оставшиеся статьи любой ценой.", status: "МАРШРУТ", requires: ["agent:editorInChief", "agent:journalist"] },
          { id: "deadline-publish", source: "Журналист", target: "CMS-система", agent: "journalist", component: "cms", kind: "tool", text: "Статьи опубликованы в последний момент.", failText: "Журналист не успел без полного контура.", status: "ВЫЗЫВАЕТ TOOL", requires: ["tool:journalist:cms", "skill:journalist:writing"], effect: { articlesReady: 2, views: 1500 }, objective: "publish" }
        ]
      }
    ],
    finalEvent: {
      id: "publication_final",
      title: "Публикация выпуска",
      description: "Все статьи готовы. Финальная проверка перед отправкой читателям.",
      statePatch: {},
      steps: [
        { id: "final-event", source: "СОБЫТИЕ", target: "Главный редактор", kind: "event", text: "Выпуск готов к публикации. Финальная проверка.", status: "ФИНАЛ", tone: "danger" },
        { id: "final-validate", source: "Главный редактор", target: "Фактчекер", agent: "factChecker", component: "plagiarismChecker", kind: "tool", text: "Уникальность 98%. Факты проверены.", failText: "Нет финальной проверки контента.", status: "ПРОВЕРКА", requires: ["agent:factChecker", "tool:factChecker:plagiarismChecker", "skill:factChecker:resultValidation"] },
        { id: "final-publish", source: "Главный редактор", target: "Читатели", agent: "editorInChief", kind: "decision", text: "ВЫПУСК ОПУБЛИКОВАН: все факты проверены, дедлайн соблюдён.", failText: "ВЫПУСК ОТМЕНЁН: архитектура не смогла проверить факты или уложиться в срок.", status: "РЕШЕНИЕ", requires: ["agent:editorInChief", "skill:editorInChief:resultValidation", "tool:editorInChief:cms"], requiresSegmentSuccess: true, effect: { views: 8000, credibility: "Высокая" }, objective: "publish" }
      ]
    },
    hints: [
      "Кто должен разрешать противоречия между источниками?",
      "Какой навык нужен фактчекеру для проверки утверждений?",
      "Если источник ненадёжен, какой компонент это определит?",
      "Проверьте, кому журналист возвращает черновик статьи.",
      "Финальная публикация требует проверки уникальности и фактов."
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

  const aiCompany = {
    id: "ai_company",
    title: "ИИ-отдел компании",
    shortTitle: "AI-Corp",
    icon: "🏢",
    difficulty: "★★★",
    lesson: "Реальная бизнес-система",
    description: "Лиды, продажи, отчёты и неполные данные CRM. Максимальная сложность с вероятностными исходами.",
    available: true,
    mission: {
      countdown: "12:00:00",
      objectives: [
        { id: "leads", title: "Конвертировать лиды в продажи" },
        { id: "pipeline", title: "Заполнить воронку продаж" },
        { id: "reports", title: "Подготовить отчёты для стейкхолдеров" },
        { id: "automation", title: "Автоматизировать рутинные процессы" },
        { id: "revenue", title: "Достичь квартального плана" }
      ]
    },
    initialState: {
      leadsIncoming: 25,
      leadsQualified: 8,
      dealsClosed: 3,
      pipelineValue: 120000,
      targetRevenue: 500000,
      crmCompleteness: 45,
      automationLevel: 20,
      stakeholderSatisfaction: 60
    },
    agents: [
      component("cto", "agent", "CTO", "Технический директор, стратегическое планирование", "◎"),
      component("salesLead", "agent", "Руководитель продаж", "Управление командой и воронкой", "✚"),
      component("dataScientist", "agent", "Data Scientist", "ML-модели и прогнозы", "△"),
      component("crmManager", "agent", "CRM-менеджер", "Качество данных и процессы", "◫"),
      component("automationEngineer", "agent", "Инженер автоматизации", "Внедрение AI-решений", "⌬"),
      component("analyst", "agent", "Бизнес-аналитик", "Отчётность и метрики", "▦"),
      component("customerSuccess", "agent", "Customer Success", "Удержание клиентов", "+")
    ],
    rag: [
      component("crmData", "rag", "CRM-система", "Данные сделок и клиентов (неполные)", "▤"),
      component("marketResearch", "rag", "Исследования рынка", "Тренды и конкуренты", "◷"),
      component("historicalSales", "rag", "История продаж", "Прошлые сделки и конверсии", "+"),
      component("mlModels", "rag", "ML-модели", "Прогнозные модели и веса", "≋"),
      component("stakeholderReqs", "rag", "Требования стейкхолдеров", "Ожидания и KPI", "▽"),
      component("processDocs", "rag", "Документация процессов", "Регламенты и инструкции", "▦"),
      component("competitorIntel", "rag", "Разведка конкурентов", "Данные о конкурентах", "△")
    ],
    skills: [
      component("leadScoring", "skill", "Скоринг лидов", "Оценка качества лидов", "⌘"),
      component("forecasting", "skill", "Прогнозирование", "Предсказание продаж и трендов", "↗"),
      component("dataCleaning", "skill", "Очистка данных", "Работа с неполными данными", "✚"),
      component("pipelineManagement", "skill", "Управление воронкой", "Оптимизация этапов продаж", "△"),
      component("automationDesign", "skill", "Проектирование автоматизации", "Создание AI-пайплайнов", "⇅"),
      component("reporting", "skill", "Отчётность", "Визуализация и презентация данных", "▦"),
      component("negotiation", "skill", "Переговоры", "Закрытие сложных сделок", "✓"),
      component("riskAssessment", "skill", "Оценка рисков", "Анализ вероятностей неудачи", "◫")
    ],
    tools: [
      component("crmSystem", "tool", "CRM-система", "Управление сделками и контактами", "⌁"),
      component("mlPlatform", "tool", "ML-платформа", "Обучение и деплой моделей", "⌬"),
      component("biDashboard", "tool", "BI-дашборд", "Визуализация метрик", "◉"),
      component("emailAutomation", "tool", "Email-автоматизация", "Рассылки и триггеры", "ϟ"),
      component("callTracking", "tool", "Трекинг звонков", "Запись и анализ разговоров", "◉"),
      component("contractGenerator", "tool", "Генератор договоров", "Автоматическое создание документов", "▥"),
      component("slackBot", "tool", "Slack-бот", "Уведомления команды", "◎")
    ],
    goals: {
      cto: "Обеспечить технологическое превосходство и выполнение плана.",
      salesLead: "Максимизировать конверсию и средний чек.",
      dataScientist: "Создавать точные прогнозные модели.",
      crmManager: "Поддерживать полноту и качество данных.",
      automationEngineer: "Внедрять автоматизацию для роста эффективности.",
      analyst: "Предоставлять точные отчёты для решений.",
      customerSuccess: "Увеличивать LTV и снижать отток."
    },
    reference: {
      agents: [
        { templateId: "cto", input: "user", output: "salesLead", rag: ["stakeholderReqs", "marketResearch"], skills: ["riskAssessment", "reporting"], tools: ["biDashboard", "slackBot"] },
        { templateId: "salesLead", input: "cto", output: "cto", rag: ["crmData", "historicalSales", "competitorIntel"], skills: ["pipelineManagement", "negotiation"], tools: ["crmSystem", "callTracking"] },
        { templateId: "dataScientist", input: "cto", output: "cto", rag: ["mlModels", "historicalSales", "crmData"], skills: ["forecasting", "dataCleaning"], tools: ["mlPlatform", "biDashboard"] },
        { templateId: "crmManager", input: "cto", output: "cto", rag: ["crmData", "processDocs"], skills: ["dataCleaning"], tools: ["crmSystem", "emailAutomation"] },
        { templateId: "automationEngineer", input: "cto", output: "cto", rag: ["processDocs", "mlModels"], skills: ["automationDesign"], tools: ["mlPlatform", "contractGenerator"] },
        { templateId: "analyst", input: "cto", output: "cto", rag: ["crmData", "historicalSales", "stakeholderReqs"], skills: ["reporting", "forecasting"], tools: ["biDashboard"] },
        { templateId: "customerSuccess", input: "cto", output: "cto", rag: ["crmData", "processDocs"], skills: ["negotiation"], tools: ["emailAutomation", "callTracking"] }
      ]
    },
    baseSteps: [
      { id: "mission", source: "ПОЛЬЗОВАТЕЛЬ", target: "CTO", agent: "cto", kind: "task", text: "Получена цель: выполнить квартальный план продаж.", status: "МЫСЛИТ", requires: ["agent:cto"] },
      { id: "delegate-sales", source: "CTO", target: "Руководитель продаж", agent: "cto", kind: "route", text: "Проанализировать текущую воронку.", status: "МАРШРУТ", requires: ["agent:cto", "agent:salesLead", "route:salesLead:cto"] },
      { id: "sales-pipeline", source: "Руководитель продаж", target: "CRM-система", agent: "salesLead", component: "crmSystem", kind: "tool", text: "Воронка проанализирована: 25 лидов, 8 квалифицированы.", failText: "Руководителю продаж недоступна CRM.", status: "ВЫЗЫВАЕТ TOOL", requires: ["rag:salesLead:crmData", "skill:salesLead:pipelineManagement", "tool:salesLead:crmSystem"], effect: { leadsQualified: 3 }, objective: "pipeline" },
      { id: "delegate-data", source: "CTO", target: "Data Scientist", agent: "cto", kind: "route", text: "Построить прогноз закрытия сделок.", status: "МАРШРУТ", requires: ["agent:cto", "agent:dataScientist", "route:dataScientist:cto"] },
      { id: "data-forecast", source: "Data Scientist", target: "ML-платформа", agent: "dataScientist", component: "mlPlatform", kind: "tool", text: "Прогноз: 65% вероятность выполнения плана.", failText: "Data Scientist'у недоступна ML-платформа.", status: "ВЫЗЫВАЕТ TOOL", requires: ["rag:dataScientist:mlModels", "skill:dataScientist:forecasting", "tool:dataScientist:mlPlatform"] },
      { id: "delegate-crm", source: "CTO", target: "CRM-менеджер", agent: "cto", kind: "route", text: "Улучшить полноту данных в CRM.", status: "МАРШРУТ", requires: ["agent:cto", "agent:crmManager", "route:crmManager:cto"] },
      { id: "crm-clean", source: "CRM-менеджер", target: "CRM-система", agent: "crmManager", component: "crmSystem", kind: "tool", text: "Данные очищены, полнота повышена.", failText: "CRM-менеджеру недоступна система.", status: "ВЫЗЫВАЕТ TOOL", requires: ["rag:crmManager:crmData", "skill:crmManager:dataCleaning", "tool:crmManager:crmSystem"], effect: { crmCompleteness: 15 }, objective: "reports" },
      { id: "delegate-automation", source: "CTO", target: "Инженер автоматизации", agent: "cto", kind: "route", text: "Внедрить автоматизацию скоринга лидов.", status: "МАРШРУТ", requires: ["agent:cto", "agent:automationEngineer", "route:automationEngineer:cto"] },
      { id: "automation-impl", source: "Инженер автоматизации", target: "ML-платформа", agent: "automationEngineer", component: "mlPlatform", kind: "tool", text: "Скоринг лидов автоматизирован.", failText: "Инженеру недоступна платформа.", status: "ВЫЗЫВАЕТ TOOL", requires: ["rag:automationEngineer:mlModels", "skill:automationEngineer:automationDesign", "tool:automationEngineer:mlPlatform"], effect: { automationLevel: 25, leadsIncoming: -5 }, objective: "automation" }
    ],
    events: [
      {
        id: "incomplete_data",
        title: "Неполные данные CRM",
        description: "30% сделок не имеют контактных данных. Прогнозы ненадёжны.",
        statePatch: { crmCompleteness: 30, stakeholderSatisfaction: 50 },
        steps: [
          { id: "data-event", source: "СОБЫТИЕ", target: "CTO + Аналитик", kind: "event", text: "Критическая проблема: данные неполные.", status: "КОНФЛИКТ", tone: "danger" },
          { id: "analyst-alert", source: "Аналитик", target: "CTO", agent: "analyst", kind: "route", text: "Запрос: приостановить отчёт до очистки данных.", status: "ЗАПРОС", requires: ["agent:analyst", "route:analyst:cto"] },
          { id: "cto-decision", source: "CTO", target: "Команда", agent: "cto", kind: "conflict", text: "Решение: CRM-менеджер срочно чистит данные, отчёт задерживается.", failText: "КОНФЛИКТ НЕ РАЗРЕШЁН: нет координатора с оценкой рисков.", status: "РЕШЕНИЕ", requires: ["agent:cto", "agent:crmManager", "skill:cto:riskAssessment"], effect: { crmCompleteness: 25, stakeholderSatisfaction: -10 }, objective: "reports" }
        ]
      },
      {
        id: "big_deal_opportunity",
        title: "Крупная сделка",
        description: "Потенциальный клиент с бюджетом 200к. Требует особых условий.",
        statePatch: { pipelineValue: 320000 },
        steps: [
          { id: "deal-event", source: "СОБЫТИЕ", target: "Руководитель продаж", kind: "event", text: "Крупная возможность: 200к рублей.", status: "СОБЫТИЕ", tone: "success" },
          { id: "sales-negotiate", source: "Руководитель продаж", target: "Генератор договоров", agent: "salesLead", component: "contractGenerator", kind: "tool", text: "Переговоры начаты, договор готовится.", failText: "Руководителю недоступен генератор договоров.", status: "ВЫЗЫВАЕТ TOOL", requires: ["agent:salesLead", "skill:salesLead:negotiation", "tool:salesLead:contractGenerator"] },
          { id: "deal-close", source: "Руководитель продаж", target: "CRM-система", agent: "salesLead", component: "crmSystem", kind: "tool", text: "Сделка закрыта! +200к к плану.", failText: "Сделка упущена без полного контура.", status: "ВЫЗЫВАЕТ TOOL", requires: ["tool:salesLead:crmSystem", "skill:salesLead:negotiation"], effect: { dealsClosed: 1, pipelineValue: -200000, targetRevenue: -200000 }, objective: "revenue" }
        ]
      }
    ],
    finalEvent: {
      id: "quarterly_review",
      title: "Квартальный отчёт",
      description: "Конец квартала. Финальная сверка с планом и презентация стейкхолдерам.",
      statePatch: {},
      steps: [
        { id: "final-event", source: "СОБЫТИЕ", target: "CTO", kind: "event", text: "Квартал завершён. Подготовка итогового отчёта.", status: "ФИНАЛ", tone: "danger" },
        { id: "final-analyze", source: "CTO", target: "Аналитик", agent: "analyst", component: "biDashboard", kind: "tool", text: "Итоги: план выполнен на 94%. Автоматизация внедрена.", failText: "Нет данных для финального отчёта.", status: "ПРОВЕРКА", requires: ["agent:analyst", "tool:analyst:biDashboard", "skill:analyst:reporting"] },
        { id: "final-present", source: "CTO", target: "Стейкхолдеры", agent: "cto", kind: "decision", text: "ПЛАН ВЫПОЛНЕН: выручка достигнута, процессы автоматизированы.", failText: "ПЛАН ПРОВАЛЕН: архитектура не справилась с неполными данными и сложностью.", status: "РЕШЕНИЕ", requires: ["agent:cto", "skill:cto:reporting", "tool:cto:slackBot"], requiresSegmentSuccess: true, effect: { stakeholderSatisfaction: 25, automationLevel: 10 }, objective: "revenue" }
      ]
    },
    hints: [
      "Кто должен оценивать риски при неполных данных?",
      "Какой навык нужен для прогнозирования продаж?",
      "Если CRM неполная, кто отвечает за очистку?",
      "Проверьте маршруты: кому Data Scientist возвращает прогноз?",
      "Финальный отчёт требует агрегации данных из всех систем."
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

  window.AGENT_LAB_SCENARIOS = [mars, store, newsroom, aiCompany];
})();
