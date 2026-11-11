(() => {
  "use strict";

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const money = (n) =>
    new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(n);
  const num = (n) => new Intl.NumberFormat("ro-RO").format(Math.round(n));
  const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  const store = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    },
  };

  let toastTimer;
  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }


  const DEFAULT_SETTINGS = { name: "Alex", accent: "#5b5bf0", theme: "auto", status: "online" };

  const state = {
    settings: { ...DEFAULT_SETTINGS, ...store.get("nova-settings", {}) },
    tasks: store.get("nova-tasks", Data.defaultTasks),
    notifications: Data.notifications.map((n) => ({ ...n })),
    orders: Data.orderRows.map((o) => ({ ...o })),
    range: 30,
    hover: -1,
    query: "",
    status: "all",
    sort: { key: "id", dir: -1 },
    page: 1,
    taskFilter: "all",
  };

  const saveSettings = () => store.set("nova-settings", state.settings);
  const saveTasks = () => store.set("nova-tasks", state.tasks);


  function isDark() {
    const theme = root.getAttribute("data-theme");
    return theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function applyTheme() {
    const { theme, accent, name } = state.settings;

    if (theme === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);

    root.style.setProperty("--accent", accent);
    $("#themeIcon use").setAttribute("href", isDark() ? "#i-sun" : "#i-moon");

    const initials = name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    $("#avatar").textContent = initials || "?";
    $("#hello").textContent = `Bună, ${name.trim() || "utilizator"}!`;

    $("#avatar2").textContent = initials || "?";
    $("#menuName").textContent = name.trim() || "Utilizator";
    $("#statusDot").className = "status " + state.settings.status;
    $$("[data-status]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.status === state.settings.status));
    $("#pmThemeText").textContent = isDark() ? "Temă luminoasă" : "Temă întunecată";
    $("#pmThemeIcon use").setAttribute("href", isDark() ? "#i-sun" : "#i-moon");

    $$(".swatch").forEach((s) => s.setAttribute("aria-pressed", s.dataset.color === accent));
    $("#themeSelect").value = theme;
    drawChart();
  }

  $("#themeBtn").addEventListener("click", () => {
    state.settings.theme = isDark() ? "light" : "dark";
    saveSettings();
    applyTheme();
  });

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);


  const VIEWS = ["overview", "orders", "tasks", "settings"];
  const sidebar = $("#sidebar");
  const overlay = $("#overlay");

  function openSidebar(open) {
    sidebar.classList.toggle("open", open);
    overlay.hidden = !open;
  }

  let currentView = null;
  let switchToken = 0;

  function moveIndicator() {
    const active = $('.nav-link[aria-current="page"]');
    const indicator = $("#navInd");
    if (!active || !indicator) return;
    indicator.style.width = active.offsetWidth + "px";
    indicator.style.transform = `translateY(${active.offsetTop}px)`;
  }

  function showView(name) {
    if (!VIEWS.includes(name)) name = "overview";

    const token = ++switchToken;
    const next = $(`#view-${name}`);
    const prev = currentView && currentView !== next ? currentView : null;

    $$(".nav-link").forEach((l) => {
      if (l.dataset.view === name) l.setAttribute("aria-current", "page");
      else l.removeAttribute("aria-current");
    });
    moveIndicator();
    openSidebar(false);

    const reveal = () => {
      if (token !== switchToken) return;
      $$(".view").forEach((v) => {
        v.hidden = v !== next;
        v.classList.remove("leaving");
      });
      currentView = next;
      window.scrollTo(0, 0);

      if (name === "overview") {
        renderStats();
        drawChart();
        renderSources();
      }
    };

    if (prev && !reduceMotion) {
      const bar = $("#nprog");
      bar.classList.remove("run");
      void bar.offsetWidth;
      bar.classList.add("run");
      prev.classList.add("leaving");
      setTimeout(reveal, 160);
    } else {
      reveal();
    }
  }

  function goTo(name) {
    if (location.hash.slice(1) === name) showView(name);
    else location.hash = name;
  }

  $$(".nav-link").forEach((link) =>
    link.addEventListener("click", () => {
      if (location.hash.slice(1) === link.dataset.view) showView(link.dataset.view);
      else location.hash = link.dataset.view;
    })
  );

  addEventListener("hashchange", () => showView(location.hash.slice(1)));
  $("#menuBtn").addEventListener("click", () => openSidebar(true));
  overlay.addEventListener("click", () => openSidebar(false));

  function toggleCollapse() {
    const collapsed = $("#app").classList.toggle("collapsed");
    store.set("nova-collapsed", collapsed);
    setTimeout(() => {
      drawChart();
      moveIndicator();
    }, 300);
  }

  $("#collapseBtn").addEventListener("click", toggleCollapse);

  if (store.get("nova-collapsed", false)) $("#app").classList.add("collapsed");


  const sumRange = (series, from, to) => series.slice(from, to).reduce((a, b) => a + b, 0);

  function totals(series, n) {
    const len = series.length;
    return { cur: sumRange(series, len - n), prev: sumRange(series, len - 2 * n, len - n) };
  }

  function metrics(n) {
    const rev = totals(Data.revenue, n);
    const ord = totals(Data.orders, n);
    const vis = totals(Data.visitors, n);

    return [
      { label: "Venituri", icon: "wallet", cur: rev.cur, prev: rev.prev, fmt: money },
      { label: "Comenzi", icon: "bag", cur: ord.cur, prev: ord.prev, fmt: num },
      { label: "Vizitatori", icon: "users", cur: vis.cur, prev: vis.prev, fmt: num },
      {
        label: "Conversie",
        icon: "target",
        cur: (ord.cur / vis.cur) * 100,
        prev: (ord.prev / vis.prev) * 100,
        fmt: (v) => v.toFixed(2).replace(".", ",") + "%",
      },
    ];
  }

  function countUp(el, to, fmt) {
    if (reduceMotion) {
      el.textContent = fmt(to);
      return;
    }
    const start = performance.now();
    const duration = 800;

    (function step(now) {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = fmt(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

  function renderStats() {
    const list = metrics(state.range);

    $("#stats").innerHTML = list
      .map((m) => {
        const change = ((m.cur - m.prev) / m.prev) * 100;
        const up = change >= 0;
        return `
          <article class="card">
            <div class="stat-top">
              <span>${m.label}</span>
              <span class="stat-icon"><svg class="icon"><use href="#i-${m.icon}"></use></svg></span>
            </div>
            <div class="stat-value">0</div>
            <span class="trend ${up ? "up" : "down"}">${up ? "▲" : "▼"} ${Math.abs(change).toFixed(1).replace(".", ",")}%
              <span style="color:var(--muted);font-weight:500"> față de perioada anterioară</span></span>
          </article>`;
      })
      .join("");

    $$(".stat-value").forEach((el, i) => countUp(el, list[i].cur, list[i].fmt));
  }

  function drawChart() {
    const canvas = $("#chart");
    if (!canvas || $("#view-overview").hidden) return;

    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    const pad = { l: 46, r: 10, t: 10, b: 28 };
    const data = Data.revenue.slice(-state.range);
    const max = Math.max(...data) * 1.12;
    const accent = cssVar("--accent");
    const border = cssVar("--border");
    const muted = cssVar("--muted");

    const points = data.map((v, i) => ({
      x: pad.l + ((w - pad.l - pad.r) * i) / (data.length - 1),
      y: pad.t + (h - pad.t - pad.b) * (1 - v / max),
    }));
    canvas._points = points;

    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = muted;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = pad.t + ((h - pad.t - pad.b) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(Math.round((max * (1 - i / 4)) / 1000) + "k", pad.l - 8, y + 4);
    }

    [0, Math.floor((data.length - 1) / 2), data.length - 1].forEach((i, k) => {
      const date = new Date(Date.now() - (data.length - 1 - i) * 864e5);
      ctx.textAlign = k === 0 ? "left" : k === 2 ? "right" : "center";
      ctx.fillText(date.toLocaleDateString("ro-RO", { day: "numeric", month: "short" }), points[i].x, h - 8);
    });

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const mx = (points[i - 1].x + points[i].x) / 2;
      const my = (points[i - 1].y + points[i].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, mx, my);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.lineTo(points[points.length - 1].x, h - pad.b);
    ctx.lineTo(points[0].x, h - pad.b);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
    gradient.addColorStop(0, accent + "55");
    gradient.addColorStop(1, accent + "00");
    ctx.fillStyle = gradient;
    ctx.fill();

    const tip = $("#tip");
    if (state.hover >= 0 && points[state.hover]) {
      const p = points[state.hover];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = cssVar("--surface");
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.stroke();

      const date = new Date(Date.now() - (data.length - 1 - state.hover) * 864e5);
      tip.hidden = false;
      tip.style.left = p.x + "px";
      tip.style.top = p.y + "px";
      tip.textContent = `${date.toLocaleDateString("ro-RO", { day: "numeric", month: "short" })}: ${money(data[state.hover])}`;
    } else {
      tip.hidden = true;
    }
  }

  $("#chart").addEventListener("pointermove", (e) => {
    const points = e.target._points;
    if (!points) return;
    const x = e.clientX - e.target.getBoundingClientRect().left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(points[best].x - x)) best = i;
    });
    state.hover = best;
    drawChart();
  });

  $("#chart").addEventListener("pointerleave", () => {
    state.hover = -1;
    drawChart();
  });

  $$("[data-range]").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.range = +btn.dataset.range;
      $$("[data-range]").forEach((b) => b.setAttribute("aria-pressed", b === btn));
      renderStats();
      drawChart();
    })
  );

  function renderSources() {
    $("#sources").innerHTML = Data.sources
      .map(([label, pct]) => `
        <div class="bar-row">
          <div class="bar-label"><span>${label}</span><b>${pct}%</b></div>
          <div class="bar-track"><div class="bar-fill" data-w="${pct}"></div></div>
        </div>`)
      .join("");

    requestAnimationFrame(() => $$(".bar-fill").forEach((b) => (b.style.width = b.dataset.w + "%")));
  }

  $("#feed").innerHTML = Data.activity
    .map(([text, time]) => `<li><span>${text}</span><small>${time}</small></li>`)
    .join("");

  addEventListener("resize", () =>
    requestAnimationFrame(() => {
      drawChart();
      moveIndicator();
    })
  );


  const PER_PAGE = 8;
  const COLUMNS = [
    ["id", "ID"], ["client", "Client"], ["product", "Produs"],
    ["amount", "Sumă"], ["date", "Dată"], ["status", "Status"],
  ];
  const STATUS_CLASS = { "Livrată": "ok", "În procesare": "wait", "Anulată": "bad" };

  function filteredOrders() {
    const q = state.query.trim().toLowerCase();
    const { key, dir } = state.sort;

    return state.orders
      .filter((o) => state.status === "all" || o.status === state.status)
      .filter((o) => !q || `${o.id} ${o.client} ${o.product}`.toLowerCase().includes(q))
      .sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * dir);
  }

  function renderOrders() {
    const rows = filteredOrders();
    const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    state.page = Math.min(state.page, pages);
    const slice = rows.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);

    $("#thr").innerHTML = COLUMNS.map(([key, label]) => {
      const sort = state.sort.key === key ? (state.sort.dir === 1 ? "ascending" : "descending") : "none";
      return `<th aria-sort="${sort}"><button type="button" data-sort="${key}">${label}</button></th>`;
    }).join("");

    $("#tbody").innerHTML = slice.length
      ? slice.map((o) => `
          <tr>
            <td>#${o.id}</td>
            <td>${o.client}</td>
            <td>${o.product}</td>
            <td>${money(o.amount)}</td>
            <td>${o.date.toLocaleDateString("ro-RO")}</td>
            <td><button class="badge ${STATUS_CLASS[o.status]}" type="button" data-id="${o.id}" title="Click pentru a schimba statusul">${o.status}</button></td>
          </tr>`).join("")
      : `<tr><td colspan="6" style="text-align:center;color:var(--muted)">Nicio comandă găsită.</td></tr>`;

    $("#pageInfo").textContent = `${rows.length} comenzi · pagina ${state.page} din ${pages}`;
    $("#prev").disabled = state.page <= 1;
    $("#next").disabled = state.page >= pages;
  }

  function setQuery(value) {
    state.query = value;
    $("#search").value = value;
    $("#q").value = value;
    state.page = 1;
    renderOrders();
  }

  $("#search").addEventListener("input", (e) => {
    setQuery(e.target.value);
    if (e.target.value && location.hash !== "#orders") location.hash = "orders";
  });

  $("#q").addEventListener("input", (e) => setQuery(e.target.value));

  $("#statusFilter").addEventListener("change", (e) => {
    state.status = e.target.value;
    state.page = 1;
    renderOrders();
  });

  $("#thr").addEventListener("click", (e) => {
    const key = e.target.dataset.sort;
    if (!key) return;
    state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : 1 };
    renderOrders();
  });

  $("#tbody").addEventListener("click", (e) => {
    const id = +e.target.dataset.id;
    if (!id) return;
    const order = state.orders.find((o) => o.id === id);
    order.status = Data.statuses[(Data.statuses.indexOf(order.status) + 1) % Data.statuses.length];
    renderOrders();
    toast(`Comanda #${id}: ${order.status}`);
  });

  $("#prev").addEventListener("click", () => { state.page--; renderOrders(); });
  $("#next").addEventListener("click", () => { state.page++; renderOrders(); });

  $("#exportBtn").addEventListener("click", () => {
    const rows = filteredOrders();
    const lines = [["ID", "Client", "Produs", "Suma (lei)", "Data", "Status"]].concat(
      rows.map((o) => [o.id, o.client, o.product, o.amount, o.date.toLocaleDateString("ro-RO"), o.status])
    );
    const csv = "\ufeff" + lines.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");

    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "comenzi.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    toast(`Exportate ${rows.length} comenzi`);
  });


  function renderTasks() {
    const list = $("#tasks");
    const shown = state.tasks.filter((t) =>
      state.taskFilter === "all" ? true : state.taskFilter === "done" ? t.done : !t.done
    );

    list.innerHTML = "";

    shown.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task" + (task.done ? " done" : "");

      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = task.done;
      check.setAttribute("aria-label", "Marchează ca terminată");
      check.addEventListener("change", () => {
        task.done = check.checked;
        saveTasks();
        renderTasks();
      });

      const text = document.createElement("span");
      text.textContent = task.text;

      const prio = document.createElement("span");
      prio.className = "prio" + (task.prio === "high" ? " high" : "");
      prio.textContent = task.prio === "high" ? "Urgent" : "Normal";

      const del = document.createElement("button");
      del.className = "icon-btn";
      del.setAttribute("aria-label", "Șterge sarcina");
      del.innerHTML = '<svg class="icon"><use href="#i-trash"></use></svg>';
      del.addEventListener("click", () => {
        state.tasks = state.tasks.filter((t) => t.id !== task.id);
        saveTasks();
        renderTasks();
      });

      li.append(check, text, prio, del);
      list.append(li);
    });

    const open = state.tasks.filter((t) => !t.done).length;
    $("#taskCount").textContent = shown.length
      ? `${open} active din ${state.tasks.length} sarcini`
      : "Nu ai nicio sarcină aici.";
  }

  $("#taskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#taskText");
    const text = input.value.trim();
    if (!text) return;

    state.tasks.unshift({ id: Date.now(), text, done: false, prio: $("#taskPrio").value });
    saveTasks();
    input.value = "";
    renderTasks();
  });

  $$("[data-filter]").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.taskFilter = btn.dataset.filter;
      $$("[data-filter]").forEach((b) => b.setAttribute("aria-pressed", b === btn));
      renderTasks();
    })
  );


  $("#nameInput").value = state.settings.name;
  $("#nameInput").addEventListener("input", (e) => {
    state.settings.name = e.target.value;
    saveSettings();
    applyTheme();
  });

  $$(".swatch").forEach((swatch) => {
    swatch.style.background = swatch.dataset.color;
    swatch.addEventListener("click", () => {
      state.settings.accent = swatch.dataset.color;
      saveSettings();
      applyTheme();
    });
  });

  $("#themeSelect").addEventListener("change", (e) => {
    state.settings.theme = e.target.value;
    saveSettings();
    applyTheme();
  });

  $("#resetBtn").addEventListener("click", () => {
    store.remove("nova-settings");
    store.remove("nova-tasks");
    store.remove("nova-collapsed");
    location.reload();
  });

  const bell = $("#bellBtn");
  const panel = $("#notifPanel");

  function renderNotifications() {
    const unread = state.notifications.filter((n) => n.unread).length;
    const badge = $("#bellDot");
    badge.hidden = unread === 0;
    badge.textContent = unread;

    $("#notifList").innerHTML = state.notifications
      .map((n) => `<div class="notif ${n.unread ? "unread" : ""}"><div>${n.text}<small>${n.time}</small></div></div>`)
      .join("");
  }

  bell.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleProfile(false);
    panel.hidden = !panel.hidden;
  });

  $("#markRead").addEventListener("click", () => {
    state.notifications.forEach((n) => (n.unread = false));
    renderNotifications();
  });

  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target)) panel.hidden = true;
    if (!profile.contains(e.target) && !avatarBtn.contains(e.target)) toggleProfile(false);
  });

  const avatarBtn = $("#avatarBtn");
  const profile = $("#profileMenu");

  function toggleProfile(open) {
    profile.hidden = !open;
    avatarBtn.setAttribute("aria-expanded", open);
    if (open) {
      panel.hidden = true;
      $(".pm-item", profile).focus();
    }
  }

  avatarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleProfile(profile.hidden);
  });

  $$("[data-go]", profile).forEach((item) =>
    item.addEventListener("click", () => {
      toggleProfile(false);
      goTo(item.dataset.go);
    })
  );

  $$("[data-status]", profile).forEach((btn) =>
    btn.addEventListener("click", () => {
      state.settings.status = btn.dataset.status;
      saveSettings();
      applyTheme();
      toast("Status: " + btn.textContent.trim());
    })
  );

  $("#pmTheme").addEventListener("click", () => $("#themeBtn").click());

  $("#pmCollapse").addEventListener("click", () => {
    toggleProfile(false);
    toggleCollapse();
  });

  $("#pmLogout").addEventListener("click", () => {
    toggleProfile(false);
    toast("Aceasta este o demonstrație, nu există un cont real.");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!profile.hidden) {
      toggleProfile(false);
      avatarBtn.focus();
    }
    panel.hidden = true;
  });


  $("#today").textContent = new Date().toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" });
  renderNotifications();
  renderOrders();
  renderTasks();
  applyTheme();
  showView(location.hash.slice(1));
})();