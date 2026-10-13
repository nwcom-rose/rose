document.addEventListener('DOMContentLoaded', () => {
  console.log("西北語薇星光號啟動");
  if (typeof firebase !== 'undefined') {
    console.log("Firebase 載入成功");
    window.firebaseApp = firebase.apps.length ? firebase.app() : null;
    window.auth = firebase.auth();
    window.db = firebase.firestore();
  } else {
    console.error("Firebase 載入失敗，請檢查網路連線或 Firebase SDK 設定");
  }

  // ============ 載入駕駛艙自訂佈局（背景、語薇圖、熱點位置、語薇位置、自訂圖片、標題） ============
  function applyCockpitConfig(cfg) {
    if (!cfg) return;
    // 標題
    if (cfg.title) {
      const titleEl = document.getElementById('cockpitTitle');
      if (titleEl) titleEl.textContent = cfg.title;
    }
    // 背景圖
    if (cfg.bgUrl) {
      const bgImg = document.querySelector('.cockpit-bg > img');
      if (bgImg) bgImg.src = cfg.bgUrl;
    }
    // 語薇圖
    if (cfg.yuweiUrl) {
      const ywImg = document.querySelector('.yuwei-figure');
      if (ywImg) ywImg.src = cfg.yuweiUrl;
    }
    // 語薇圖片位置與大小
    const ywWrap = document.querySelector('.yuwei-wrap');
    if (ywWrap) {
      // 高度（若有自訂）
      if (cfg.yuweiPos && typeof cfg.yuweiPos.height === 'number') {
        ywWrap.style.height = cfg.yuweiPos.height + '%';
      }
      if (cfg.yuweiPos && typeof cfg.yuweiPos.top === 'number' && typeof cfg.yuweiPos.left === 'number') {
        ywWrap.style.top = cfg.yuweiPos.top + '%';
        ywWrap.style.left = cfg.yuweiPos.left + '%';
        ywWrap.style.bottom = 'auto';
        ywWrap.style.transform = 'translate(-50%, -50%)';
      }
    }
    // 自訂圖片
    const figures = document.querySelector('.cockpit-figures');
    if (figures) {
      figures.querySelectorAll('.cockpit-custom-img').forEach(el => el.remove());
      if (Array.isArray(cfg.customImages)) {
        cfg.customImages.forEach(img => {
          if (!img || !img.url) return;
          const wrap = document.createElement('div');
          wrap.className = 'cockpit-custom-img';
          wrap.style.top = img.top + '%';
          wrap.style.left = img.left + '%';
          wrap.style.width = (img.width || 15) + '%';
          const pic = document.createElement('img');
          pic.src = img.url;
          pic.alt = '裝飾圖片';
          pic.draggable = false;
          wrap.appendChild(pic);
          figures.appendChild(wrap);
        });
      }
    }
    // 熱點位置
    if (cfg.hotspots) {
      Object.keys(cfg.hotspots).forEach(key => {
        const btn = document.querySelector(`.hotspot-btn[data-topic="${key}"]`);
        if (btn && cfg.hotspots[key]) {
          btn.style.top = cfg.hotspots[key].top + '%';
          btn.style.left = cfg.hotspots[key].left + '%';
          btn.style.right = 'auto';
          btn.style.bottom = 'auto';
          if (key === 'neighbor') btn.style.transform = 'none';
        }
      });
    }
  }
  if (window.db) {
    window.db.collection('config').doc('cockpit').get()
      .then(snap => { if (snap.exists) applyCockpitConfig(snap.data()); })
      .catch(err => console.warn('載入駕駛艙設定失敗', err));
    // 載入位階設定（30 階），失敗時使用 APP_CONFIG.levels 預設值
    window.db.collection('config').doc('levels').get()
      .then(snap => {
        if (snap.exists && Array.isArray(snap.data().items)) {
          APP_CONFIG.levels = snap.data().items.slice().sort((a, b) => a.level - b.level);
          renderUserCard();
        }
      })
      .catch(err => console.warn('載入位階設定失敗', err));
  }

  // ============ CONFIG ============
  // 30 階位階預設（與後台 getDefaultLevels 一致；Firestore 有資料時會覆寫）
  const LEVEL_NAMES = [
    '見習勤務員', '星際膳食師', '資深物資管理員', '醫療護理員', '資深安保專員',
    '外星生物學家', '維生專家', '工程技術員', '裝備維修師', '星空巡航員',
    '深空通訊官', '後勤總長', '心理調音師', '資深外科醫師', '動力工程師',
    '網絡安全官', '副輪機長', '航行官', '火力控制官', '安全長',
    '醫療總監', '首席系統架構師', '輪機長', '作戰指揮官', '資深航行官',
    '首席導航官', '星艦副官', '首席參謀長', '副艦長', '艦長'
  ];
  const LEVEL_MIN_EXP = { 25: 500000, 26: 700000, 27: 1000000, 28: 1500000, 29: 10000000, 30: 10000000 };
  const hslToHex = (h, s, l) => {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
  };
  const DEFAULT_LEVELS = LEVEL_NAMES.map((name, i) => {
    const lv = i + 1;
    return {
      level: lv,
      name,
      minExp: LEVEL_MIN_EXP[lv] !== undefined ? LEVEL_MIN_EXP[lv] : (lv === 1 ? 0 : Math.round(Math.pow(lv, 2.6) * 22)),
      color: hslToHex(220 - i * (220 / 29), 65, 52)
    };
  });
  const APP_CONFIG = {
    levels: DEFAULT_LEVELS.slice(),
    rewards: {
      VIEW_CONTENT: { exp: 10, coins: 5, label: '內容探索' },
      SHARE: { exp: 15, coins: 10, label: '星際分享' },
      DAILY_LOGIN: { exp: 20, coins: 15, label: '每日報到' }
    },
    topics: [
      {
        id: 'about', name: '關於語薇', desc: '來自2107的未來檔案', requiredLevel: 1,
        itemName: 'ITEM-001 · 全息投影儀',
        itemSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <defs><linearGradient id="beam1" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#d32f2f" stop-opacity="0.1"/><stop offset="100%" stop-color="#d32f2f" stop-opacity="0.9"/></linearGradient><linearGradient id="base1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3a3a4a"/><stop offset="100%" stop-color="#15151f"/></linearGradient></defs>
          <ellipse cx="60" cy="108" rx="38" ry="6" fill="#000" opacity="0.5"/>
          <rect x="30" y="90" width="60" height="16" rx="4" fill="url(#base1)" stroke="#d32f2f" stroke-width="1.5"/>
          <circle cx="42" cy="98" r="2.5" fill="#ffeb3b"/><circle cx="60" cy="98" r="2.5" fill="#d32f2f"/><circle cx="78" cy="98" r="2.5" fill="#4caf50"/>
          <polygon points="40,90 80,90 70,30 50,30" fill="url(#beam1)" stroke="#ff6b6b" stroke-width="1" opacity="0.85"/>
          <circle cx="60" cy="40" r="14" fill="#ffdbac" stroke="#d32f2f" stroke-width="1.2"/>
          <path d="M48 34 Q48 22 60 22 Q72 22 72 34 L72 40 Q60 32 48 40 Z" fill="#1a1a1a"/>
          <rect x="50" y="40" width="20" height="7" rx="2" fill="#1a1a1a" stroke="#d32f2f" stroke-width="0.8"/>
          <path d="M54 50 Q60 54 66 50" stroke="#8b0000" stroke-width="1.2" fill="none" stroke-linecap="round"/>
          <circle cx="28" cy="55" r="1.5" fill="#fff" opacity="0.9"/><circle cx="96" cy="42" r="1" fill="#fff" opacity="0.8"/><circle cx="88" cy="75" r="1.2" fill="#ff8888"/>
        </svg>`
      },
      {
        id: 'music', name: '語薇創作曲', desc: '穿越時空的旋律', requiredLevel: 1,
        itemName: 'ITEM-002 · 星際黑膠唱盤',
        itemSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <defs><radialGradient id="vinyl" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stop-color="#2a2a2a"/><stop offset="85%" stop-color="#0a0a0a"/><stop offset="100%" stop-color="#1a1a1a"/></radialGradient><linearGradient id="plinth" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4a1a1a"/><stop offset="100%" stop-color="#1a0505"/></linearGradient></defs>
          <ellipse cx="60" cy="108" rx="44" ry="5" fill="#000" opacity="0.5"/>
          <rect x="14" y="78" width="92" height="30" rx="5" fill="url(#plinth)" stroke="#d32f2f" stroke-width="1.5"/>
          <circle cx="42" cy="93" r="2" fill="#ffeb3b"/><rect x="78" y="89" width="20" height="8" rx="1.5" fill="#1a1a1a" stroke="#d32f2f" stroke-width="0.8"/>
          <circle cx="52" cy="55" r="32" fill="url(#vinyl)" stroke="#d32f2f" stroke-width="1.2"/>
          <circle cx="52" cy="55" r="28" fill="none" stroke="#333" stroke-width="0.5" stroke-dasharray="1 2"/>
          <circle cx="52" cy="55" r="10" fill="#d32f2f"/><circle cx="52" cy="55" r="2.5" fill="#1a1a1a"/>
          <text x="52" y="58" text-anchor="middle" font-size="5" fill="#fff" font-weight="700" font-family="Arial">ROSE</text>
          <path d="M80 28 Q100 32 98 58 L92 56 Q94 38 78 34 Z" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
          <circle cx="90" cy="56" r="4" fill="#555"/>
          <path d="M92 40 L90 42 M94 45 L92 47" stroke="#d32f2f" stroke-width="1"/>
          <circle cx="100" cy="22" r="1" fill="#fff"/>
        </svg>`
      },
      {
        id: 'daily', name: '語薇日常', desc: '社區搞笑驚喜日記', requiredLevel: 1,
        itemName: 'ITEM-003 · 星際日誌手冊',
        itemSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <defs><linearGradient id="cover" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#b71c1c"/><stop offset="100%" stop-color="#5d0000"/></linearGradient></defs>
          <ellipse cx="60" cy="110" rx="40" ry="5" fill="#000" opacity="0.5"/>
          <rect x="26" y="22" width="68" height="84" rx="4" fill="url(#cover)" stroke="#8b0000" stroke-width="2"/>
          <rect x="22" y="26" width="6" height="76" rx="1" fill="#3a0a0a"/>
          <rect x="36" y="34" width="52" height="3" rx="1" fill="#ffd54f" opacity="0.85"/>
          <rect x="36" y="44" width="44" height="2" rx="1" fill="#fff" opacity="0.4"/>
          <rect x="36" y="52" width="48" height="2" rx="1" fill="#fff" opacity="0.4"/>
          <rect x="36" y="60" width="40" height="2" rx="1" fill="#fff" opacity="0.4"/>
          <rect x="36" y="68" width="46" height="2" rx="1" fill="#fff" opacity="0.4"/>
          <rect x="36" y="76" width="38" height="2" rx="1" fill="#fff" opacity="0.4"/>
          <circle cx="36" cy="90" r="4" fill="none" stroke="#ffd54f" stroke-width="1.5"/>
          <path d="M36 90 L39 93 L42 88" stroke="#ffd54f" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M72 88 Q80 80 86 86 L84 90 Q78 85 72 92 Z" fill="#d32f2f" stroke="#fff" stroke-width="0.8"/>
          <text x="60" y="30" text-anchor="middle" font-size="9" fill="#ffd54f" font-weight="800" font-family="Arial" letter-spacing="1">日誌</text>
          <circle cx="20" cy="18" r="1.2" fill="#fff"/>
        </svg>`
      },
      {
        id: 'toolbox', name: '社區百寶箱', desc: '萬用生活工具集', requiredLevel: 1,
        itemName: 'ITEM-004 · 懸浮工具收納櫃',
        itemSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <defs><linearGradient id="box" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4a4a5a"/><stop offset="100%" stop-color="#1f1f2a"/></linearGradient></defs>
          <ellipse cx="60" cy="110" rx="42" ry="5" fill="#000" opacity="0.5"/>
          <rect x="18" y="30" width="84" height="76" rx="7" fill="url(#box)" stroke="#d32f2f" stroke-width="2"/>
          <rect x="18" y="48" width="84" height="1.5" fill="#d32f2f" opacity="0.6"/>
          <rect x="18" y="68" width="84" height="1.5" fill="#d32f2f" opacity="0.6"/>
          <rect x="24" y="34" width="36" height="12" rx="2" fill="#2a2a38" stroke="#555" stroke-width="0.8"/>
          <circle cx="55" cy="40" r="1.8" fill="#d32f2f"/>
          <rect x="64" y="34" width="34" height="12" rx="2" fill="#2a2a38" stroke="#555" stroke-width="0.8"/>
          <circle cx="95" cy="40" r="1.8" fill="#ffeb3b"/>
          <rect x="24" y="54" width="24" height="12" rx="2" fill="#2a2a38" stroke="#555" stroke-width="0.8"/>
          <circle cx="45" cy="60" r="1.8" fill="#4caf50"/>
          <rect x="52" y="54" width="24" height="12" rx="2" fill="#2a2a38" stroke="#555" stroke-width="0.8"/>
          <path d="M60 57 L66 60 L60 63 Z" fill="#d32f2f"/>
          <rect x="80" y="54" width="18" height="12" rx="2" fill="#2a2a38" stroke="#555" stroke-width="0.8"/>
          <circle cx="95" cy="60" r="1.8" fill="#2196f3"/>
          <rect x="24" y="74" width="84" height="14" rx="2" fill="#2a2a38" stroke="#555" stroke-width="0.8"/>
          <path d="M30 81 L40 77 L50 81 L60 77 L70 81 L80 77 L90 81 L100 77" stroke="#d32f2f" stroke-width="1" fill="none"/>
          <rect x="30" y="92" width="60" height="8" rx="2" fill="#1a1a28" stroke="#d32f2f" stroke-width="1"/>
          <circle cx="60" cy="96" r="2" fill="#ffeb3b">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite"/>
          </circle>
        </svg>`
      },
      {
        id: 'unbox', name: '語薇開箱去', desc: '好物開箱評測', requiredLevel: 2,
        itemName: 'ITEM-005 · 太空貨運膠囊',
        itemSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <defs><linearGradient id="capsule" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#d32f2f"/><stop offset="50%" stop-color="#eeeeee"/><stop offset="100%" stop-color="#d32f2f"/></linearGradient></defs>
          <ellipse cx="60" cy="110" rx="38" ry="5" fill="#000" opacity="0.5"/>
          <path d="M25 55 Q25 25 60 25 Q95 25 95 55 L95 90 Q95 100 60 100 Q25 100 25 90 Z" fill="url(#capsule)" stroke="#8b0000" stroke-width="2"/>
          <path d="M42 25 Q42 18 60 18 Q78 18 78 25" fill="none" stroke="#444" stroke-width="2"/>
          <rect x="50" y="32" width="20" height="14" rx="2" fill="#1a1a1a" stroke="#d32f2f" stroke-width="1.2"/>
          <rect x="52" y="34" width="16" height="10" rx="1" fill="#4fc3f7" opacity="0.8"/>
          <path d="M30 50 L90 50" stroke="#8b0000" stroke-width="2"/>
          <path d="M30 80 L90 80" stroke="#8b0000" stroke-width="2"/>
          <rect x="42" y="58" width="36" height="16" rx="2" fill="#fafafa" stroke="#aaa" stroke-width="0.8"/>
          <rect x="46" y="62" width="10" height="8" fill="#d32f2f"/>
          <text x="72" y="70" text-anchor="middle" font-size="8" font-weight="800" fill="#1a1a1a">NW-ROSE</text>
          <circle cx="42" cy="92" r="2" fill="#1a1a1a" stroke="#8b0000" stroke-width="1"/>
          <circle cx="78" cy="92" r="2" fill="#1a1a1a" stroke="#8b0000" stroke-width="1"/>
          <path d="M100 20 L105 15 L110 25 L104 28 Z" fill="#ffeb3b"/>
          <path d="M15 35 L10 32 L14 40 L19 38 Z" fill="#ffeb3b"/>
        </svg>`
      },
      {
        id: 'neighbor', name: '鄰里好生活', desc: '社區活動與交流', requiredLevel: 2,
        itemName: 'ITEM-006 · 星際通訊控制台',
        itemSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <defs><linearGradient id="console" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3a3a4a"/><stop offset="100%" stop-color="#15151f"/></linearGradient></defs>
          <ellipse cx="60" cy="108" rx="44" ry="5" fill="#000" opacity="0.5"/>
          <path d="M18 50 L28 30 L92 30 L102 50 L102 92 Q102 98 96 98 L24 98 Q18 98 18 92 Z" fill="url(#console)" stroke="#d32f2f" stroke-width="1.8"/>
          <rect x="30" y="40" width="60" height="34" rx="3" fill="#0a0a15" stroke="#555" stroke-width="1"/>
          <rect x="34" y="44" width="52" height="4" rx="1" fill="#4caf50" opacity="0.8"/>
          <circle cx="42" cy="55" r="5" fill="#1a2a3a" stroke="#2196f3" stroke-width="0.8"/>
          <circle cx="42" cy="55" r="2" fill="#2196f3"/>
          <rect x="54" y="50" width="30" height="2" rx="1" fill="#4caf50" opacity="0.8"/>
          <rect x="54" y="56" width="24" height="2" rx="1" fill="#4caf50" opacity="0.6"/>
          <rect x="54" y="62" width="28" height="2" rx="1" fill="#4caf50" opacity="0.7"/>
          <rect x="30" y="80" width="60" height="12" rx="2" fill="#0a0a15" stroke="#555" stroke-width="0.8"/>
          <circle cx="40" cy="86" r="3" fill="#1a1a2a" stroke="#d32f2f" stroke-width="1"/>
          <circle cx="52" cy="86" r="3" fill="#1a1a2a" stroke="#ffeb3b" stroke-width="1"/>
          <circle cx="64" cy="86" r="3" fill="#1a1a2a" stroke="#4caf50" stroke-width="1"/>
          <circle cx="76" cy="86" r="3" fill="#1a1a2a" stroke="#2196f3" stroke-width="1"/>
          <path d="M60 30 L60 14 L52 14 M60 14 L68 14" stroke="#999" stroke-width="1.5" fill="none"/>
          <circle cx="60" cy="12" r="3" fill="#d32f2f">
            <animate attributeName="r" values="2;4;2" dur="1s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>`
      },
      {
        id: 'news', name: '社區快訊', desc: '最新公告與推播', requiredLevel: 1,
        itemName: 'ITEM-007 · 雷射公告顯示幕',
        itemSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <defs><linearGradient id="frame" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2a2a3a"/><stop offset="100%" stop-color="#0a0a15"/></linearGradient></defs>
          <ellipse cx="60" cy="110" rx="42" ry="5" fill="#000" opacity="0.5"/>
          <rect x="22" y="72" width="76" height="34" rx="5" fill="url(#frame)" stroke="#d32f2f" stroke-width="2"/>
          <rect x="30" y="82" width="60" height="16" rx="2" fill="#000"/>
          <text x="60" y="94" text-anchor="middle" font-size="9" font-weight="800" fill="#ff3b3b" font-family="Consolas,monospace" letter-spacing="1">● 語薇公告</text>
          <path d="M18 72 L18 34 L22 30 L98 30 L102 34 L102 72" fill="url(#frame)" stroke="#d32f2f" stroke-width="2"/>
          <rect x="28" y="38" width="64" height="26" rx="2" fill="#0a1a2a" stroke="#334" stroke-width="0.8"/>
          <line x1="34" y1="46" x2="86" y2="46" stroke="#d32f2f" stroke-width="1" opacity="0.9">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
          </line>
          <rect x="34" y="51" width="40" height="2.5" rx="1" fill="#4fc3f7"/>
          <rect x="34" y="56" width="54" height="2.5" rx="1" fill="#81d4fa"/>
          <rect x="34" y="61" width="30" height="2.5" rx="1" fill="#b3e5fc"/>
          <path d="M40 16 L60 24 L80 16 L80 30 L40 30 Z" fill="#d32f2f" stroke="#8b0000" stroke-width="1"/>
          <circle cx="60" cy="22" r="2" fill="#ffeb3b"/>
          <circle cx="30" cy="18" r="1" fill="#fff"/>
          <circle cx="90" cy="22" r="1.2" fill="#ff8888"/>
        </svg>`
      },
      {
        id: 'hero', name: '社區英雄', desc: '守護大使榮譽榜', requiredLevel: 3,
        itemName: 'ITEM-008 · 英雄獎盃展示座',
        itemSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <defs><linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff9c4"/><stop offset="50%" stop-color="#ffd54f"/><stop offset="100%" stop-color="#f57f17"/></linearGradient></defs>
          <ellipse cx="60" cy="110" rx="40" ry="5" fill="#000" opacity="0.5"/>
          <rect x="30" y="94" width="60" height="14" rx="3" fill="#1a1a28" stroke="#d32f2f" stroke-width="1.5"/>
          <rect x="42" y="82" width="36" height="14" rx="2" fill="#2a2a3a" stroke="#d32f2f" stroke-width="1.2"/>
          <rect x="50" y="72" width="20" height="12" rx="1" fill="#5d4037"/>
          <path d="M44 40 Q30 40 30 56 Q30 70 44 70 L44 72 L50 72 L50 70 Q56 68 60 60 Q64 68 70 70 L70 72 L76 72 L76 70 Q90 70 90 56 Q90 40 76 40 L76 32 Q76 22 60 22 Q44 22 44 32 Z" fill="url(#gold)" stroke="#ff6f00" stroke-width="1.5"/>
          <path d="M44 40 Q50 52 60 52 Q70 52 76 40" fill="none" stroke="#ff6f00" stroke-width="1.2"/>
          <path d="M30 40 L20 34 L22 50 L30 56 Z" fill="url(#gold)" stroke="#ff6f00" stroke-width="1.5"/>
          <path d="M90 40 L100 34 L98 50 L90 56 Z" fill="url(#gold)" stroke="#ff6f00" stroke-width="1.5"/>
          <polygon points="60,3 61.8,9 68,9 63,12.5 64.8,18.5 60,15 55.2,18.5 57,12.5 52,9 58.2,9" fill="#e53935" stroke="#8b0000" stroke-width="0.8"/>
          <circle cx="60" cy="55" r="4" fill="none" stroke="#d32f2f" stroke-width="1.2"/>
          <path d="M60 52 L60 58 M57 55 L63 55" stroke="#d32f2f" stroke-width="1"/>
          <circle cx="26" cy="22" r="1" fill="#fff"/>
          <circle cx="98" cy="16" r="1.2" fill="#ffeb3b"/>
          <circle cx="106" cy="66" r="1" fill="#ff8888"/>
        </svg>`
      }
    ]
  };
  window.APP_CONFIG = APP_CONFIG;

  // ============ ROLE CONFIG ============
  // 預設管理員帳號（不分大小寫）。登入後自動導向 admin.html。
  const ADMIN_EMAILS = ['istage.eason@gmail.com', 'nwcom.rose@gmail.com'];
  // 艦長（LV30）固定帳號與名稱，永不變更
  const CAPTAIN_EMAIL = 'nwcom.rose@gmail.com';
  const CAPTAIN_NAME = '西北語薇';
  const CAPTAIN_LEVEL = 30;
  const VICE_CAPTAIN_LEVEL = 29;
  // LV25~LV28 需申請加入，EXP 門檻 500000
  const APPLY_LEVEL_MIN = 25;
  const APPLY_LEVEL_MAX = 28;
  const APPLY_REQUIRED_EXP = 500000;
  // 副艦長（LV29）EXP 門檻 10000000，由艦長指定派任
  const VICE_CAPTAIN_REQUIRED_EXP = 10000000;
  // 自動升級上限（LV24），超過需申請或派任
  const AUTO_LEVEL_MAX = 24;

  function resolveRole(email) {
    if (!email) return 'member';
    return ADMIN_EMAILS.includes(String(email).toLowerCase()) ? 'admin' : 'member';
  }

  // 判斷是否為管理員 Email 白名單（含艦長）
  function isAdminEmail(email) {
    return !!email && ADMIN_EMAILS.includes(String(email).toLowerCase());
  }

  // 判斷是否為排除編號的帳號（管理員）；艦長不排除，固定為「1」
  function isExcludedFromNumbering(email) {
    const e = String(email || '').toLowerCase();
    if (e === CAPTAIN_EMAIL) return false;
    return ADMIN_EMAILS.includes(e);
  }

  // 產生推薦碼：NW + 6 碼零填補的艙員編號
  function makeReferralCode(memberNo) {
    const n = Number(memberNo);
    if (!n || n < 1) return '';
    return 'NW' + String(n).padStart(6, '0');
  }

  // 取得下一個可用的艙員編號（查詢所有用戶的 memberNo 取最大值 +1）
  async function getNextMemberNo() {
    try {
      const snap = await db.collection('users').get();
      let maxNo = 1; // 艦長固定為 1
      snap.forEach(doc => {
        const m = doc.data();
        const no = Number(m?.memberNo);
        if (no && no > maxNo) maxNo = no;
      });
      return String(maxNo + 1);
    } catch (e) {
      console.error('取得下一個艙員編號失敗', e);
      return String(Date.now()); //  fallback：用時間戳避免重複
    }
  }
  // 判斷當前是否為管理後台頁面，避免重複跳轉
  function isOnAdminPage() {
    return /admin\.html/i.test(location.pathname + location.hash);
  }
  // 依角色執行頁面導向（管理員或 Email 白名單 → admin.html；其餘留在此站）
  // 若 sessionStorage 有 nwrose_stay_frontend 旗標，表示管理員主動切換到前台，略過導向
  function handleRoleRedirect() {
    if (sessionStorage.getItem('nwrose_stay_frontend')) return;
    const isAdmin = state.userData && (state.userData.role === 'admin' || isAdminEmail(state.userData.email));
    if (isAdmin && !isOnAdminPage()) {
      window.location.replace('admin.html');
    }
  }

  // ============ STATE ============
  const state = {
    user: null,
    userData: null,
    authMode: 'login', // login | register
    currentPage: 'home',
    installPromptEvent: null,
    viewTimers: {}
  };
  window.STATE = state;

  // ============ STARRY BACKGROUND ============
  function createStars() {
    const bg = document.getElementById('starsBg');
    if (!bg) return;
    const count = 120;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'star ' + (i % 3 === 0 ? 'layer-1' : 'layer-2');
      const size = Math.random() * 2.5 + 0.5;
      star.style.width = size + 'px';
      star.style.height = size + 'px';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + 100 + '%';
      star.style.opacity = Math.random() * 0.6 + 0.2;
      const duration = Math.random() * 8 + 6;
      star.style.animationDuration = duration + 's';
      star.style.animationDelay = -Math.random() * duration + 's';
      bg.appendChild(star);
    }
  }
  createStars();

  // ============ ROUTER & PAGES ============
  function bindCockpitHotspots() {
    const btns = document.querySelectorAll('.cockpit-hotspots .hotspot-btn');
    btns.forEach(btn => {
      const topicId = btn.dataset.topic;
      if (!topicId) return;
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        navigateToSubpage(topicId);
      });
    });
  }
  bindCockpitHotspots();

  function ensureSubpageDom(topic) {
    let page = document.getElementById('page-' + topic.id);
    if (page) return page;
    page = document.createElement('section');
    page.className = 'page subpage-layout';
    page.id = 'page-' + topic.id;
    page.dataset.level = topic.requiredLevel;
    page.dataset.topicId = topic.id;
    page.innerHTML = `
      <div class="subpage-header">
        <button class="back-btn" aria-label="返回">←</button>
        <h2 class="subpage-title">${topic.icon} ${topic.name}</h2>
      </div>
      <div class="subpage-content">
        <div style="font-size: clamp(48px,10vw,96px); margin-bottom:10px;">${topic.icon}</div>
        <div class="placeholder-title">${topic.name}</div>
        <div class="placeholder-subtitle">${topic.desc}<br/>精彩內容即將上線，敬請期待星際續集！</div>
        <button class="btn" style="margin-top:20px;" data-action="share">🌠 分享到星際</button>
      </div>
    `;
    document.querySelector('.main-content').appendChild(page);
    const back = page.querySelector('.back-btn');
    if (back) back.addEventListener('click', () => navigateTo('home'));
    const share = page.querySelector('[data-action="share"]');
    if (share) share.addEventListener('click', () => triggerInteraction('SHARE'));
    return page;
  }
  APP_CONFIG.topics.forEach(ensureSubpageDom);

  function showPage(pageId, addTransition = true) {
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active', 'page-transition');
    });
    const target = document.getElementById('page-' + pageId);
    if (target) {
      target.classList.add('active');
      if (addTransition) {
        target.classList.add('page-transition');
        setTimeout(() => target.classList.remove('page-transition'), 900);
      }
    }
    state.currentPage = pageId;
    if (location.hash !== '#' + pageId) {
      history.replaceState(null, '', '#' + pageId);
    }
    if (pageId !== 'home') startViewTimer(pageId);
    // 切換到非登艦入口頁面時，重置登艦入口狀態
    if (pageId !== 'boarding' && boardingOpen) {
      boardingOpen = false;
      const bp = document.getElementById('page-boarding');
      if (bp) bp.classList.remove('active', 'leaving');
    }
  }

  function navigateTo(pageId) {
    if (pageId === 'home') { showPage('home'); return; }
    const topic = APP_CONFIG.topics.find(t => t.id === pageId);
    if (!topic) return;
    if (!state.user) { openAuthModal('login', `需登入才能進入「${topic.name}」`); return; }
    if (state.userData && state.userData.level < topic.requiredLevel) {
      const need = APP_CONFIG.levels.find(l => l.level === topic.requiredLevel);
      showToast(`此區域需要「${need ? need.name : '等級'+topic.requiredLevel}」才能解鎖哦！`, 'error');
      return;
    }
    showPage(pageId);
  }
  function navigateToSubpage(id) { navigateTo(id); }
  window.navigateTo = navigateTo;

  function handleHashChange() {
    const hash = (location.hash || '#home').slice(1) || 'home';
    if (hash === 'home') showPage('home', false);
    else if (hash === 'boarding') showBoardingPage();
    else navigateTo(hash);
  }
  window.addEventListener('hashchange', handleHashChange);
  setTimeout(handleHashChange, 0);

  // ============ REWARDS ============
  function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  }
  function showRewardFloat(text, originX, originY) {
    const el = document.createElement('div');
    el.className = 'reward-float';
    el.textContent = text;
    el.style.left = (originX || window.innerWidth / 2) + 'px';
    el.style.top = (originY || window.innerHeight / 2) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }

  // 自訂 Toast 提示（取代原生 alert）
  function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) { alert(msg); return; }
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2800);
  }
  window.showToast = showToast;
  async function grantReward(type, ev) {
    if (!state.user || !state.userData) return;
    const cfg = APP_CONFIG.rewards[type];
    if (!cfg) return;
    const uid = state.user.uid;
    const today = getTodayKey();
    const uniqueKey = `${type}:${today}`;
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) return;
    const u = userSnap.data();
    if (type === 'DAILY_LOGIN') {
      const interactions = u.interactions || [];
      if (interactions.some(x => x.key === uniqueKey)) return;
    }
    const newExp = (u.exp || 0) + cfg.exp;
    const newCoins = (u.coins || 0) + cfg.coins;
    const oldLevel = u.level || 1;
    // 艦長帳號等級固定不變
    const isCaptain = String(u.email || '').toLowerCase() === CAPTAIN_EMAIL;
    let newLevel = oldLevel;
    if (!isCaptain) {
      // 自動升級僅限 LV1~LV24；LV25+ 需申請或派任
      for (const lv of APP_CONFIG.levels) {
        if (lv.level <= AUTO_LEVEL_MAX && newExp >= lv.minExp) newLevel = lv.level;
      }
    }
    await db.collection('users').doc(uid).update({
      exp: newExp,
      coins: newCoins,
      level: newLevel,
      interactions: firebase.firestore.FieldValue.arrayUnion({
        type,
        key: uniqueKey,
        exp: cfg.exp,
        coins: cfg.coins,
        at: Date.now()
      })
    });
    state.userData = { ...(state.userData || {}), exp: newExp, coins: newCoins, level: newLevel };
    renderUserCard();
    const x = ev && ev.clientX ? ev.clientX : undefined;
    const y = ev && ev.clientY ? ev.clientY : undefined;
    showRewardFloat(`+${cfg.exp} EXP  +${cfg.coins} ✦`, x, y);
    if (newLevel > oldLevel) triggerLevelUp(newLevel);
  }
  window.grantReward = grantReward;

  function triggerInteraction(type, ev) {
    if (!state.user) { openAuthModal('login'); return; }
    grantReward(type, ev).catch(err => console.warn('獎勵發送失敗', err));
  }
  function startViewTimer(pageId) {
    if (state.viewTimers[pageId]) clearTimeout(state.viewTimers[pageId]);
    state.viewTimers[pageId] = setTimeout(() => {
      if (state.currentPage === pageId) grantReward('VIEW_CONTENT').catch(()=>{});
    }, 5000);
  }

  function getCurrentLevelInfo(lv) {
    const list = APP_CONFIG.levels;
    for (let i = list.length - 1; i >= 0; i--) {
      if (lv >= list[i].level) return list[i];
    }
    return list[0];
  }

  // 取得可申請的下一個位階（LV25~LV28），若無則回傳 null
  function getApplicableLevel() {
    if (!state.userData) return null;
    const curLv = Number(state.userData.level || 1);
    const nextLv = curLv + 1;
    if (nextLv < APPLY_LEVEL_MIN || nextLv > APPLY_LEVEL_MAX) return null;
    if (Number(state.userData.exp || 0) < APPLY_REQUIRED_EXP) return null;
    // 若已有 pending 申請，不重複申請
    const app = state.userData.levelApplication;
    if (app && app.status === 'pending') return null;
    return nextLv;
  }

  // 送出升階申請
  async function applyLevelUp(targetLevel) {
    if (!state.user || !state.userData) return;
    const app = {
      targetLevel,
      status: 'pending',
      appliedAt: Date.now(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: ''
    };
    try {
      await db.collection('users').doc(state.user.uid).update({ levelApplication: app });
      state.userData.levelApplication = app;
      renderUserCard();
      showToast(`已送出 LV${targetLevel} 升階申請，請等候艦長或副艦長核准。`, 'success');
    } catch (e) {
      console.error('申請失敗', e);
      showToast('申請失敗：' + (e.message || e), 'error');
    }
  }
  window.applyLevelUp = applyLevelUp;

  function renderUserCard() {
    const cert = document.getElementById('starlightCert');
    const authBtn = document.getElementById('authBtn');
    if (!state.user || !state.userData) {
      cert.style.display = 'none';
      if (authBtn) authBtn.textContent = '登入 / 註冊';
      return;
    }
    // 管理員帳號（不含艦長）不顯示 EXP/星幣區塊
    if (isExcludedFromNumbering(state.userData.email)) {
      cert.style.display = 'none';
      if (authBtn) authBtn.textContent = state.userData.displayName ? state.userData.displayName.slice(0,8) : '登出';
      return;
    }
    cert.style.display = 'flex';
    const lvInfo = getCurrentLevelInfo(state.userData.level);
    document.getElementById('userLevel').textContent = `LV${state.userData.level} ${lvInfo.name}`;
    const nextLv = APP_CONFIG.levels.find(l => l.level === state.userData.level + 1);
    let pct = 100;
    if (nextLv) {
      const curMin = lvInfo.minExp;
      const range = nextLv.minExp - curMin;
      pct = Math.min(100, Math.max(0, ((state.userData.exp - curMin) / (range || 1)) * 100));
    }
    document.getElementById('userExpBar').style.width = pct + '%';
    document.getElementById('userCoins').textContent = state.userData.coins || 0;
    if (authBtn) authBtn.textContent = state.userData.displayName ? state.userData.displayName.slice(0,8) : '登出';

    // 升階申請提示
    const applyTip = document.getElementById('levelApplyTip');
    if (applyTip) {
      const app = state.userData.levelApplication;
      const applicable = getApplicableLevel();
      if (app && app.status === 'pending') {
        applyTip.innerHTML = `<span class="apply-pending">LV${app.targetLevel} 申請審核中…</span>`;
        applyTip.style.display = 'block';
      } else if (applicable) {
        applyTip.innerHTML = `<button class="apply-btn" type="button" onclick="applyLevelUp(${applicable})">申請 LV${applicable}</button>`;
        applyTip.style.display = 'block';
      } else if (app && app.status === 'rejected') {
        applyTip.innerHTML = `<span class="apply-rejected">申請被駁回${app.reviewNote ? '：' + app.reviewNote : ''}</span>`;
        applyTip.style.display = 'block';
      } else {
        applyTip.style.display = 'none';
        applyTip.innerHTML = '';
      }
    }
  }

  // ============ 登艦入口（星光證） ============
  let boardingOpen = false;

  function renderStarlightCard() {
    const card = document.getElementById('starlightCard');
    const stats = document.querySelector('.card-stats');
    if (!card) return;
    const photo = document.getElementById('cardPhoto');
    const nameEl = document.getElementById('cardName');
    const memberNoEl = document.getElementById('cardMemberNo');
    const levelCodeEl = document.getElementById('cardLevelCode');
    const levelNameEl = document.getElementById('cardLevelName');
    const expEl = document.getElementById('cardExp');
    const coinsEl = document.getElementById('cardCoins');
    const canvas = document.getElementById('cardQrCanvas');
    const content = document.querySelector('.boarding-content');

    // 未登入：顯示提示
    if (!state.user || !state.userData) {
      card.style.display = 'none';
      if (stats) stats.style.display = 'none';
      let hint = content.querySelector('.boarding-login-hint');
      if (!hint) {
        hint = document.createElement('div');
        hint.className = 'boarding-login-hint';
        hint.textContent = '請先登入以領取你的星光證';
        content.appendChild(hint);
      }
      return;
    }
    // 隱藏未登入提示
    const hint = content.querySelector('.boarding-login-hint');
    if (hint) hint.remove();
    card.style.display = 'flex';

    const u = state.userData;
    // 管理員帳號（不含艦長）不顯示星點/星幣
    const excluded = isExcludedFromNumbering(u.email);
    if (stats) stats.style.display = excluded ? 'none' : 'flex';
    // 大頭照
    if (photo) {
      if (u.photoURL) {
        photo.src = u.photoURL;
        photo.style.display = 'block';
        const ph = photo.parentElement.querySelector('.photo-placeholder');
        if (ph) ph.style.display = 'none';
      } else {
        photo.style.display = 'none';
        const ph = photo.parentElement.querySelector('.photo-placeholder');
        if (ph) ph.style.display = 'flex';
      }
    }
    // 暱稱
    if (nameEl) nameEl.textContent = u.displayName || '艙員';
    // 艙員編號
    const memberNo = u.memberNo || '--';
    if (memberNoEl) memberNoEl.textContent = memberNo;
    // 位階
    const lvInfo = getCurrentLevelInfo(u.level || 1);
    if (levelCodeEl) levelCodeEl.textContent = `LV${u.level || 1}`;
    if (levelNameEl) levelNameEl.textContent = lvInfo.name;
    // 星點 / 星幣
    if (expEl) expEl.textContent = Number(u.exp || 0).toLocaleString();
    if (coinsEl) coinsEl.textContent = Number(u.coins || 0).toLocaleString();
    // QR Code（推薦碼 = 會員號）
    if (canvas) {
      const qrText = u.referralCode || (u.memberNo ? 'NW' + String(Number(u.memberNo)).padStart(6, '0') : '');
      if (window.QRCode && qrText) {
        // qrcodejs 庫：每次先清空容器再建立
        canvas.innerHTML = '';
        try {
          new window.QRCode(canvas, {
            text: qrText,
            width: 200,
            height: 200,
            colorDark: '#1a0a0a',
            colorLight: '#ffffff',
            correctLevel: window.QRCode.CorrectLevel.M
          });
        } catch (err) {
          console.warn('QR 產生失敗', err);
        }
      }
    }
  }

  function showBoardingPage() {
    const page = document.getElementById('page-boarding');
    if (!page || boardingOpen) return;
    boardingOpen = true;
    state.currentPage = 'boarding';
    if (location.hash !== '#boarding') {
      history.replaceState(null, '', '#boarding');
    }
    renderStarlightCard();
    page.classList.remove('leaving');
    page.classList.add('active');

    // 重新觸發氣閘門開啟動畫
    const doors = page.querySelectorAll('.door-left, .door-right');
    doors.forEach(d => {
      d.style.animation = 'none';
      // 強制 reflow
      void d.offsetHeight;
      d.style.animation = '';
    });
  }

  function hideBoardingPage() {
    const page = document.getElementById('page-boarding');
    if (!page || !boardingOpen) return;
    boardingOpen = false;
    state.currentPage = 'home';
    if (location.hash !== '#home') {
      history.replaceState(null, '', '#home');
    }
    page.classList.add('leaving');
    setTimeout(() => {
      page.classList.remove('active', 'leaving');
    }, 340);
  }

  // 返回按鈕
  const boardingBackBtn = document.getElementById('boardingBackBtn');
  if (boardingBackBtn) boardingBackBtn.addEventListener('click', hideBoardingPage);

  // 首頁滑動手勢：由左向右滑 → 顯示登艦入口
  (function initBoardingSwipe() {
    const home = document.getElementById('page-home');
    if (!home) return;
    let startX = 0, startY = 0, tracking = false;
    const THRESHOLD = 60; // 滑動超過 60px 即觸發
    const VERTICAL_LIMIT = 50; // 垂直偏移超過此值視為非水平滑動

    function onStart(x, y) {
      startX = x; startY = y; tracking = true;
    }
    function onMove(x, y) {
      if (!tracking) return;
      const dx = x - startX;
      const dy = Math.abs(y - startY);
      // 由左向右滑，且水平為主
      if (dx > THRESHOLD && dy < VERTICAL_LIMIT && state.currentPage === 'home') {
        tracking = false;
        showBoardingPage();
      }
    }
    function onEnd() { tracking = false; }

    // Touch 事件
    home.addEventListener('touchstart', e => {
      const t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }, { passive: true });
    home.addEventListener('touchmove', e => {
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: true });
    home.addEventListener('touchend', onEnd);

    // Mouse 事件（電腦）
    home.addEventListener('mousedown', e => {
      onStart(e.clientX, e.clientY);
    });
    home.addEventListener('mousemove', e => {
      if (e.buttons !== 1) return; // 僅左鍵拖曳
      onMove(e.clientX, e.clientY);
    });
    home.addEventListener('mouseup', onEnd);
    home.addEventListener('mouseleave', onEnd);
  })();

  // 登艦入口左滑返回首頁
  (function initBoardingBackSwipe() {
    const page = document.getElementById('page-boarding');
    if (!page) return;
    let startX = 0, startY = 0, tracking = false;
    const THRESHOLD = 60;
    const VERTICAL_LIMIT = 50;

    function onStart(x, y) { startX = x; startY = y; tracking = true; }
    function onMove(x, y) {
      if (!tracking) return;
      const dx = x - startX;
      const dy = Math.abs(y - startY);
      // 由右向左滑 → 返回首頁
      if (dx < -THRESHOLD && dy < VERTICAL_LIMIT) {
        tracking = false;
        hideBoardingPage();
      }
    }
    function onEnd() { tracking = false; }

    page.addEventListener('touchstart', e => {
      const t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }, { passive: true });
    page.addEventListener('touchmove', e => {
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: true });
    page.addEventListener('touchend', onEnd);
    page.addEventListener('mousedown', e => onStart(e.clientX, e.clientY));
    page.addEventListener('mousemove', e => {
      if (e.buttons !== 1) return;
      onMove(e.clientX, e.clientY);
    });
    page.addEventListener('mouseup', onEnd);
    page.addEventListener('mouseleave', onEnd);
  })();

  // 暴露給外部（hash 變化時使用）
  window.showBoardingPage = showBoardingPage;
  window.hideBoardingPage = hideBoardingPage;

  function triggerLevelUp(newLevel) {
    const info = getCurrentLevelInfo(newLevel);
    const overlay = document.getElementById('levelUpOverlay');
    const badge = document.getElementById('levelUpBadge');
    const title = document.getElementById('levelUpTitle');
    badge.textContent = `LV ${newLevel}`;
    title.textContent = `升級為 ${info.name}！`;
    overlay.classList.remove('active');
    void overlay.offsetWidth;
    overlay.classList.add('active');
    setTimeout(() => overlay.classList.remove('active'), 2200);
  }

  // ============ AUTH ============
  const authModal = document.getElementById('authModal');
  const authBtn = document.getElementById('authBtn');
  const modalTitle = document.getElementById('authModalTitle');
  const modalSubtitle = document.getElementById('authModalSubtitle');
  const nameGroup = document.getElementById('nameGroup');
  const authSubmit = document.getElementById('authSubmitBtn');
  const authSwitch = document.getElementById('authModeSwitch');
  const authForm = document.getElementById('authForm');
  const googleBtn = document.getElementById('googleSignInBtn');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const inputEmail = document.getElementById('inputEmail');
  const inputPassword = document.getElementById('inputPassword');
  const rememberMe = document.getElementById('rememberMe');
  const REMEMBER_EMAIL_KEY = 'nwrose_remember_email';

  // ===== 顯示/隱藏密碼切換 =====
  if (togglePasswordBtn && inputPassword) {
    togglePasswordBtn.addEventListener('click', () => {
      const eyeOn = togglePasswordBtn.querySelector('.eye-icon');
      const eyeOff = togglePasswordBtn.querySelector('.eye-off-icon');
      const isPassword = inputPassword.type === 'password';
      inputPassword.type = isPassword ? 'text' : 'password';
      if (eyeOn) eyeOn.style.display = isPassword ? 'none' : '';
      if (eyeOff) eyeOff.style.display = isPassword ? '' : 'none';
      togglePasswordBtn.setAttribute('aria-label', isPassword ? '隱藏密碼' : '顯示密碼');
    });
  }

  function openAuthModal(mode = 'login', subtitle = null) {
    state.authMode = mode;
    if (mode === 'register') {
      modalTitle.textContent = '註冊星光證';
      modalSubtitle.textContent = subtitle || '建立你的專屬星際身分';
      nameGroup.style.display = 'block';
      authSubmit.textContent = '註冊並登入';
      authSwitch.textContent = '已有星光證？前往登入';
    } else {
      modalTitle.textContent = '登入星光號';
      modalSubtitle.textContent = subtitle || '與語薇一起展開星際冒險';
      nameGroup.style.display = 'none';
      authSubmit.textContent = '登入';
      authSwitch.textContent = '還沒有星光證？立即註冊';
    }
    // 載入記住的 email
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (inputEmail && savedEmail) {
      inputEmail.value = savedEmail;
      if (rememberMe) rememberMe.checked = true;
    } else if (rememberMe) {
      rememberMe.checked = false;
    }
    authModal.classList.add('active');
  }
  function closeAuthModal() { authModal.classList.remove('active'); }
  authModal.addEventListener('click', e => { if (e.target === authModal) closeAuthModal(); });

  // ===== 登出確認 Modal =====
  const logoutModal = document.getElementById('logoutModal');
  const logoutCancelBtn = document.getElementById('logoutCancelBtn');
  const logoutConfirmBtn = document.getElementById('logoutConfirmBtn');
  const logoutSwitchAdminBtn = document.getElementById('logoutSwitchAdminBtn');
  const logoutUserText = document.getElementById('logoutUserText');
  function openLogoutModal() {
    if (logoutUserText) {
      const name = (state.userData && state.userData.displayName)
        || (state.user && state.user.email && state.user.email.split('@')[0])
        || '艙員';
      logoutUserText.textContent = `${name}，即將離開星光號`;
    }
    // 僅管理員（含 Email 白名單）顯示「切換系統後台」按鈕
    if (logoutSwitchAdminBtn) {
      const isAdmin = state.userData && (state.userData.role === 'admin' || isAdminEmail(state.userData.email));
      logoutSwitchAdminBtn.style.display = isAdmin ? '' : 'none';
    }
    if (logoutModal) logoutModal.classList.add('active');
  }
  function closeLogoutModal() { if (logoutModal) logoutModal.classList.remove('active'); }
  if (logoutCancelBtn) logoutCancelBtn.addEventListener('click', closeLogoutModal);
  if (logoutConfirmBtn) logoutConfirmBtn.addEventListener('click', () => {
    closeLogoutModal();
    sessionStorage.removeItem('nwrose_stay_frontend');
    auth.signOut().catch(err => console.warn(err));
  });
  if (logoutSwitchAdminBtn) logoutSwitchAdminBtn.addEventListener('click', () => {
    closeLogoutModal();
    // 清除前台停留旗標，讓管理員返回後台
    sessionStorage.removeItem('nwrose_stay_frontend');
    window.location.href = 'admin.html';
  });
  if (logoutModal) logoutModal.addEventListener('click', e => {
    if (e.target === logoutModal) closeLogoutModal();
  });

  if (authBtn) authBtn.addEventListener('click', () => {
    if (state.user) {
      openLogoutModal();
    } else {
      openAuthModal('login');
    }
  });
  if (authSwitch) authSwitch.addEventListener('click', () => {
    openAuthModal(state.authMode === 'login' ? 'register' : 'login');
  });
  if (authForm) authForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = inputEmail.value.trim();
    const password = inputPassword.value;
    const name = document.getElementById('inputName').value.trim();
    authSubmit.disabled = true;
    try {
      if (state.authMode === 'register') {
        const uc = await auth.createUserWithEmailAndPassword(email, password);
        const displayName = name || uc.user.email.split('@')[0];
        await uc.user.updateProfile({ displayName });
        await ensureUserDoc(uc.user, displayName);
      } else {
        await auth.signInWithEmailAndPassword(email, password);
      }
      // 處理「記住我」：勾選則保存 email，否則清除
      if (rememberMe && rememberMe.checked) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
      closeAuthModal();
      authForm.reset();
    } catch (err) {
      showToast('驗證失敗：' + (err.message || err.code), 'error');
    } finally {
      authSubmit.disabled = false;
    }
  });
  if (googleBtn) googleBtn.addEventListener('click', async () => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const r = await auth.signInWithPopup(provider);
      await ensureUserDoc(r.user, r.user.displayName);
      closeAuthModal();
    } catch (err) {
      if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
        showToast('Google 登入失敗：' + (err.message || err.code), 'error');
      }
    }
  });

  async function ensureUserDoc(user, displayNameOverride) {
    const isCaptain = String(user.email || '').toLowerCase() === CAPTAIN_EMAIL;
    const snap = await db.collection('users').doc(user.uid).get();
    if (snap.exists) {
      state.userData = snap.data();
      // 艦長帳號：強制 LV30、角色 member、固定名稱，永不變更
      if (isCaptain) {
        const forced = {
          level: CAPTAIN_LEVEL,
          role: 'member',
          displayName: CAPTAIN_NAME,
          memberNo: '1',
          referralCode: makeReferralCode('1')
        };
        const changed = state.userData.level !== CAPTAIN_LEVEL ||
          state.userData.role !== 'member' ||
          state.userData.displayName !== CAPTAIN_NAME ||
          state.userData.memberNo !== '1';
        if (changed) {
          await db.collection('users').doc(user.uid).update(forced).catch(() => {});
          state.userData = { ...state.userData, ...forced };
        }
      } else if (!state.userData.role) {
        const role = resolveRole(user.email);
        state.userData.role = role;
        await db.collection('users').doc(user.uid).update({ role }).catch(() => {});
      }
      // 補填：非管理員用戶若缺少 memberNo，自動配發序號
      if (!isCaptain && !isExcludedFromNumbering(user.email) && !state.userData.memberNo) {
        const nextNo = await getNextMemberNo();
        const refCode = makeReferralCode(nextNo);
        await db.collection('users').doc(user.uid).update({ memberNo: nextNo, referralCode: refCode }).catch(() => {});
        state.userData = { ...state.userData, memberNo: nextNo, referralCode: refCode };
      }
      const today = getTodayKey();
      const inter = state.userData.interactions || [];
      const hasDaily = inter.some(x => x.key === `DAILY_LOGIN:${today}`);
      if (!hasDaily) await grantReward('DAILY_LOGIN').catch(()=>{});
      else renderUserCard();
      handleRoleRedirect();
      return;
    }
    const displayName = isCaptain ? CAPTAIN_NAME : (displayNameOverride || user.displayName || user.email.split('@')[0]);
    const excluded = isExcludedFromNumbering(user.email);
    let memberNo = '';
    let referralCode = '';
    if (isCaptain) {
      memberNo = '1';
      referralCode = makeReferralCode('1');
    } else if (!excluded) {
      memberNo = await getNextMemberNo();
      referralCode = makeReferralCode(memberNo);
    }
    const data = {
      uid: user.uid,
      displayName,
      photoURL: user.photoURL || '',
      email: user.email || '',
      role: isCaptain ? 'member' : resolveRole(user.email),
      level: isCaptain ? CAPTAIN_LEVEL : 1,
      exp: 0,
      coins: 0,
      createdAt: Date.now(),
      interactions: [],
      memberNo,
      referralCode
    };
    await db.collection('users').doc(user.uid).set(data);
    state.userData = data;
    renderUserCard();
    if (!isCaptain) await grantReward('DAILY_LOGIN').catch(()=>{});
    handleRoleRedirect();
  }

  if (window.auth) {
    auth.onAuthStateChanged(async user => {
      state.user = user;
      if (user) {
        try {
          const snap = await db.collection('users').doc(user.uid).get();
          if (snap.exists) {
            state.userData = snap.data();
            const isCaptain = String(user.email || '').toLowerCase() === CAPTAIN_EMAIL;
            if (isCaptain) {
              // 艦長帳號：強制維持 LV30、角色 member、固定名稱
              const changed = state.userData.level !== CAPTAIN_LEVEL ||
                state.userData.role !== 'member' ||
                state.userData.displayName !== CAPTAIN_NAME;
              if (changed) {
                const forced = { level: CAPTAIN_LEVEL, role: 'member', displayName: CAPTAIN_NAME };
                db.collection('users').doc(user.uid).update(forced).catch(() => {});
                state.userData = { ...state.userData, ...forced };
              }
            } else if (!state.userData.role) {
              const role = resolveRole(user.email);
              state.userData.role = role;
              db.collection('users').doc(user.uid).update({ role }).catch(() => {});
            }
            handleRoleRedirect();
          } else {
            await ensureUserDoc(user);
          }
        } catch (e) { console.warn('用戶資料讀取失敗', e); }
      } else {
        state.userData = null;
        if (state.currentPage !== 'home') navigateTo('home');
      }
      renderUserCard();
    });
  } else {
    renderUserCard();
  }

  // ============ PWA INSTALL ============
  // 偵測是否已安裝為獨立應用（standalone 模式 / iOS standalone）
  function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // 若已安裝，隱藏所有安裝提示並結束
  if (isAppInstalled()) {
    const headerInstallBtn = document.getElementById('installBtn');
    if (headerInstallBtn) headerInstallBtn.style.display = 'none';
  } else {
    // 安裝提示關閉記憶（24 小時內不再自動彈出）
    const PWA_DISMISS_KEY = 'nwrose_pwa_dismissed_until';
    function shouldShowPwaPrompt() {
      const until = parseInt(localStorage.getItem(PWA_DISMISS_KEY) || '0', 10);
      return Date.now() > until;
    }
    function dismissPwaPromptFor(hours) {
      localStorage.setItem(PWA_DISMISS_KEY, String(Date.now() + hours * 3600 * 1000));
    }

    function showPwaInstallModal() {
      const modal = document.getElementById('pwaInstallModal');
      if (modal) modal.classList.add('active');
    }
    function hidePwaInstallModal() {
      const modal = document.getElementById('pwaInstallModal');
      if (modal) modal.classList.remove('active');
    }

    // beforeinstallprompt 觸發：儲存事件、顯示 header 按鈕、延遲自動彈窗
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      state.installPromptEvent = e;
      const headerBtn = document.getElementById('installBtn');
      if (headerBtn) headerBtn.style.display = 'inline-block';
      // 若使用者最近沒關閉過，延遲 2.5 秒自動彈出安裝提示
      if (shouldShowPwaPrompt()) {
        setTimeout(showPwaInstallModal, 2500);
      }
    });

    // 安裝完成事件：隱藏所有安裝提示
    window.addEventListener('appinstalled', () => {
      state.installPromptEvent = null;
      const headerBtn = document.getElementById('installBtn');
      if (headerBtn) headerBtn.style.display = 'none';
      hidePwaInstallModal();
      dismissPwaPromptFor(24 * 365); // 安裝後一年內不再提示
    });

    // 立即安裝按鈕（modal 內）
    const pwaInstallBtn = document.getElementById('pwaInstallBtn');
    if (pwaInstallBtn) pwaInstallBtn.addEventListener('click', async () => {
      if (!state.installPromptEvent) {
        // 若 beforeinstallprompt 未觸發（例如 iOS Safari），提示手動安裝方式
        showToast('請點擊瀏覽器分享按鈕 →「加入主畫面」來安裝西北語薇', 'info');
        return;
      }
      state.installPromptEvent.prompt();
      const choice = await state.installPromptEvent.userChoice;
      state.installPromptEvent = null;
      hidePwaInstallModal();
      if (choice.outcome === 'accepted') {
        const headerBtn = document.getElementById('installBtn');
        if (headerBtn) headerBtn.style.display = 'none';
      } else {
        dismissPwaPromptFor(24); // 使用者拒絕，24 小時內不再提示
      }
    });

    // 稍後再說按鈕
    const pwaLaterBtn = document.getElementById('pwaLaterBtn');
    if (pwaLaterBtn) pwaLaterBtn.addEventListener('click', () => {
      hidePwaInstallModal();
      dismissPwaPromptFor(24); // 24 小時內不再自動彈出
    });

    // Header 安裝按鈕點擊：直接觸發安裝（不彈 modal）
    const installBtn = document.getElementById('installBtn');
    if (installBtn) installBtn.addEventListener('click', async () => {
      if (!state.installPromptEvent) return;
      state.installPromptEvent.prompt();
      const choice = await state.installPromptEvent.userChoice;
      if (choice.outcome === 'accepted') installBtn.style.display = 'none';
      state.installPromptEvent = null;
    });
  }
});
