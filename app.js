const CONFIG = {
  scriptUrl: "https://script.google.com/macros/s/AKfycbzossH9LRU67oKFtekByg8VS7IALhRsTAJJDjixhhTX8Kj6hhXubylUcP_xDPy8CXchbg/exec",
  questionsPerModule: 27,
  moduleSeconds: 32 * 60,
};

const modules = [
  {
    id: "module1",
    label: "Module 1",
    title: "Reading and Writing",
    imagePath: "./assets/questions/module1/q",
  },
  {
    id: "module2",
    label: "Module 2",
    title: "Reading and Writing",
    imagePath: "./assets/questions/module2/q",
  },
];

const state = {
  studentName: "",
  studentId: "",
  moduleIndex: 0,
  questionIndex: 0,
  secondsLeft: CONFIG.moduleSeconds,
  timerId: null,
  answers: {
    module1: Array(CONFIG.questionsPerModule).fill(""),
    module2: Array(CONFIG.questionsPerModule).fill(""),
  },
  startedAt: "",
};

const els = {
  startScreen: document.getElementById("startScreen"),
  moduleStartScreen: document.getElementById("moduleStartScreen"),
  testScreen: document.getElementById("testScreen"),
  doneScreen: document.getElementById("doneScreen"),
  studentForm: document.getElementById("studentForm"),
  studentName: document.getElementById("studentName"),
  studentId: document.getElementById("studentId"),
  moduleLabel: document.getElementById("moduleLabel"),
  moduleTitle: document.getElementById("moduleTitle"),
  timerText: document.getElementById("timerText"),
  questionCounter: document.getElementById("questionCounter"),
  questionImage: document.getElementById("questionImage"),
  answerButtons: document.getElementById("answerButtons"),
  questionGrid: document.getElementById("questionGrid"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  moduleActionBtn: document.getElementById("moduleActionBtn"),
  startModule2Btn: document.getElementById("startModule2Btn"),
  submissionMessage: document.getElementById("submissionMessage"),
};

function padQuestion(number) {
  return String(number).padStart(2, "0");
}

function currentModule() {
  return modules[state.moduleIndex];
}

function currentAnswers() {
  return state.answers[currentModule().id];
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function renderTimer() {
  els.timerText.textContent = formatTime(state.secondsLeft);
  els.timerText.classList.toggle("submit-warning", state.secondsLeft <= 300);
}

function startTimer() {
  clearInterval(state.timerId);
  renderTimer();
  state.timerId = setInterval(() => {
    state.secondsLeft -= 1;
    renderTimer();
    if (state.secondsLeft <= 0) {
      clearInterval(state.timerId);
      handleModuleTimeExpired();
    }
  }, 1000);
}

function renderQuestion() {
  const module = currentModule();
  const questionNumber = state.questionIndex + 1;
  const answer = currentAnswers()[state.questionIndex];

  els.moduleLabel.textContent = module.label;
  els.moduleTitle.textContent = module.title;
  els.questionCounter.textContent = `Question ${questionNumber} of ${CONFIG.questionsPerModule}`;
  els.questionImage.src = `${module.imagePath}${padQuestion(questionNumber)}.png`;
  els.questionImage.alt = `${module.label}, question ${questionNumber}`;
  els.prevBtn.disabled = state.questionIndex === 0;
  els.nextBtn.disabled = state.questionIndex === CONFIG.questionsPerModule - 1;
  els.moduleActionBtn.textContent = state.moduleIndex === 0 ? "Finish Module 1" : "Submit Test";

  els.answerButtons.innerHTML = "";
  ["A", "B", "C", "D"].forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `choice-button${answer === choice ? " selected" : ""}`;
    button.textContent = choice;
    button.addEventListener("click", () => {
      currentAnswers()[state.questionIndex] = choice;
      renderQuestion();
    });
    els.answerButtons.appendChild(button);
  });

  renderQuestionGrid();
}

function renderQuestionGrid() {
  const answers = currentAnswers();
  els.questionGrid.innerHTML = "";
  answers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      "question-tile",
      answer ? "answered" : "",
      index === state.questionIndex ? "current" : "",
    ]
      .filter(Boolean)
      .join(" ");
    button.textContent = `Q ${index + 1}`;
    button.addEventListener("click", () => {
      state.questionIndex = index;
      renderQuestion();
    });
    els.questionGrid.appendChild(button);
  });
}

function unansweredCount(moduleId) {
  return state.answers[moduleId].filter((answer) => !answer).length;
}

function showOnly(screen) {
  [els.startScreen, els.moduleStartScreen, els.testScreen, els.doneScreen].forEach((item) => {
    item.hidden = item !== screen;
  });
}

function startCurrentModule() {
  state.questionIndex = 0;
  state.secondsLeft = CONFIG.moduleSeconds;
  showOnly(els.testScreen);
  renderQuestion();
  startTimer();
}

function goToNextModule() {
  state.moduleIndex = 1;
  clearInterval(state.timerId);
  showOnly(els.moduleStartScreen);
}

function handleModuleTimeExpired() {
  if (state.moduleIndex === 0) {
    const proceed = window.confirm(
      "Time is up for Module 1. Continue to Module 2 now?"
    );
    if (proceed) {
      goToNextModule();
    }
    return;
  }
  submitTest();
}

function handleModuleAction() {
  const module = currentModule();
  const missing = unansweredCount(module.id);

  if (state.moduleIndex === 0) {
    const message =
      missing > 0
        ? `You have ${missing} unanswered question(s) in Module 1. Continue to Module 2?`
        : "Finish Module 1 and continue to Module 2?";
    if (window.confirm(message)) {
      goToNextModule();
    }
    return;
  }

  const message =
    missing > 0
      ? `You have ${missing} unanswered question(s) in Module 2. Submit your test now?`
      : "Submit your test now?";
  if (window.confirm(message)) {
    submitTest();
  }
}

function buildPayload() {
  return {
    testName: "SAT Reading and Writing Practice Test 2",
    studentName: state.studentName,
    studentId: state.studentId,
    startedAt: state.startedAt,
    submittedAt: new Date().toISOString(),
    answers: {
      module1: state.answers.module1,
      module2: state.answers.module2,
    },
  };
}

async function submitTest() {
  clearInterval(state.timerId);
  const payload = buildPayload();

  showOnly(els.doneScreen);

  if (!CONFIG.scriptUrl) {
    els.submissionMessage.textContent =
      "Submission is not connected yet. Add your Google Apps Script web app URL in app.js before sharing this test.";
    return;
  }

  try {
    await fetch(CONFIG.scriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    els.submissionMessage.textContent =
      "Your answers were submitted. Your instructor will review your results.";
  } catch (error) {
    els.submissionMessage.textContent =
      "Your answers could not be submitted. Tell your instructor before closing this page.";
  }
}

els.studentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.studentName = els.studentName.value.trim();
  state.studentId = els.studentId.value.trim();
  state.startedAt = new Date().toISOString();
  state.moduleIndex = 0;
  startCurrentModule();
});

els.startModule2Btn.addEventListener("click", startCurrentModule);

els.prevBtn.addEventListener("click", () => {
  state.questionIndex = Math.max(0, state.questionIndex - 1);
  renderQuestion();
});

els.nextBtn.addEventListener("click", () => {
  state.questionIndex = Math.min(CONFIG.questionsPerModule - 1, state.questionIndex + 1);
  renderQuestion();
});

els.moduleActionBtn.addEventListener("click", handleModuleAction);

document.addEventListener("keydown", (event) => {
  if (els.testScreen.hidden) return;
  const key = event.key.toUpperCase();
  if (["A", "B", "C", "D"].includes(key)) {
    currentAnswers()[state.questionIndex] = key;
    renderQuestion();
  }
});
