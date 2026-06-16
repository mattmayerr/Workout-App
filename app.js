const UI_STORAGE_KEY = "workout-tracker-ui-v1";

const routine = [
  {
    id: "push-day",
    day: "Push",
    name: "Chest, Shoulders & Triceps",
    time: "60-75 min",
    totalSets: "~20 sets",
    exercises: [
      { name: "Incline Bench", sets: 4, reps: "6-10", group: "Push" },
      { name: "Flat Dumbbell Press", sets: 3, reps: "8-12", group: "Push" },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: "8-12", group: "Push" },
      { name: "Lateral Raises", sets: 4, reps: "12-15", group: "Push" },
      { name: "Overhead Tricep Extension", sets: 3, reps: "10-12", group: "Push" },
      { name: "Rope Pushdown", sets: 3, reps: "10-12", group: "Push" },
    ],
  },
  {
    id: "pull-day",
    day: "Pull",
    name: "Back & Biceps",
    time: "60-75 min",
    totalSets: "~20 sets",
    exercises: [
      { name: "Weighted Pull-Ups", sets: 4, reps: "6-10", group: "Pull" },
      { name: "Chest Supported Row", sets: 4, reps: "8-12", group: "Pull" },
      { name: "Cable Row", sets: 3, reps: "10-12", group: "Pull" },
      { name: "Face Pulls", sets: 3, reps: "12-15", group: "Pull" },
      { name: "Barbell Curl", sets: 3, reps: "10-12", group: "Pull" },
      { name: "Hammer Curl", sets: 3, reps: "10-12", group: "Pull" },
    ],
  },
  {
    id: "legs-day",
    day: "Legs",
    name: "Quads, Hamstrings & Calves",
    time: "~60 min",
    totalSets: "~24 sets",
    exercises: [
      { name: "Squat", sets: 4, reps: "6-10", group: "Legs" },
      { name: "Romanian Deadlift", sets: 4, reps: "8-12", group: "Legs" },
      { name: "Leg Press", sets: 3, reps: "10-15", group: "Legs" },
      { name: "Leg Curl", sets: 3, reps: "10-15", group: "Legs" },
      { name: "Leg Extension", sets: 3, reps: "12-15", group: "Legs" },
      { name: "Calf Raises", sets: 4, reps: "15-20", group: "Legs" },
      { name: "Abs", sets: 3, reps: "10-20", group: "Core" },
    ],
  },
];

const app = document.querySelector("#app");
const tabs = document.querySelectorAll(".tab");
const tabsNav = document.querySelector(".tabs");
const accountStatus = document.querySelector("#account-status");
const supabaseClient = createSupabaseClient();

let state = loadState();

function loadState() {
  const today = new Date().toISOString().slice(0, 10);
  const defaults = {
    activeTab: "dashboard",
    selectedRoutineId: routine[0].id,
    selectedExercise: "Incline Bench",
    formDate: today,
    workouts: [],
    session: null,
    isLoading: true,
    authMessage: "",
    dataMessage: "",
  };

  try {
    const saved = JSON.parse(localStorage.getItem(UI_STORAGE_KEY));
    return saved ? { ...defaults, ...saved, workouts: [] } : defaults;
  } catch {
    return defaults;
  }
}

function saveState() {
  const uiState = {
    activeTab: state.activeTab,
    selectedRoutineId: state.selectedRoutineId,
    selectedExercise: state.selectedExercise,
    formDate: state.formDate,
  };

  localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(uiState));
}

function createSupabaseClient() {
  const config = globalThis.WORKOUT_SUPABASE_CONFIG || {};
  const hasConfig = Boolean(config.url && config.anonKey);
  const hasSdk = Boolean(globalThis.supabase?.createClient);

  if (!hasConfig || !hasSdk) return null;
  return globalThis.supabase.createClient(config.url, config.anonKey);
}

function isSignedIn() {
  return Boolean(state.session?.user);
}

function getLoginUrl() {
  return new URL("login.html", window.location.href).href;
}

function setTab(tabName) {
  state.activeTab = tabName;
  saveState();
  render();
}

function currencyNumber(value) {
  return Math.round(value).toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getRoutine(routineId = state.selectedRoutineId) {
  return routine.find((item) => item.id === routineId) ?? routine[0];
}

function completedSets(workout) {
  return workout.exercises.reduce((total, exercise) => {
    return total + exercise.sets.filter((set) => Number(set.reps) > 0).length;
  }, 0);
}

function workoutVolume(workout) {
  return workout.exercises.reduce((total, exercise) => {
    return (
      total +
      exercise.sets.reduce((setTotal, set) => {
        return setTotal + Number(set.weight || 0) * Number(set.reps || 0);
      }, 0)
    );
  }, 0);
}

function estimatedOneRepMax(weight, reps) {
  const weightValue = Number(weight || 0);
  const repValue = Number(reps || 0);
  if (!weightValue || !repValue) return 0;
  return weightValue * (1 + repValue / 30);
}

function getAllExerciseNames() {
  const routineNames = routine.flatMap((day) => day.exercises.map((exercise) => exercise.name));
  const loggedNames = state.workouts.flatMap((workout) =>
    workout.exercises.map((exercise) => exercise.name),
  );
  return [...new Set([...routineNames, ...loggedNames])].sort();
}

function flattenExerciseSessions(exerciseName) {
  return state.workouts
    .filter((workout) => workout.exercises.some((exercise) => exercise.name === exerciseName))
    .map((workout) => {
      const exercise = workout.exercises.find((item) => item.name === exerciseName);
      const sets = exercise.sets.filter((set) => Number(set.reps) > 0);
      const bestSet = sets.reduce(
        (best, set) => {
          const e1rm = estimatedOneRepMax(set.weight, set.reps);
          return e1rm > best.e1rm
            ? { weight: Number(set.weight || 0), reps: Number(set.reps || 0), e1rm }
            : best;
        },
        { weight: 0, reps: 0, e1rm: 0 },
      );

      return {
        date: workout.date,
        routineName: workout.routineName,
        totalVolume: sets.reduce(
          (total, set) => total + Number(set.weight || 0) * Number(set.reps || 0),
          0,
        ),
        bestSet,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function calculateStreak() {
  if (!state.workouts.length) return 0;

  const workoutDates = new Set(state.workouts.map((workout) => workout.date));
  let streak = 0;
  const cursor = new Date();
  const todayKey = cursor.toISOString().slice(0, 10);
  const yesterday = new Date(cursor);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (!workoutDates.has(todayKey) && !workoutDates.has(yesterdayKey)) return 0;

  for (let index = 0; index < 365; index += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (workoutDates.has(key)) {
      streak += 1;
    } else if (streak > 0) {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function workoutsInLastDays(days) {
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  return state.workouts.filter((workout) => new Date(`${workout.date}T00:00:00`) >= start);
}

function getWeekKey(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - firstDay) / 86400000);
  const week = Math.ceil((days + firstDay.getDay() + 1) / 7);
  return `${date.getFullYear()} W${String(week).padStart(2, "0")}`;
}

function weeklyVolumeData() {
  const grouped = new Map();
  state.workouts.forEach((workout) => {
    const key = getWeekKey(workout.date);
    grouped.set(key, (grouped.get(key) || 0) + workoutVolume(workout));
  });

  return [...grouped.entries()]
    .map(([label, value]) => ({ label, value }))
    .slice(-8);
}

function rowToWorkout(row) {
  return {
    id: row.id,
    date: row.date,
    routineId: row.routine_id,
    routineName: row.routine_name,
    duration: Number(row.duration || 0),
    bodyweight: Number(row.bodyweight || 0),
    notes: row.notes || "",
    exercises: Array.isArray(row.exercises) ? row.exercises : [],
    createdAt: row.created_at,
  };
}

function workoutToRow(workout) {
  return {
    user_id: state.session.user.id,
    date: workout.date,
    routine_id: workout.routineId,
    routine_name: workout.routineName,
    duration: workout.duration || null,
    bodyweight: workout.bodyweight || null,
    notes: workout.notes || null,
    exercises: workout.exercises,
  };
}

async function loadWorkouts(showLoading = true) {
  if (!supabaseClient || !isSignedIn()) return;

  if (showLoading) {
    state.isLoading = true;
    render();
  }

  const { data, error } = await supabaseClient
    .from("workouts")
    .select("*")
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  state.isLoading = false;

  if (error) {
    state.dataMessage = error.message;
    state.workouts = [];
  } else {
    state.dataMessage = "";
    state.workouts = data.map(rowToWorkout);
  }

  render();
}

async function signOut() {
  if (!supabaseClient) return;

  await supabaseClient.auth.signOut();
  state.session = null;
  state.workouts = [];
  state.activeTab = "dashboard";
  state.authMessage = "";
  saveState();
  window.location.href = getLoginUrl();
}

function renderAccountStatus() {
  if (!accountStatus) return;

  if (!supabaseClient) {
    accountStatus.innerHTML = `
      <p><strong>Cloud sync not configured</strong></p>
      <p>Add Supabase URL and anon key.</p>
    `;
    return;
  }

  if (state.isLoading) {
    accountStatus.innerHTML = `<p>Checking account...</p>`;
    return;
  }

  if (!isSignedIn()) {
    accountStatus.innerHTML = `<p>Sign in to sync workouts.</p>`;
    return;
  }

  accountStatus.innerHTML = `
    <p><strong>${escapeHtml(state.session.user.email)}</strong></p>
    <button class="button-secondary" data-action="sign-out" type="button">Sign out</button>
  `;
}

function renderSetupNotice() {
  app.innerHTML = `
    <div class="setup-card">
      <div>
        <p class="eyebrow">Setup Needed</p>
        <h2>Connect Supabase before using cloud sync.</h2>
        <p class="muted">
          This GitHub Pages version needs your Supabase project URL and public anon key in
          <code>supabase-config.js</code>. The app is rendering correctly, but cloud login and
          workout storage are paused until that file is filled in.
        </p>
      </div>
      <p class="message">
        Create a Supabase project, run <code>supabase-schema.sql</code>, then copy your project
        URL and anon key into <code>supabase-config.js</code>.
      </p>
    </div>
  `;
}

function renderLoading() {
  app.innerHTML = `
    <div class="empty-state">
      <h2>Loading your workouts...</h2>
      <p>Checking your account and syncing the latest workout data.</p>
    </div>
  `;
}

function renderAuthGate() {
  app.innerHTML = `
    <div class="auth-card">
      <div>
        <p class="eyebrow">Private Workout Log</p>
        <h2>Sign in from the login page.</h2>
        <p class="muted">
          Your dashboard and workout history are private to your account. Sign in or create an
          account to continue.
        </p>
      </div>
      <a class="button" href="login.html">Go to login</a>
    </div>
  `;
}

function renderMessage(message, type = "info") {
  const className = type === "error" ? "message message--error" : `message message--${type}`;
  return `<p class="${className}">${escapeHtml(message)}</p>`;
}

function renderEmptyState() {
  const template = document.querySelector("#empty-state-template");
  app.innerHTML = "";
  app.append(template.content.cloneNode(true));
}

function renderMetric(label, value, note) {
  return `
    <article class="metric">
      <span class="metric__label">${label}</span>
      <strong>${value}</strong>
      <span>${note}</span>
    </article>
  `;
}

function renderDashboard() {
  if (!state.workouts.length) {
    renderEmptyState();
    return;
  }

  const last30 = workoutsInLastDays(30);
  const totalVolume = state.workouts.reduce((total, workout) => total + workoutVolume(workout), 0);
  const averageVolume = totalVolume / state.workouts.length;
  const lastWorkout = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date))[0];
  const weeklyTarget = Math.round((last30.length / (30 / 7)) * 10) / 10;

  app.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Dashboard</h2>
        <p>Your main signals are consistency, total work, and whether key lifts are trending up.</p>
      </div>
      <button class="button" data-action="go-log">Log workout</button>
    </div>

    ${state.dataMessage ? renderMessage(state.dataMessage, "error") : ""}

    <div class="grid grid--metrics">
      ${renderMetric("Total workouts", state.workouts.length, "All time")}
      ${renderMetric("Last 30 days", last30.length, `${weeklyTarget} workouts/week avg`)}
      ${renderMetric("Total volume", currencyNumber(totalVolume), "lbs x reps")}
      ${renderMetric("Current streak", calculateStreak(), "consecutive workout days")}
    </div>

    <div class="grid grid--two" style="margin-top: 1rem;">
      <article class="card">
        <div class="section-header">
          <div>
            <h3>Weekly Volume</h3>
            <p>More volume over time usually means you're doing more productive work.</p>
          </div>
        </div>
        ${renderVolumeBars(weeklyVolumeData())}
      </article>

      <article class="card">
        <h3>Latest Workout</h3>
        <p class="muted">${formatDate(lastWorkout.date)} - ${escapeHtml(lastWorkout.routineName)}</p>
        <div class="workout-card__stats">
          <span class="pill">${completedSets(lastWorkout)} sets</span>
          <span class="pill">${currencyNumber(workoutVolume(lastWorkout))} volume</span>
          <span class="pill">${lastWorkout.duration || "No"} min</span>
        </div>
        <hr />
        <p class="muted">Average session volume</p>
        <h2>${currencyNumber(averageVolume)}</h2>
        <p class="muted">Keep the plan boring. Add reps, add weight, or repeat quality work.</p>
      </article>
    </div>

    <div class="grid grid--two" style="margin-top: 1rem;">
      ${renderProgressCard()}
      <article class="card">
        <h3>Focus Exercises</h3>
        <p class="muted">These are the exercises doing most of the physique-building work in this plan.</p>
        <div class="workout-card__stats">
          ${["Incline Bench", "Dumbbell Shoulder Press", "Lateral Raises", "Weighted Pull-Ups", "Chest Supported Row", "Face Pulls", "Squat", "Romanian Deadlift", "Leg Press"]
            .map((name) => `<span class="pill">${name}</span>`)
            .join("")}
        </div>
      </article>
    </div>
  `;
}

function renderVolumeBars(data) {
  if (!data.length) return `<p class="muted">Log workouts to build this chart.</p>`;

  const max = Math.max(...data.map((item) => item.value), 1);
  return `
    <div class="chart" role="img" aria-label="Weekly workout volume bar chart">
      ${data
        .map((item) => {
          const height = Math.max((item.value / max) * 100, 4);
          return `
            <div class="bar-wrap" title="${item.label}: ${currencyNumber(item.value)}">
              <div class="bar" style="height: ${height}%"></div>
              <span class="bar-label">${escapeHtml(item.label.replace("20", "'"))}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderProgressCard() {
  const exercises = getAllExerciseNames();
  const selected = exercises.includes(state.selectedExercise) ? state.selectedExercise : exercises[0];
  state.selectedExercise = selected;
  const sessions = flattenExerciseSessions(selected).slice(-8);
  const first = sessions[0]?.bestSet.e1rm || 0;
  const latest = sessions.at(-1)?.bestSet.e1rm || 0;
  const change = first ? ((latest - first) / first) * 100 : 0;
  const trendClass = change >= 0 ? "trend-positive" : "trend-negative";

  return `
    <article class="card">
      <div class="section-header">
        <div>
          <h3>Exercise Progress</h3>
          <p>Uses estimated 1-rep max from your best set each session.</p>
        </div>
      </div>
      <label for="exercise-progress">Exercise</label>
      <select id="exercise-progress" data-action="select-progress-exercise">
        ${exercises
          .map(
            (name) =>
              `<option value="${escapeHtml(name)}" ${name === selected ? "selected" : ""}>${escapeHtml(name)}</option>`,
          )
          .join("")}
      </select>
      <div style="margin-top: 1rem;">
        ${renderLineChart(sessions.map((session) => ({ label: formatDate(session.date), value: session.bestSet.e1rm })))}
      </div>
      ${
        sessions.length > 1
          ? `<p class="${trendClass}">${change >= 0 ? "+" : ""}${change.toFixed(1)}% estimated strength change across the visible sessions.</p>`
          : `<p class="muted">Log this exercise more than once to see a trend.</p>`
      }
    </article>
  `;
}

function renderLineChart(data) {
  if (!data.length) return `<p class="muted">No logs for this exercise yet.</p>`;

  const width = 520;
  const height = 230;
  const padding = 28;
  const values = data.map((item) => item.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, max);
  const range = Math.max(max - min, 1);
  const points = data.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
    const y = height - padding - ((item.value - min) / range) * (height - padding * 2);
    return { ...item, x, y };
  });

  const pointString = points.map((point) => `${point.x},${point.y}`).join(" ");
  return `
    <svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Exercise progress line chart">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#e5d9c8" stroke-width="2" />
      <polyline points="${pointString}" fill="none" stroke="#1f5f4a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      ${points
        .map(
          (point, index) => `
            <circle cx="${point.x}" cy="${point.y}" r="5" fill="#c06c3a">
              <title>${escapeHtml(point.label)}: ${currencyNumber(point.value)} e1RM</title>
            </circle>
            ${
              index === 0 || index === points.length - 1
                ? `<text x="${point.x}" y="${point.y - 12}" text-anchor="middle">${currencyNumber(point.value)}</text>`
                : ""
            }
          `,
        )
        .join("")}
    </svg>
  `;
}

function renderLog() {
  const selectedRoutine = getRoutine();

  app.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Log Workout</h2>
        <p>Pick the workout day, enter each completed set, and save. Empty sets are ignored.</p>
      </div>
    </div>

    <form id="workout-form">
      <div class="card">
        <div class="form-grid">
          <div class="field">
            <label for="workout-date">Date</label>
            <input id="workout-date" name="date" type="date" value="${escapeHtml(state.formDate)}" required />
          </div>
          <div class="field">
            <label for="routine-select">Routine</label>
            <select id="routine-select" name="routineId" data-action="select-routine">
              ${routine
                .map(
                  (day) =>
                    `<option value="${day.id}" ${day.id === selectedRoutine.id ? "selected" : ""}>${day.day} - ${day.name}</option>`,
                )
                .join("")}
            </select>
          </div>
          <div class="field">
            <label for="duration">Duration min</label>
            <input id="duration" name="duration" type="number" min="1" max="240" placeholder="65" />
          </div>
          <div class="field">
            <label for="bodyweight">Bodyweight</label>
            <input id="bodyweight" name="bodyweight" type="number" min="1" step="0.1" placeholder="198" />
          </div>
          <div class="field field--wide">
            <label for="notes">Notes</label>
            <textarea id="notes" name="notes" placeholder="Energy, sleep, form notes, or what to improve next time"></textarea>
          </div>
        </div>
      </div>

      <div class="exercise-list">
        ${selectedRoutine.exercises.map(renderExerciseInputCard).join("")}
      </div>

      <div class="form-actions">
        <p class="form-help">Tip: add reps first. When you hit the top of the range, increase weight next time.</p>
        <button class="button" type="submit">Save workout</button>
      </div>
    </form>
  `;
}

function renderExerciseInputCard(exercise, exerciseIndex) {
  const rows = Array.from({ length: exercise.sets }, (_, setIndex) => {
    return `
      <tr>
        <td>${setIndex + 1}</td>
        <td><input name="exercise-${exerciseIndex}-weight-${setIndex}" type="number" min="0" step="0.5" inputmode="decimal" placeholder="lbs" /></td>
        <td><input name="exercise-${exerciseIndex}-reps-${setIndex}" type="number" min="0" step="1" inputmode="numeric" placeholder="${exercise.reps}" /></td>
      </tr>
    `;
  }).join("");

  return `
    <article class="exercise-card" data-exercise-name="${escapeHtml(exercise.name)}">
      <div class="exercise-card__header">
        <div>
          <h3>${escapeHtml(exercise.name)}</h3>
          <p>${exercise.sets} sets x ${escapeHtml(exercise.reps)} reps</p>
        </div>
        <span class="pill">${escapeHtml(exercise.group)}</span>
      </div>
      <table class="sets-table">
        <thead>
          <tr>
            <th>Set</th>
            <th>Weight</th>
            <th>Reps</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </article>
  `;
}

async function saveWorkout(form) {
  const formData = new FormData(form);
  const selectedRoutine = getRoutine(formData.get("routineId"));

  const exercises = selectedRoutine.exercises
    .map((exercise, exerciseIndex) => {
      const sets = Array.from({ length: exercise.sets }, (_, setIndex) => ({
        weight: Number(formData.get(`exercise-${exerciseIndex}-weight-${setIndex}`) || 0),
        reps: Number(formData.get(`exercise-${exerciseIndex}-reps-${setIndex}`) || 0),
      })).filter((set) => set.reps > 0 || set.weight > 0);

      return { name: exercise.name, group: exercise.group, sets };
    })
    .filter((exercise) => exercise.sets.length);

  if (!exercises.length) {
    alert("Add at least one completed set before saving.");
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Saving...";

  const workout = {
    date: formData.get("date"),
    routineId: selectedRoutine.id,
    routineName: `${selectedRoutine.day} - ${selectedRoutine.name}`,
    duration: Number(formData.get("duration") || 0),
    bodyweight: Number(formData.get("bodyweight") || 0),
    notes: String(formData.get("notes") || "").trim(),
    exercises,
  };

  const { data, error } = await supabaseClient
    .from("workouts")
    .insert(workoutToRow(workout))
    .select("*")
    .single();

  submitButton.disabled = false;
  submitButton.textContent = "Save workout";

  if (error) {
    alert(`Workout could not be saved: ${error.message}`);
    return;
  }

  state.workouts = [...state.workouts, rowToWorkout(data)].sort((a, b) => a.date.localeCompare(b.date));
  state.formDate = workout.date;
  state.activeTab = "dashboard";
  saveState();
  render();
}

function renderRoutine() {
  app.innerHTML = `
    <div class="section-header">
      <div>
        <h2>The Routine</h2>
        <p>Four days per week, focused on progressive overload and repeatability.</p>
      </div>
      <button class="button" data-action="go-log">Log workout</button>
    </div>

    <div class="grid grid--routine">
      ${routine
        .map(
          (day) => `
            <article class="card routine-day">
              <div>
                <p class="eyebrow">${day.day}</p>
                <h3>${day.name}</h3>
                <div class="routine-day__meta">
                  <span class="pill">${day.time}</span>
                  <span class="pill">${day.totalSets}</span>
                </div>
              </div>
              <ul class="routine-list">
                ${day.exercises
                  .map(
                    (exercise) => `
                      <li>
                        <strong>${escapeHtml(exercise.name)}</strong>
                        <span>${exercise.sets} x ${escapeHtml(exercise.reps)}</span>
                      </li>
                    `,
                  )
                  .join("")}
              </ul>
              <button class="button-secondary" data-action="log-specific-routine" data-routine-id="${day.id}">Log ${day.day}</button>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderHistory() {
  const workouts = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date));

  app.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Workout History</h2>
        <p>Review what you did, compare session volume, and delete mistakes.</p>
      </div>
      <button class="button-danger" data-action="clear-all">Clear all data</button>
    </div>

    ${
      workouts.length
        ? `<div class="history-list">${workouts.map(renderWorkoutCard).join("")}</div>`
        : `<div class="empty-state"><h2>No history yet</h2><p>Saved workouts will show up here.</p><button class="button" data-action="go-log">Log workout</button></div>`
    }
  `;
}

function renderWorkoutCard(workout) {
  return `
    <article class="workout-card">
      <div class="workout-card__top">
        <div>
          <h3>${formatDate(workout.date)} - ${escapeHtml(workout.routineName)}</h3>
          <p>${workout.notes ? escapeHtml(workout.notes) : "No notes added."}</p>
        </div>
        <button class="button-danger" data-action="delete-workout" data-workout-id="${workout.id}">Delete</button>
      </div>
      <div class="workout-card__stats">
        <span class="pill">${completedSets(workout)} sets</span>
        <span class="pill">${currencyNumber(workoutVolume(workout))} volume</span>
        <span class="pill">${workout.duration || "No"} min</span>
        ${workout.bodyweight ? `<span class="pill">${workout.bodyweight} lb bodyweight</span>` : ""}
      </div>
      <table class="mini-table">
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Best set</th>
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
          ${workout.exercises
            .map((exercise) => {
              const bestSet = exercise.sets.reduce(
                (best, set) => {
                  const e1rm = estimatedOneRepMax(set.weight, set.reps);
                  return e1rm > best.e1rm ? { ...set, e1rm } : best;
                },
                { weight: 0, reps: 0, e1rm: 0 },
              );
              const volume = exercise.sets.reduce(
                (total, set) => total + Number(set.weight || 0) * Number(set.reps || 0),
                0,
              );
              return `
                <tr>
                  <td>${escapeHtml(exercise.name)}</td>
                  <td>${bestSet.weight} x ${bestSet.reps}</td>
                  <td>${currencyNumber(volume)}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </article>
  `;
}

function render() {
  const locked = !supabaseClient || state.isLoading || !isSignedIn();
  tabsNav.classList.toggle("is-locked", locked);
  tabs.forEach((tab) => {
    tab.disabled = locked;
    tab.classList.toggle("is-active", tab.dataset.tab === state.activeTab);
  });
  renderAccountStatus();

  if (!supabaseClient) {
    renderSetupNotice();
    return;
  }

  if (state.isLoading) {
    renderLoading();
    return;
  }

  if (!isSignedIn()) {
    renderAuthGate();
    return;
  }

  if (state.activeTab === "dashboard") renderDashboard();
  if (state.activeTab === "log") renderLog();
  if (state.activeTab === "routine") renderRoutine();
  if (state.activeTab === "history") renderHistory();
}

document.addEventListener("click", async (event) => {
  const tab = event.target.closest("[data-tab]");
  if (tab && !tab.disabled) {
    setTab(tab.dataset.tab);
    return;
  }

  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;

  const { action } = actionTarget.dataset;

  if (action === "go-log") {
    setTab("log");
  }

  if (action === "log-specific-routine") {
    state.selectedRoutineId = actionTarget.dataset.routineId;
    setTab("log");
  }

  if (action === "sign-out") {
    await signOut();
  }

  if (action === "delete-workout") {
    const shouldDelete = confirm("Delete this workout from your cloud account?");
    if (!shouldDelete) return;

    const { error } = await supabaseClient
      .from("workouts")
      .delete()
      .eq("id", actionTarget.dataset.workoutId);

    if (error) {
      alert(`Workout could not be deleted: ${error.message}`);
      return;
    }

    state.workouts = state.workouts.filter(
      (workout) => workout.id !== actionTarget.dataset.workoutId,
    );
    render();
  }

  if (action === "clear-all") {
    const shouldClear = confirm("Clear all saved workout data from your cloud account?");
    if (!shouldClear) return;

    const { error } = await supabaseClient
      .from("workouts")
      .delete()
      .eq("user_id", state.session.user.id);

    if (error) {
      alert(`Workout data could not be cleared: ${error.message}`);
      return;
    }

    state.workouts = [];
    render();
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;

  if (target.matches("[data-action='select-routine']")) {
    state.selectedRoutineId = target.value;
    saveState();
    renderLog();
  }

  if (target.matches("[data-action='select-progress-exercise']")) {
    state.selectedExercise = target.value;
    saveState();
    render();
  }
});

document.addEventListener("submit", async (event) => {
  if (event.target.id === "workout-form") {
    event.preventDefault();
    await saveWorkout(event.target);
  }
});

async function initApp() {
  render();

  if (!supabaseClient) {
    state.isLoading = false;
    render();
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();

  state.isLoading = false;
  state.session = data.session;
  state.authMessage = error ? error.message : "";

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    state.authMessage = "";
    state.workouts = [];

    if (session) {
      await loadWorkouts();
    } else {
      state.activeTab = "dashboard";
      saveState();
      render();
    }
  });

  if (state.session) {
    await loadWorkouts(false);
  } else {
    render();
    window.location.href = getLoginUrl();
  }
}

initApp();
