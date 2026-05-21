const STORAGE_KEY = "qiuqiuren_delta_accounts_v2";

const roleMeta = {
  support: {
    label: "客服账号",
    title: "客服系统",
    short: "客服",
    permission: "可使用派单、客服报单、会员登记、工单",
  },
  player: {
    label: "陪玩账号",
    title: "陪玩系统",
    short: "陪玩",
    permission: "可查看自己的订单、提交报单、查看自己的流水",
  },
  owner: {
    label: "老板账号",
    title: "老板系统",
    short: "老板",
    permission: "可查看全店数据、流水、客诉、店铺设置",
  },
};

const state = {
  selectedLoginRole: "support",
  authMode: "login",
  auth: null,
  accounts: loadAccounts(),
  companions: [],
  orders: [],
  reports: [],
  members: [],
  tickets: [],
  complaints: [],
  ledger: [],
  settings: {
    playerRate: 70,
  },
};

const PRICE_TIERS = [
  { value: "98", label: "体验单", hours: 1, amount: 98 },
  { value: "198", label: "标准单", hours: 2, amount: 198 },
  { value: "268", label: "进阶单", hours: 3, amount: 268 },
  { value: "398", label: "车队单", hours: 4, amount: 398 },
];

const ORDER_PROFILES = [
  { customer: "待填写老板", service: "烽火地带撤离陪打", mode: "烽火地带", tier: PRICE_TIERS[1], offsetMinutes: 18 },
  { customer: "待填写老板", service: "烽火地带物资路线教学", mode: "烽火地带", tier: PRICE_TIERS[2], offsetMinutes: 42 },
  { customer: "待填写老板", service: "全面战场冲分陪打", mode: "全面战场", tier: PRICE_TIERS[3], offsetMinutes: 76 },
  { customer: "待填写老板", service: "干员配装复盘", mode: "烽火地带", tier: PRICE_TIERS[0], offsetMinutes: 95 },
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function uid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadAccounts() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAccounts() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.accounts));
}

function money(value) {
  return `¥${Number(value).toLocaleString("zh-CN")}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function localDateTimeValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatOrderTime(value) {
  if (!value) return "未填时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间异常";
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function profileForNextOrder() {
  return ORDER_PROFILES[state.orders.length % ORDER_PROFILES.length];
}

function tierFromValue(value) {
  return PRICE_TIERS.find((tier) => tier.value === String(value));
}

function priceLabelFor(order) {
  if (order.priceLabel) return order.priceLabel;
  const tier = PRICE_TIERS.find((item) => item.amount === Number(order.amount) && item.hours === Number(order.hours));
  return tier ? `${tier.label} · ${tier.hours}h` : "自定义价位";
}

function priceLabelFromForm(data) {
  const hours = Number(data.hours);
  const tier = data.priceTier === "custom" ? null : tierFromValue(data.priceTier);
  return tier ? `${tier.label} · ${hours}h` : `自定义价位 · ${hours}h`;
}

function setOrderFormDefaults() {
  const orderTime = $("#supportReportForm input[name='orderTime']");
  if (orderTime && !orderTime.value) orderTime.value = localDateTimeValue(new Date(Date.now() + 15 * 60 * 1000));
}

function syncPriceTierFields() {
  const select = $("#supportPriceTier");
  const hours = $("#supportHours");
  const amount = $("#supportAmount");
  if (!select || !hours || !amount || select.value === "custom") return;
  const selected = select.selectedOptions[0];
  hours.value = selected.dataset.hours || hours.value;
  amount.value = select.value;
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => element.classList.remove("show"), 2200);
}

function emptyState(text) {
  return `<div class="empty-state">${text}</div>`;
}

function metricCard(label, value, detail) {
  return `
    <article class="metric-card">
      <p class="eyebrow">${label}</p>
      <strong>${value}</strong>
      <span>${detail}</span>
    </article>
  `;
}

function assertRole(role) {
  return state.auth?.role === role;
}

function currentPlayerName() {
  return state.auth?.role === "player" ? state.auth.name : "当前陪玩";
}

function roleAccounts(role = state.selectedLoginRole) {
  return state.accounts.filter((account) => account.role === role);
}

function getCompanionRoster() {
  const fromAccounts = state.accounts
    .filter((account) => account.role === "player")
    .map((account) => ({ name: account.name, skill: "已创建陪玩账号", online: true }));
  const merged = [...fromAccounts, ...state.companions];
  return merged.filter((item, index, array) => array.findIndex((other) => other.name === item.name) === index);
}

function renderAuthMode() {
  $$(".auth-tabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === state.authMode);
  });
  $("#loginForm").classList.toggle("hidden", state.authMode !== "login");
  $("#registerForm").classList.toggle("hidden", state.authMode !== "register");
}

function renderLoginRole() {
  $$(".role-card").forEach((button) => {
    button.classList.toggle("active", button.dataset.loginRole === state.selectedLoginRole);
  });
  const meta = roleMeta[state.selectedLoginRole];
  $("#loginAccount").placeholder = `输入${meta.short}账号`;
  $("#registerName").placeholder = `创建${meta.short}昵称`;
  $("#registerAccount").placeholder = `创建${meta.short}账号`;
  renderAccountList();
}

function renderAccountList() {
  const grouped = ["support", "player", "owner"]
    .map((role) => {
      const users = roleAccounts(role);
      const names = users.length ? users.map((user) => user.account).join("、") : "未创建";
      return `<span>${roleMeta[role].short}：${names}</span>`;
    })
    .join("");
  $("#createdAccountList").innerHTML = grouped;
}

function login(account, password) {
  const user = state.accounts.find(
    (item) => item.role === state.selectedLoginRole && item.account === account && item.password === password,
  );
  if (!user) {
    const hasRoleAccount = roleAccounts().length > 0;
    toast(hasRoleAccount ? "账号或密码不匹配" : "这个角色还没有账号，请先创建");
    return;
  }
  state.auth = { ...user };
  $("#loginScreen").classList.add("hidden");
  $("#appShell").classList.remove("hidden");
  renderWorkspace();
  toast(`${roleMeta[user.role].label}已登录`);
}

function registerAccount(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const account = String(data.account || "").trim();
  const name = String(data.name || "").trim();
  const password = String(data.password || "");
  const passwordConfirm = String(data.passwordConfirm || "");
  if (!name || !account || !password) {
    toast("昵称、账号和密码都要填写");
    return;
  }
  if (password !== passwordConfirm) {
    toast("两次密码不一致");
    return;
  }
  if (state.accounts.some((item) => item.account === account)) {
    toast("这个账号已经存在，请换一个");
    return;
  }
  state.accounts.push({
    id: uid(),
    role: state.selectedLoginRole,
    account,
    password,
    name,
    createdAt: new Date().toISOString(),
  });
  saveAccounts();
  form.reset();
  $("#loginAccount").value = account;
  state.authMode = "login";
  renderAuthMode();
  renderAccountList();
  toast(`${roleMeta[state.selectedLoginRole].short}账号创建成功`);
}

function logout() {
  state.auth = null;
  $("#appShell").classList.add("hidden");
  $("#loginScreen").classList.remove("hidden");
  $("#changePasswordForm").reset();
  renderLoginRole();
  toast("已退出，需要重新登录");
}

function changePassword(form) {
  if (!state.auth) return;
  const data = Object.fromEntries(new FormData(form).entries());
  if (data.oldPassword !== state.auth.password) {
    toast("原密码不正确");
    return;
  }
  if (!data.newPassword || data.newPassword !== data.newPasswordConfirm) {
    toast("两次新密码不一致");
    return;
  }
  const account = state.accounts.find((item) => item.id === state.auth.id);
  if (!account) {
    toast("没有找到当前账号");
    return;
  }
  account.password = data.newPassword;
  state.auth = { ...account };
  saveAccounts();
  form.reset();
  toast("密码已修改");
}

function renderWorkspace() {
  if (!state.auth) return;
  const role = state.auth.role;
  $("#workspaceTitle").textContent = roleMeta[role].title;
  $("#userRoleLabel").textContent = roleMeta[role].label;
  $("#userNameLabel").textContent = state.auth.name;
  $("#permissionLabel").textContent = roleMeta[role].permission;

  $$(".permission-item").forEach((item) => {
    const active = item.dataset.permission === role;
    item.classList.toggle("active", active);
    item.classList.toggle("locked", !active);
  });

  $$(".role-view").forEach((view) => view.classList.remove("active"));
  $(`#${role}View`).classList.add("active");
  renderAll();
}

function renderCompanionOptions() {
  const roster = getCompanionRoster();
  $("#companionPicker").innerHTML = roster.length
    ? roster.map((companion) => `<option value="${companion.name}">${companion.name} · ${companion.skill}</option>`).join("")
    : `<option value="">请先创建陪玩账号</option>`;
}

function auditOrderSet(orders) {
  const issues = [];
  if (!orders.length) {
    return [{ level: "ok", text: "暂无订单，等待首单录入" }];
  }
  const missingTime = orders.filter((order) => !order.orderTime || Number.isNaN(new Date(order.orderTime).getTime())).length;
  const invalidPrice = orders.filter((order) => Number(order.amount) <= 0 || Number(order.hours) <= 0).length;
  const timeKeys = orders.map((order) => order.orderTime || "").filter(Boolean);
  const priceKeys = orders
    .filter((order) => Number(order.amount) > 0 && Number(order.hours) > 0)
    .map((order) => `${order.hours}-${order.amount}`);
  const sameTime = timeKeys.length === orders.length && new Set(timeKeys).size === 1 && orders.length > 1;
  const samePrice = priceKeys.length === orders.length && new Set(priceKeys).size === 1 && orders.length > 1;
  if (missingTime) issues.push({ level: "warn", text: `${missingTime} 单缺少有效下单时间` });
  if (invalidPrice) issues.push({ level: "warn", text: `${invalidPrice} 单时长或金额异常` });
  if (sameTime) issues.push({ level: "warn", text: "多笔订单下单时间完全相同，请复核" });
  if (samePrice) issues.push({ level: "warn", text: "多笔订单价位完全相同，请确认不是模板单" });
  if (!issues.length) issues.push({ level: "ok", text: "订单时间和价位检测正常" });
  return issues;
}

function renderAuditStrip(selector, orders) {
  const element = $(selector);
  if (!element) return;
  element.innerHTML = auditOrderSet(orders)
    .map((issue) => `<span class="audit-chip ${issue.level}">${issue.level === "ok" ? "✓" : "!"} ${issue.text}</span>`)
    .join("");
}

function renderAudits() {
  const playerName = currentPlayerName();
  if (assertRole("support")) renderAuditStrip("#supportAudit", state.orders);
  if (assertRole("player")) renderAuditStrip("#playerAudit", state.orders.filter((order) => order.companion === playerName));
  if (assertRole("owner")) renderAuditStrip("#ownerAudit", state.orders);
}

function renderMetrics() {
  const supportPending = state.orders.filter((order) => order.status === "待派单").length;
  const supportActive = state.orders.filter((order) => order.status === "进行中").length;
  const playerName = currentPlayerName();
  const playerOrders = state.orders.filter((order) => order.companion === playerName);
  const playerReports = state.reports.filter((report) => report.companion === playerName);
  const playerIncome = playerReports.reduce((sum, report) => sum + report.share, 0);
  const ownerRevenue = state.ledger.reduce((sum, item) => sum + item.amount, 0);
  const avgOrder = state.orders.length ? Math.round(state.orders.reduce((sum, order) => sum + Number(order.amount || 0), 0) / state.orders.length) : 0;

  $("#supportMetrics").innerHTML = [
    metricCard("待派单", supportPending, "客服可分配给在线陪玩"),
    metricCard("进行中", supportActive, "三角洲订单服务中"),
    metricCard("会员", state.members.length, "老板档案从 0 开始"),
    metricCard("工单", state.tickets.length, "客服独立处理"),
  ].join("");

  $("#playerMetrics").innerHTML = [
    metricCard("我的订单", playerOrders.length, `只看${playerName}自己的单`),
    metricCard("待报单", playerOrders.filter((order) => order.status === "进行中").length, "完成后提交给客服审核"),
    metricCard("可结算", money(playerIncome), "只显示个人流水"),
    metricCard("主攻项目", "烽火", "撤离陪打 / 路线教学"),
  ].join("");

  $("#ownerMetrics").innerHTML = [
    metricCard("全店流水", money(ownerRevenue), "老板可见全部资金"),
    metricCard("订单", state.orders.length, `客单价 ${money(avgOrder)}`),
    metricCard("客诉", state.complaints.length, "可冻结争议订单"),
    metricCard("陪玩", getCompanionRoster().length, "三角洲专员"),
  ].join("");
}

function renderSupportOrders() {
  if (!assertRole("support")) return;
  if (!state.orders.length) {
    $("#supportOrders").innerHTML = emptyState("暂无待派订单。使用右侧报单表单创建首单。");
    return;
  }
  $("#supportOrders").innerHTML = state.orders
    .map((order) => {
      const canAssign = order.status === "待派单";
      return `
        <article class="item-card">
          <div class="item-top">
            <div>
              <h4>${order.id} · ${order.service}</h4>
              <div class="meta-line">
                <span>${order.customer}</span>
                <span>${formatOrderTime(order.orderTime)}</span>
                <span>${order.hours}h</span>
                <span>${money(order.amount)}</span>
                <span class="state-pill">${order.status}</span>
              </div>
            </div>
            <div class="item-actions">
              <button class="mini-button primary" type="button" data-assign="${order.id}" ${canAssign ? "" : "disabled"}>派单</button>
              <button class="mini-button" type="button" data-finish="${order.id}">结单</button>
            </div>
          </div>
          <div class="meta-line">
            <span class="tag">${order.mode}</span>
            <span class="tag">${priceLabelFor(order)}</span>
            <span>${order.companion || "未分配陪玩"}</span>
            <span>${order.note}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderMembers() {
  if (!assertRole("support")) return;
  $("#memberList").innerHTML = state.members.length
    ? state.members
        .map(
          (member) => `
            <article class="item-card">
              <div class="split-top">
                <strong>${member.name}</strong>
                <span class="tag">${member.preference}</span>
              </div>
              <div class="meta-line">${member.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
            </article>
          `,
        )
        .join("")
    : emptyState("暂无会员档案。");
}

function renderTickets() {
  if (!assertRole("support")) return;
  $("#ticketList").innerHTML = state.tickets.length
    ? state.tickets
        .map(
          (ticket) => `
            <article class="item-card">
              <div class="item-top">
                <div>
                  <h4>${ticket.id} · ${ticket.title}</h4>
                  <div class="meta-line">
                    <span>${ticket.customer}</span>
                    <span class="tag">${ticket.priority}</span>
                    <span>${ticket.status}</span>
                  </div>
                </div>
                <button class="mini-button" type="button" data-ticket="${ticket.id}">跟进</button>
              </div>
            </article>
          `,
        )
        .join("")
    : emptyState("暂无客服工单。");
}

function renderPlayerOrders() {
  if (!assertRole("player")) return;
  const playerName = currentPlayerName();
  const namePill = $("#playerNamePill");
  if (namePill) namePill.textContent = playerName;
  const myOrders = state.orders.filter((order) => order.companion === playerName);
  $("#playerOrders").innerHTML = myOrders.length
    ? myOrders
        .map(
          (order) => `
            <article class="item-card">
              <div class="item-top">
                <div>
                  <h4>${order.service}</h4>
                  <div class="meta-line">
                    <span>${order.id}</span>
                    <span>${order.customer}</span>
                    <span>${formatOrderTime(order.orderTime)}</span>
                    <span>${order.hours}h</span>
                    <span>${money(order.amount)}</span>
                    <span class="state-pill">${order.status}</span>
                  </div>
                </div>
                <button class="mini-button primary" type="button" data-player-pick="${order.id}">报单</button>
              </div>
              <div class="meta-line">
                <span class="tag">${order.mode}</span>
                <span class="tag">${priceLabelFor(order)}</span>
                <span>${order.note}</span>
              </div>
            </article>
          `,
        )
        .join("")
    : emptyState("当前没有分配给你的订单。");

  $("#playerOrderSelect").innerHTML = myOrders.length
    ? myOrders.map((order) => `<option value="${order.id}">${order.id} · ${order.service}</option>`).join("")
    : `<option value="">暂无可报订单</option>`;
}

function renderEarnings() {
  if (!assertRole("player")) return;
  const playerName = currentPlayerName();
  const reports = state.reports.filter((report) => report.companion === playerName);
  const total = reports.reduce((sum, report) => sum + report.share, 0);
  $("#playerWeekAmount").textContent = money(total);
  $(".donut").classList.toggle("active", total > 0);
  $("#earningRows").innerHTML = reports.length
    ? reports
        .map(
          (report) => `
            <tr>
              <td>${report.id}</td>
              <td>
                <span>${report.service}</span>
                <small class="table-sub">${report.priceLabel || "未记录价位"} · ${formatOrderTime(report.orderTime)}</small>
              </td>
              <td>${money(report.share)}</td>
              <td>${report.status}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="4">暂无流水</td></tr>`;
}

function renderOwner() {
  if (!assertRole("owner")) return;
  const chartValues = state.ledger.length
    ? [0, 0, 0, 0, 0, 0, state.ledger.reduce((sum, item) => sum + item.amount, 0)]
    : [0, 0, 0, 0, 0, 0, 0];
  const labels = ["五", "六", "日", "一", "二", "三", "今"];
  const max = Math.max(...chartValues, 1);
  $("#revenueBars").innerHTML = chartValues
    .map((value, index) => {
      const height = 34 + (value / max) * 126;
      return `<div class="bar" style="height:${height}px" title="${labels[index]} ${money(value)}">${labels[index]}</div>`;
    })
    .join("");

  const modeCount = state.orders.reduce(
    (summary, order) => {
      summary[order.mode] = (summary[order.mode] || 0) + 1;
      return summary;
    },
    { 烽火地带: 0, 全面战场: 0 },
  );
  $("#serviceSplit").innerHTML = Object.entries(modeCount)
    .map(
      ([mode, count]) => `
        <article class="item-card">
          <div class="split-top">
            <strong>${mode}</strong>
            <span>${count} 单</span>
          </div>
        </article>
      `,
    )
    .join("");

  $("#ledgerList").innerHTML = state.ledger.length
    ? state.ledger
        .map(
          (item) => `
            <article class="item-card">
              <div class="split-top">
                <strong>${item.title}</strong>
                <span>${money(item.amount)}</span>
              </div>
              <div class="meta-line">
                <span>${item.type}</span>
                <span>${item.time}</span>
              </div>
            </article>
          `,
        )
        .join("")
    : emptyState("全店流水已清零。");

  $("#complaintList").innerHTML = state.complaints.length
    ? state.complaints
        .map(
          (complaint) => `
            <article class="item-card">
              <div class="item-top">
                <div>
                  <h4>${complaint.id} · ${complaint.title}</h4>
                  <div class="meta-line">
                    <span>${complaint.customer}</span>
                    <span>${complaint.orderId}</span>
                    <span class="tag">${complaint.status}</span>
                  </div>
                </div>
                <button class="mini-button" type="button" data-complaint="${complaint.id}">处理</button>
              </div>
            </article>
          `,
        )
        .join("")
    : emptyState("暂无客户投诉。");
}

function renderAll() {
  renderCompanionOptions();
  renderMetrics();
  renderAudits();
  renderSupportOrders();
  renderMembers();
  renderTickets();
  renderPlayerOrders();
  renderEarnings();
  renderOwner();
}

function createOrder(overrides = {}) {
  const id = `DF-${String(state.orders.length + 1).padStart(4, "0")}`;
  const profile = profileForNextOrder();
  const tier = (overrides.priceTier && overrides.priceTier !== "custom" ? tierFromValue(overrides.priceTier) : profile.tier) || profile.tier;
  const orderTime =
    overrides.orderTime ||
    localDateTimeValue(new Date(Date.now() + (profile.offsetMinutes + state.orders.length * 11) * 60 * 1000));
  const order = {
    id,
    customer: profile.customer,
    service: profile.service,
    mode: profile.mode,
    orderTime,
    hours: tier.hours,
    amount: tier.amount,
    priceTier: tier.value,
    priceLabel: `${tier.label} · ${tier.hours}h`,
    companion: "",
    status: "待派单",
    note: "目标：稳定撤离，优先保物资。",
    ...overrides,
  };
  order.hours = Number(order.hours);
  order.amount = Number(order.amount);
  order.mode = order.mode || (order.service.includes("全面") ? "全面战场" : "烽火地带");
  order.priceLabel = order.priceLabel || priceLabelFor(order);
  state.orders.unshift(order);
  return order;
}

function assignOrder(orderId) {
  if (!assertRole("support")) return;
  const order = state.orders.find((item) => item.id === orderId);
  if (!order || order.status !== "待派单") return;
  const companionName = $("#companionPicker").value.split(" · ")[0];
  if (!companionName) {
    toast("请先创建陪玩账号，再进行派单");
    return;
  }
  order.companion = companionName;
  order.status = "进行中";
  toast(`${order.id} 已派给 ${order.companion}`);
  renderAll();
}

function finishOrder(orderId) {
  if (!assertRole("support")) return;
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  order.status = "已完成";
  if (!order.companion) order.companion = getCompanionRoster()[0]?.name || "未分配陪玩";
  const share = Math.round(order.amount * (state.settings.playerRate / 100));
  state.reports.unshift({
    id: order.id,
    service: order.service,
    companion: order.companion,
    orderTime: order.orderTime,
    priceLabel: priceLabelFor(order),
    share,
    status: "待审核",
  });
  state.ledger.unshift({
    title: `${order.service} · ${priceLabelFor(order)}`,
    amount: order.amount,
    type: "订单收入",
    time: formatOrderTime(order.orderTime),
  });
  toast(`${order.id} 已结单并生成流水`);
  renderAll();
}

function bindEvents() {
  $$(".role-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedLoginRole = button.dataset.loginRole;
      renderLoginRole();
    });
  });

  $$(".auth-tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authMode;
      renderAuthMode();
    });
  });

  $("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    login($("#loginAccount").value.trim(), $("#loginPassword").value);
  });

  $("#registerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    registerAccount(event.currentTarget);
  });

  $("#changePasswordForm").addEventListener("submit", (event) => {
    event.preventDefault();
    changePassword(event.currentTarget);
  });

  $("#logoutButton").addEventListener("click", logout);

  $("#supportSeedButton").addEventListener("click", () => {
    if (!assertRole("support")) return;
    createOrder({ customer: "待填写老板", note: "空白待派订单，请补充客户需求。" });
    toast("已创建一条空白待派订单");
    renderAll();
  });

  $("#supportOrders").addEventListener("click", (event) => {
    const assign = event.target.closest("[data-assign]");
    const finish = event.target.closest("[data-finish]");
    if (assign) assignOrder(assign.dataset.assign);
    if (finish) finishOrder(finish.dataset.finish);
  });

  $("#supportReportForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!assertRole("support")) return;
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const hours = Number(data.hours);
    const amount = Number(data.amount);
    if (!data.orderTime || hours <= 0 || amount <= 0) {
      toast("下单时间、时长和金额都要有效");
      return;
    }
    createOrder({
      customer: data.customer,
      service: data.service,
      mode: data.service.includes("全面") ? "全面战场" : "烽火地带",
      orderTime: data.orderTime,
      priceTier: data.priceTier,
      priceLabel: priceLabelFromForm(data),
      hours,
      amount,
      note: "客服代报，待派单。",
    });
    toast("客服报单已生成待派订单");
    event.currentTarget.reset();
    syncPriceTierFields();
    setOrderFormDefaults();
    renderAll();
  });

  $("#memberForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!assertRole("support")) return;
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    state.members.unshift({
      name: data.name,
      preference: data.preference,
      tags: data.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    });
    toast(`${data.name} 已登记`);
    renderAll();
  });

  $("#newTicketButton").addEventListener("click", () => {
    if (!assertRole("support")) return;
    state.tickets.unshift({
      id: `TK-${String(state.tickets.length + 1).padStart(3, "0")}`,
      title: "三角洲订单待回访",
      customer: "待填写老板",
      priority: "中优先级",
      status: "待处理",
    });
    toast("客服工单已创建");
    renderAll();
  });

  $("#ticketList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-ticket]");
    if (!button || !assertRole("support")) return;
    const ticket = state.tickets.find((item) => item.id === button.dataset.ticket);
    if (ticket) ticket.status = "已跟进";
    toast("工单已跟进");
    renderAll();
  });

  $("#playerSeedButton").addEventListener("click", () => {
    if (!assertRole("player")) return;
    createOrder({ companion: currentPlayerName(), status: "进行中", customer: "待填写老板", note: "空白个人订单，请补充服务备注。" });
    toast("已新增一条你的空白订单");
    renderAll();
  });

  $("#playerOrders").addEventListener("click", (event) => {
    const button = event.target.closest("[data-player-pick]");
    if (!button || !assertRole("player")) return;
    $("#playerOrderSelect").value = button.dataset.playerPick;
    toast("已带入报单订单");
  });

  $("#playerReportForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!assertRole("player")) return;
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const order = state.orders.find((item) => item.id === data.orderId && item.companion === currentPlayerName());
    if (!order) {
      toast("暂无可提交的个人订单");
      return;
    }
    const actualHours = Number(data.hours);
    if (actualHours <= 0) {
      toast("实际时长要大于 0");
      return;
    }
    const amount = order.amount + Number(data.gift || 0);
    const share = Math.round(amount * (state.settings.playerRate / 100));
    order.status = "已完成";
    state.reports.unshift({
      id: order.id,
      service: order.service,
      companion: currentPlayerName(),
      orderTime: order.orderTime,
      priceLabel: priceLabelFor(order),
      actualHours,
      note: data.note,
      share,
      status: "待客服审核",
    });
    state.ledger.unshift({
      title: `${order.service} · ${priceLabelFor(order)}`,
      amount,
      type: Number(data.gift || 0) > 0 ? "订单收入 + 礼物" : "订单收入",
      time: formatOrderTime(order.orderTime),
    });
    toast("陪玩报单已提交给客服审核");
    renderAll();
  });

  $("#withdrawButton").addEventListener("click", () => {
    if (!assertRole("player")) return;
    toast("提现申请已提交");
  });

  $("#ownerSeedButton").addEventListener("click", () => {
    if (!assertRole("owner")) return;
    const order = createOrder({
      customer: "待填写老板",
      service: "全面战场冲分陪打",
      mode: "全面战场",
      priceTier: "398",
      status: "已完成",
      companion: getCompanionRoster()[0]?.name || "",
      note: "空白今日数据，请补充订单来源。",
    });
    state.ledger.unshift({
      title: `${order.service} · ${priceLabelFor(order)}`,
      amount: order.amount,
      type: "订单收入",
      time: formatOrderTime(order.orderTime),
    });
    toast("已新增一条老板可见的今日数据");
    renderAll();
  });

  $("#newComplaintButton").addEventListener("click", () => {
    if (!assertRole("owner")) return;
    state.complaints.unshift({
      id: `CP-${String(state.complaints.length + 1).padStart(3, "0")}`,
      title: "订单体验争议",
      customer: "待填写老板",
      orderId: state.orders[0]?.id || "暂无订单",
      status: "待处理",
    });
    toast("客诉已创建，相关订单建议冻结");
    renderAll();
  });

  $("#complaintList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-complaint]");
    if (!button || !assertRole("owner")) return;
    const complaint = state.complaints.find((item) => item.id === button.dataset.complaint);
    if (complaint) complaint.status = "已处理";
    toast("客诉已处理");
    renderAll();
  });

  $("#settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!assertRole("owner")) return;
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    state.settings.playerRate = Number(data.playerRate);
    toast("店铺设置已保存");
    renderAll();
  });

  $$(".segmented button").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".segmented button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      toast(`已切换到${button.textContent}视图`);
    });
  });

  $("#supportPriceTier").addEventListener("change", syncPriceTierFields);
  syncPriceTierFields();
  setOrderFormDefaults();
}

bindEvents();
renderAuthMode();
renderLoginRole();
