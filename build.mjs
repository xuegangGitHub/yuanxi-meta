/* ============================================
   内容库构建脚本
   读取 content/videos/*.json，
   生成 index.html 中的筛选按钮与静态卡片。
   运行：node build.mjs
   ============================================ */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const contentDir = join(root, "content", "videos");
const htmlPath = join(root, "index.html");
const sitemapPath = join(root, "sitemap.xml");

const TYPE_META = {
  short: { label: "短视频", cls: "short" },
  mid: { label: "中视频", cls: "mid" },
  long: { label: "长视频", cls: "long" }
};
const TYPE_ORDER = { short: 0, mid: 1, long: 2 };

const STATUS_META = {
  published: { label: "已发布", cls: "is-published" },
  production: { label: "制作中", cls: "is-production" },
  idea: { label: "选题池", cls: "is-idea" }
};

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );

const errors = [];

/* ---------- 读取并校验内容 ---------- */
const files = (await readdir(contentDir)).filter((file) => file.endsWith(".json")).sort();
const videos = [];

for (const file of files) {
  let data;
  try {
    data = JSON.parse(await readFile(join(contentDir, file), "utf8"));
  } catch (err) {
    errors.push(`${file}：JSON 解析失败（${err.message}）`);
    continue;
  }

  if (!data.title) errors.push(`${file}：缺少 title`);
  if (!TYPE_META[data.type]) errors.push(`${file}：type 必须是 short / mid / long`);
  if (!STATUS_META[data.status]) errors.push(`${file}：status 必须是 published / production / idea`);
  if (!/^\d{1,2}:\d{2}$/.test(data.duration || "")) errors.push(`${file}：duration 需为 mm:ss，例如 04:12`);
  if (!data.tag) errors.push(`${file}：缺少 tag`);
  if (!data.desc) errors.push(`${file}：缺少 desc`);

  videos.push({ ...data, order: Number(data.order) || 999 });
}

if (errors.length) {
  console.error("内容校验未通过：\n" + errors.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

videos.sort(
  (a, b) =>
    TYPE_ORDER[a.type] - TYPE_ORDER[b.type] ||
    a.order - b.order ||
    String(a.title).localeCompare(String(b.title), "zh")
);

/* ---------- 生成卡片 ---------- */
const typeIndex = {};
const cards = videos.map((video) => {
  typeIndex[video.type] = (typeIndex[video.type] ?? -1) + 1;
  const delay = (typeIndex[video.type] % 6) * 55;
  const type = TYPE_META[video.type];
  const status = STATUS_META[video.status];

  return `          <article class="video-card" data-type="${video.type}" style="--d:${delay}ms">
            <div class="video-top">
              <span class="type-dot ${type.cls}">${type.label}</span>
              <span class="video-duration">${escapeHtml(video.duration)}</span>
              <span class="status ${status.cls}">${status.label}</span>
            </div>
            <h3>${escapeHtml(video.title)}</h3>
            <p>${escapeHtml(video.desc)}</p>
            <div class="video-foot">
              <span>#${escapeHtml(video.tag)}</span>
              <span class="arrow" aria-hidden="true">↗</span>
            </div>
          </article>`;
});

const counts = {
  all: videos.length,
  short: videos.filter((video) => video.type === "short").length,
  mid: videos.filter((video) => video.type === "mid").length,
  long: videos.filter((video) => video.type === "long").length
};

const tabsBlock = `        <!-- TABS_START -->
        <div class="tabs reveal" role="tablist" aria-label="按视频类型筛选">
          <button class="tab is-active" data-filter="all" role="tab" aria-selected="true">全部<span class="tab-count">${counts.all}</span></button>
          <button class="tab" data-filter="short" role="tab" aria-selected="false">短视频<span class="tab-count">${counts.short}</span></button>
          <button class="tab" data-filter="mid" role="tab" aria-selected="false">中视频<span class="tab-count">${counts.mid}</span></button>
          <button class="tab" data-filter="long" role="tab" aria-selected="false">长视频<span class="tab-count">${counts.long}</span></button>
        </div>
        <!-- TABS_END -->`;

const gridBlock = `        <!-- VIDEO_GRID_START -->
        <div class="video-grid" id="videoGrid" aria-live="polite">
${cards.join("\n\n")}
        </div>
        <!-- VIDEO_GRID_END -->`;

/* ---------- 写回 index.html ---------- */
let html = await readFile(htmlPath, "utf8");
const before = html;

html = html.replace(/[ \t]*<!-- TABS_START -->[\s\S]*?<!-- TABS_END -->/, tabsBlock);
html = html.replace(/[ \t]*<!-- VIDEO_GRID_START -->[\s\S]*?<!-- VIDEO_GRID_END -->/, gridBlock);

if (html === before) {
  console.log(`内容库无变化（${videos.length} 条）`);
} else {
  await writeFile(htmlPath, html, "utf8");
  console.log(
    `已更新 index.html：${videos.length} 条（短视频 ${counts.short} / 中视频 ${counts.mid} / 长视频 ${counts.long}）`
  );
}

/* ---------- 更新 sitemap 的 lastmod ---------- */
try {
  const sitemap = await readFile(sitemapPath, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  const next = sitemap.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${today}</lastmod>`);
  if (next !== sitemap) await writeFile(sitemapPath, next, "utf8");
  console.log(`sitemap.xml lastmod → ${today}`);
} catch {
  console.warn("未找到 sitemap.xml，已跳过");
}
