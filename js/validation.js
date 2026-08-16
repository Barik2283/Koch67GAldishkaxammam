(function () {
  "use strict";

  function findAgent(state, templateId) {
    return state.agents.find((agent) => agent.templateId === templateId);
  }

  function resourceList(agent, type) {
    if (!agent) return [];
    if (type === "skill") return agent.skills || [];
    if (type === "tool") return agent.tools || [];
    return agent.rag || [];
  }

  function checkRequirement(requirement, state) {
    const [type, owner, id] = requirement.split(":");
    if (type === "agent") {
      return Boolean(findAgent(state, owner));
    }
    if (type === "route") {
      const agent = findAgent(state, owner);
      const targetExists = id === "user" || Boolean(findAgent(state, id));
      return Boolean(agent && targetExists && (agent.output === id || agent.input === id));
    }
    const agent = findAgent(state, owner);
    return Boolean(agent && resourceList(agent, type).includes(id));
  }

  function checkRequirements(requirements, state) {
    const missing = (requirements || []).filter((item) => !checkRequirement(item, state));
    return { passed: missing.length === 0, missing };
  }

  function humanizeRequirement(requirement, scenario) {
    const [type, owner, id] = requirement.split(":");
    const ownerName = scenario.agents.find((item) => item.id === owner)?.title || owner;
    if (type === "agent") return `агент «${ownerName}»`;
    if (type === "route") {
      const targetName = scenario.agents.find((item) => item.id === id)?.title || (id === "user" ? "Пользователь" : id);
      return `маршрут ${ownerName} → ${targetName}`;
    }
    const collection = type === "skill" ? scenario.skills : type === "tool" ? scenario.tools : scenario.rag;
    const componentName = collection.find((item) => item.id === id)?.title || id;
    const typeName = type === "skill" ? "навык" : type === "tool" ? "инструмент" : "RAG";
    return `${typeName} «${componentName}» у агента «${ownerName}»`;
  }

  function validate(scenario, state) {
    const errors = [];
    const warnings = [];
    const notes = [];

    if (!state.agents.length) {
      errors.push("В системе нет ни одного агента.");
      return { errors, warnings, notes, stats: { agents: 0, rag: 0, skills: 0, tools: 0 } };
    }

    state.agents.forEach((agent) => {
      if (!agent.goal || !agent.goal.trim()) {
        errors.push(`${agent.name} не понимает, за какой результат отвечает: задайте цель.`);
      }
      if (!agent.output) {
        warnings.push(`${agent.name} не знает, кому передать результат. Выполненная работа может потеряться.`);
      }
      if (!agent.input) {
        warnings.push(`${agent.name} не знает, откуда получает задачи.`);
      }
      if (!(agent.rag || []).length) {
        warnings.push(`${agent.name}: нет RAG — специализированные знания будут недоступны.`);
      }
      if (!(agent.skills || []).length) {
        warnings.push(`${agent.name}: нет навыков — данные нельзя превратить в способ решения.`);
      }
      if (!(agent.tools || []).length) {
        warnings.push(`${agent.name}: нет инструментов — агент не сможет изменить состояние станции.`);
      }
    });

    const coordinator = findAgent(state, "coordinator");
    if (!coordinator) {
      warnings.push("Нет координатора: конфликт медика и инженера может привести к тупику.");
    } else if (!(coordinator.skills || []).includes("prioritization")) {
      warnings.push("У координатора нет навыка приоритизации: наличие роли ещё не гарантирует разрешение конфликта.");
    }

    const specialists = state.agents.filter((agent) => agent.templateId !== "coordinator");
    const routed = specialists.filter((agent) => agent.input === "coordinator" && agent.output === "coordinator");
    if (specialists.length && routed.length < specialists.length) {
      warnings.push(`Полный маршрут через координатора настроен у ${routed.length} из ${specialists.length} специалистов.`);
    }

    if (state.agents.length > 5) {
      warnings.push("В команде больше пяти агентов. Проверьте, действительно ли у каждого уникальная ответственность (штраф −5). ");
    }

    const roleCount = new Map();
    state.agents.forEach((agent) => roleCount.set(agent.role.trim().toLowerCase(), (roleCount.get(agent.role.trim().toLowerCase()) || 0) + 1));
    [...roleCount.entries()].filter(([, count]) => count > 1).forEach(([role]) => {
      warnings.push(`Роль «${role}» дублируется. Больше агентов не всегда означает лучшую систему.`);
    });

    if (!warnings.length && !errors.length) notes.push("Базовый контур собран. Реальную устойчивость покажет симуляция.");

    return {
      errors,
      warnings,
      notes,
      stats: {
        agents: state.agents.length,
        rag: state.agents.reduce((sum, agent) => sum + (agent.rag || []).length, 0),
        skills: state.agents.reduce((sum, agent) => sum + (agent.skills || []).length, 0),
        tools: state.agents.reduce((sum, agent) => sum + (agent.tools || []).length, 0)
      }
    };
  }

  function coverage(state, requirements) {
    const passed = requirements.filter((item) => checkRequirement(item, state)).length;
    return requirements.length ? passed / requirements.length : 1;
  }

  function calculateScore(scenario, state, run) {
    const agents = state.agents;
    const uniqueRoles = new Set(agents.map((agent) => agent.templateId)).size;
    const namedGoals = agents.filter((agent) => agent.goal && agent.goal.trim()).length;
    const specializationRatio = agents.length ? Math.min(uniqueRoles / Math.min(5, agents.length), 1) * .55 + (namedGoals / agents.length) * .45 : 0;

    const knowledgeRequirements = [
      "rag:engineer:technical_manual", "rag:engineer:energy_logs", "rag:medic:medical_base",
      "rag:analyst:incident_history", "rag:analyst:energy_logs", "rag:analyst:landing_protocols"
    ];
    const skillRequirements = [
      "skill:engineer:diagnostics", "skill:engineer:repair_planning", "skill:medic:medical_diagnosis",
      "skill:analyst:risk_analysis", "skill:coordinator:prioritization", "skill:coordinator:result_validation"
    ];
    const toolRequirements = [
      "tool:engineer:sensors", "tool:engineer:generator_control", "tool:medic:medical_scanner",
      "tool:coordinator:comms", "tool:logistician:robot_control"
    ];

    const specialists = agents.filter((agent) => agent.templateId !== "coordinator");
    const routed = specialists.filter((agent) => agent.input === "coordinator" && agent.output === "coordinator").length;
    const routingRatio = specialists.length ? routed / specialists.length : 0;
    const coordinator = findAgent(state, "coordinator");
    const coordinationRatio = coordinator
      ? ((coordinator.skills || []).includes("prioritization") ? .65 : .3) + ((coordinator.skills || []).includes("result_validation") ? .35 : 0)
      : 0;
    const errorRatio = Math.min(
      ((coordinator?.skills || []).includes("result_validation") ? .45 : 0) +
      ((coordinator?.tools || []).includes("operations_log") ? .25 : 0) +
      ((findAgent(state, "analyst")?.skills || []).includes("risk_analysis") ? .3 : 0),
      1
    );
    const runRatio = run && run.completedSteps ? run.successfulSteps / run.completedSteps : 0;

    const values = {
      specialization: specializationRatio,
      knowledge: coverage(state, knowledgeRequirements),
      skills: coverage(state, skillRequirements),
      tools: coverage(state, toolRequirements),
      routing: routingRatio,
      errorHandling: Math.min(errorRatio * .7 + runRatio * .3, 1),
      coordination: Math.min(coordinationRatio * .75 + runRatio * .25, 1)
    };

    const categories = scenario.scoring.categories.map((category) => ({
      ...category,
      value: Math.round(category.max * (values[category.id] || 0))
    }));
    let total = categories.reduce((sum, category) => sum + category.value, 0);
    if (agents.length > 5) total = Math.max(0, total - 5);

    const findings = [];
    if (checkRequirement("rag:engineer:technical_manual", state) && checkRequirement("skill:engineer:diagnostics", state) && checkRequirement("tool:engineer:sensors", state)) {
      findings.push({ good: true, text: "Инженер смог диагностировать очиститель: RAG дал знания, навык — способ анализа, Tool — реальные данные." });
    } else {
      findings.push({ good: false, text: "Диагностический контур инженера неполон: нужны технический RAG, диагностика и датчики одновременно." });
    }
    if (coordinator && (coordinator.skills || []).includes("prioritization")) {
      findings.push({ good: true, text: "Конфликт целей проходит через координатора с явным навыком приоритизации." });
    } else {
      findings.push({ good: false, text: "Конфликт медика и инженера некому обоснованно разрешить." });
    }
    if (routingRatio === 1 && specialists.length) {
      findings.push({ good: true, text: "Специалисты получают задачи и возвращают результаты по явным маршрутам." });
    } else {
      findings.push({ good: false, text: "Часть результатов теряется: у специалистов не завершён маршрут к координатору." });
    }
    if (run && run.failedSteps) {
      findings.push({ good: false, text: `Во время симуляции провалено шагов: ${run.failedSteps}. Архитектура уверенно работала не во всех ситуациях.` });
    }

    return { total, categories, findings };
  }

  window.AgentLabValidation = {
    validate,
    checkRequirement,
    checkRequirements,
    humanizeRequirement,
    calculateScore
  };
})();
