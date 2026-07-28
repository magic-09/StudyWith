/**
 * 통합 웹앱 메인 로직 (D-Day, 타이머, 허용앱, Firebase 게시판, AI 성적 분석)
 */

/* Firebase Config */
const firebaseConfig = {
  apiKey: "AIzaSyDhexfD1AgkL5ZQAt7EjFcpkKBlB-PEi0g",
  authDomain: "erica-777f2.firebaseapp.com",
  projectId: "erica-777f2",
  storageBucket: "erica-777f2.firebasestorage.app",
  messagingSenderId: "763591090141",
  appId: "1:763591090141:web:5fae48a0448ddc49a3a034"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

/* 코인 규칙 설정 */
const COIN_CONFIG = {
  SECONDS_PER_UNIT: 5,
  REWARD_COINS: 10
};

// 0. 코인 모듈
const CoinModule = {
  STORAGE_KEY: 'study_app_user_coins',
  coins: 0,
  init: function() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      this.coins = saved ? parseInt(saved, 10) : 0;
    } catch(e) { this.coins = 0; }
    return this.coins;
  },
  addCoins: function(amount) {
    this.coins += amount;
    this.save();
    return this.coins;
  },
  save: function() {
    try { localStorage.setItem(this.STORAGE_KEY, this.coins.toString()); } catch(e) {}
  }
};

// 1. 메인 타이머 모듈
const StudyTimerModule = {
  seconds: 0,
  timerInterval: null,
  isRunning: false,

  start: function(onTick) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timerInterval = setInterval(() => {
      this.seconds++;
      if (this.seconds % COIN_CONFIG.SECONDS_PER_UNIT === 0) {
        CoinModule.addCoins(COIN_CONFIG.REWARD_COINS);
        updateCoinUI();
      }
      if (typeof onTick === 'function') onTick(this.getFormattedTime(this.seconds));
    }, 1000);
  },

  pause: function() {
    clearInterval(this.timerInterval);
    this.isRunning = false;
  },

  stop: function() {
    clearInterval(this.timerInterval);
    this.isRunning = false;
    AllowedAppsModule.stopAllTimers();
  },

  reset: function() {
    clearInterval(this.timerInterval);
    this.isRunning = false;
    this.seconds = 0;
    AllowedAppsModule.stopAllTimers();
    return this.getFormattedTime(0);
  },

  getFormattedTime: function(sec) {
    const hrs = String(Math.floor(sec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const secs = String(sec % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }
};

// 2. 허용앱 모듈
const AllowedAppsModule = {
  STORAGE_KEY: 'study_app_allowed_apps',
  apps: [],
  activeIntervals: {},

  init: function() {
    let saved = null;
    try { saved = localStorage.getItem(this.STORAGE_KEY); } catch(e) {}
    if (saved) {
      try { this.apps = JSON.parse(saved); } catch(e) { this.apps = []; }
    } else {
      this.apps = [
        { id: 1, name: 'EBSi', url: 'ebsi.co.kr', icon: '📚', totalSeconds: 0, isRunning: false },
        { id: 2, name: '노션 (Notion)', url: 'notion.so', icon: '📝', totalSeconds: 0, isRunning: false }
      ];
      this.save();
    }
    this.apps.forEach(app => { app.isRunning = false; });
    return this.apps;
  },

  addApp: function(name, url) {
    const newApp = { id: Date.now(), name, url: url || '', icon: '📱', totalSeconds: 0, isRunning: false };
    this.apps.push(newApp);
    this.save();
    return newApp;
  },

  removeApp: function(id) {
    this.stopTimer(id);
    this.apps = this.apps.filter(app => app.id !== id);
    this.save();
  },

  startTimer: function(id, onTick) {
    if (!StudyTimerModule.isRunning) {
      alert("메인 공부 타이머가 시작되어 있을 때만 허용 앱을 켤 수 있습니다!");
      return;
    }
    const app = this.apps.find(a => a.id === id);
    if (!app || app.isRunning) return;

    app.isRunning = true;
    this.save();

    this.activeIntervals[id] = setInterval(() => {
      app.totalSeconds++;
      this.save();
      if (typeof onTick === 'function') onTick(StudyTimerModule.getFormattedTime(app.totalSeconds));
    }, 1000);
  },

  stopTimer: function(id) {
    const app = this.apps.find(a => a.id === id);
    if (this.activeIntervals[id]) {
      clearInterval(this.activeIntervals[id]);
      delete this.activeIntervals[id];
    }
    if (app) {
      app.isRunning = false;
      this.save();
    }
  },

  stopAllTimers: function() {
    this.apps.forEach(app => {
      if (app.isRunning) this.stopTimer(app.id);
    });
    renderAppGrid();
  },

  save: function() {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.apps)); } catch(e) {}
  }
};

// 3. Community (Firebase)
const CommunityModule = {
  COLLECTION_NAME: "posts",
  addPost: async function(content) {
    if (!content || content.trim() === "") return;
    try {
      await db.collection(this.COLLECTION_NAME).add({
        content: content.trim(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) { alert("글 등록 오류가 발생했습니다."); }
  },
  listenPosts: function(onUpdate) {
    db.collection(this.COLLECTION_NAME)
      .orderBy("createdAt", "desc")
      .onSnapshot((snapshot) => {
        const posts = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          posts.push({
            id: doc.id,
            content: data.content,
            createdAt: data.createdAt ? data.createdAt.toDate().toLocaleString('ko-KR') : '방금 전'
          });
        });
        if (typeof onUpdate === 'function') onUpdate(posts);
      });
  }
};

function updateCoinUI() {
  const coinDisplay = document.getElementById("coin-display");
  if (coinDisplay) coinDisplay.textContent = CoinModule.coins;
}

function renderAppGrid() {
  const appGrid = document.getElementById("app-grid");
  if (!appGrid) return;
  appGrid.innerHTML = "";
  
  AllowedAppsModule.apps.forEach(app => {
    const card = document.createElement("div");
    card.className = "app-card";
    const formattedAppTime = StudyTimerModule.getFormattedTime(app.totalSeconds || 0);

    card.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-xl">${app.icon}</span>
        <div>
          <div class="font-bold text-sm">${app.name}</div>
          <small class="text-slate-400 text-xs">${app.url || '허용됨'}</small>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="bg-white px-2.5 py-1 rounded border border-slate-200 text-xs font-mono">${formattedAppTime}</span>
        <button class="px-3 py-1 text-xs rounded font-bold ${app.isRunning ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}" id="btn-toggle-app-${app.id}">
          ${app.isRunning ? '⏹ 중지' : '▶ 시작'}
        </button>
        <button id="btn-delete-app-${app.id}" class="text-slate-400 hover:text-red-500 px-1">&times;</button>
      </div>
    `;

    appGrid.appendChild(card);

    const toggleBtn = document.getElementById(`btn-toggle-app-${app.id}`);
    const timerBadge = document.getElementById(`app-timer-${app.id}`);

    if (toggleBtn) {
      toggleBtn.onclick = function() {
        if (app.isRunning) {
          AllowedAppsModule.stopTimer(app.id);
          toggleBtn.className = "px-3 py-1 text-xs rounded font-bold bg-emerald-500 text-white";
          toggleBtn.textContent = "▶ 시작";
        } else {
          AllowedAppsModule.startTimer(app.id, (timeStr) => {
            if (timerBadge) timerBadge.textContent = timeStr;
          });
          if (app.isRunning) {
            toggleBtn.className = "px-3 py-1 text-xs rounded font-bold bg-red-500 text-white";
            toggleBtn.textContent = "⏹ 중지";
          }
        }
      };
    }

    const deleteBtn = document.getElementById(`btn-delete-app-${app.id}`);
    if (deleteBtn) {
      deleteBtn.onclick = function() {
        AllowedAppsModule.removeApp(app.id);
        renderAppGrid();
      };
    }
  });
}

// 4. D-Day 및 AI 일일 메이트 로직
const TARGET_DATE = new Date('2026-11-19T00:00:00');
let lastFetchedDate = null;

function updateDDay() {
  const now = new Date();
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetZero = new Date(TARGET_DATE.getFullYear(), TARGET_DATE.getMonth(), TARGET_DATE.getDate());
  
  const diffTime = targetZero - todayZero;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const ddayText = document.getElementById('ddayText');
  const targetDateText = document.getElementById('targetDateText');
  const currentDateText = document.getElementById('currentDateText');

  if (ddayText) {
    if (diffDays > 0) ddayText.innerText = `D-${diffDays}`;
    else if (diffDays === 0) ddayText.innerText = `D-DAY`;
    else ddayText.innerText = `D+${Math.abs(diffDays)}`;
  }

  if (targetDateText) targetDateText.innerText = `2026년 11월 19일(목) 까지`;
  if (currentDateText) currentDateText.innerText = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

  const currentDateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  if (lastFetchedDate !== currentDateStr) {
    lastFetchedDate = currentDateStr;
    fetchAIMessage(diffDays);
  }
}

async function fetchAIMessage(dday) {
  const aiBox = document.getElementById('aiMessageBox');
  if (!aiBox) return;
  
  aiBox.innerHTML = `
    <div class="flex flex-col items-center gap-2 text-slate-400 py-2">
      <i class="fa-solid fa-circle-notch animate-spin text-blue-500 text-xl"></i>
      <span>AI 메시지를 생성하고 있습니다...</span>
    </div>
  `;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dday: dday })
    });

    const data = await response.json();
    if (response.ok && data.result) {
      aiBox.innerText = data.result;
    } else {
      aiBox.innerText = '😊 "오늘 하루도 힘내세요! 조급해하지 말고 하나씩 차근차근 해나가는 하루가 되길 바랍니다."';
    }
  } catch (err) {
    aiBox.innerText = '✨ "지나간 시간보다 다가올 하루에 집중해 보세요. 오늘도 당신을 응원합니다!"';
  }
}

// 5. AI 성적 분석 & 반 배치 함수
async function analyzeGrade() {
  const inputEl = document.getElementById('gradeInput');
  if (!inputEl) return;
  const input = inputEl.value.trim();
  if (!input) return alert('성적 및 상태 정보를 입력해 주세요!');

  const btn = document.getElementById('analyzeBtn');
  const resultBox = document.getElementById('classResult');
  const responseBox = document.getElementById('aiResponse');
  
  btn.disabled = true;
  btn.classList.add('opacity-50');
  btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> AI 분석 진행 중...';

  resultBox.innerHTML = `
    <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
    <p class="text-sm font-bold text-blue-600">AI 성적 분석 진행 중...</p>
  `;
  responseBox.innerText = '성적 데이터를 바탕으로 최적의 클래스 배치 및 피드백 리포트를 생성하고 있습니다...';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const reply = data.result;
    responseBox.innerText = reply;

    if (reply.includes('상위권')) {
      resultBox.className = 'flex-1 flex flex-col items-center justify-center p-6 rounded-xl bg-indigo-50 border border-indigo-200 text-center min-h-[200px]';
      resultBox.innerHTML = `
        <div class="w-16 h-16 bg-indigo-500 text-white rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-lg shadow-indigo-200">
          <i class="fa-solid fa-crown"></i>
        </div>
        <span class="text-xs font-bold text-indigo-500 bg-indigo-100 px-3 py-1 rounded-full mb-2">분석 완료</span>
        <h3 class="text-xl font-extrabold text-indigo-900">[상위권 반] 배치</h3>
        <p class="text-xs text-indigo-600 mt-2">최고 레벨 클래스에서 심화 학습을 진행할 수 있는 우수한 성적입니다!</p>
      `;
    } else if (reply.includes('중위권')) {
      resultBox.className = 'flex-1 flex flex-col items-center justify-center p-6 rounded-xl bg-blue-50 border border-blue-200 text-center min-h-[200px]';
      resultBox.innerHTML = `
        <div class="w-16 h-16 bg-blue-500 text-white rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-lg shadow-blue-200">
          <i class="fa-solid fa-star"></i>
        </div>
        <span class="text-xs font-bold text-blue-500 bg-blue-100 px-3 py-1 rounded-full mb-2">분석 완료</span>
        <h3 class="text-xl font-extrabold text-blue-900">[중위권 반] 배치</h3>
        <p class="text-xs text-blue-600 mt-2">탄탄한 기본기를 바탕으로 상위권 도약이 기대되는 클래스입니다.</p>
      `;
    } else {
      resultBox.className = 'flex-1 flex flex-col items-center justify-center p-6 rounded-xl bg-sky-50 border border-sky-200 text-center min-h-[200px]';
      resultBox.innerHTML = `
        <div class="w-16 h-16 bg-sky-500 text-white rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-lg shadow-sky-200">
          <i class="fa-solid fa-seedling"></i>
        </div>
        <span class="text-xs font-bold text-sky-500 bg-sky-100 px-3 py-1 rounded-full mb-2">분석 완료</span>
        <h3 class="text-xl font-extrabold text-sky-900">[하위권 반] 배치</h3>
        <p class="text-xs text-sky-600 mt-2">맞춤형 기초 케어와 약점 보완을 통해 성장할 수 있는 클래스입니다.</p>
      `;
    }
  } catch (err) {
    alert(err.message || 'AI 분석 중 오류가 발생했습니다.');
  } finally {
    btn.disabled = false;
    btn.classList.remove('opacity-50');
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> AI 반 결정 및 학습 피드백 요청';
  }
}

// MAIN DOM INIT
function initApp() {
  CoinModule.init();
  updateCoinUI();

  // 1. Sidebar Tab Switching Logic
  const navItems = document.querySelectorAll(".nav-item");
  const viewSections = document.querySelectorAll(".view-section");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetTab = item.getAttribute("data-tab");

      navItems.forEach(n => n.classList.remove("active"));
      item.classList.add("active");

      viewSections.forEach(v => {
        v.classList.remove("active");
        if (v.id === `view-${targetTab}`) {
          v.classList.add("active");
        }
      });
    });
  });

  // 2. Timer Controls
  const timerDisplay = document.getElementById("timer-display");
  const btnToggle = document.getElementById("btn-timer-toggle");
  const btnReset = document.getElementById("btn-timer-reset");
  const btnStop = document.getElementById("btn-timer-stop");

  if (btnToggle) {
    btnToggle.onclick = function() {
      if (!StudyTimerModule.isRunning) {
        StudyTimerModule.start((formatted) => {
          if (timerDisplay) timerDisplay.textContent = formatted;
        });
        btnToggle.innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        StudyTimerModule.pause();
        btnToggle.innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    };
  }

  if (btnStop) {
    btnStop.onclick = function() {
      StudyTimerModule.stop();
      if (btnToggle) btnToggle.innerHTML = '<i class="fa-solid fa-play"></i>';
    };
  }

  if (btnReset) {
    btnReset.onclick = function() {
      const resetTime = StudyTimerModule.reset();
      if (timerDisplay) timerDisplay.textContent = resetTime;
      if (btnToggle) btnToggle.innerHTML = '<i class="fa-solid fa-play"></i>';
    };
  }

  // 3. Allowed Apps Form
  AllowedAppsModule.init();
  renderAppGrid();

  const appForm = document.getElementById("form-add-app");
  if (appForm) {
    appForm.onsubmit = function(e) {
      e.preventDefault();
      const nameInput = document.getElementById("input-app-name");
      const urlInput = document.getElementById("input-app-url");
      if (nameInput && nameInput.value.trim()) {
        AllowedAppsModule.addApp(nameInput.value.trim(), urlInput ? urlInput.value.trim() : "");
        nameInput.value = "";
        if (urlInput) urlInput.value = "";
        renderAppGrid();
      }
    };
  }

  // 4. Community List Handling
  const postForm = document.getElementById("form-add-post");
  const postInput = document.getElementById("input-post-content");
  const postList = document.getElementById("post-list");

  CommunityModule.listenPosts((posts) => {
    if (!postList) return;
    postList.innerHTML = "";
    if (posts.length === 0) {
      postList.innerHTML = `<div class="post-card text-slate-400">등록된 의견이 없습니다.</div>`;
      return;
    }
    posts.forEach((post) => {
      const card = document.createElement("div");
      card.className = "post-card";
      card.innerHTML = `
        <div>
          <div class="font-semibold text-sm text-slate-800">${post.content}</div>
          <small class="text-slate-400 text-xs">${post.createdAt}</small>
        </div>
      `;
      postList.appendChild(card);
    });
  });

  if (postForm) {
    postForm.onsubmit = async function(e) {
      e.preventDefault();
      if (postInput && postInput.value.trim()) {
        const txt = postInput.value;
        postInput.value = "";
        await CommunityModule.addPost(txt);
      }
    };
  }

  // 5. Initialize D-Day
  updateDDay();
  setInterval(updateDDay, 60000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
