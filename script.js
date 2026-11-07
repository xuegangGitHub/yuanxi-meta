/* ============================================
   元析 Meta · 页面交互
   内容库筛选 / 折叠 / 滚动动效
   ============================================ */

/* ---------- 内容库筛选 ----------
   卡片已静态写在 index.html 中，
   这里只负责显示与隐藏，便于搜索引擎抓取。
------------------------------------ */
const grid = document.getElementById("videoGrid");
const tabs = document.querySelectorAll(".tab");
const cards = grid ? [...grid.querySelectorAll(".video-card")] : [];

function applyFilter(filter) {
  cards.forEach((card) => {
    const show = filter === "all" || card.dataset.type === filter;
    card.classList.toggle("is-hidden", !show);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => {
      t.classList.remove("is-active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("is-active");
    tab.setAttribute("aria-selected", "true");
    applyFilter(tab.dataset.filter);
  });
});

/* 更新筛选按钮上的数量（从 DOM 计算） */
tabs.forEach((tab) => {
  const filter = tab.dataset.filter;
  const count =
    filter === "all" ? cards.length : cards.filter((card) => card.dataset.type === filter).length;
  const node = tab.querySelector(".tab-count");
  if (node) node.textContent = count;
});

/* ---------- 折叠面板：同时只展开一项 ---------- */
const accordions = document.querySelectorAll(".acc");

accordions.forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    accordions.forEach((other) => {
      if (other !== item) other.open = false;
    });
  });
});

/* ---------- 滚动显现 ---------- */
const revealEls = document.querySelectorAll(".reveal");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduceMotion && "IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  revealEls.forEach((el) => revealObserver.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

/* ---------- 导航高亮 ---------- */
const navLinks = document.querySelectorAll(".nav a");
const sections = [...navLinks]
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle(
            "is-active",
            link.getAttribute("href") === `#${entry.target.id}`
          );
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );

  sections.forEach((section) => navObserver.observe(section));
}

/* ---------- 顶栏滚动状态 ---------- */
const header = document.getElementById("siteHeader");

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 8);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

/* ---------- 复制固定免责声明 ---------- */
const copyBtn = document.getElementById("copyDisclaimer");
const disclaimerText =
  "本内容仅为医学科研统计方法教学，仅供科研学习参考，不构成临床诊疗、投稿录用承诺。";

if (copyBtn) {
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(disclaimerText);
    } catch (err) {
      const helper = document.createElement("textarea");
      helper.value = disclaimerText;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    const original = copyBtn.textContent;
    copyBtn.textContent = "已复制";
    setTimeout(() => {
      copyBtn.textContent = original;
    }, 1600);
  });
}

/* ---------- 拍摄脚本生成 ---------- */
const scriptForm = document.getElementById("scriptForm");
const scriptTier = document.getElementById("scriptTier");
const scriptTopic = document.getElementById("scriptTopic");
const scriptPoints = document.getElementById("scriptPoints");
const shotList = document.getElementById("shotList");
const scriptExtra = document.getElementById("scriptExtra");
const scriptTitle = document.getElementById("scriptTitle");
const scriptMeta = document.getElementById("scriptMeta");
const copyScriptBtn = document.getElementById("copyScript");

const SCRIPT_TIERS = {
  short: {
    label: "短视频",
    length: "约 3 分钟",
    total: 180,
    hookEnd: 8,
    contextEnd: 25,
    bodyEnd: 155,
    hookVisual: "半身中景 · 正面柔光 · 眼平机位",
    bodyVisual: "中景口播，关键处切屏幕特写 2–4 秒",
    outroVisual: "半身中景，机位不动，收手势"
  },
  mid: {
    label: "中视频",
    length: "约 8 分钟",
    total: 480,
    hookEnd: 15,
    contextEnd: 50,
    bodyEnd: 440,
    hookVisual: "中景口播 · 正面柔光 · 眼平机位",
    bodyVisual: "中景口播 + 录屏分镜交替",
    outroVisual: "中景口播，结论打字幕"
  },
  long: {
    label: "长视频",
    length: "约 20 分钟",
    total: 1200,
    hookEnd: 25,
    contextEnd: 100,
    bodyEnd: 1140,
    hookVisual: "章节卡开场 + 中景口播",
    bodyVisual: "章节卡 → 口播 → 录屏或案例演示",
    outroVisual: "中景口播，回顾路线图"
  }
};

const SCRIPT_CONTEXT = {
  short: (topic) => `今天用三分钟，把「${topic}」拆成可以直接上手的三步。`,
  mid: (topic) => `这条视频用八分钟，把「${topic}」的流程走一遍：先看结构，再看操作，最后看常见误区。`,
  long: (topic) => `这一期用二十分钟，把「${topic}」从概念到落地拆开讲，最后附一个完整演示。`
};

const padTime = (value) => String(value).padStart(2, "0");
const formatTime = (seconds) => `${padTime(Math.floor(seconds / 60))}:${padTime(seconds % 60)}`;

const escapeText = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );

function buildShots(tierKey, topic, points) {
  const tier = SCRIPT_TIERS[tierKey];
  const shots = [];

  shots.push({
    start: 0,
    end: tier.hookEnd,
    visual: tier.hookVisual,
    sub: "大字钩子 + 选题关键词",
    voice: `先把问题摆出来：「${topic}」这件事，多数人卡在同一个地方。`
  });

  shots.push({
    start: tier.hookEnd,
    end: tier.contextEnd,
    visual: tier.hookVisual,
    sub: "一句话说明本期讲什么",
    voice: SCRIPT_CONTEXT[tierKey](topic)
  });

  const bodyStart = tier.contextEnd;
  const bodyTotal = tier.bodyEnd - bodyStart;
  const count = points.length;

  points.forEach((point, index) => {
    const start = bodyStart + Math.round((bodyTotal * index) / count);
    const end = bodyStart + Math.round((bodyTotal * (index + 1)) / count);
    shots.push({
      start,
      end,
      visual: tier.bodyVisual,
      sub: `关键词字幕：${point}`,
      voice: `第 ${index + 1} 个要点：${point}。先给判断标准，再举一个反例，最后说清适用边界。`
    });
  });

  shots.push({
    start: tier.bodyEnd,
    end: tier.total,
    visual: tier.outroVisual,
    sub: "结论 + 片尾固定句（小字）",
    voice: `把 ${count} 个要点串成一句能复述的结论，再提醒一次适用边界。`
  });

  return shots;
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  fallbackCopy(text);
  return Promise.resolve();
}

function fallbackCopy(text) {
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
}

function renderScript() {
  if (!scriptForm) return;

  const tierKey = scriptTier.value;
  const tier = SCRIPT_TIERS[tierKey];
  const topic = scriptTopic.value.trim() || "本期选题";

  let points = scriptPoints.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (!points.length) points = ["先讲清概念与适用场景"];

  const shots = buildShots(tierKey, topic, points);

  shotList.innerHTML = shots
    .map(
      (shot) => `
        <li class="shot">
          <span class="shot-time">${formatTime(shot.start)}–${formatTime(shot.end)}</span>
          <div class="shot-visual"><b>画面</b>${escapeText(shot.visual)}<span class="shot-sub">字幕：${escapeText(shot.sub)}</span></div>
          <div class="shot-voice"><b>口播</b>${escapeText(shot.voice)}</div>
        </li>`
    )
    .join("");

  const titles = [
    `「${topic}」：3 个判断标准，照着做就行`,
    `「${topic}」，卡住的地方通常在这一步`,
    `把「${topic}」讲清楚：一版可复用的判断框架`
  ];
  const cover = `封面大字：${topic}｜副标题：3 个判断标准 + 1 个反例｜角标：科研方法分享`;

  scriptExtra.innerHTML = `
    <div class="script-block">
      <h4>标题备选</h4>
      <p>${titles.map((item) => escapeText(item)).join("<br />")}</p>
    </div>
    <div class="script-block">
      <h4>封面文字</h4>
      <p>${escapeText(cover)}</p>
    </div>
    <div class="script-block">
      <h4>片尾固定句</h4>
      <p>${escapeText(disclaimerText)}</p>
    </div>`;

  scriptTitle.textContent = `《${topic}》拍摄脚本`;
  scriptMeta.textContent = `${tier.label} · ${tier.length} · ${shots.length} 个分镜`;

  currentScriptText = [
    `《${topic}》拍摄脚本`,
    `${tier.label} · ${tier.length}`,
    "",
    ...shots.map(
      (shot) =>
        `${formatTime(shot.start)}–${formatTime(shot.end)}｜画面：${shot.visual}（字幕：${shot.sub}）\n口播：${shot.voice}`
    ),
    "",
    "标题备选：",
    ...titles.map((item, index) => `${index + 1}. ${item}`),
    "",
    `封面文字：${cover}`,
    "",
    "片尾固定句：",
    disclaimerText
  ].join("\n");
}

let currentScriptText = "";

if (scriptForm) {
  scriptForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderScript();
  });
  scriptTier.addEventListener("change", renderScript);
  renderScript();
}

if (copyScriptBtn) {
  copyScriptBtn.addEventListener("click", async () => {
    await copyToClipboard(currentScriptText);
    const original = copyScriptBtn.textContent;
    copyScriptBtn.textContent = "已复制";
    setTimeout(() => {
      copyScriptBtn.textContent = original;
    }, 1600);
  });
}
