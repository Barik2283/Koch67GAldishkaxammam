(function () {
  "use strict";

  class AgentLabSimulator {
    constructor(options) {
      this.scenario = options.scenario;
      this.getArchitecture = options.getArchitecture;
      this.onLog = options.onLog || (() => {});
      this.onWorldChange = options.onWorldChange || (() => {});
      this.onActiveChange = options.onActiveChange || (() => {});
      this.onStatusChange = options.onStatusChange || (() => {});
      this.onFinish = options.onFinish || (() => {});
      this.speed = 1;
      this.status = "idle";
      this.queue = [];
      this.triggered = new Set();
      this.segmentFailures = new Map();
      this.timer = null;
      this.virtualElapsed = 0;
      this.run = this.emptyRun();
    }

    emptyRun() {
      return {
        completedSteps: 0,
        successfulSteps: 0,
        failedSteps: 0,
        currentStep: null,
        triggeredEvents: [],
        finalDecision: null
      };
    }

    start() {
      this.stopTimer();
      this.queue = this.withSegment(this.scenario.baseSteps, "base");
      this.triggered.clear();
      this.segmentFailures.clear();
      this.virtualElapsed = 0;
      this.run = this.emptyRun();
      this.status = "running";
      this.onStatusChange(this.status);
      this.onActiveChange(null);
      this.schedule();
      return this.snapshot();
    }

    withSegment(steps, segmentId) {
      return steps.map((step) => ({ ...step, _segment: segmentId }));
    }

    setSpeed(speed) {
      this.speed = [1, 2, 4].includes(Number(speed)) ? Number(speed) : 1;
      if (this.status === "running") {
        this.stopTimer();
        this.schedule();
      }
    }

    togglePause() {
      if (this.status === "running") {
        this.status = "paused";
        this.stopTimer();
      } else if (this.status === "paused") {
        this.status = "running";
        this.schedule();
      }
      this.onStatusChange(this.status);
      return this.status;
    }

    stepOnce() {
      if (this.status === "idle" || this.status === "completed") return false;
      this.stopTimer();
      const didStep = this.executeNext();
      if (this.status === "running") this.schedule();
      return didStep;
    }

    triggerEvent(eventId) {
      const event = this.findEvent(eventId);
      if (!event || this.triggered.has(eventId) || this.status === "completed") return false;

      this.triggered.add(eventId);
      this.run.triggeredEvents.push(eventId);
      this.applyPatch(event.statePatch || {});
      this.queue.unshift(...this.withSegment(event.steps, eventId));
      this.onWorldChange();

      if (this.status === "idle") {
        this.status = "paused";
        this.onStatusChange(this.status);
      }
      return true;
    }

    findEvent(eventId) {
      if (this.scenario.finalEvent.id === eventId) return this.scenario.finalEvent;
      return this.scenario.events.find((event) => event.id === eventId);
    }

    executeNext() {
      if (!this.queue.length) this.enqueueNextStage();
      if (!this.queue.length || this.status === "completed") return false;

      const step = this.queue.shift();
      const architecture = this.getArchitecture();
      const requirementResult = window.AgentLabValidation.checkRequirements(step.requires || [], architecture);
      const segmentAlreadyFailed = step.requiresSegmentSuccess && (this.segmentFailures.get(step._segment) || 0) > 0;
      const passed = requirementResult.passed && !segmentAlreadyFailed;

      this.run.completedSteps += 1;
      this.run.currentStep = step.id;
      if (passed) {
        this.run.successfulSteps += 1;
        this.applyEffect(step.effect || {});
        if (step.objective) architecture.objectives[step.objective] = true;
      } else {
        this.run.failedSteps += 1;
        this.segmentFailures.set(step._segment, (this.segmentFailures.get(step._segment) || 0) + 1);
      }

      if (step.id === "landing-decision") {
        this.run.finalDecision = passed ? "Разрешить посадку" : "Отменить посадку";
      }

      const tone = passed ? (step.tone || (step.kind === "event" ? "danger" : "success")) : "danger";
      const status = passed ? step.status : "ОШИБКА";
      let message = passed ? step.text : (step.failText || "Шаг не выполнен: архитектуре не хватает обязательного компонента.");
      if (!passed && requirementResult.missing.length) {
        const missingText = requirementResult.missing
          .map((item) => window.AgentLabValidation.humanizeRequirement(item, this.scenario))
          .join(", ");
        message += ` Не найдено: ${missingText}.`;
      }
      if (!passed && segmentAlreadyFailed && !requirementResult.missing.length) {
        message += " Предыдущая проверка этого этапа уже провалена.";
      }

      this.onActiveChange({ agent: step.agent || null, component: step.component || null, tone, kind: step.kind });
      this.onLog({
        id: `${Date.now()}-${this.run.completedSteps}`,
        source: step.source,
        target: step.target,
        message,
        status,
        tone,
        passed,
        stepId: step.id
      });
      this.onWorldChange();

      if (!this.queue.length) {
        this.enqueueNextStage();
      }
      return true;
    }

    enqueueNextStage() {
      const sequence = [...this.scenario.events.map((event) => event.id), this.scenario.finalEvent.id];
      const nextId = sequence.find((eventId) => !this.triggered.has(eventId));
      if (nextId) {
        this.triggerEvent(nextId);
        return;
      }
      this.finish();
    }

    applyPatch(patch) {
      const architecture = this.getArchitecture();
      Object.entries(patch).forEach(([key, value]) => {
        architecture.world[key] = value;
      });
    }

    applyEffect(effect) {
      const architecture = this.getArchitecture();
      Object.entries(effect).forEach(([key, value]) => {
        if (typeof value === "number" && typeof architecture.world[key] === "number") {
          architecture.world[key] = Math.max(0, Math.min(key === "crewHealthy" ? architecture.world.crewTotal : 100, architecture.world[key] + value));
        } else {
          architecture.world[key] = value;
        }
      });
    }

    advance(milliseconds) {
      if (this.status !== "running") return this.snapshot();
      this.stopTimer();
      this.virtualElapsed += Math.max(0, Number(milliseconds) || 0);
      const interval = 900 / this.speed;
      let safety = 100;
      while (this.virtualElapsed >= interval && this.status === "running" && safety > 0) {
        this.virtualElapsed -= interval;
        this.executeNext();
        safety -= 1;
      }
      if (this.status === "running") this.schedule();
      return this.snapshot();
    }

    schedule() {
      if (this.status !== "running") return;
      this.timer = window.setTimeout(() => {
        this.timer = null;
        this.executeNext();
        if (this.status === "running") this.schedule();
      }, 900 / this.speed);
    }

    stopTimer() {
      if (this.timer !== null) {
        window.clearTimeout(this.timer);
        this.timer = null;
      }
    }

    finish() {
      if (this.status === "completed") return;
      this.status = "completed";
      this.stopTimer();
      this.onActiveChange(null);
      this.onStatusChange(this.status);
      this.onFinish({ ...this.run });
    }

    snapshot() {
      return {
        status: this.status,
        speed: this.speed,
        queueLength: this.queue.length,
        triggered: [...this.triggered],
        run: { ...this.run }
      };
    }
  }

  window.AgentLabSimulator = AgentLabSimulator;
})();
