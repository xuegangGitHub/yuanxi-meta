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
