const UI_STORAGE_KEY = "workout-tracker-ui-v1";
const DRAFT_STORAGE_KEY = "workout-tracker-log-draft-v1";

// Chest / Back / Arms / Legs, four training days.
// Restored 2026-08-19 from commit 63d1a0d, reverting the 08-17 Upper/Lower split.
// Squat, Incline Bench and Barbell Curl must keep these exact names: STRENGTH_GOALS
// below matches on them, and a rename shows the Goals card as "Not logged yet".
// The Focus Exercises card (renderDashboard) is hardcoded to this routine's lifts too.
const DEFAULT_ROUTINE = [
  {
    id: "chest",
    day: "Chest",
    name: "Chest & Shoulders",
    time: "60-75 min",
    exercises: [
      { name: "Incline Bench", sets: 4, reps: "6-8", group: "Push" },
      { name: "Flat Dumbbell Press", sets: 3, reps: "6-8", group: "Push" },
      { name: "Cable Fly", sets: 3, reps: "10-12", group: "Push" },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: "6-8", group: "Push" },
      { name: "Lateral Raises", sets: 4, reps: "10-12", group: "Push" },
      { name: "Front Raises", sets: 3, reps: "10-12", group: "Push" },
    ],
  },
  {
    id: "back",
    day: "Back",
    name: "Back & Rear Delts",
    time: "60-75 min",
    exercises: [
      { name: "Barbell Row", sets: 4, reps: "6-8", group: "Pull" },
      { name: "Lat Pulldown", sets: 3, reps: "6-8", group: "Pull" },
      { name: "Chest Supported Row", sets: 3, reps: "6-8", group: "Pull" },
      { name: "Cable Row", sets: 3, reps: "6-8", group: "Pull" },
      { name: "Face Pulls", sets: 3, reps: "10-12", group: "Pull" },
      { name: "Rear Delt Fly", sets: 3, reps: "10-12", group: "Pull" },
      { name: "Dumbbell Shrugs", sets: 3, reps: "10-12", group: "Pull" },
    ],
  },
  {
    id: "arms",
    day: "Arms",
    name: "Biceps, Triceps & Shoulders",
    time: "60-75 min",
    exercises: [
      { name: "Dips", sets: 3, reps: "6-8", group: "Push" },
      { name: "Barbell Curl", sets: 3, reps: "10-12", group: "Pull" },
      { name: "Rope Pushdown", sets: 3, reps: "10-12", group: "Push" },
      { name: "Incline Dumbbell Curl", sets: 3, reps: "10-12", group: "Pull" },
      { name: "Skull Crushers", sets: 3, reps: "10-12", group: "Push" },
      { name: "Hammer Curl", sets: 3, reps: "10-12", group: "Pull" },
      { name: "Overhead Tricep Extension", sets: 3, reps: "10-12", group: "Push" },
      { name: "Cable Curl", sets: 3, reps: "10-12", group: "Pull" },
      { name: "Lateral Raises", sets: 3, reps: "10-12", group: "Push" },
    ],
  },
  {
    id: "legs",
    day: "Legs",
    name: "Quads, Hamstrings & Abs",
    time: "60 min",
    exercises: [
      { name: "Squat", sets: 4, reps: "6-8", group: "Legs" },
      { name: "Romanian Deadlift", sets: 4, reps: "6-8", group: "Legs" },
      { name: "Leg Press", sets: 3, reps: "6-8", group: "Legs" },
      { name: "Leg Extension", sets: 3, reps: "10-12", group: "Legs" },
      { name: "Leg Curl", sets: 3, reps: "10-12", group: "Legs" },
      { name: "Calf Raises", sets: 4, reps: "10-12", group: "Legs" },
      { name: "Abs", sets: 3, reps: "10-12", group: "Core" },
    ],
  },
];

// Seed default for a brand-new profile's goals (profiles.goals in Supabase).
// Edited from the Profile tab going forward, not here. Names are matched
// loosely against logged exercises, so "Barbell Curls" still finds
// "Barbell Curl" — but renaming a lift far enough shows "Not logged yet".
const STRENGTH_GOALS = [
  { name: "Squat", target: 275 },
  { name: "Incline Bench", target: 225 },
  { name: "Barbell Curl", target: 95 },
];

const app = document.querySelector("#app");
const tabs = document.querySelectorAll(".tab");
const tabsNav = document.querySelector(".tabs");
const accountStatus = document.querySelector("#account-status");
const supabaseClient = createSupabaseClient();

let state = loadState();
applyTheme();

function applyTheme() {
  document.documentElement.dataset.theme = state.profile?.theme || state.theme || "light";
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadState() {
  const today = toDateKey(new Date());
  const defaults = {
    activeTab: "dashboard",
    selectedRoutineId: DEFAULT_ROUTINE[0].id,
    selectedExercise: "Incline Bench",
    formDate: today,
    workouts: [],
    routine: [],
    routineMessage: "",
    session: null,
    isLoading: true,
    authMessage: "",
    dataMessage: "",
    profile: null,
    profileMessage: "",
    theme: "light",
    avatarUploading: false,
  };

  try {
    const saved = JSON.parse(localStorage.getItem(UI_STORAGE_KEY));
    return saved
      ? { ...defaults, ...saved, formDate: today, workouts: [], routine: [], profile: null }
      : defaults;
  } catch {
    return defaults;
  }
}

function saveState() {
  const uiState = {
    activeTab: state.activeTab,
    selectedRoutineId: state.selectedRoutineId,
    selectedExercise: state.selectedExercise,
    theme: state.profile?.theme || state.theme || "light",
  };

  localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(uiState));
}

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveDraftFromForm(form) {
  if (!form) return;
  const draft = {};
  for (const [key, value] of new FormData(form).entries()) {
    draft[key] = value;
  }
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

function clearDraft() {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

function clearExerciseDraftFields() {
  const draft = loadDraft();
  for (const key of Object.keys(draft)) {
    if (key.startsWith("exercise-")) delete draft[key];
  }
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

function getWorkoutForm() {
  return document.querySelector("#workout-form");
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

const KG_PER_LB = 0.45359237;

// Canonical storage is always pounds. These two are the only place a unit
// preference should ever touch a weight-scaled number — everything else
// (goalProgress, workoutVolume, e1RM) stays pure lb math.
function toDisplayWeight(lbValue, units) {
  const value = Number(lbValue || 0);
  return units === "kg" ? value * KG_PER_LB : value;
}

function fromDisplayWeight(displayValue, units) {
  const value = Number(displayValue || 0);
  return units === "kg" ? value / KG_PER_LB : value;
}

function weightUnitLabel(units) {
  return units === "kg" ? "kg" : "lb";
}

function currentUnits() {
  return state.profile?.units || "lb";
}

function displayWeightNumber(lbValue, units) {
  const display = toDisplayWeight(lbValue, units);
  return units === "kg" ? (Math.round(display * 10) / 10).toLocaleString() : currencyNumber(display);
}

// Plain numeric value (no thousands separator) — safe to drop into a
// number input's value attribute, unlike displayWeightNumber's formatted string.
function displayWeightValue(lbValue, units) {
  const display = toDisplayWeight(lbValue, units);
  return units === "kg" ? Math.round(display * 10) / 10 : Math.round(display);
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
  return state.routine.find((item) => item.id === routineId) ?? state.routine[0] ?? null;
}

function generateId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneDefaultRoutine() {
  return DEFAULT_ROUTINE.map((day) => ({
    id: generateId(),
    day: day.day,
    name: day.name,
    time: day.time,
    exercises: day.exercises.map((exercise) => ({ ...exercise })),
  }));
}

function cloneDefaultGoals() {
  return STRENGTH_GOALS.map((goal) => ({ ...goal }));
}

function getInitials(displayName, email) {
  const source = String(displayName || "").trim() || String(email || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : source.slice(0, 2).toUpperCase();
}

function renderAvatar(profile, size = "sm") {
  const cls = `avatar-circle avatar-circle--${size}`;
  if (profile?.avatarUrl) {
    const cacheBust = encodeURIComponent(profile.updatedAt || "");
    return `<img class="${cls}" src="${escapeHtml(profile.avatarUrl)}?v=${cacheBust}" alt="Profile photo" />`;
  }
  const initials = getInitials(profile?.displayName, state.session?.user?.email);
  return `<span class="${cls} avatar-circle--initials">${escapeHtml(initials)}</span>`;
}

function dayTotalSets(day) {
  const total = day.exercises.reduce((sum, exercise) => sum + Number(exercise.sets || 0), 0);
  return `~${total} sets`;
}

function getSplitGroup(dayLabel) {
  const match = String(dayLabel || "").match(/^(.+?)\s+[AB]$/i);
  return match ? match[1].trim() : String(dayLabel || "Other");
}

function groupRoutineDays(days) {
  const groups = new Map();
  days.forEach((day) => {
    const group = getSplitGroup(day.day);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(day);
  });
  return groups;
}

function renderRoutineSelectOptions(selectedId) {
  const groups = groupRoutineDays(state.routine);
  return [...groups.entries()]
    .map(([group, days]) => {
      const options = days
        .map(
          (day) =>
            `<option value="${escapeHtml(day.id)}" ${day.id === selectedId ? "selected" : ""}>${escapeHtml(day.day)}${day.name ? ` - ${escapeHtml(day.name)}` : ""}</option>`,
        )
        .join("");
      return groups.size > 1
        ? `<optgroup label="${escapeHtml(group)}">${options}</optgroup>`
        : options;
    })
    .join("");
}

function renderRoutineDayCard(day) {
  return `
    <article class="card routine-day">
      <div>
        <p class="eyebrow">${escapeHtml(day.day)}</p>
        <h3>${escapeHtml(day.name)}</h3>
        <div class="routine-day__meta">
          <span class="pill">${escapeHtml(day.time)}</span>
          <span class="pill">${dayTotalSets(day)}</span>
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
      <button class="button-secondary" data-action="log-specific-routine" data-routine-id="${escapeHtml(day.id)}">Log ${escapeHtml(day.day)}</button>
    </article>
  `;
}

const EXERCISE_GROUPS = ["Push", "Pull", "Legs", "Core", "Other"];

function findRoutineDay(dayId) {
  return state.routine.find((day) => day.id === dayId) ?? null;
}

function moveArrayItem(items, index, direction) {
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return false;
  [items[index], items[target]] = [items[target], items[index]];
  return true;
}

async function commitRoutineChange() {
  render();
  await saveRoutine();
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

function allTimeVolume() {
  return state.workouts.reduce((total, workout) => total + workoutVolume(workout), 0);
}

function estimatedOneRepMax(weight, reps) {
  const weightValue = Number(weight || 0);
  const repValue = Number(reps || 0);
  if (!weightValue || !repValue) return 0;
  return weightValue * (1 + repValue / 30);
}

function sortWorkoutsNewestFirst(workouts) {
  return [...workouts].sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
}

function getLastWorkoutForRoutine(routine) {
  if (!routine) return null;

  const byId = sortWorkoutsNewestFirst(state.workouts.filter((workout) => workout.routineId === routine.id));
  if (byId.length) return byId[0];

  const routineLabel = `${routine.day} - ${routine.name}`;
  const byName = sortWorkoutsNewestFirst(
    state.workouts.filter(
      (workout) => workout.routineName === routineLabel || workout.routineName.startsWith(`${routine.day} -`),
    ),
  );
  return byName[0] ?? null;
}

function summarizeLoggedExercise(exercise) {
  const sets = exercise.sets.filter((set) => Number(set.reps) > 0 || Number(set.weight) > 0);
  if (!sets.length) return null;

  const setCount = sets.length;
  const firstWeight = Number(sets[0].weight || 0);
  const firstReps = Number(sets[0].reps || 0);
  const allSame = sets.every(
    (set) => Number(set.weight || 0) === firstWeight && Number(set.reps || 0) === firstReps,
  );

  const units = currentUnits();

  if (allSame) {
    const parts = [];
    if (firstWeight) parts.push(`${displayWeightNumber(firstWeight, units)} ${weightUnitLabel(units)}`);
    parts.push(`${setCount} set${setCount === 1 ? "" : "s"}`);
    if (firstReps) parts.push(`${firstReps} reps`);
    return parts.join(" · ");
  }

  const bestSet = sets.reduce(
    (best, set) => {
      const e1rm = estimatedOneRepMax(set.weight, set.reps);
      return e1rm > best.e1rm ? { weight: Number(set.weight || 0), reps: Number(set.reps || 0), e1rm } : best;
    },
    { weight: 0, reps: 0, e1rm: 0 },
  );

  return `Best: ${displayWeightNumber(bestSet.weight, units)} ${weightUnitLabel(units)} × ${bestSet.reps} (${setCount} sets)`;
}

function getLastExerciseLogsForRoutine(routine) {
  const lastWorkout = getLastWorkoutForRoutine(routine);
  if (!lastWorkout) return { lastWorkout: null, byName: new Map() };

  const byName = new Map();
  lastWorkout.exercises.forEach((exercise) => {
    const summary = summarizeLoggedExercise(exercise);
    if (summary) byName.set(exercise.name, summary);
  });

  return { lastWorkout, byName };
}

function getAllExerciseNames() {
  const routineNames = state.routine.flatMap((day) => day.exercises.map((exercise) => exercise.name));
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
  const todayKey = toDateKey(cursor);
  const yesterday = new Date(cursor);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  if (!workoutDates.has(todayKey) && !workoutDates.has(yesterdayKey)) return 0;

  for (let index = 0; index < 365; index += 1) {
    const key = toDateKey(cursor);
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

function normalizeExerciseName(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function exerciseNamesMatch(a, b) {
  const left = normalizeExerciseName(a);
  const right = normalizeExerciseName(b);
  if (left === right) return true;
  // "Barbell Curls" and "Barbell Curl" are the same lift.
  return left.replace(/s$/, "") === right.replace(/s$/, "");
}

function heaviestSetWeight(exercise) {
  return exercise.sets.reduce((best, set) => Math.max(best, Number(set.weight || 0)), 0);
}

function findLastLoggedWeight(exerciseName) {
  for (const workout of sortWorkoutsNewestFirst(state.workouts)) {
    const exercise = workout.exercises.find((item) => exerciseNamesMatch(item.name, exerciseName));
    if (!exercise) continue;
    // A session logged at bodyweight is not a data point for a weight goal.
    const weight = heaviestSetWeight(exercise);
    if (weight > 0) return { weight, date: workout.date };
  }
  return null;
}

function goalProgress(goal) {
  const last = findLastLoggedWeight(goal.name);

  if (!last) {
    return { name: goal.name, target: goal.target, current: null, delta: null, date: null, state: "none" };
  }

  const delta = last.weight - goal.target;
  return {
    name: goal.name,
    target: goal.target,
    current: last.weight,
    delta,
    date: last.date,
    state: delta === 0 ? "reached" : delta > 0 ? "over" : "short",
  };
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

  await Promise.all([loadRoutine(), loadProfile()]);

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

function normalizeRoutine(days) {
  if (!Array.isArray(days)) return [];
  return days
    .filter((day) => day && typeof day === "object")
    .map((day) => ({
      id: day.id || generateId(),
      day: String(day.day || "Day"),
      name: String(day.name || ""),
      time: String(day.time || "60 min"),
      exercises: Array.isArray(day.exercises)
        ? day.exercises.map((exercise) => ({
            name: String(exercise?.name || "Exercise"),
            sets: Number(exercise?.sets || 0),
            reps: String(exercise?.reps || ""),
            group: String(exercise?.group || "Other"),
          }))
        : [],
    }));
}

function reconcileSelectedRoutine() {
  if (!state.routine.length) return;
  const exists = state.routine.some((day) => day.id === state.selectedRoutineId);
  if (!exists) {
    state.selectedRoutineId = state.routine[0].id;
    saveState();
  }
}

async function loadRoutine() {
  if (!supabaseClient || !isSignedIn()) return;

  const { data, error } = await supabaseClient
    .from("routines")
    .select("days")
    .eq("user_id", state.session.user.id)
    .maybeSingle();

  if (error) {
    state.routineMessage = error.message;
    state.routine = cloneDefaultRoutine();
    reconcileSelectedRoutine();
    return;
  }

  if (!data) {
    state.routine = cloneDefaultRoutine();
    const { error: seedError } = await supabaseClient
      .from("routines")
      .insert({ user_id: state.session.user.id, days: state.routine });
    state.routineMessage = seedError ? seedError.message : "";
    reconcileSelectedRoutine();
    return;
  }

  const days = normalizeRoutine(data.days);
  state.routine = days.length ? days : cloneDefaultRoutine();
  state.routineMessage = "";
  reconcileSelectedRoutine();
}

async function saveRoutine() {
  if (!supabaseClient || !isSignedIn()) return;

  const { error } = await supabaseClient
    .from("routines")
    .upsert(
      { user_id: state.session.user.id, days: state.routine },
      { onConflict: "user_id" },
    );

  state.routineMessage = error ? error.message : "";
  if (error) render();
}

function normalizeGoals(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item === "object")
    .map((item) => ({ name: String(item.name || "Goal"), target: Number(item.target || 0) }));
}

function defaultProfile() {
  return { displayName: "", units: "lb", theme: "light", avatarUrl: null, goals: cloneDefaultGoals(), updatedAt: null };
}

function rowToProfile(row) {
  const goals = normalizeGoals(row.goals);
  return {
    displayName: row.display_name || "",
    units: row.units === "kg" ? "kg" : "lb",
    theme: row.theme === "dark" ? "dark" : "light",
    avatarUrl: row.avatar_url || null,
    goals: goals.length ? goals : cloneDefaultGoals(),
    updatedAt: row.updated_at || null,
  };
}

function profileToRow(profile) {
  return {
    user_id: state.session.user.id,
    display_name: profile.displayName || null,
    units: profile.units,
    theme: profile.theme,
    avatar_url: profile.avatarUrl,
    goals: profile.goals,
  };
}

async function loadProfile() {
  if (!supabaseClient || !isSignedIn()) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("display_name, units, theme, avatar_url, goals, updated_at")
    .eq("user_id", state.session.user.id)
    .maybeSingle();

  if (error) {
    state.profileMessage = error.message;
    state.profile = defaultProfile();
    return;
  }

  if (!data) {
    state.profile = defaultProfile();
    const { error: seedError } = await supabaseClient
      .from("profiles")
      .insert(profileToRow(state.profile));
    state.profileMessage = seedError ? seedError.message : "";
    return;
  }

  state.profile = rowToProfile(data);
  state.profileMessage = "";
}

async function saveProfile() {
  if (!supabaseClient || !isSignedIn()) return;

  const { error } = await supabaseClient
    .from("profiles")
    .upsert(profileToRow(state.profile), { onConflict: "user_id" });

  state.profileMessage = error ? error.message : "";
  if (error) render();
}

async function commitProfileChange() {
  render();
  await saveProfile();
}

function resizeImageToBlob(file, maxDimension) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not process image."))),
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image file."));
    };
    img.src = objectUrl;
  });
}

async function handleAvatarFileChange(file) {
  if (!file || !state.profile || !supabaseClient) return;

  if (!file.type.startsWith("image/")) {
    state.profileMessage = "Please choose an image file.";
    render();
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    state.profileMessage = "Image must be smaller than 5MB.";
    render();
    return;
  }

  state.avatarUploading = true;
  state.profileMessage = "";
  render();

  try {
    const blob = await resizeImageToBlob(file, 512);
    const path = `${state.session.user.id}/avatar.jpg`;
    const { error: uploadError } = await supabaseClient.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

    if (uploadError) throw uploadError;

    const { data } = supabaseClient.storage.from("avatars").getPublicUrl(path);
    state.profile.avatarUrl = data.publicUrl;
    await saveProfile();
    // Refetch so profile.updatedAt (the cache-bust key on the <img> src) reflects
    // this upload — saveProfile()'s upsert doesn't return the trigger-set value.
    await loadProfile();
  } catch (error) {
    state.profileMessage = error?.message || "Photo upload failed.";
  }

  state.avatarUploading = false;
  render();
}

async function signOut() {
  if (!supabaseClient) return;

  await supabaseClient.auth.signOut();
  state.session = null;
  state.workouts = [];
  state.profile = null;
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

  const name = state.profile?.displayName || state.session.user.email;
  accountStatus.innerHTML = `
    <div class="account-status__row">
      ${renderAvatar(state.profile, "sm")}
      <p><strong>${escapeHtml(name)}</strong></p>
    </div>
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

  const units = currentUnits();
  const last30 = workoutsInLastDays(30);
  const totalVolume = allTimeVolume();
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
      ${renderMetric("Total volume", displayWeightNumber(totalVolume, units), `${weightUnitLabel(units)} x reps`)}
      ${renderMetric("Current streak", calculateStreak(), "consecutive workout days")}
    </div>

    <div class="grid grid--two" style="margin-top: 1rem;">
      ${renderGoalsCard()}

      <article class="card">
        <h3>Latest Workout</h3>
        <p class="muted">${formatDate(lastWorkout.date)} - ${escapeHtml(lastWorkout.routineName)}</p>
        <div class="workout-card__stats">
          <span class="pill">${completedSets(lastWorkout)} sets</span>
          <span class="pill">${displayWeightNumber(workoutVolume(lastWorkout), units)} volume</span>
          <span class="pill">${lastWorkout.duration || "No"} min</span>
        </div>
        <hr />
        <p class="muted">Average session volume</p>
        <h2>${displayWeightNumber(averageVolume, units)}</h2>
        <p class="muted">Keep the plan boring. Add reps, add weight, or repeat quality work.</p>
      </article>
    </div>

    <div class="grid grid--two" style="margin-top: 1rem;">
      ${renderProgressCard()}
      <article class="card">
        <h3>Focus Exercises</h3>
        <p class="muted">These are the exercises doing most of the physique-building work in this plan.</p>
        <div class="workout-card__stats">
          ${["Incline Bench", "Dumbbell Shoulder Press", "Barbell Row", "Lat Pulldown", "Lateral Raises", "Face Pulls", "Dips", "Squat", "Romanian Deadlift"]
            .map((name) => `<span class="pill">${name}</span>`)
            .join("")}
        </div>
      </article>
    </div>
  `;
}

function goalDeltaCopy(progress) {
  const units = currentUnits();
  const label = weightUnitLabel(units);
  if (progress.state === "none") return "Not logged yet";
  if (progress.state === "reached") return "Reached";
  if (progress.state === "over") return `${displayWeightNumber(progress.delta, units)} ${label} over`;
  return `${displayWeightNumber(Math.abs(progress.delta), units)} ${label} to go`;
}

function renderGoalRow(progress) {
  const units = currentUnits();
  const hasData = progress.current !== null;
  const percent = hasData
    ? Math.min((progress.current / Math.max(progress.target, 1)) * 100, 100)
    : 0;

  return `
    <div class="goal-row goal-row--${progress.state}">
      <div class="goal-row__top">
        <strong>${escapeHtml(progress.name)}</strong>
        <span class="goal-row__weights">
          ${hasData ? displayWeightNumber(progress.current, units) : "--"} &rarr; ${displayWeightNumber(progress.target, units)} ${weightUnitLabel(units)}
        </span>
      </div>
      <div
        class="goal-bar"
        role="img"
        aria-label="${escapeHtml(progress.name)}: ${goalDeltaCopy(progress)}"
      >
        <div class="goal-bar__fill" style="width: ${percent}%"></div>
      </div>
      <div class="goal-row__foot">
        <span class="goal-row__delta">${goalDeltaCopy(progress)}</span>
        <span class="muted">${
          progress.date
            ? `last lifted ${formatDate(progress.date)}`
            : "nothing in your history matches this name"
        }</span>
      </div>
    </div>
  `;
}

function renderGoalsCard() {
  const goals = state.profile?.goals?.length ? state.profile.goals : STRENGTH_GOALS;
  return `
    <article class="card">
      <div class="section-header">
        <div>
          <h3>Goals</h3>
          <p>Your last working weight on each lift, against where you are headed.</p>
        </div>
        <button class="button-secondary" data-action="go-profile">Edit goals</button>
      </div>
      <div class="goal-list">
        ${goals.map((goal) => renderGoalRow(goalProgress(goal))).join("")}
      </div>
    </article>
  `;
}

function renderProgressCard() {
  const units = currentUnits();
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
        ${renderLineChart(sessions.map((session) => ({ label: formatDate(session.date), value: toDisplayWeight(session.bestSet.e1rm, units) })))}
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
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" class="line-chart__axis" stroke-width="2" />
      <polyline points="${pointString}" fill="none" class="line-chart__trend" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      ${points
        .map(
          (point, index) => `
            <circle cx="${point.x}" cy="${point.y}" r="5" class="line-chart__point">
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
  if (!state.routine.length) {
    app.innerHTML = `
      <div class="section-header">
        <div>
          <h2>Log Workout</h2>
          <p>You don't have any workout days yet.</p>
        </div>
        <button class="button" data-action="go-builder">Edit routine</button>
      </div>
      <div class="empty-state">
        <h2>No workout days</h2>
        <p>Add a workout day in the routine editor, then come back here to log it.</p>
        <button class="button" data-action="go-builder">Go to routine editor</button>
      </div>
    `;
    return;
  }

  const units = currentUnits();
  const bodyweightPlaceholder = units === "kg" ? "90" : "198";
  const draft = loadDraft();
  if (draft.routineId && getRoutine(draft.routineId)?.id === draft.routineId) {
    state.selectedRoutineId = draft.routineId;
  }
  const selectedRoutine = getRoutine();
  const dateValue = draft.date || state.formDate;
  const { lastWorkout, byName: lastExerciseLogs } = getLastExerciseLogsForRoutine(selectedRoutine);

  app.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Log Workout</h2>
        <p>Pick the workout day, enter sets and reps for each exercise, and save. Leave an exercise blank to skip it.</p>
      </div>
    </div>

    ${
      lastWorkout
        ? `<p class="last-workout-banner">Last ${escapeHtml(selectedRoutine.day)} session: ${formatDate(lastWorkout.date)}</p>`
        : ""
    }

    <form id="workout-form">
      <div class="card">
        <div class="form-grid">
          <div class="field">
            <label for="workout-date">Date</label>
            <input id="workout-date" name="date" type="date" value="${escapeHtml(dateValue)}" required />
          </div>
          <div class="field">
            <label for="routine-select">Routine</label>
            <select id="routine-select" name="routineId" data-action="select-routine">
              ${renderRoutineSelectOptions(selectedRoutine.id)}
            </select>
          </div>
          <div class="field">
            <label for="duration">Duration min</label>
            <input id="duration" name="duration" type="number" min="1" max="240" placeholder="65" value="${escapeHtml(draft.duration || "")}" />
          </div>
          <div class="field">
            <label for="bodyweight">Bodyweight (${weightUnitLabel(units)})</label>
            <input id="bodyweight" name="bodyweight" type="number" min="1" step="0.1" placeholder="${bodyweightPlaceholder}" value="${escapeHtml(draft.bodyweight || "")}" />
          </div>
          <div class="field field--wide">
            <label for="notes">Notes</label>
            <textarea id="notes" name="notes" placeholder="Energy, sleep, form notes, or what to improve next time">${escapeHtml(draft.notes || "")}</textarea>
          </div>
        </div>
      </div>

      <div class="exercise-list">
        ${selectedRoutine.exercises.map((exercise, index) => renderExerciseInputCard(exercise, index, draft, lastExerciseLogs, Boolean(lastWorkout))).join("")}
      </div>

      <div class="form-actions">
        <p class="form-help">Tip: enter once per exercise. If every set was the same, one row is enough.</p>
        <button class="button" type="submit">Save workout</button>
      </div>
    </form>
  `;
}

function renderExerciseInputCard(exercise, exerciseIndex, draft = {}, lastExerciseLogs = new Map(), hasLastSession = false) {
  const units = currentUnits();
  const weightName = `exercise-${exerciseIndex}-weight`;
  const setsName = `exercise-${exerciseIndex}-sets`;
  const repsName = `exercise-${exerciseIndex}-reps`;
  const lastLog = lastExerciseLogs.get(exercise.name);
  const lastLogMarkup = lastLog
    ? `<p class="exercise-last-log">Last time: ${escapeHtml(lastLog)}</p>`
    : hasLastSession
      ? `<p class="exercise-last-log exercise-last-log--empty">Skipped last time</p>`
      : `<p class="exercise-last-log exercise-last-log--empty">No previous session yet</p>`;

  return `
    <article class="exercise-card" data-exercise-name="${escapeHtml(exercise.name)}">
      <div class="exercise-card__header">
        <div>
          <h3>${escapeHtml(exercise.name)}</h3>
          <p>Target: ${exercise.sets} sets x ${escapeHtml(exercise.reps)} reps</p>
          ${lastLogMarkup}
        </div>
        <span class="pill">${escapeHtml(exercise.group)}</span>
      </div>
      <div class="exercise-log-fields">
        <div class="field">
          <label for="${weightName}">Weight (${weightUnitLabel(units)})</label>
          <input id="${weightName}" name="${weightName}" type="number" min="0" step="0.5" inputmode="decimal" placeholder="${weightUnitLabel(units)}" value="${escapeHtml(draft[weightName] || "")}" />
        </div>
        <div class="field">
          <label for="${setsName}">Sets</label>
          <input id="${setsName}" name="${setsName}" type="number" min="0" max="20" step="1" inputmode="numeric" placeholder="${exercise.sets}" value="${escapeHtml(draft[setsName] || "")}" />
        </div>
        <div class="field">
          <label for="${repsName}">Reps</label>
          <input id="${repsName}" name="${repsName}" type="number" min="0" step="1" inputmode="numeric" placeholder="${escapeHtml(exercise.reps)}" value="${escapeHtml(draft[repsName] || "")}" />
        </div>
      </div>
    </article>
  `;
}

async function saveWorkout(form) {
  const units = currentUnits();
  const formData = new FormData(form);
  const selectedRoutine = getRoutine(formData.get("routineId"));
  if (!selectedRoutine) {
    alert("Add a workout day in the routine editor before logging.");
    return;
  }

  const exercises = selectedRoutine.exercises
    .map((exercise, exerciseIndex) => {
      const setCount = Number(formData.get(`exercise-${exerciseIndex}-sets`) || 0);
      const reps = Number(formData.get(`exercise-${exerciseIndex}-reps`) || 0);
      const weight = fromDisplayWeight(formData.get(`exercise-${exerciseIndex}-weight`), units);

      if (setCount <= 0 && reps <= 0 && weight <= 0) {
        return { name: exercise.name, group: exercise.group, sets: [] };
      }

      if (reps <= 0 && weight <= 0) {
        return { name: exercise.name, group: exercise.group, sets: [] };
      }

      const completedSets = setCount > 0 ? setCount : 1;
      const sets = Array.from({ length: completedSets }, () => ({ weight, reps }));

      return { name: exercise.name, group: exercise.group, sets };
    })
    .filter((exercise) => exercise.sets.length);

  if (!exercises.length) {
    alert("Add at least one exercise with sets or reps before saving.");
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
    bodyweight: fromDisplayWeight(formData.get("bodyweight"), units),
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
  clearDraft();
  saveState();
  render();
}

function renderRoutine() {
  const groups = groupRoutineDays(state.routine);
  const groupedHtml = [...groups.entries()]
    .map(
      ([group, days]) => `
        <section class="routine-split">
          <h3 class="routine-split__title">${escapeHtml(group)}</h3>
          <div class="grid grid--routine">
            ${days.map(renderRoutineDayCard).join("")}
          </div>
        </section>
      `,
    )
    .join("");

  app.innerHTML = `
    <div class="section-header">
      <div>
        <h2>The Routine</h2>
        <p>Chest, Back, Arms, Legs. Customize exercises in the routine editor.</p>
      </div>
      <button class="button" data-action="go-builder">Edit routine</button>
    </div>

    ${
      state.routine.length
        ? groupedHtml
        : `<div class="empty-state"><h2>No workout days yet</h2><p>Build your plan in the routine editor.</p><button class="button" data-action="go-builder">Open routine editor</button></div>`
    }
  `;
}

function renderBuilder() {
  app.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Edit Routine</h2>
        <p>Add workout days, edit exercises, and reorder them. Changes save to your account automatically.</p>
      </div>
      <div class="builder-actions">
        <button class="button" data-action="builder-add-day">Add workout day</button>
        <button class="button-secondary" data-action="builder-reset-default">Reset to default</button>
      </div>
    </div>

    ${state.routineMessage ? renderMessage(state.routineMessage, "error") : ""}

    ${
      state.routine.length
        ? `<div class="builder-days">${state.routine.map(renderBuilderDay).join("")}</div>`
        : `<div class="empty-state"><h2>No workout days</h2><p>Add your first workout day to get started.</p><button class="button" data-action="builder-add-day">Add workout day</button></div>`
    }
  `;
}

function renderBuilderDay(day, dayIndex) {
  const isFirst = dayIndex === 0;
  const isLast = dayIndex === state.routine.length - 1;

  return `
    <article class="card builder-day" data-day-id="${escapeHtml(day.id)}">
      <div class="builder-day__top">
        <div class="builder-day__fields">
          <div class="field">
            <label>Day label</label>
            <input type="text" value="${escapeHtml(day.day)}" placeholder="Chest"
              data-action="builder-day-field" data-day-id="${escapeHtml(day.id)}" data-field="day" />
          </div>
          <div class="field">
            <label>Focus / name</label>
            <input type="text" value="${escapeHtml(day.name)}" placeholder="Chest, Shoulders & Triceps"
              data-action="builder-day-field" data-day-id="${escapeHtml(day.id)}" data-field="name" />
          </div>
          <div class="field">
            <label>Time</label>
            <input type="text" value="${escapeHtml(day.time)}" placeholder="60 min"
              data-action="builder-day-field" data-day-id="${escapeHtml(day.id)}" data-field="time" />
          </div>
        </div>
        <div class="builder-day__controls">
          <span class="pill">${dayTotalSets(day)}</span>
          <button class="icon-button" data-action="builder-move-day" data-day-id="${escapeHtml(day.id)}" data-dir="up" ${isFirst ? "disabled" : ""} title="Move day up">&uarr;</button>
          <button class="icon-button" data-action="builder-move-day" data-day-id="${escapeHtml(day.id)}" data-dir="down" ${isLast ? "disabled" : ""} title="Move day down">&darr;</button>
          <button class="button-danger" data-action="builder-delete-day" data-day-id="${escapeHtml(day.id)}">Delete day</button>
        </div>
      </div>

      ${
        day.exercises.length
          ? `<table class="builder-exercises">
        <thead>
          <tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Group</th><th>Order</th></tr>
        </thead>
        <tbody>
          ${day.exercises.map((exercise, exIndex) => renderBuilderExerciseRow(day, exercise, exIndex)).join("")}
        </tbody>
      </table>`
          : `<p class="muted">No exercises yet. Add one below.</p>`
      }

      <button class="button-secondary" data-action="builder-add-exercise" data-day-id="${escapeHtml(day.id)}">Add exercise</button>
    </article>
  `;
}

function renderBuilderExerciseRow(day, exercise, exIndex) {
  const isFirst = exIndex === 0;
  const isLast = exIndex === day.exercises.length - 1;

  return `
    <tr>
      <td data-label="Exercise"><input type="text" value="${escapeHtml(exercise.name)}" placeholder="Exercise name"
        data-action="builder-exercise-field" data-day-id="${escapeHtml(day.id)}" data-ex-index="${exIndex}" data-field="name" /></td>
      <td data-label="Sets"><input type="number" min="1" max="20" step="1" value="${escapeHtml(exercise.sets)}"
        data-action="builder-exercise-field" data-day-id="${escapeHtml(day.id)}" data-ex-index="${exIndex}" data-field="sets" /></td>
      <td data-label="Reps"><input type="text" value="${escapeHtml(exercise.reps)}" placeholder="8-12"
        data-action="builder-exercise-field" data-day-id="${escapeHtml(day.id)}" data-ex-index="${exIndex}" data-field="reps" /></td>
      <td data-label="Group">
        <select data-action="builder-exercise-field" data-day-id="${escapeHtml(day.id)}" data-ex-index="${exIndex}" data-field="group">
          ${EXERCISE_GROUPS.map((group) => `<option value="${group}" ${group === exercise.group ? "selected" : ""}>${group}</option>`).join("")}
        </select>
      </td>
      <td data-label="Order" class="builder-exercise__controls">
        <button class="icon-button" data-action="builder-move-exercise" data-day-id="${escapeHtml(day.id)}" data-ex-index="${exIndex}" data-dir="up" ${isFirst ? "disabled" : ""} title="Move up">&uarr;</button>
        <button class="icon-button" data-action="builder-move-exercise" data-day-id="${escapeHtml(day.id)}" data-ex-index="${exIndex}" data-dir="down" ${isLast ? "disabled" : ""} title="Move down">&darr;</button>
        <button class="icon-button icon-button--danger" data-action="builder-delete-exercise" data-day-id="${escapeHtml(day.id)}" data-ex-index="${exIndex}" title="Remove exercise">&times;</button>
      </td>
    </tr>
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
  const units = currentUnits();
  const label = weightUnitLabel(units);
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
        <span class="pill">${displayWeightNumber(workoutVolume(workout), units)} volume</span>
        <span class="pill">${workout.duration || "No"} min</span>
        ${workout.bodyweight ? `<span class="pill">${displayWeightNumber(workout.bodyweight, units)} ${label} bodyweight</span>` : ""}
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
                  <td>${displayWeightNumber(bestSet.weight, units)} ${label} x ${bestSet.reps}</td>
                  <td>${displayWeightNumber(volume, units)}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </article>
  `;
}

function renderProfile() {
  const profile = state.profile || defaultProfile();
  const units = currentUnits();
  const unitLabel = weightUnitLabel(units);
  const email = state.session?.user?.email || "";
  const memberSince = state.session?.user?.created_at
    ? formatDate(String(state.session.user.created_at).slice(0, 10))
    : "Unknown";

  app.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Profile</h2>
        <p>Your account, how the app displays weight and theme, and the goals the Dashboard tracks.</p>
      </div>
    </div>

    ${state.profileMessage ? renderMessage(state.profileMessage, "error") : ""}

    <div class="grid grid--two">
      <article class="card">
        <h3>Account</h3>
        <div class="profile-identity">
          ${renderAvatar(profile, "lg")}
          <div class="field field--wide">
            <label for="avatar-file">Profile photo</label>
            <input id="avatar-file" type="file" accept="image/*" data-action="avatar-file-input" ${state.avatarUploading ? "disabled" : ""} />
            <span class="form-help">${state.avatarUploading ? "Uploading..." : "JPG or PNG, up to 5MB."}</span>
          </div>
        </div>
        <div class="form-grid" style="margin-top: 1rem;">
          <div class="field field--wide">
            <label for="profile-display-name">Display name</label>
            <input id="profile-display-name" type="text" placeholder="${escapeHtml(email)}"
              value="${escapeHtml(profile.displayName)}" data-action="profile-field" data-field="displayName" />
          </div>
          <div class="field field--wide">
            <label>Email</label>
            <input type="text" value="${escapeHtml(email)}" disabled />
          </div>
        </div>
      </article>

      <article class="card">
        <h3>Customize</h3>
        <div class="field" style="margin-top: 0.5rem;">
          <label for="profile-units">Units</label>
          <select id="profile-units" data-action="profile-field" data-field="units">
            <option value="lb" ${units === "lb" ? "selected" : ""}>Pounds (lb)</option>
            <option value="kg" ${units === "kg" ? "selected" : ""}>Kilograms (kg)</option>
          </select>
        </div>
        <div class="field" style="margin-top: 0.8rem;">
          <label for="profile-theme">Theme</label>
          <select id="profile-theme" data-action="profile-field" data-field="theme">
            <option value="light" ${profile.theme === "light" ? "selected" : ""}>Light</option>
            <option value="dark" ${profile.theme === "dark" ? "selected" : ""}>Dark</option>
          </select>
        </div>
      </article>
    </div>

    <div class="grid grid--metrics" style="margin-top: 1rem;">
      ${renderMetric("Member since", memberSince, "")}
      ${renderMetric("Total workouts", state.workouts.length, "All time")}
      ${renderMetric("Current streak", calculateStreak(), "consecutive workout days")}
      ${renderMetric("All-time volume", displayWeightNumber(allTimeVolume(), units), `${unitLabel} x reps`)}
    </div>

    <article class="card" style="margin-top: 1rem;">
      <div class="section-header">
        <div>
          <h3>Goals</h3>
          <p>Edit the lifts the Dashboard Goals card tracks. Changes save automatically.</p>
        </div>
        <button class="button-secondary" data-action="profile-add-goal">Add goal</button>
      </div>
      ${
        profile.goals.length
          ? `<table class="builder-exercises">
        <thead>
          <tr><th>Name</th><th>Target (${unitLabel})</th><th></th></tr>
        </thead>
        <tbody>
          ${profile.goals
            .map(
              (goal, index) => `
            <tr>
              <td><input type="text" value="${escapeHtml(goal.name)}" placeholder="Exercise name"
                data-action="profile-goal-field" data-goal-index="${index}" data-field="name" /></td>
              <td><input type="number" min="0" step="1" value="${displayWeightValue(goal.target, units)}"
                data-action="profile-goal-field" data-goal-index="${index}" data-field="target" /></td>
              <td class="builder-exercise__controls">
                <button class="icon-button icon-button--danger" data-action="profile-delete-goal" data-goal-index="${index}" title="Remove goal">&times;</button>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>`
          : `<p class="muted">No goals yet. Add one above.</p>`
      }
    </article>
  `;
}

function render() {
  applyTheme();
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
  if (state.activeTab === "builder") renderBuilder();
  if (state.activeTab === "history") renderHistory();
  if (state.activeTab === "profile") renderProfile();
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

  if (action === "go-builder") {
    setTab("builder");
  }

  if (action === "go-profile") {
    setTab("profile");
  }

  if (action === "builder-add-day") {
    state.routine.push({
      id: generateId(),
      day: "New Day",
      name: "",
      time: "60 min",
      exercises: [],
    });
    await commitRoutineChange();
  }

  if (action === "builder-delete-day") {
    const day = findRoutineDay(actionTarget.dataset.dayId);
    if (!day) return;
    if (!confirm(`Delete "${day.day}" and its exercises?`)) return;
    state.routine = state.routine.filter((item) => item.id !== day.id);
    reconcileSelectedRoutine();
    await commitRoutineChange();
  }

  if (action === "builder-move-day") {
    const index = state.routine.findIndex((item) => item.id === actionTarget.dataset.dayId);
    if (index === -1) return;
    if (moveArrayItem(state.routine, index, actionTarget.dataset.dir)) {
      await commitRoutineChange();
    }
  }

  if (action === "builder-add-exercise") {
    const day = findRoutineDay(actionTarget.dataset.dayId);
    if (!day) return;
    day.exercises.push({ name: "New Exercise", sets: 3, reps: "8-12", group: "Other" });
    await commitRoutineChange();
  }

  if (action === "builder-delete-exercise") {
    const day = findRoutineDay(actionTarget.dataset.dayId);
    if (!day) return;
    const exIndex = Number(actionTarget.dataset.exIndex);
    day.exercises.splice(exIndex, 1);
    await commitRoutineChange();
  }

  if (action === "builder-move-exercise") {
    const day = findRoutineDay(actionTarget.dataset.dayId);
    if (!day) return;
    const exIndex = Number(actionTarget.dataset.exIndex);
    if (moveArrayItem(day.exercises, exIndex, actionTarget.dataset.dir)) {
      await commitRoutineChange();
    }
  }

  if (action === "builder-reset-default") {
    if (!confirm("Reset your routine back to the default Chest/Back/Arms/Legs plan? This replaces your current days.")) return;
    state.routine = cloneDefaultRoutine();
    reconcileSelectedRoutine();
    await commitRoutineChange();
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

  if (action === "profile-add-goal") {
    state.profile.goals.push({ name: "New Goal", target: 0 });
    await commitProfileChange();
  }

  if (action === "profile-delete-goal") {
    const index = Number(actionTarget.dataset.goalIndex);
    state.profile.goals.splice(index, 1);
    await commitProfileChange();
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;

  if (target.matches("[data-action='select-routine']")) {
    saveDraftFromForm(getWorkoutForm());
    clearExerciseDraftFields();
    state.selectedRoutineId = target.value;
    saveState();
    renderLog();
  }

  if (target.matches("[data-action='select-progress-exercise']")) {
    state.selectedExercise = target.value;
    saveState();
    render();
  }

  if (target.matches("[data-action='builder-day-field']")) {
    const day = findRoutineDay(target.dataset.dayId);
    if (!day) return;
    day[target.dataset.field] = target.value;
    saveRoutine();
  }

  if (target.matches("[data-action='builder-exercise-field']")) {
    const day = findRoutineDay(target.dataset.dayId);
    if (!day) return;
    const exercise = day.exercises[Number(target.dataset.exIndex)];
    if (!exercise) return;
    const field = target.dataset.field;
    if (field === "sets") {
      const value = Math.max(1, Math.min(20, Math.round(Number(target.value) || 1)));
      exercise.sets = value;
      target.value = value;
    } else {
      exercise[field] = target.value;
    }
    saveRoutine();
  }

  if (target.matches("[data-action='profile-field']")) {
    if (!state.profile) return;
    const field = target.dataset.field;
    if (field === "displayName") {
      state.profile.displayName = target.value;
    } else if (field === "units") {
      state.profile.units = target.value === "kg" ? "kg" : "lb";
    } else if (field === "theme") {
      state.profile.theme = target.value === "dark" ? "dark" : "light";
      saveState();
    }
    commitProfileChange();
  }

  if (target.matches("[data-action='profile-goal-field']")) {
    if (!state.profile) return;
    const goal = state.profile.goals[Number(target.dataset.goalIndex)];
    if (!goal) return;
    const field = target.dataset.field;
    if (field === "target") {
      goal.target = fromDisplayWeight(target.value, currentUnits());
    } else {
      goal.name = target.value;
    }
    commitProfileChange();
  }

  if (target.matches("[data-action='avatar-file-input']")) {
    handleAvatarFileChange(target.files[0]);
  }
});

document.addEventListener("input", (event) => {
  const form = event.target.closest?.("#workout-form");
  if (form) saveDraftFromForm(form);
});

function persistDraftOnHide() {
  saveDraftFromForm(getWorkoutForm());
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persistDraftOnHide();
});
window.addEventListener("pagehide", persistDraftOnHide);

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
    state.profile = null;

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
