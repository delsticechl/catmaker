const STORAGE_KEY = "catMakerOutfits.v1";
const SOUND_KEY = "catMakerSound";

const inventory = {
  clothes: [
    { id: "c0", name: "None", image: "" },
    { id: "c1", name: "Lone Wolf Fit", image: "assets/clothes1.png" },
    { id: "c2", name: "Zip Zeep Zip", image: "assets/clothes2.png" },
    { id: "c3", name: "Bussinessman Suit", image: "assets/clothes3.png" }
  ],
  accessories: [
    { id: "a0", name: "None", image: "" },
    { id: "a1", name: "Secret Agent Hat", image: "assets/acc1.png" },
    { id: "a2", name: "Cherry Warmies", image: "assets/acc2.png" },
    { id: "a3", name: "Banana", image: "assets/acc3.png" }
  ],
  expression: [
    { id: "e0", name: "None", image: "" },
    { id: "e1", name: "Happy", image: "assets/exp1.png" },
    { id: "e2", name: "Wink", image: "assets/exp2.png" }
  ],
  skin: [
    { id: "s1", name: "White", image: "assets/skin1.png" },
    { id: "s2", name: "Gray", image: "assets/skin2.png" },
    { id: "s3", name: "Hachiware", image: "assets/skin3.png" },
    { id: "s4", name: "Cheese Dippeds", image: "assets/skin4.png" },
    { id: "s5", name: "Calico", image: "assets/skin5.png" }
  ],
  background: [
    { id: "b0", name: "None", image: "" },
    { id: "b1", name: "Room", image: "assets/bg1.png" },
    { id: "b2", name: "Park", image: "assets/bg2.png" }
  ]
};

const defaultOutfit = {
  clothes: "",
  accessories: "",
  expression: "",
  skin: "assets/skin1.png",
  background: ""
};

let currentCategory = "clothes";
let equipped = { ...defaultOutfit };
let soundOn = localStorage.getItem(SOUND_KEY) !== "off";
let audioCtx = null;
let modalMode = "save";

const toastEl = document.getElementById("toast");
const modalEl = document.getElementById("modal");
const nameInput = document.getElementById("outfit-name");
const soundToggle = document.getElementById("sound-toggle");

function getAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, duration, type = "sine", gainValue = 0.05) {
  if (!soundOn) return;
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    /* ignore autoplay restrictions */
  }
}

function sounds() {
  return {
    tap: () => playTone(520, 0.08, "triangle", 0.04),
    equip: () => {
      playTone(420, 0.09, "sine", 0.04);
      setTimeout(() => playTone(640, 0.1, "sine", 0.035), 70);
    },
    save: () => {
      playTone(523, 0.1, "sine", 0.05);
      setTimeout(() => playTone(659, 0.12, "sine", 0.045), 90);
    },
    export: () => playTone(740, 0.16, "triangle", 0.045),
    reset: () => playTone(220, 0.18, "sawtooth", 0.03),
    error: () => playTone(180, 0.16, "square", 0.03)
  };
}

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function updateSoundButton() {
  soundToggle.textContent = soundOn ? "🔊" : "🔇";
  soundToggle.setAttribute("aria-pressed", String(soundOn));
  soundToggle.title = soundOn ? "Sound on" : "Sound off";
}

function applyLayer(category, imagePath, animate = true) {
  const layer = document.getElementById(`layer-${category}`);
  if (!layer) return;

  layer.classList.remove("pop");
  if (imagePath) {
    layer.src = imagePath;
    layer.classList.add("visible");
  } else {
    layer.removeAttribute("src");
    layer.classList.remove("visible");
  }

  if (animate && imagePath) {
    void layer.offsetWidth;
    layer.classList.add("pop");
  }
}

function applyOutfit(outfit, animate = true) {
  equipped = { ...defaultOutfit, ...outfit };
  Object.keys(defaultOutfit).forEach((category) => {
    applyLayer(category, equipped[category], animate);
  });
  renderItems();
}

function selectCategory(category) {
  currentCategory = category;
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === category);
  });
  renderItems();
}

function renderItems() {
  const grid = document.getElementById("item-grid");
  grid.innerHTML = "";
  const items = inventory[currentCategory] || [];

  items.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "item-card";
    if ((equipped[currentCategory] || "") === item.image) {
      card.classList.add("equipped");
    }

    if (item.image) {
      card.innerHTML = `<img class="thumb" src="${item.image}" alt="" /><span>${item.name}</span>`;
    } else {
      card.innerHTML = `<div class="thumb empty">∅</div><span>${item.name}</span>`;
    }

    card.addEventListener("click", () => {
      sounds().equip();
      equipped[currentCategory] = item.image;
      applyLayer(currentCategory, item.image);
      renderItems();
    });

    grid.appendChild(card);
  });
}

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistSaved(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  renderSaved();
}

function renderSaved() {
  const list = loadSaved();
  const wrap = document.getElementById("saved-list");
  document.getElementById("saved-count").textContent = String(list.length);

  if (!list.length) {
    wrap.innerHTML = `<p class="empty-saved">No saved looks yet. Mix an outfit and tap Save.</p>`;
    return;
  }

  wrap.innerHTML = "";
  list.forEach((outfit) => {
    const row = document.createElement("div");
    row.className = "saved-card";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(outfit.name)}</strong>
        <small>${new Date(outfit.createdAt).toLocaleDateString()}</small>
      </div>
      <div class="saved-actions">
        <button type="button" data-load="${outfit.id}" title="Load" aria-label="Load ${escapeHtml(outfit.name)}">▶</button>
        <button type="button" data-delete="${outfit.id}" title="Delete" aria-label="Delete ${escapeHtml(outfit.name)}">✕</button>
      </div>
    `;
    wrap.appendChild(row);
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function openModal(mode) {
  modalMode = mode;
  modalEl.hidden = false;
  modalEl.setAttribute("aria-hidden", "false");
  const title = document.getElementById("modal-title");
  const copy = document.getElementById("modal-copy");
  const confirm = document.getElementById("modal-confirm");

  if (mode === "save") {
    title.textContent = "Save outfit";
    copy.textContent = "Give this look a name so you can load it later.";
    nameInput.hidden = false;
    nameInput.value = "";
    confirm.textContent = "Save";
    confirm.classList.add("primary");
    setTimeout(() => nameInput.focus(), 50);
  } else {
    title.textContent = "Reset outfit?";
    copy.textContent = "This clears clothes, extras, and background. Saved looks stay in the list.";
    nameInput.hidden = true;
    confirm.textContent = "Reset";
    confirm.classList.add("primary");
  }
}

function closeModal() {
  modalEl.hidden = true;
  modalEl.setAttribute("aria-hidden", "true");
}

function saveOutfit(name) {
  const trimmed = name.trim();
  if (!trimmed) {
    sounds().error();
    toast("Add a name first");
    return false;
  }

  const list = loadSaved();
  list.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: trimmed,
    createdAt: Date.now(),
    items: { ...equipped }
  });
  persistSaved(list);
  sounds().save();
  toast("Outfit saved");
  return true;
}

function loadOutfit(id) {
  const outfit = loadSaved().find((item) => item.id === id);
  if (!outfit) return;
  applyOutfit(outfit.items);
  sounds().equip();
  toast(`Loaded “${outfit.name}”`);
}

function deleteOutfit(id) {
  persistSaved(loadSaved().filter((item) => item.id !== id));
  sounds().tap();
  toast("Look removed");
}

function resetOutfit() {
  applyOutfit(defaultOutfit);
  sounds().reset();
  toast("Outfit cleared");
}

function waitForImage(img) {
  return new Promise((resolve) => {
    if (!img.classList.contains("visible") || !img.src) {
      resolve(null);
      return;
    }
    if (img.complete && img.naturalWidth) {
      resolve(img);
      return;
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
}

async function exportImage() {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff8f1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const order = ["background", "skin", "expression", "clothes", "accessories"];
  for (const category of order) {
    const img = document.getElementById(`layer-${category}`);
    const ready = await waitForImage(img);
    if (ready) {
      ctx.drawImage(ready, 0, 0, canvas.width, canvas.height);
    }
  }

  const link = document.createElement("a");
  link.download = `cat-maker-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  sounds().export();
  toast("Image downloaded");
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    sounds().tap();
    selectCategory(btn.dataset.category);
  });
});

document.getElementById("btn-save").addEventListener("click", () => {
  sounds().tap();
  openModal("save");
});

document.getElementById("btn-export").addEventListener("click", () => {
  exportImage().catch(() => {
    sounds().error();
    toast("Could not export image");
  });
});

document.getElementById("btn-reset").addEventListener("click", () => {
  sounds().tap();
  openModal("reset");
});

document.getElementById("modal-cancel").addEventListener("click", closeModal);
document.getElementById("modal-confirm").addEventListener("click", () => {
  if (modalMode === "save") {
    if (saveOutfit(nameInput.value)) closeModal();
  } else {
    resetOutfit();
    closeModal();
  }
});

modalEl.addEventListener("click", (event) => {
  if (event.target === modalEl) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalEl.hidden) closeModal();
});

nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    if (saveOutfit(nameInput.value)) closeModal();
  }
});

document.getElementById("saved-list").addEventListener("click", (event) => {
  const loadId = event.target.dataset.load;
  const deleteId = event.target.dataset.delete;
  if (loadId) loadOutfit(loadId);
  if (deleteId) deleteOutfit(deleteId);
});

soundToggle.addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
  updateSoundButton();
  sounds().tap();
});

let touchStartX = 0;
const tabs = [...document.querySelectorAll(".tab-btn")];
const stage = document.getElementById("stage");

stage.addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].screenX;
}, { passive: true });

stage.addEventListener("touchend", (event) => {
  const dx = event.changedTouches[0].screenX - touchStartX;
  if (Math.abs(dx) < 50) return;
  const index = tabs.findIndex((tab) => tab.dataset.category === currentCategory);
  const next = dx < 0 ? tabs[index + 1] : tabs[index - 1];
  if (!next) return;
  sounds().tap();
  selectCategory(next.dataset.category);
  next.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}, { passive: true });

updateSoundButton();
applyOutfit(defaultOutfit, false);
renderSaved();
