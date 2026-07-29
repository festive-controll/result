/**
 * Sibaq '25 - Results Module JS
 * Dynamic data handling, sidebar tab switching, Iconify & Flaticon support,
 * Candidate profile auth (Image 5), Dynamic Created Sections Leaderboard Topper cards,
 * Team profile & standings, Starred programs, and Firestore listeners.
 * Visuals: Ultra Minimal, Soft Medium Typography, Reduced Border Radius (8-12px), No Shadows, No Heavy Gradients.
 */

// Firebase Configuration
const firebaseConfig = {
  authDomain: "festie-s1u2h3.firebaseapp.com",
  projectId: "festie-s1u2h3",
  storageBucket: "festie-s1u2h3.firebasestorage.app",
  messagingSenderId: "1055535560935",
  appId: "1:1055535560935:web:5317ad5fe9ba3ffcfebff7"
};

let db = null;
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
}

// App State
let allPrograms = [];
let dashboardCycleInterval = null;
let allResults = [];
let allTeams = [];
let allCandidates = [];
let dbSections = []; // Created sections from Firestore 'sections' collection
let starredPrograms = JSON.parse(localStorage.getItem('sibaq_starred_programs') || '[]');
let authenticatedCandidate = null;
let isResultPresent = true;

let activeSidebarTab = 'dashboard'; // 'dashboard', 'leaderboard', 'results', 'candidate', 'institution', 'starred', 'toppers'
let activeTab = 'all'; // 'all', 'published'
let activeSection = 'ALL'; // 'ALL', dynamic created section names
let searchQuery = '';
let dashboardToggleTab = 'program'; // 'program' or 'section'

// Fallback arrays (empty by default - data loaded strictly from DB)
const fallbackTeams = [];
const fallbackCandidates = [];
const fallbackPrograms = [];

// DOM Load Handler
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  syncResultPresentConfig();
  fetchResultsData();
  setupDigitInputs();
});

// Sync Result Present state from Firestore config
function syncResultPresentConfig() {
  if (!db) return;
  db.collection('config').doc('website').onSnapshot(doc => {
    if (doc.exists) {
      const config = doc.data();
      isResultPresent = config.resultPresent !== false;
      updatePageViewState(isResultPresent);
    }
  }, err => console.warn("Result present sync error:", err));
}

function updatePageViewState(isPresent) {
  const csSec = document.getElementById('coming-soon-section');
  if (csSec) {
    if (!isPresent) {
      csSec.classList.remove('hidden');
    } else {
      csSec.classList.add('hidden');
    }
  }
}

// Auto focus movement across digit inputs (3 slots)
function setupDigitInputs() {
  const digits = ['cand-digit-1', 'cand-digit-2', 'cand-digit-3'];
  digits.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      if (e.target.value && idx < digits.length - 1) {
        document.getElementById(digits[idx + 1]).focus();
      }
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        document.getElementById(digits[idx - 1]).focus();
      }
      if (e.key === 'Enter') {
        executeCandidateLogin();
      }
    });
  });
}

// Initialize UI Listeners
function initEventListeners() {
  const searchInput = document.getElementById('search-input');
  const searchInputMobile = document.getElementById('search-input-mobile');

  const handleSearch = (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    if (activeSidebarTab === 'leaderboard') {
      switchSidebarTab('results');
    }
    renderViews();
  };

  if (searchInput) searchInput.addEventListener('input', handleSearch);
  if (searchInputMobile) searchInputMobile.addEventListener('input', handleSearch);

  // Section Selector Dropdown
  const sectionSelect = document.getElementById('section-select');
  if (sectionSelect) {
    sectionSelect.addEventListener('change', (e) => {
      activeSection = e.target.value;
      renderViews();
    });
  }

  // Sidebar Items Click
  document.querySelectorAll('[data-nav]').forEach(item => {
    item.addEventListener('click', () => {
      const targetNav = item.getAttribute('data-nav');
      switchSidebarTab(targetNav);
    });
  });

  // Filter Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active', 'bg-sky-100', 'text-sky-800', 'border', 'border-sky-300');
        b.classList.add('text-slate-600');
      });
      btn.classList.add('active', 'bg-sky-100', 'text-sky-800', 'border', 'border-sky-300');
      btn.classList.remove('text-slate-600');

      activeTab = btn.getAttribute('data-tab');
      renderViews();
    });
  });

  // Modal Controls
  const modalClose = document.getElementById('modal-close');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modal = document.getElementById('result-modal');

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
}

// Switch Sidebar Tab View
window.switchSidebarTab = function (tabName) {
  activeSidebarTab = tabName;

  document.querySelectorAll('[data-nav]').forEach(item => {
    const navKey = item.getAttribute('data-nav');
    if (navKey === tabName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  const secDashboard = document.getElementById('view-dashboard');
  const secLeaderboard = document.getElementById('view-leaderboard');
  const secResults = document.getElementById('view-results');
  const secCandidate = document.getElementById('view-candidate');
  const secInstitution = document.getElementById('view-institution');
  const secStarred = document.getElementById('view-starred');
  const secToppers = document.getElementById('view-toppers');
  const secDetail = document.getElementById('view-program-detail');
  const secSectionToppers = document.getElementById('view-section-toppers-list');

  const sections = [secDashboard, secLeaderboard, secResults, secCandidate, secInstitution, secStarred, secToppers, secDetail, secSectionToppers];
  sections.forEach(sec => { if (sec) sec.classList.add('hidden'); });

  if (tabName === 'dashboard') {
    if (secDashboard) secDashboard.classList.remove('hidden');
    renderDashboardView();
  } else if (tabName === 'leaderboard') {
    if (secLeaderboard) secLeaderboard.classList.remove('hidden');
  } else if (tabName === 'results') {
    if (secResults) secResults.classList.remove('hidden');
  } else if (tabName === 'candidate') {
    if (secCandidate) secCandidate.classList.remove('hidden');
  } else if (tabName === 'institution' || tabName === 'team') {
    if (secInstitution) secInstitution.classList.remove('hidden');
    renderTeamProfiles();
  } else if (tabName === 'starred') {
    if (secStarred) secStarred.classList.remove('hidden');
    renderStarredPrograms();
  } else if (tabName === 'toppers') {
    if (secToppers) secToppers.classList.remove('hidden');
    renderCandidateToppers();
  }

  renderViews();
};

// Fetch Firebase Data (Programs, Results, Teams, Candidates & Created Sections)
function fetchResultsData() {
  if (!db) {
    processDataAndRender();
    return;
  }

  // 0. Fest config listener for shutdown state
  db.collection('config').doc('festData').onSnapshot(doc => {
    const d = doc.exists ? doc.data() : { isActive: true, name: 'Festival' };
    if (d.isActive === false) {
        let overlay = document.getElementById('results-offline-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'results-offline-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:linear-gradient(-45deg, #fdfbfb, #ffffff, #f8f9fa, #fdfbfb);background-size:400% 400%;animation:bg-pan 15s ease infinite;display:flex;align-items:center;justify-content:center;padding:20px;overflow:hidden;';
            
            const style = document.createElement('style');
            style.id = 'results-offline-style';
            style.innerHTML = `
                @import url('https://api.fontshare.com/v2/css?f[]=clash-grotesk@200,300,400,500,600,700&display=swap');
                @keyframes error-slide-up { from{opacity:0;transform:translateY(24px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
                @keyframes error-float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
                @keyframes bg-pan { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

                .error-card {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(178, 230, 206, 0.6);
                    border-radius: 40px;
                    padding: 30px;
                    max-width: 700px;
                    width: calc(100% - 32px);
                    text-align: center;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02);
                    animation: error-slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
                    position: relative;
                    z-index: 10;
                    font-family: 'Clash Grotesk', sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .error-header {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                    margin-bottom: 20px;
                    width: 100%;
                }
                .error-icon-wrapper {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    border: 2px solid #ffb3c6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    background: #fff;
                    animation: error-float 4s ease-in-out infinite;
                    box-shadow: 0 12px 24px -8px rgba(242, 139, 130, 0.3);
                }

                .error-text-container {
                    text-align: left;
                }
                .error-title {
                    font-size: 46px;
                    font-weight: normal;
                    color: #f05a4f;
                    margin: 0 0 8px;
                    line-height: 1.1;
                    letter-spacing: -1.5px;
                    text-shadow: 0 2px 4px rgba(240, 90, 79, 0.1);
                }
                .error-subtitle {
                    font-size: 26px;
                    color: #f28b82;
                    margin: 0;
                    font-weight: 300;
                    letter-spacing: -0.5px;
                }

                .error-logo-box {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 16px;
                    border: 1px solid #ffb3c6;
                    border-radius: 16px;
                    margin: 16px 0;
                    background: #ffffff;
                    box-shadow: 0 4px 12px -2px rgba(0,0,0,0.05);
                    cursor: default;
                }
                .error-logo-img {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    object-fit: contain;
                }
                .error-logo-text {
                    color: #2b3a67;
                    text-align: left;
                    line-height: 1.2;
                }
                .error-logo-text-title {
                    font-size: 20px;
                    font-weight: normal;
                    letter-spacing: -0.5px;
                }
                .error-logo-text-sub {
                    font-size: 14px;
                    font-weight: normal;
                    opacity: 0.7;
                    color: #4a6fa5;
                }

                .error-footer {
                    font-size: 16px;
                    color: #888;
                    margin-top: 16px;
                    font-weight: normal;
                }
                .error-footer span {
                    color: #4a6fa5;
                    font-weight: normal;
                    cursor: pointer;
                }

                @media (max-width: 600px) {
                    .error-header { flex-direction: column; text-align: center; }
                    .error-text-container { text-align: center; }
                    .error-title { font-size: 32px; }
                    .error-subtitle { font-size: 20px; }
                }
            `;
            document.head.appendChild(style);

            let errorCard = document.createElement('div');
            errorCard.className = 'error-card';
            errorCard.innerHTML = `
                <div class="error-header">
                    <div class="error-icon-wrapper">
                        <svg viewBox="0 0 100 100" width="60" height="60" xmlns="http://www.w3.org/2000/svg">
                          <rect x="15" y="25" width="70" height="50" rx="4" fill="#f8f9fa" stroke="#2b3a67" stroke-width="3"/>
                          <line x1="15" y1="38" x2="85" y2="38" stroke="#2b3a67" stroke-width="3"/>
                          <circle cx="23" cy="31.5" r="2.5" fill="#f05a4f"/>
                          <circle cx="31" cy="31.5" r="2.5" fill="#f2c94c"/>
                          <circle cx="39" cy="31.5" r="2.5" fill="#27ae60"/>
                          <rect x="25" y="46" width="30" height="3" rx="1.5" fill="#a0aec0"/>
                          <rect x="25" y="54" width="40" height="3" rx="1.5" fill="#a0aec0"/>
                          <rect x="25" y="62" width="20" height="3" rx="1.5" fill="#a0aec0"/>
                          <polygon points="55,50 35,85 75,85" fill="#f8f9fa" stroke="#2b3a67" stroke-width="3" stroke-linejoin="round"/>
                          <polygon points="55,54 40,81 70,81" fill="#f05a4f" />
                          <line x1="55" y1="62" x2="55" y2="72" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
                          <circle cx="55" cy="77" r="1.5" fill="#fff"/>
                        </svg>
                    </div>
                    <div class="error-text-container">
                        <h1 class="error-title">Website is Shutdown</h1>
                        <h2 class="error-subtitle">304 - Backend De-attached</h2>
                    </div>
                </div>
                
                <div class="error-logo-box">
                    <img class="error-logo-img" id="offline-logo-img" src="../logo-512.svg" alt="Logo">
                    <div class="error-logo-text">
                        <div class="error-logo-text-title" id="offline-fest-name">\${d.name || 'Festival'}</div>
                        <div class="error-logo-text-sub">System Lockout</div>
                    </div>
                </div>

                <div class="error-footer">
                    contact owner is problem exists <span>dezignmvs.</span>
                </div>
            `;
            overlay.appendChild(errorCard);
            document.body.appendChild(overlay);
        }
    } else {
        let overlay = document.getElementById('results-offline-overlay');
        if (overlay) overlay.remove();
        let style = document.getElementById('results-offline-style');
        if (style) style.remove();
    }
  });

  // 1. Sections Listener
  db.collection('sections').onSnapshot(secSnap => {
    if (secSnap && !secSnap.empty) {
      dbSections = secSnap.docs.map(d => d.data().name || d.data().sectionName || d.id).filter(Boolean);
    } else {
      dbSections = [];
    }
    renderSectionDropdown();
    renderCategoryToppersGrid();
  }, err => console.warn("Sections snapshot error:", err));

  // 2. Program Results Listener
  db.collection('programResults').onSnapshot(snapshot => {
    allResults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    processDataAndRender();
  }, err => console.warn("ProgramResults snapshot error:", err));

  // 3. Programs Listener
  db.collection('programs').onSnapshot(progSnap => {
    allPrograms = progSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    processDataAndRender();
  }, err => console.warn("Programs snapshot error:", err));

  // 4. Teams Listener
  db.collection('teams').onSnapshot(teamSnap => {
    allTeams = teamSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    processDataAndRender();
  }, err => console.warn("Teams snapshot error:", err));

  // 5. Candidates Listener
  db.collection('candidates').onSnapshot(candSnap => {
    allCandidates = candSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    processDataAndRender();
  }, err => console.warn("Candidates snapshot error:", err));
}

function useFallbackData() {
  processDataAndRender();
}

// Section hierarchy sorter: Bidāya -> Ūlā -> Thāniya -> Thānawiyya -> Āliya
function getSectionHierarchyRank(secName) {
  if (!secName) return 999;
  const s = String(secName).toLowerCase().replace(/[\u0300-\u036f]/g, "").trim();

  // Normalize macrons & diacritics
  const norm = s
    .replace(/ā/g, 'a')
    .replace(/ū/g, 'u')
    .replace(/ī/g, 'i');

  if (norm.includes('bida') || norm.includes('biday')) return 1;
  if (norm.includes('ula') || norm === 'ula') return 2;
  if (norm.includes('thani') || norm.includes('thany') || norm.includes('thania')) return 3;
  if (norm.includes('thanaw') || norm.includes('thanav')) return 4;
  if (norm.includes('aliya') || norm.includes('aliay') || norm.includes('alia')) return 5;

  return 10;
}

function sortSectionsByHierarchy(sections) {
  return [...sections].sort((a, b) => {
    const rankA = getSectionHierarchyRank(a);
    const rankB = getSectionHierarchyRank(b);
    if (rankA !== rankB) return rankA - rankB;
    return a.localeCompare(b);
  });
}

// Helper: Get list of created sections ordered by canonical hierarchy
function getCreatedSectionsList() {
  const sectionsSet = new Set();

  // Add sections from Firestore sections collection
  if (Array.isArray(dbSections) && dbSections.length > 0) {
    dbSections.forEach(s => sectionsSet.add(s.trim()));
  }

  // Add sections created in programs dataset
  allPrograms.forEach(prog => {
    const sec = prog.category || prog.section;
    if (sec && sec.trim()) {
      sectionsSet.add(sec.trim());
    }
  });

  const list = Array.from(sectionsSet);
  return sortSectionsByHierarchy(list);
}

function renderSectionFilterTabs() {
  const filterContainer = document.getElementById('results-filter-tabs');
  if (!filterContainer) return;

  const sectionsList = getCreatedSectionsList();

  let html = `
    <button data-sec="ALL" class="section-tab-btn ${activeSection === 'ALL' ? 'active bg-sky-100 text-sky-800 border border-sky-300 font-bold' : 'text-slate-600 hover:bg-slate-100'} px-4 py-1.5 rounded-lg text-xs transition-all">
      All Programs
    </button>
  `;

  sectionsList.forEach(secName => {
    const isActive = activeSection.toUpperCase() === secName.toUpperCase();
    html += `
      <button data-sec="${secName}" class="section-tab-btn ${isActive ? 'active bg-sky-100 text-sky-800 border border-sky-300 font-bold' : 'text-slate-600 hover:bg-slate-100'} px-4 py-1.5 rounded-lg text-xs transition-all">
        ${secName}
      </button>
    `;
  });

  filterContainer.innerHTML = html;

  filterContainer.querySelectorAll('.section-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const secVal = btn.getAttribute('data-sec');
      activeSection = secVal;
      renderSectionFilterTabs();
      renderViews();
    });
  });
}

function getNumericPosition(r) {
  if (!r) return 99;

  if (r.position !== undefined && r.position !== null && r.position !== '' && !isNaN(parseInt(r.position))) {
    const pos = parseInt(r.position);
    if (pos > 0 && pos <= 50) return pos;
  }

  if (r.positionLabel && typeof r.positionLabel === 'string') {
    const label = r.positionLabel.toLowerCase();
    if (label.includes('1st') || label.startsWith('1')) return 1;
    if (label.includes('2nd') || label.startsWith('2')) return 2;
    if (label.includes('3rd') || label.startsWith('3')) return 3;
    const match = label.match(/\d+/);
    if (match) return parseInt(match[0]);
  }

  if (r.positionPoints !== undefined && r.positionPoints !== null) {
    const pts = parseInt(r.positionPoints);
    if (pts === 3) return 1;
    if (pts === 2) return 2;
    if (pts === 1) return 3;
  }

  return 99;
}

function parseGradeLabel(grade) {
  if (!grade) return 'A';
  const str = String(grade).trim();
  const clean = str.replace(/\s*\(.*?\)/g, '').replace(/grade/i, '').trim();
  return clean || str || 'A';
}

function processDataAndRender() {
  allPrograms.forEach(prog => {
    const matchingResults = allResults.filter(r => r.programId === prog.id || r.programCode === prog.code);
    prog.isPublished = prog.resultsPublished === true;
    
    if (matchingResults.length > 0) {
      prog.winners = matchingResults.map(r => ({
        position: getNumericPosition(r),
        candidateName: r.candidateName || r.name || 'Candidate',
        candidateId: r.candidateId || r.code || '',
        chestNo: r.chestNo || '',
        team: r.team || r.teamName || 'Unassigned',
        grade: parseGradeLabel(r.gradeLabel || r.grade),
        points: parseInt(r.totalPoints || r.points || (parseInt(r.gradePoints || 0) + parseInt(r.positionPoints || 0))) || 0,
        isGroupResult: r.isGroupResult === true
      })).sort((a, b) => a.position - b.position);
    }
  });

  calculateTeamStandings();
  renderSummaryStats();
  renderSectionDropdown();
  renderSectionFilterTabs();
  renderCategoryToppersGrid();
  renderTeamProfiles();
  renderDashboardView();
  startDashboardCycle();
  renderViews();
}

function calculateTeamStandings() {
  const teamMap = {};

  allTeams.forEach(t => {
    const tName = t.name || t.teamName;
    teamMap[tName] = {
      name: tName,
      code: t.code || tName.substring(0, 3).toUpperCase(),
      color: t.color || '#EA8F23',
      points: 0,
      wins: 0
    };
  });

  allPrograms.forEach(prog => {
    if (prog.isPublished && Array.isArray(prog.winners)) {
      prog.winners.forEach(w => {
        if (!teamMap[w.team]) {
          teamMap[w.team] = {
            name: w.team,
            code: w.team.substring(0, 3).toUpperCase(),
            color: '#00A3E0',
            points: 0,
            wins: 0
          };
        }
        teamMap[w.team].points += (w.points || 0);
        if (w.position === 1) teamMap[w.team].wins += 1;
      });
    }
  });

  allTeams = Object.values(teamMap).sort((a, b) => b.points - a.points);
}

function renderSummaryStats() {
  const totalPoints = allTeams.reduce((sum, t) => sum + t.points, 0);
  const badgeEl = document.getElementById('stat-total-points-badge');
  if (badgeEl) badgeEl.textContent = `Total Points: ${totalPoints.toLocaleString()}`;

  const resBadge = document.getElementById('results-count-badge');
  if (resBadge) resBadge.textContent = `${allPrograms.length} Programs`;
}

// Render dynamic Section Filter Dropdown matching created sections only
function renderSectionDropdown() {
  const sectionSelect = document.getElementById('section-select');
  if (!sectionSelect) return;

  const sectionsToDisplay = getCreatedSectionsList();
  const currentVal = sectionSelect.value || 'ALL';

  let html = `<option value="ALL" ${currentVal === 'ALL' ? 'selected' : ''}>All Sections</option>`;
  sectionsToDisplay.forEach(sec => {
    html += `<option value="${sec}" ${currentVal === sec ? 'selected' : ''}>${sec}</option>`;
  });

  sectionSelect.innerHTML = html;
}

// Render Category Topper Pill Cards for CREATED SECTIONS ONLY
function renderCategoryToppersGrid() {
  const container = document.getElementById('category-toppers-pill-grid');
  if (!container) return;

  const createdSections = getCreatedSectionsList().filter(s => s.toUpperCase() !== 'KULLIYA');

  container.innerHTML = createdSections.map(secName => {
    const catProgs = allPrograms.filter(p =>
      p.isPublished && (p.category || p.section || '').toUpperCase() === secName.toUpperCase()
    );
    
    const candidateMap = {};
    catProgs.forEach(p => {
      const isKulliyaSection = secName.toUpperCase() === 'KULLIYA';
      const isGroup = (p.type || '').toLowerCase().includes('group') || isKulliyaSection;
      
      if (isGroup && !isKulliyaSection) return; // Exclude group programs from individual toppers
      if (Array.isArray(p.winners)) {
        p.winners.forEach(w => {
          if (w.isGroupResult && !isKulliyaSection) return;
          
          let cKey = w.candidateName;
          let dName = w.candidateName;
          if (isKulliyaSection) {
            cKey = w.team || w.candidateName || 'Unknown Team';
            dName = w.team || w.candidateName || 'Unknown Team';
          }
          if (!cKey) return;
          
          if (!candidateMap[cKey]) {
            candidateMap[cKey] = {
              name: dName,
              team: w.team,
              points: 0,
              winnerObj: w
            };
          }
          candidateMap[cKey].points += (w.points || 0);
        });
      }
    });

    const toppers = Object.values(candidateMap).sort((a, b) => b.points - a.points);
    const top3 = toppers.slice(0, 3);
    
    let listHtml = '';
    
    if (top3.length > 0) {
      listHtml = '<div class="space-y-2">';
      top3.forEach((cand, idx) => {
        let matchedCand = allCandidates.find(c =>
          (c.id && c.id === cand.winnerObj?.candidateId) ||
          (c.chestNo && String(c.chestNo) === String(cand.winnerObj?.chestNo)) ||
          (c.name && c.name.toLowerCase() === (cand.name || '').toLowerCase())
        );
        let photoUrl = getCandidatePhotoUrl(cand.winnerObj, matchedCand);
        let initials = getInitials(cand.name);
        
        let avatarHtml = '';
        if (photoUrl) {
          avatarHtml = `<img src="${photoUrl}" alt="${cand.name}" class="w-7 h-7 rounded-full border-2 border-amber-400 object-cover shrink-0 shadow-sm" onerror="this.onerror=null; this.outerHTML='<div class=\\'w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-[9px] flex items-center justify-center border-2 border-amber-400 shrink-0 shadow-sm uppercase\\'>${initials}</div>';" />`;
        } else {
          avatarHtml = `<div class="w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-[9px] flex items-center justify-center border-2 border-amber-400 shrink-0 shadow-sm uppercase">${initials}</div>`;
        }

        const searchArg = (cand.winnerObj?.chestNo || cand.winnerObj?.candidateId || cand.name || '').replace(/'/g, "\\'");
        
        let rankIcon = '';
        if (idx === 0) rankIcon = '<span class="iconify text-amber-500 text-base shrink-0" data-icon="solar:crown-star-bold"></span>';
        else if (idx === 1) rankIcon = '<span class="iconify text-slate-400 text-base shrink-0" data-icon="solar:medal-star-bold"></span>';
        else if (idx === 2) rankIcon = '<span class="iconify text-amber-700 text-base shrink-0" data-icon="solar:medal-ribbons-star-bold"></span>';

        listHtml += `
          <div class="topper-slot-pill flex items-center justify-between px-3.5 py-2 hover:bg-slate-100/80 transition-colors rounded-lg cursor-pointer" onclick="openCandidateProfileByChestNo('${searchArg}')">
            <div class="flex items-center gap-2 min-w-0">
              ${rankIcon}
              ${avatarHtml}
              <span class="text-xs font-medium text-slate-900 truncate transition-colors">${cand.name}</span>
            </div>
            <div class="text-right shrink-0">
              <span class="text-[10px] font-normal text-slate-500 uppercase block leading-tight">${cand.team}</span>
              <span class="text-[11px] font-medium text-amber-600 leading-tight">${cand.points} Pts</span>
            </div>
          </div>
        `;
      });
      listHtml += '</div>';
    } else {
      listHtml = `<div class="topper-slot-pill flex items-center justify-center px-3.5 py-4"><span class="text-xs font-normal text-slate-400 mx-auto">Standings calculating...</span></div>`;
    }

    return `
      <div class="topper-pill-card flex flex-col justify-between group p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <div>
          <h4 class="font-medium text-slate-900 text-base tracking-tight text-center mb-4">${secName} Toppers</h4>
          ${listHtml}
        </div>
        ${top3.length > 0 ? `
        <button onclick="openSectionToppersList('${secName}')" class="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition-all flex items-center justify-center gap-1">
          <span>View More</span>
          <span class="iconify" data-icon="solar:alt-arrow-right-linear"></span>
        </button>
        ` : ''}
      </div>
    `;
  }).join('');
}

window.openSectionToppersList = function(secName) {
  document.getElementById('view-leaderboard').classList.add('hidden');
  const secSectionToppers = document.getElementById('view-section-toppers-list');
  if (secSectionToppers) secSectionToppers.classList.remove('hidden');
  
  const titleEl = document.getElementById('section-toppers-title');
  if (titleEl) titleEl.textContent = `${secName} Section Toppers`;
  
  const container = document.getElementById('section-toppers-full-list');
  if (!container) return;
  
  const catProgs = allPrograms.filter(p => p.isPublished && (p.category || p.section || '').toUpperCase() === secName.toUpperCase());
  const candidateMap = {};
  
  catProgs.forEach(p => {
    const isKulliyaSection = secName.toUpperCase() === 'KULLIYA';
    const isGroup = (p.type || '').toLowerCase().includes('group') || isKulliyaSection;
    
    if (isGroup && !isKulliyaSection) return;
    if (Array.isArray(p.winners)) {
      p.winners.forEach(w => {
        if (w.isGroupResult && !isKulliyaSection) return;
        
        let cKey = w.candidateName;
        let dName = w.candidateName;
        if (isKulliyaSection) {
          cKey = w.team || w.candidateName || 'Unknown Team';
          dName = w.team || w.candidateName || 'Unknown Team';
        }
        if (!cKey) return;
        
        if (!candidateMap[cKey]) {
          candidateMap[cKey] = { name: dName, team: w.team, points: 0, firstPlaces: 0, winnerObj: w };
        }
        candidateMap[cKey].points += (w.points || 0);
        if (w.position === 1) candidateMap[cKey].firstPlaces += 1;
      });
    }
  });

  const toppers = Object.values(candidateMap).sort((a, b) => b.points - a.points);
  
  if (toppers.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs font-medium col-span-full">No candidates found for this section.</div>`;
    return;
  }
  
  container.innerHTML = toppers.map((cand, idx) => {
    let matchedCand = allCandidates.find(c =>
      (c.id && c.id === cand.winnerObj?.candidateId) ||
      (c.chestNo && String(c.chestNo) === String(cand.winnerObj?.chestNo)) ||
      (c.name && c.name.toLowerCase() === (cand.name || '').toLowerCase())
    );
    
    const photoUrl = getCandidatePhotoUrl(cand.winnerObj, matchedCand);
    const initials = getInitials(cand.name);
    
    let avatarHtml = '';
    if (photoUrl) {
      avatarHtml = `<img src="${photoUrl}" alt="${cand.name}" class="w-10 h-10 rounded-full border border-slate-200 object-cover shrink-0" onerror="this.onerror=null; this.outerHTML='<div class=\\'w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-bold text-sm flex items-center justify-center border border-slate-200 shrink-0 uppercase\\'>${initials}</div>';" />`;
    } else {
      avatarHtml = `<div class="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-bold text-sm flex items-center justify-center border border-slate-200 shrink-0 uppercase">${initials}</div>`;
    }
    
    const rankBadgeColor = idx === 0 ? 'bg-amber-100 text-amber-800 border-amber-200' : idx === 1 ? 'bg-slate-100 text-slate-700 border-slate-300' : idx === 2 ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-slate-50 text-slate-500 border-slate-200';
    const searchArg = (cand.winnerObj?.chestNo || cand.winnerObj?.candidateId || cand.name || '').replace(/'/g, "\\'");
    
    return `
      <div class="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer" onclick="openCandidateProfileByChestNo('${searchArg}')">
        <div class="w-8 h-8 rounded-lg ${rankBadgeColor} border flex items-center justify-center font-medium text-xs shrink-0">
          #${idx + 1}
        </div>
        ${avatarHtml}
        <div class="flex-1 min-w-0">
          <h4 class="font-medium text-slate-900 text-sm truncate">${cand.name}</h4>
          <p class="text-xs text-slate-500 truncate">${cand.team}</p>
        </div>
        <div class="text-right shrink-0">
          <div class="text-sm font-medium text-amber-600">${cand.points} pts</div>
          ${cand.firstPlaces > 0 ? `<div class="text-[10px] font-medium text-amber-500 flex items-center gap-0.5 justify-end mt-0.5"><span class="iconify" data-icon="solar:cup-star-bold"></span> ${cand.firstPlaces} Gold</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
};

window.closeSectionToppersList = function() {
  const secSectionToppers = document.getElementById('view-section-toppers-list');
  if (secSectionToppers) secSectionToppers.classList.add('hidden');
  document.getElementById('view-leaderboard').classList.remove('hidden');
};

// Render Team Standings inside Team Profile Section (Column Table with Section Breakdown & Totals)
function renderTeamProfiles() {
  const leaderboardContainer = document.getElementById('team-leaderboard');
  if (!leaderboardContainer) return;

  if (!allTeams || allTeams.length === 0) {
    leaderboardContainer.innerHTML = `<div class="p-8 text-center text-slate-400 text-sm font-medium bg-white border border-slate-200 rounded-2xl">No team standings available</div>`;
    return;
  }

  const createdSections = getCreatedSectionsList();

  // Calculate points per section for each team
  const teamSectionDataMap = {};
  allTeams.forEach(t => {
    const tName = t.name || t.teamName;
    teamSectionDataMap[tName] = {
      name: tName,
      code: t.code || tName.substring(0, 3).toUpperCase(),
      color: t.color || '#EA8F23',
      sectionPoints: {},
      totalPoints: t.points || 0,
      totalWins: t.wins || 0
    };
  });

  allPrograms.forEach(prog => {
    if (prog.isPublished && Array.isArray(prog.winners)) {
      const sec = prog.category || prog.section || 'General';
      prog.winners.forEach(w => {
        if (!teamSectionDataMap[w.team]) {
          teamSectionDataMap[w.team] = {
            name: w.team,
            code: w.team.substring(0, 3).toUpperCase(),
            color: '#00A3E0',
            sectionPoints: {},
            totalPoints: 0,
            totalWins: 0
          };
        }
        if (!teamSectionDataMap[w.team].sectionPoints[sec]) {
          teamSectionDataMap[w.team].sectionPoints[sec] = 0;
        }
        teamSectionDataMap[w.team].sectionPoints[sec] += (w.points || 0);
      });
    }
  });

  const sortedTeams = Object.values(teamSectionDataMap).sort((a, b) => b.totalPoints - a.totalPoints);

  // Render Section Column Table
  let html = `
    <div class="w-full bg-white border border-slate-200/90 rounded-2xl shadow-sm p-5 mb-6">
      <h4 class="text-sm font-medium text-slate-800 mb-4 flex items-center gap-2"><span class="iconify text-amber-500" data-icon="solar:chart-square-bold"></span> Points Breakdown by Section</h4>
      <div id="team-sections-chart" class="w-full h-72"></div>
    </div>
    <div class="w-full overflow-x-auto bg-white border border-slate-200/90 rounded-2xl shadow-sm">
      <table class="w-full text-left border-collapse min-w-[640px]">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-medium uppercase tracking-wider">
            <th class="py-3.5 px-4 font-medium">Rank & Team</th>
            ${createdSections.map(sec => `<th class="py-3.5 px-3 text-center font-medium">${sec}</th>`).join('')}
            <th class="py-3.5 px-4 text-right bg-amber-50/60 text-amber-900 font-medium">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 text-xs font-medium text-slate-800">
  `;

  sortedTeams.forEach((t, idx) => {
    const rankBadgeColor = idx === 0 ? 'bg-amber-400 text-slate-950 font-medium border-amber-500' : idx === 1 ? 'bg-slate-200 text-slate-900 border-slate-300' : idx === 2 ? 'bg-amber-700 text-white border-amber-800' : 'bg-slate-100 text-slate-600 border-slate-200';
    const rankLabel = idx === 0 ? '1st' : idx === 1 ? '2nd' : idx === 2 ? '3rd' : `#${idx + 1}`;

    html += `
      <tr class="hover:bg-slate-50/80 transition-colors">
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-2.5">
            <span class="w-6 h-6 rounded-md text-xs font-medium flex items-center justify-center border shrink-0 ${rankBadgeColor}">
              ${rankLabel}
            </span>
            <div>
              <h4 class="font-medium text-slate-800 text-xs sm:text-sm leading-tight">${t.name}</h4>
              <p class="text-[11px] font-mono font-normal text-slate-400">Code: ${t.code}</p>
            </div>
          </div>
        </td>
        ${createdSections.map(sec => {
          const pts = t.sectionPoints[sec] || 0;
          return `<td class="py-3.5 px-3 text-center font-medium ${pts > 0 ? 'text-slate-800' : 'text-slate-300'}">${pts}</td>`;
        }).join('')}
        <td class="py-3.5 px-4 text-right font-medium text-xs sm:text-sm text-slate-900 bg-amber-50/30">${t.totalPoints}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  leaderboardContainer.innerHTML = html;

  // Render ApexChart
  if (typeof ApexCharts !== 'undefined' && sortedTeams.length > 0) {
    const chartEl = document.getElementById('team-sections-chart');
    if (chartEl) {
      const teamNames = sortedTeams.map(t => t.name);
      const seriesData = createdSections.map(sec => {
        return {
          name: sec,
          data: sortedTeams.map(t => t.sectionPoints[sec] || 0)
        };
      });

      const options = {
        series: seriesData,
        colors: ['#0ea5e9', '#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#14b8a6'],
        chart: {
          type: 'bar',
          height: 320,
          stacked: false,
          toolbar: { show: false },
          fontFamily: 'inherit',
          dropShadow: {
            enabled: true,
            top: 2,
            left: 0,
            blur: 4,
            color: '#000',
            opacity: 0.05
          }
        },
        plotOptions: {
          bar: { 
            horizontal: false, 
            borderRadius: 4, 
            borderRadiusApplication: 'end',
            columnWidth: '70%' 
          },
        },
        dataLabels: { 
          enabled: false
        },
        stroke: { width: 1, colors: ['transparent'] },
        xaxis: {
          categories: teamNames,
          axisBorder: { show: false },
          axisTicks: { show: false },
          labels: { style: { colors: '#64748b', fontSize: '12px', fontWeight: 600 } }
        },
        yaxis: {
          labels: { style: { colors: '#94a3b8', fontSize: '11px', fontWeight: 500 } }
        },
        grid: {
          borderColor: '#f1f5f9',
          strokeDashArray: 4,
          padding: { top: 0, right: 0, bottom: 0, left: 10 }
        },
        fill: { opacity: 1 },
        legend: { 
          position: 'top', 
          horizontalAlign: 'right', 
          fontSize: '12px', 
          fontWeight: 500,
          labels: { colors: '#475569' },
          markers: { radius: 12, width: 10, height: 10 } 
        },
        tooltip: {
          theme: 'light',
          y: { formatter: function (val) { return val + " Pts" } },
          style: { fontSize: '12px', fontFamily: 'inherit' }
        }
      };

      if (window.teamChartInstance) {
        window.teamChartInstance.destroy();
      }
      window.teamChartInstance = new ApexCharts(chartEl, options);
      window.teamChartInstance.render();
    }
  }
}

function renderViews() {
  const programGrid = document.getElementById('programs-results-grid');
  const emptyState = document.getElementById('empty-state');
  const countBadge = document.getElementById('results-count-badge');

  if (activeSidebarTab !== 'results') {
    if (emptyState) emptyState.classList.add('hidden');
    if (activeSidebarTab === 'toppers') renderCandidateToppers();
    return;
  }

  if (!programGrid) return;

  let filtered = allPrograms.filter(prog => {
    const isPub = prog.isPublished === true;
    if (!isPub) return false;

    const progSec = (prog.category || prog.section || '').toUpperCase();
    if (activeSection !== 'ALL' && progSec !== activeSection.toUpperCase()) return false;

    if (searchQuery) {
      const nameMatch = (prog.name || '').toLowerCase().includes(searchQuery);
      const codeMatch = (prog.code || '').toLowerCase().includes(searchQuery);
      const winnerMatch = Array.isArray(prog.winners) && prog.winners.some(w =>
        (w.candidateName || '').toLowerCase().includes(searchQuery) ||
        (w.team || '').toLowerCase().includes(searchQuery)
      );
      return nameMatch || codeMatch || winnerMatch;
    }

    return true;
  });

  const countTextEl = document.getElementById('results-count-text');
  if (countTextEl || countBadge) {
    const publishedProgsCount = allPrograms.filter(p => p.isPublished === true).length;
    const totalProgsCount = allPrograms.length;
    const countText = totalProgsCount === 0
      ? `-- / -- Published`
      : `${publishedProgsCount} Published`;

    if (countTextEl) countTextEl.textContent = countText;
    else if (countBadge) countBadge.textContent = countText;
  }

  if (filtered.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    programGrid.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  programGrid.innerHTML = filtered.map(prog => {
    const isPub = prog.isPublished === true;
    const topWinner = isPub && Array.isArray(prog.winners) && prog.winners.length > 0 ? prog.winners[0] : null;
    const isStarred = starredPrograms.includes(prog.id);

    return `
      <div class="content-card p-4 flex flex-col justify-between relative overflow-hidden">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2.5">
            <span class="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
              ${prog.category || prog.section || 'General'}
            </span>
            <div class="flex items-center gap-1.5">
              <button onclick="toggleStarProgram('${prog.id}')" title="Star Program" class="text-amber-500 transition-colors">
                <span class="iconify text-base" data-icon="${isStarred ? 'solar:star-bold' : 'solar:star-linear'}"></span>
              </button>
              <span class="text-xs font-mono font-medium text-slate-400">#${prog.code || prog.id}</span>
            </div>
          </div>

          <h3 class="font-bold text-slate-900 text-base leading-snug mb-3 hover:text-amber-600 transition-colors cursor-pointer"
            onclick="openProgramModal('${prog.id}')">
            ${prog.name}
          </h3>

          ${isPub && Array.isArray(prog.winners) && prog.winners.length > 0 ? `
            <div class="flex justify-center -space-x-4 mb-5 mt-3">
              ${prog.winners.slice(0, 3).map((w, index) => {
                let sMatchedCand = allCandidates.find(c =>
                  (c.id && c.id === w.candidateId) ||
                  (c.chestNo && String(c.chestNo) === String(w.chestNo)) ||
                  (c.name && c.name.toLowerCase() === (w.candidateName || '').toLowerCase())
                );
                const sPhotoUrl = getCandidatePhotoUrl(w, sMatchedCand);
                const sInitials = getInitials(w.candidateName);
                
                let ringClass = 'border-2 border-white';
                if(w.position == 1) ringClass = 'border-2 border-amber-400';
                else if(w.position == 2) ringClass = 'border-2 border-slate-300';
                else if(w.position == 3) ringClass = 'border-2 border-amber-700/70';

                const zIndex = 40 - (index * 10);
                
                if (sPhotoUrl) {
                  return `<img src="${sPhotoUrl}" class="w-16 h-16 rounded-full object-cover shrink-0 ${ringClass} shadow-md relative bg-white" style="z-index: ${zIndex}" onerror="this.onerror=null; this.outerHTML='<div class=\\'w-16 h-16 rounded-full bg-slate-100 text-slate-600 font-medium text-base flex items-center justify-center shrink-0 uppercase ${ringClass} shadow-md relative\\' style=\\'z-index: ${zIndex}\\'>${sInitials}</div>';" />`;
                } else {
                  return `<div class="w-16 h-16 rounded-full bg-slate-100 text-slate-600 font-medium text-base flex items-center justify-center shrink-0 uppercase ${ringClass} shadow-md relative" style="z-index: ${zIndex}">${sInitials}</div>`;
                }
              }).join('')}
              ${prog.winners.length > 3 ? `<div class="w-16 h-16 rounded-full bg-slate-100 text-slate-600 font-medium text-base flex items-center justify-center shrink-0 border-2 border-white shadow-md relative" style="z-index: 10">+${prog.winners.length - 3}</div>` : ''}
            </div>
          ` : `
            <div class="flex justify-center mb-5 mt-3">
              <div class="w-16 h-16 rounded-full bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center shadow-sm">
                 <span class="iconify text-slate-300 text-2xl" data-icon="solar:clock-circle-linear"></span>
              </div>
            </div>
          `}
        </div>

        <div class="pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold ${isPub ? 'text-emerald-600' : 'text-amber-600'}">
            <span class="w-1.5 h-1.5 rounded-full ${isPub ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
            ${isPub ? 'Declared' : 'Awaited'}
          </span>
          <button onclick="openProgramModal('${prog.id}')"
            class="text-xs font-medium text-slate-800 hover:text-amber-600 flex items-center gap-1 transition-colors">
            <span>View Winners</span>
            <span class="iconify text-sm" data-icon="solar:alt-arrow-right-linear"></span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// React Hot Toast Notification System
window.showToast = function (message, type = 'error') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/10 text-slate-800 text-xs sm:text-sm font-medium transform transition-all duration-300 translate-y-[-20px] opacity-0 scale-95 max-w-full`;

  let iconHtml = '';
  if (type === 'error') {
    iconHtml = `
      <div class="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
        <span class="iconify text-sm" data-icon="solar:close-circle-bold"></span>
      </div>
    `;
  } else if (type === 'success') {
    iconHtml = `
      <div class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
        <span class="iconify text-sm" data-icon="solar:check-circle-bold"></span>
      </div>
    `;
  } else {
    iconHtml = `
      <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
        <span class="iconify text-sm" data-icon="solar:info-circle-bold"></span>
      </div>
    `;
  }

  toast.innerHTML = `
    ${iconHtml}
    <span class="leading-tight">${message}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-[-20px]', 'opacity-0', 'scale-95');
    toast.classList.add('translate-y-0', 'opacity-100', 'scale-100');
  });

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100', 'scale-100');
    toast.classList.add('translate-y-[-20px]', 'opacity-0', 'scale-95');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
};

// Toggle Star Program
window.toggleStarProgram = function (progId) {
  if (starredPrograms.includes(progId)) {
    starredPrograms = starredPrograms.filter(id => id !== progId);
    showToast("Program removed from bookmarks", "info");
  } else {
    starredPrograms.push(progId);
    showToast("Program bookmarked successfully", "success");
  }
  localStorage.setItem('sibaq_starred_programs', JSON.stringify(starredPrograms));
  renderViews();
  if (activeSidebarTab === 'starred') renderStarredPrograms();
};

// Candidate Profile Authentication & Display (3-digit chest number)
window.executeCandidateLogin = function () {
  const errEl = document.getElementById('cand-login-error');
  if (errEl) errEl.classList.add('hidden');

  const d1 = (document.getElementById('cand-digit-1')?.value || '').trim();
  const d2 = (document.getElementById('cand-digit-2')?.value || '').trim();
  const d3 = (document.getElementById('cand-digit-3')?.value || '').trim();

  const enteredChest = `${d1}${d2}${d3}`.trim();

  if (!enteredChest) {
    if (errEl) {
      errEl.textContent = "Please enter 3-digit chest number";
      errEl.classList.remove('hidden');
    }
    showToast("Please enter 3-digit chest number", "error");
    return;
  }

  // Find candidate by chest number (matches string chestNo or numeric digits)
  const cand = allCandidates.find(c => {
    const cChestRaw = String(c.chestNo || c.chest || '').trim();
    const cChestNum = cChestRaw.replace(/\D/g, '');
    const enteredNum = enteredChest.replace(/\D/g, '');
    return cChestRaw === enteredChest || (enteredNum !== '' && cChestNum === enteredNum);
  });

  if (cand) {
    authenticatedCandidate = cand;
    if (errEl) errEl.classList.add('hidden');
    showToast(`Logged in as ${cand.name || 'Candidate'}`, "success");
    renderAuthenticatedCandidateView(cand);
  } else {
    const msg = `Chest number #${enteredChest} does not exist`;
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
    }
    showToast(msg, "error");
  }
};

window.handleQRScanTrigger = function () {
  showToast("QR Code scanning is a coming soon feature!", "info");
};

window.logoutCandidate = function () {
  authenticatedCandidate = null;
  const wrapper = document.getElementById('cand-auth-wrapper');
  const display = document.getElementById('cand-profile-display');
  if (display) display.classList.add('hidden');
  if (wrapper) {
    wrapper.classList.remove('hidden');
    wrapper.classList.remove('animate-profile-fade-in');
    void wrapper.offsetWidth;
    wrapper.classList.add('animate-profile-fade-in');
  }
  showToast("Logged out successfully", "info");
};

function renderAuthenticatedCandidateView(cand) {
  const wrapper = document.getElementById('cand-auth-wrapper');
  const display = document.getElementById('cand-profile-display');
  if (wrapper) wrapper.classList.add('hidden');
  if (display) {
    display.classList.remove('hidden');
    display.classList.remove('animate-profile-fade-in');
    void display.offsetWidth;
    display.classList.add('animate-profile-fade-in');
  }

  const avatar = document.getElementById('cand-avatar');
  const nameEl = document.getElementById('cand-display-name');
  const chestEl = document.getElementById('cand-display-chest');
  const teamEl = document.getElementById('cand-display-team');
  const secEl = document.getElementById('cand-display-section');

  const photoUrl = getCandidatePhotoUrl(cand);
  const initials = getInitials(cand ? cand.name : '');

  if (avatar) {
    if (photoUrl) {
      avatar.innerHTML = `<img src="${photoUrl}" alt="${cand.name || ''}" class="w-full h-full object-cover rounded-2xl" onerror="this.onerror=null; this.parentElement.innerHTML='${initials}';" />`;
    } else {
      avatar.textContent = initials;
    }
  }
  if (nameEl) nameEl.textContent = cand.name || 'Candidate Profile';
  if (chestEl) chestEl.textContent = `#${cand.chestNo || ''}`;
  if (teamEl) teamEl.textContent = cand.team || 'Unassigned';
  if (secEl) secEl.textContent = cand.section || 'General';

  // Calculate results for this candidate
  let totalPts = 0;
  let winsCount = 0;
  let candResults = [];

  allPrograms.forEach(prog => {
    if (Array.isArray(prog.winners)) {
      const match = prog.winners.find(w =>
        w.candidateId === cand.id ||
        String(w.chestNo || '') === String(cand.chestNo || '') ||
        (w.candidateName || '').toLowerCase() === (cand.name || '').toLowerCase()
      );
      if (match) {
        if (prog.isPublished) {
          totalPts += (match.points || 0);
          if (match.position === 1) winsCount += 1;
        }
        candResults.push({
          programName: prog.name,
          programCode: prog.code,
          category: prog.category || prog.section,
          position: match.position,
          grade: match.grade,
          points: match.points,
          isPublished: prog.isPublished === true
        });
      }
    }
  });

  // Calculate total participations count for candidate
  let totalParticipations = candResults.length;
  if (Array.isArray(cand.programs)) {
    totalParticipations = Math.max(totalParticipations, cand.programs.length);
  } else if (cand.eventCount) {
    totalParticipations = Math.max(totalParticipations, cand.eventCount);
  }

  const statPts = document.getElementById('cand-stat-points');
  const statWins = document.getElementById('cand-stat-wins');
  const statEvents = document.getElementById('cand-stat-events');
  const statPct = document.getElementById('cand-stat-percentage');

  // Calculate percentage: Total Points / Max Achievable Points (based on participations)
  const maxPossibleMarks = totalParticipations > 0 ? totalParticipations * 8 : 0;
  const percentageVal = maxPossibleMarks > 0 ? Math.min(100, Math.round((totalPts / maxPossibleMarks) * 100)) : 0;

  if (statEvents) statEvents.textContent = `${totalParticipations} Events`;
  if (statWins) statWins.textContent = `${winsCount} Published`;
  if (statPts) statPts.textContent = `${totalPts} Marks`;
  if (statPct) statPct.textContent = `${percentageVal}%`;

  const listContainer = document.getElementById('cand-results-list');
  if (listContainer) {
    if (candResults.length === 0) {
      listContainer.innerHTML = `<div class="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 font-normal text-xs">No declared program results found for candidate #${cand.chestNo || ''}.</div>`;
    } else {
      listContainer.innerHTML = candResults.map(r => `
        <div class="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <span class="text-[10px] font-medium uppercase px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200 mb-1 inline-block">${r.category}</span>
            <h5 class="font-medium text-slate-900 text-xs sm:text-sm">${r.programName}</h5>
            <p class="text-[11px] font-mono font-normal text-slate-400">Code: #${r.programCode}</p>
          </div>
          <div class="text-right">
            ${r.isPublished ? `
              <span class="px-2.5 py-0.5 bg-amber-50 text-amber-950 font-medium text-xs rounded-full border border-amber-200">
                ${r.position === 1 ? '1st Rank' : r.position === 2 ? '2nd Rank' : '3rd Rank'} (Grade ${r.grade})
              </span>
              <span class="block text-xs font-medium text-slate-900 mt-1">+${r.points} Pts</span>
            ` : `
              <span class="px-2.5 py-0.5 bg-slate-100 text-slate-500 font-medium text-xs rounded-full border border-slate-200">
                Result not published
              </span>
            `}
          </div>
        </div>
      `).join('');
    }
  }
}

window.logoutCandidate = function () {
  authenticatedCandidate = null;
  const errEl = document.getElementById('cand-login-error');
  if (errEl) errEl.classList.add('hidden');

  ['cand-digit-1', 'cand-digit-2', 'cand-digit-3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const wrapper = document.getElementById('cand-auth-wrapper');
  const display = document.getElementById('cand-profile-display');
  if (wrapper) wrapper.classList.remove('hidden');
  if (display) display.classList.add('hidden');
};

// Render Starred Programs
function renderStarredPrograms() {
  const container = document.getElementById('starred-programs-grid');
  const countBadge = document.getElementById('starred-count-badge');
  if (!container) return;

  const starredList = allPrograms.filter(p => starredPrograms.includes(p.id));
  if (countBadge) countBadge.textContent = `${starredList.length} Starred`;

  if (starredList.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-8 text-center text-slate-400 font-medium text-xs">
        No starred programs yet. Click the star icon on any result card to bookmark it.
      </div>
    `;
    return;
  }

  container.innerHTML = starredList.map(prog => `
    <div class="content-card p-4 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between gap-2 mb-2">
          <span class="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-amber-50 text-amber-900 border border-amber-200">
            ${prog.category || prog.section}
          </span>
          <button onclick="toggleStarProgram('${prog.id}')" class="text-amber-500">
            <span class="iconify text-base" data-icon="solar:star-bold"></span>
          </button>
        </div>
        <h4 class="font-medium text-slate-900 text-sm leading-snug">${prog.name}</h4>
      </div>
      <button onclick="openProgramModal('${prog.id}')" class="mt-3 text-xs font-medium text-sky-600 hover:underline">
        View Winners &rarr;
      </button>
    </div>
  `).join('');
}

window.openCandidateProfileByChestNo = function (candidateOrWinnerOrChest) {
  let cand = null;
  if (typeof candidateOrWinnerOrChest === 'object' && candidateOrWinnerOrChest !== null) {
    cand = allCandidates.find(c =>
      (c.id && c.id === candidateOrWinnerOrChest.candidateId) ||
      (c.chestNo && String(c.chestNo) === String(candidateOrWinnerOrChest.chestNo)) ||
      (c.name && c.name.toLowerCase() === (candidateOrWinnerOrChest.candidateName || candidateOrWinnerOrChest.name || '').toLowerCase())
    ) || candidateOrWinnerOrChest;
  } else if (candidateOrWinnerOrChest) {
    const searchVal = String(candidateOrWinnerOrChest).trim().toLowerCase();
    cand = allCandidates.find(c =>
      String(c.chestNo || c.chest || '').toLowerCase() === searchVal ||
      (c.id && c.id === searchVal) ||
      (c.name && c.name.toLowerCase() === searchVal)
    );
  }

  if (cand) {
    authenticatedCandidate = cand;
    switchSidebarTab('candidate');
    renderAuthenticatedCandidateView(cand);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    switchSidebarTab('candidate');
  }
};

function renderCandidateToppers() {
  const container = document.getElementById('toppers-list');
  const countBadge = document.getElementById('topper-count-badge');
  if (!container) return;

  const candidateMap = {};
  const sectionCandidateMap = {};
  const createdSections = getCreatedSectionsList().filter(s => s.toUpperCase() !== 'KULLIYA');
  createdSections.forEach(sec => sectionCandidateMap[sec.toUpperCase()] = { secName: sec, candidates: {} });

  allPrograms.forEach(p => {
    const section = (p.category || p.section || '').toUpperCase();
    const isKulliyaSection = section === 'KULLIYA';
    const isGroup = (p.type || '').toLowerCase().includes('group') || isKulliyaSection;
    
    if (p.isPublished && Array.isArray(p.winners)) {
      p.winners.forEach(w => {
        // OVERALL candidate map (exclude ALL group and kulliya)
        if (!isGroup && !w.isGroupResult) {
          const cKey = w.candidateName;
          if (cKey) {
            if (!candidateMap[cKey]) {
              candidateMap[cKey] = {
                name: w.candidateName,
                team: w.team,
                points: 0,
                winsCount: 0,
                winnerObj: w
              };
            }
            candidateMap[cKey].points += (w.points || 0);
            candidateMap[cKey].winsCount += 1;
          }
        }

        // SECTION candidate map
        if (sectionCandidateMap[section]) {
          if (isGroup && !isKulliyaSection) return;
          if (w.isGroupResult && !isKulliyaSection) return;
          
          let sKey = w.candidateName;
          let dName = w.candidateName;
          if (isKulliyaSection) {
            sKey = w.team || w.candidateName || 'Unknown Team';
            dName = w.team || w.candidateName || 'Unknown Team';
          }
          if (!sKey) return;

          if (!sectionCandidateMap[section].candidates[sKey]) {
            sectionCandidateMap[section].candidates[sKey] = { name: dName, team: w.team, points: 0, winsCount: 0, winnerObj: w };
          }
          sectionCandidateMap[section].candidates[sKey].points += (w.points || 0);
          sectionCandidateMap[section].candidates[sKey].winsCount += 1;
        }
      });
    }
  });

  const overallToppers = Object.values(candidateMap).sort((a, b) => b.points - a.points);

  if (overallToppers.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs font-medium">No candidate results available yet.</div>`;
    if (countBadge) countBadge.textContent = `0 Candidates`;
    return;
  }

  const collegeTopper = overallToppers[0];
  let matchedCand = allCandidates.find(c =>
    (c.id && c.id === collegeTopper.winnerObj?.candidateId) ||
    (c.chestNo && String(c.chestNo) === String(collegeTopper.winnerObj?.chestNo)) ||
    (c.name && c.name.toLowerCase() === (collegeTopper.name || '').toLowerCase())
  );

  let totalParticipations = collegeTopper.winsCount;
  let chestNo = collegeTopper.winnerObj?.chestNo || 'N/A';
  let sectionName = matchedCand?.section || matchedCand?.category || collegeTopper.winnerObj?.category || 'General';

  if (matchedCand) {
    if (Array.isArray(matchedCand.programs)) totalParticipations = Math.max(totalParticipations, matchedCand.programs.length);
    else if (matchedCand.eventCount) totalParticipations = Math.max(totalParticipations, matchedCand.eventCount);
    if (matchedCand.chestNo) chestNo = matchedCand.chestNo;
  }

  const maxPossibleMarks = totalParticipations * 8;
  const percentageVal = maxPossibleMarks > 0 ? Math.min(100, Math.round((collegeTopper.points / maxPossibleMarks) * 100)) : 0;

  const photoUrl = getCandidatePhotoUrl(collegeTopper.winnerObj, matchedCand);
  const initials = getInitials(collegeTopper.name);
  let avatarHtml = photoUrl 
    ? `<img src="${photoUrl}" alt="${collegeTopper.name}" class="w-16 h-16 rounded-full border-4 border-white shadow-sm object-cover" onerror="this.onerror=null; this.outerHTML='<div class=\\'w-16 h-16 rounded-full bg-amber-500 text-white font-medium text-xl flex items-center justify-center border-4 border-white shadow-sm uppercase\\'>${initials}</div>';" />`
    : `<div class="w-16 h-16 rounded-full bg-amber-500 text-white font-medium text-xl flex items-center justify-center border-4 border-white shadow-sm uppercase">${initials}</div>`;

  const searchArg = (chestNo || collegeTopper.winnerObj?.candidateId || collegeTopper.name || '').replace(/'/g, "\\'");

  let html = `
    <!-- College Topper Card -->
    <div class="bg-gradient-to-br from-amber-50/80 to-amber-100/50 border border-amber-200 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden shadow-sm cursor-pointer group" onclick="openCandidateProfileByChestNo('${searchArg}')">
      <div class="absolute -right-4 -top-4 opacity-10 pointer-events-none transition-transform group-hover:scale-110">
        <span class="iconify text-8xl text-amber-500" data-icon="solar:crown-star-bold"></span>
      </div>
      
      <div class="shrink-0 relative z-10">
        ${avatarHtml}
        <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm">
          <span class="iconify text-xs" data-icon="solar:star-bold"></span>
        </div>
      </div>
      
      <div class="flex-1 min-w-0 text-center sm:text-left z-10">
        <span class="px-2 py-0.5 rounded-md bg-amber-200/50 text-amber-800 text-[9px] font-medium uppercase tracking-wider mb-1.5 inline-block">College Topper</span>
        <h3 class="text-lg font-medium text-slate-900 truncate group-hover:text-amber-600 transition-colors">${collegeTopper.name}</h3>
        <p class="text-xs font-normal text-slate-600 truncate mt-0.5">${collegeTopper.team} <span class="mx-1 text-slate-300">&bull;</span> ${sectionName}</p>
        <p class="text-[11px] text-slate-500 mt-1 font-mono">Chest No: #${chestNo}</p>
      </div>
      
      <div class="flex gap-4 sm:flex-col sm:gap-2 items-center sm:items-end z-10 mt-4 sm:mt-0">
        <div class="text-center sm:text-right bg-white/80 px-3 py-1.5 rounded-xl border border-amber-100 min-w-[70px]">
          <span class="block text-xl font-medium text-amber-600 leading-none">${collegeTopper.points}</span>
          <span class="text-[9px] font-medium text-amber-700/70 uppercase">Total Pts</span>
        </div>
        <div class="text-center sm:text-right bg-white/80 px-3 py-1.5 rounded-xl border border-sky-100 min-w-[70px]">
          <span class="block text-xl font-medium text-sky-600 leading-none">${percentageVal}%</span>
          <span class="text-[9px] font-medium text-sky-700/70 uppercase">Score</span>
        </div>
      </div>
    </div>
    
    <!-- Section Toppers -->
    <h4 class="font-medium text-slate-800 text-sm mb-4 px-1 flex items-center gap-2">
      <span class="iconify text-slate-400" data-icon="solar:medal-star-bold"></span> Section Toppers
    </h4>
    <div class="space-y-3">
  `;

  let sectionTopperCount = 0;

  createdSections.forEach(sec => {
    const sectionData = sectionCandidateMap[sec.toUpperCase()];
    
    // Empty state for this section
    if (!sectionData || !sectionData.candidates || Object.keys(sectionData.candidates).length === 0) {
      html += `
        <div class="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 text-slate-400">
          <div class="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
            <span class="iconify text-xl text-slate-300" data-icon="solar:user-block-rounded-linear"></span>
          </div>
          <div class="flex-1">
            <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-medium uppercase tracking-wider mb-1 inline-block">${sec}</span>
            <p class="text-sm font-normal text-slate-500">Not Registered</p>
          </div>
        </div>
      `;
      return;
    }

    const secCands = Object.values(sectionData.candidates).sort((a, b) => b.points - a.points);
    const topCand = secCands[0];
    sectionTopperCount++;
    
    let sMatchedCand = allCandidates.find(c =>
      (c.id && c.id === topCand.winnerObj?.candidateId) ||
      (c.chestNo && String(c.chestNo) === String(topCand.winnerObj?.chestNo)) ||
      (c.name && c.name.toLowerCase() === (topCand.name || '').toLowerCase())
    );
    
    let sTotalParticipations = topCand.winsCount;
    let sChestNo = topCand.winnerObj?.chestNo || 'N/A';
    
    if (sMatchedCand) {
      if (Array.isArray(sMatchedCand.programs)) sTotalParticipations = Math.max(sTotalParticipations, sMatchedCand.programs.length);
      else if (sMatchedCand.eventCount) sTotalParticipations = Math.max(sTotalParticipations, sMatchedCand.eventCount);
      if (sMatchedCand.chestNo) sChestNo = sMatchedCand.chestNo;
    }
    
    const sMaxPossibleMarks = sTotalParticipations * 8;
    const sPercentageVal = sMaxPossibleMarks > 0 ? Math.min(100, Math.round((topCand.points / sMaxPossibleMarks) * 100)) : 0;
    
    const sPhotoUrl = getCandidatePhotoUrl(topCand.winnerObj, sMatchedCand);
    const sInitials = getInitials(topCand.name);
    
    let sAvatarHtml = sPhotoUrl
      ? `<img src="${sPhotoUrl}" alt="${topCand.name}" class="w-12 h-12 rounded-full border-2 border-slate-100 shadow-sm object-cover shrink-0" onerror="this.onerror=null; this.outerHTML='<div class=\\'w-12 h-12 rounded-full bg-slate-100 text-slate-600 font-medium text-lg flex items-center justify-center border-2 border-slate-200 shrink-0 uppercase\\'>${sInitials}</div>';" />`
      : `<div class="w-12 h-12 rounded-full bg-slate-100 text-slate-600 font-medium text-lg flex items-center justify-center border-2 border-slate-200 shadow-sm shrink-0 uppercase">${sInitials}</div>`;
    
    const sSearchArg = (sChestNo || topCand.winnerObj?.candidateId || topCand.name || '').replace(/'/g, "\\'");

    html += `
      <div class="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer group" onclick="openCandidateProfileByChestNo('${sSearchArg}')">
        <div class="flex items-center gap-4 flex-1 min-w-0">
          ${sAvatarHtml}
          <div class="flex-1 min-w-0">
            <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[9px] font-medium uppercase tracking-wider mb-1 inline-block">${sec} Topper</span>
            <h4 class="font-medium text-slate-900 text-base truncate group-hover:text-amber-600 transition-colors">${topCand.name}</h4>
            <p class="text-xs font-normal text-slate-500 truncate mt-0.5">${topCand.team}</p>
            <p class="text-[10px] text-slate-400 mt-0.5 font-mono">Chest No: #${sChestNo}</p>
          </div>
        </div>
        
        <div class="flex gap-6 items-center sm:justify-end mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
          <div class="text-center sm:text-right">
            <span class="block text-xl font-medium text-amber-600 leading-none">${topCand.points}</span>
            <span class="text-[9px] font-medium text-slate-400 uppercase mt-1 block">Total Pts</span>
          </div>
          <div class="text-center sm:text-right">
            <span class="block text-xl font-medium text-sky-600 leading-none">${sPercentageVal}%</span>
            <span class="text-[9px] font-medium text-slate-400 uppercase mt-1 block">Score</span>
          </div>
        </div>
      </div>
    `;
  });

  html += `</div>`;

  container.innerHTML = html;
  
  if (countBadge) countBadge.textContent = `${sectionTopperCount + 1} Toppers`;
}

let previousActiveTabBeforeDetail = 'dashboard';

window.openProgramModal = function (programId) {
  const prog = allPrograms.find(p => p.id === programId);
  if (!prog) return;

  previousActiveTabBeforeDetail = activeSidebarTab;

  const detailView = document.getElementById('view-program-detail');
  if (!detailView) return;

  ['view-dashboard', 'view-leaderboard', 'view-results', 'view-candidate', 'view-institution', 'view-starred', 'view-toppers', 'view-program-detail'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  detailView.classList.remove('hidden');

  const titleEl = document.getElementById('detail-prog-title');
  const codeEl = document.getElementById('detail-prog-code');
  const catEl = document.getElementById('detail-prog-category');
  const statusEl = document.getElementById('detail-prog-status-badge');
  const listEl = document.getElementById('detail-winners-list');

  if (titleEl) titleEl.textContent = prog.name;
  if (codeEl) codeEl.textContent = `#${prog.code || prog.id}`;
  if (catEl) catEl.textContent = prog.category || prog.section || 'General';

  if (statusEl) {
    if (prog.isPublished) {
      statusEl.className = "px-3.5 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shrink-0";
      statusEl.innerHTML = `<span class="iconify text-base" data-icon="solar:check-circle-bold"></span><span>Results Declared</span>`;
    } else {
      statusEl.className = "px-3.5 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5 shrink-0";
      statusEl.innerHTML = `<span class="iconify text-base" data-icon="solar:clock-circle-linear"></span><span>Evaluation in Progress</span>`;
    }
  }

  if (listEl) {
    if (!prog.isPublished || !prog.winners || prog.winners.length === 0) {
      listEl.innerHTML = `
        <div class="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
          <span class="iconify text-3xl text-amber-500 mb-2 inline-block" data-icon="solar:clock-circle-linear"></span>
          <h5 class="font-medium text-slate-800 text-sm">Evaluation in Progress</h5>
          <p class="text-xs text-slate-500 font-normal mt-1 max-w-sm mx-auto">Official position winners for this program have not been declared yet.</p>
        </div>
      `;
    } else {
      listEl.innerHTML = prog.winners.map(w => {
        const rankText = w.position === 1 ? '1st Rank' : w.position === 2 ? '2nd Rank' : w.position === 3 ? '3rd Rank' : `${w.position}th Rank`;
        const rankColor = w.position === 1 ? 'bg-amber-500 text-white border-amber-600' : w.position === 2 ? 'bg-slate-700 text-white border-slate-800' : w.position === 3 ? 'bg-rose-600 text-white border-rose-700' : 'bg-slate-100 text-slate-700 border-slate-300';

        const matchedCand = allCandidates.find(c =>
          (c.id && c.id === w.candidateId) ||
          (c.chestNo && String(c.chestNo) === String(w.chestNo)) ||
          (c.name && c.name.toLowerCase() === (w.candidateName || '').toLowerCase())
        );
        const photoUrl = getCandidatePhotoUrl(w, matchedCand);
        const initials = getInitials(w.candidateName);

        let avatarHtml = '';
        if (photoUrl) {
          avatarHtml = `<img src="${photoUrl}" alt="${w.candidateName}" class="w-12 h-12 rounded-xl object-cover border border-amber-300 shrink-0" onerror="this.onerror=null; this.outerHTML='<div class=\\'w-12 h-12 rounded-xl bg-[#0c2f82] text-amber-300 font-bold text-sm flex items-center justify-center border border-amber-300 shrink-0 uppercase\\'>${initials}</div>';" />`;
        } else {
          avatarHtml = `<div class="w-12 h-12 rounded-xl bg-[#0c2f82] text-amber-300 font-bold text-sm flex items-center justify-center border border-amber-300 shrink-0 uppercase">${initials}</div>`;
        }

        return `
          <div class="p-4 bg-slate-50/70 border border-slate-200/90 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-3.5 min-w-0">
              <span class="px-3 py-1.5 rounded-xl font-medium text-xs flex items-center justify-center shrink-0 border shadow-sm ${rankColor}">
                ${rankText}
              </span>
              ${avatarHtml}
              <div class="min-w-0">
                <h5 class="font-medium text-slate-900 text-base truncate">${w.candidateName}</h5>
                <p class="text-xs font-normal text-slate-500 truncate">${w.team || 'Unassigned Team'} ${w.chestNo ? `(#${w.chestNo})` : ''}</p>
              </div>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <span class="px-3 py-1 rounded-lg bg-amber-50 text-amber-950 font-medium text-xs border border-amber-200">
                Grade ${w.grade || 'A'}
              </span>
              <span class="text-sm font-medium text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                +${w.points} Pts
              </span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.closeProgramDetailView = function () {
  const detailView = document.getElementById('view-program-detail');
  if (detailView) detailView.classList.add('hidden');
  switchSidebarTab(previousActiveTabBeforeDetail || 'dashboard');
};

function closeModal() {
  closeProgramDetailView();
}

// Custom Dashboard View Functions
let activeDashboardProgramId = null;

function startDashboardCycle() {
  if (dashboardCycleInterval) clearInterval(dashboardCycleInterval);
  dashboardCycleInterval = setInterval(() => {
    if (activeSidebarTab !== 'dashboard') return;
    const publishedProgs = allPrograms.filter(p => p.isPublished === true).slice(0, 7);
    if (publishedProgs.length <= 1) return;
    let currentIndex = publishedProgs.findIndex(p => p.id === activeDashboardProgramId);
    let nextIndex = (currentIndex + 1) % publishedProgs.length;
    activeDashboardProgramId = publishedProgs[nextIndex].id;
    
    const podiumContainer = document.getElementById('dashboard-podium-container');
    if (podiumContainer) {
      podiumContainer.style.transition = 'opacity 0.2s';
      podiumContainer.style.opacity = '0.3';
      setTimeout(() => {
        updateDashboardHeaderInfo();
        renderDashboardView();
        podiumContainer.style.opacity = '1';
      }, 200);
    } else {
      updateDashboardHeaderInfo();
      renderDashboardView();
    }
  }, 15000);
}

function updateDashboardHeaderInfo() {
  const publishedProgs = allPrograms.filter(p => p.isPublished === true);

  if (!activeDashboardProgramId && publishedProgs.length > 0) {
    activeDashboardProgramId = publishedProgs[0].id;
  }

  const activeProg = publishedProgs.find(p => p.id === activeDashboardProgramId) || publishedProgs[0];

  const progNameEl = document.getElementById('dash-program-name-text');
  const secTextEl = document.getElementById('dash-tab-section-text');

  if (activeProg) {
    if (progNameEl) progNameEl.textContent = activeProg.name || activeProg.programName || 'Select Program';
    if (secTextEl) secTextEl.textContent = activeProg.category || activeProg.section || 'General';
  } else {
    if (progNameEl) progNameEl.textContent = 'Result not published';
    if (secTextEl) secTextEl.textContent = '-';
  }
}

window.selectDashboardProgram = function (progId) {
  activeDashboardProgramId = progId;
  updateDashboardHeaderInfo();
  renderDashboardView();
};

function renderDashboardView() {
  updateDashboardHeaderInfo();
  renderDashboardPodium();
  renderRecentUploadedList();
}

function getCandidatePhotoUrl(candOrWinner, matchedCand) {
  if (!candOrWinner) return null;
  const sources = [
    candOrWinner.imageUrl,
    candOrWinner.photo,
    candOrWinner.image,
    candOrWinner.candidatePhoto,
    candOrWinner.photoUrl,
    candOrWinner.avatar,
    candOrWinner.photoURL,
    matchedCand?.imageUrl,
    matchedCand?.photo,
    matchedCand?.image,
    matchedCand?.photoUrl,
    matchedCand?.avatar,
    matchedCand?.photoURL
  ];
  return sources.find(src => src && typeof src === 'string' && src.trim() !== '') || null;
}

function getInitials(name) {
  if (!name || name === '-' || name.trim() === '') return '--';
  const clean = name.trim().toUpperCase();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words[0].length > 0 && words[1].length > 0) {
    return `${words[0][0]}${words[1][0]}`;
  }
  return clean.substring(0, 2);
}

function getTeamColor(teamName, winner, matchedCand) {
  if (winner?.teamColor) return winner.teamColor;
  if (matchedCand?.teamColor || matchedCand?.color) return matchedCand.teamColor || matchedCand.color;

  if (teamName && teamName !== '-' && Array.isArray(allTeams)) {
    const t = allTeams.find(team =>
      (team.name && team.name.toLowerCase() === teamName.toLowerCase()) ||
      (team.code && team.code.toLowerCase() === teamName.toLowerCase()) ||
      (team.id && team.id === teamName)
    );
    if (t && (t.color || t.teamColor)) return t.color || t.teamColor;
  }
  return null;
}

function getTeamGradientStyle(teamName, rankPosition, winner, matchedCand) {
  const teamColor = getTeamColor(teamName, winner, matchedCand);
  if (teamColor && typeof teamColor === 'string' && teamColor.startsWith('#')) {
    return `background: linear-gradient(160deg, ${teamColor} 0%, #081229 95%); border: 1.5px solid ${teamColor}88;`;
  }

  if (rankPosition === 1) {
    return `background: linear-gradient(160deg, #1e3a8a 0%, #081229 95%); border: 1.5px solid #fbbf24;`;
  } else if (rankPosition === 2) {
    return `background: linear-gradient(160deg, #334155 0%, #081229 95%); border: 1.5px solid #cbd5e1;`;
  }
  return `background: linear-gradient(160deg, #451a03 0%, #081229 95%); border: 1.5px solid #d97706;`;
}

function getCandidateAvatarContent(winner, rankPosition) {
  if (!winner || !winner.candidateName || winner.candidateName === '-') {
    return `
      <div class="w-full h-full flex items-center justify-center text-white/30 text-2xl sm:text-3xl font-medium tracking-widest">
        --
      </div>
    `;
  }

  const matchedCand = allCandidates.find(c =>
    (c.id && c.id === winner.candidateId) ||
    (c.chestNo && String(c.chestNo) === String(winner.chestNo)) ||
    (c.name && c.name.toLowerCase() === (winner.candidateName || '').toLowerCase())
  );

  const photoUrl = getCandidatePhotoUrl(winner, matchedCand);
  const initials = getInitials(winner.candidateName);

  const rank1Fallback = `<div class="w-full h-full flex flex-col items-center justify-center text-white font-medium"><span class="iconify text-amber-300 text-2xl sm:text-3xl mb-1" data-icon="solar:crown-bold"></span><span class="text-2xl sm:text-3xl tracking-wider leading-none uppercase font-medium">${initials}</span></div>`;
  const rankOtherFallback = `<div class="w-full h-full flex items-center justify-center text-white text-2xl sm:text-3xl font-medium tracking-wider uppercase">${initials}</div>`;
  const fallbackHTML = rankPosition === 1 ? rank1Fallback : rankOtherFallback;

  if (photoUrl) {
    const escapedFallback = fallbackHTML.replace(/"/g, '&quot;').replace(/'/g, "\\'");
    return `
      <img src="${photoUrl}" alt="${winner.candidateName}" class="w-full h-full object-cover object-top" onerror="this.onerror=null; this.outerHTML='${escapedFallback}';" />
    `;
  }

  if (rankPosition === 1) {
    return `
      <div class="w-full h-full flex flex-col items-center justify-center text-white font-medium">
        <span class="iconify text-amber-300 text-2xl sm:text-3xl mb-1" data-icon="solar:crown-bold"></span>
        <span class="text-2xl sm:text-3xl tracking-wider leading-none uppercase font-medium">${initials}</span>
      </div>
    `;
  }

  return `
    <div class="w-full h-full flex items-center justify-center text-white text-2xl sm:text-3xl font-medium tracking-wider uppercase">
      ${initials}
    </div>
  `;
}

function renderDashboardPodium() {
  const container = document.getElementById('dashboard-podium-container');
  if (!container) return;

  const publishedProgs = allPrograms.filter(p => p.isPublished === true);
  const activeProg = publishedProgs.find(p => p.id === activeDashboardProgramId) || publishedProgs[0];

  let winnersList = [];
  if (activeProg && Array.isArray(activeProg.winners) && activeProg.winners.length > 0) {
    winnersList = activeProg.winners;
  }

  if (winnersList.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400 font-medium text-xs bg-white border border-slate-200 rounded-2xl w-full">
        Result not published
      </div>
    `;
    return;
  }

  const first = winnersList.find(w => w.position === 1) || winnersList[0];
  const second = winnersList.find(w => w.position === 2) || winnersList[1];
  const third = winnersList.find(w => w.position === 3) || winnersList[2];

  const firstCand = allCandidates.find(c => first && ((c.id && c.id === first.candidateId) || (c.chestNo && String(c.chestNo) === String(first.chestNo)) || (c.name && c.name.toLowerCase() === (first.candidateName || '').toLowerCase())));
  const secondCand = allCandidates.find(c => second && ((c.id && c.id === second.candidateId) || (c.chestNo && String(c.chestNo) === String(second.chestNo)) || (c.name && c.name.toLowerCase() === (second.candidateName || '').toLowerCase())));
  const thirdCand = allCandidates.find(c => third && ((c.id && c.id === third.candidateId) || (c.chestNo && String(c.chestNo) === String(third.chestNo)) || (c.name && c.name.toLowerCase() === (third.candidateName || '').toLowerCase())));

  const firstName = first ? (first.candidateName || first.name || 'Candidate') : '-';
  const firstTeam = first ? (first.team || '') : '';
  const firstGrade = first && first.candidateName && first.candidateName !== '-' ? (first.grade || 'A') : null;
  const firstPts = first && first.candidateName && first.candidateName !== '-' && first.points ? first.points : null;

  const secondName = second ? (second.candidateName || second.name || 'Candidate') : '-';
  const secondTeam = second ? (second.team || '') : '';
  const secondGrade = second && second.candidateName && second.candidateName !== '-' ? (second.grade || 'A') : null;
  const secondPts = second && second.candidateName && second.candidateName !== '-' && second.points ? second.points : null;

  const thirdName = third ? (third.candidateName || third.name || 'Candidate') : '-';
  const thirdTeam = third ? (third.team || '') : '';
  const thirdGrade = third && third.candidateName && third.candidateName !== '-' ? (third.grade || 'A') : null;
  const thirdPts = third && third.candidateName && third.candidateName !== '-' && third.points ? third.points : null;

  container.innerHTML = `
    <!-- 2nd Place (Left) -->
    <div class="flex flex-col items-center flex-1 max-w-[140px] sm:max-w-[170px]">
      <div class="w-full h-56 sm:h-64 rounded-[2rem] flex flex-col items-center justify-center relative shadow-md overflow-hidden" style="${getTeamGradientStyle(secondTeam, 2, second, secondCand)}">
        ${getCandidateAvatarContent(second, 2)}
      </div>
      <div class="px-3 py-0.5 bg-slate-200 text-slate-900 rounded-full flex items-center justify-center gap-1 font-medium text-xs border border-white shadow-sm -mt-4 z-10 shrink-0">
        <span>2<sup>nd</sup></span>
        ${secondGrade ? `<span class="w-1 h-1 rounded-full bg-slate-900/30"></span><span class="text-[10px] font-normal uppercase">Grade ${secondGrade}</span>` : ''}
      </div>
      <h4 class="font-medium text-slate-800 text-center text-xs sm:text-sm mt-2 w-full truncate" title="${secondName}">
        ${secondName}
      </h4>
      <p class="text-[11px] text-slate-400 font-normal text-center w-full truncate mt-0.5">
        ${secondTeam || '-'}${secondPts ? ` • ${secondPts} Pts` : ''}
      </p>
    </div>

    <!-- 1st Place (Center) -->
    <div class="flex flex-col items-center flex-1 max-w-[140px] sm:max-w-[170px]">
      <div class="w-full h-56 sm:h-64 rounded-[2rem] flex flex-col items-center justify-center relative shadow-md overflow-hidden" style="${getTeamGradientStyle(firstTeam, 1, first, firstCand)}">
        ${getCandidateAvatarContent(first, 1)}
      </div>
      <div class="px-3.5 py-0.5 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center gap-1 font-medium text-xs border border-white shadow-md -mt-4 z-10 shrink-0">
        <span>1<sup>st</sup></span>
        ${firstGrade ? `<span class="w-1 h-1 rounded-full bg-slate-950/30"></span><span class="text-[10px] font-normal uppercase">Grade ${firstGrade}</span>` : ''}
      </div>
      <h4 class="font-medium text-slate-900 text-center text-xs sm:text-sm mt-2 w-full truncate" title="${firstName}">
        ${firstName}
      </h4>
      <p class="text-[11px] text-slate-400 font-normal text-center w-full truncate mt-0.5">
        ${firstTeam || '-'}${firstPts ? ` • ${firstPts} Pts` : ''}
      </p>
    </div>

    <!-- 3rd Place (Right) -->
    <div class="flex flex-col items-center flex-1 max-w-[140px] sm:max-w-[170px]">
      <div class="w-full h-56 sm:h-64 rounded-[2rem] flex flex-col items-center justify-center relative shadow-md overflow-hidden" style="${getTeamGradientStyle(thirdTeam, 3, third, thirdCand)}">
        ${getCandidateAvatarContent(third, 3)}
      </div>
      <div class="px-3 py-0.5 bg-amber-700 text-white rounded-full flex items-center justify-center gap-1 font-medium text-xs border border-white shadow-sm -mt-4 z-10 shrink-0">
        <span>3<sup>rd</sup></span>
        ${thirdGrade ? `<span class="w-1 h-1 rounded-full bg-white/30"></span><span class="text-[10px] font-normal uppercase">Grade ${thirdGrade}</span>` : ''}
      </div>
      <h4 class="font-medium text-slate-800 text-center text-xs sm:text-sm mt-2 w-full truncate" title="${thirdName}">
        ${thirdName}
      </h4>
      <p class="text-[11px] text-slate-400 font-normal text-center w-full truncate mt-0.5">
        ${thirdTeam || '-'}${thirdPts ? ` • ${thirdPts} Pts` : ''}
      </p>
    </div>
  `;
}

function getSmallAvatar(winner, rankPos) {
  if (!winner || !winner.candidateName || winner.candidateName === '-') {
    return `<div class="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0">-</div>`;
  }

  const matchedCand = allCandidates.find(c =>
    (c.id && c.id === winner.candidateId) ||
    (c.chestNo && String(c.chestNo) === String(winner.chestNo)) ||
    (c.name && c.name.toLowerCase() === (winner.candidateName || '').toLowerCase())
  );

  const photoUrl = getCandidatePhotoUrl(winner, matchedCand);
  const initials = getInitials(winner.candidateName);
  const teamColor = getTeamColor(winner.team, winner, matchedCand);

  let styleString = '';
  let bgClass = '';
  if (teamColor) {
    styleString = `background-color: ${teamColor}; border-color: ${teamColor}; color: white;`;
  } else {
    bgClass = rankPos === 1 ? 'bg-amber-500 text-white border-amber-600' : rankPos === 2 ? 'bg-slate-700 text-white border-slate-800' : 'bg-amber-700 text-white border-amber-800';
  }

  if (photoUrl) {
    const errorHTML = `<div class=\\'w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold shrink-0 uppercase shadow-sm ${bgClass}\\' style=\\'${styleString}\\'>${initials}</div>`;
    return `<img src="${photoUrl}" alt="${winner.candidateName}" class="w-7 h-7 rounded-full border-2 border-amber-400 object-cover shrink-0 shadow-sm" style="${styleString}" onerror="this.onerror=null; this.outerHTML='${errorHTML}';" />`;
  }

  return `<div class="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold shrink-0 uppercase shadow-sm ${bgClass}" style="${styleString}">${initials}</div>`;
}

function renderRecentUploadedList() {
  const container = document.getElementById('recent-uploaded-list');
  if (!container) return;

  const publishedProgs = allPrograms.filter(p => p.isPublished === true);

  if (publishedProgs.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs font-medium bg-white border border-slate-200 rounded-2xl">Result not published</div>`;
    return;
  }

  container.innerHTML = publishedProgs.slice(0, 7).map(prog => {
    const isSelected = prog.id === activeDashboardProgramId;
    const secName = prog.category || prog.section || 'General';
    const progCode = prog.code || prog.id || 'PRG-01';

    const winners = Array.isArray(prog.winners) ? prog.winners : [];
    const w1 = winners.find(w => w.position === 1);
    const w2 = winners.find(w => w.position === 2);
    const w3 = winners.find(w => w.position === 3);

    return `
      <div onclick="openProgramModal('${prog.id}')"
        class="bg-white border-2 border-amber-400 hover:border-amber-500 rounded-2xl px-4 py-3 flex items-center justify-between transition-all cursor-pointer group shadow-sm ${isSelected ? 'bg-amber-50/10' : ''}">
        <div>
          <h5 class="font-normal text-amber-600 text-sm sm:text-base tracking-tight transition-colors">
            ${prog.name || 'Program'}
          </h5>
          <p class="text-xs text-slate-400 font-medium mt-0.5">
            ${secName} - ${progCode}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5 shrink-0">
            ${getSmallAvatar(w1, 1)}
            ${getSmallAvatar(w2, 2)}
            ${getSmallAvatar(w3, 3)}
          </div>
          <span class="iconify text-slate-400 text-lg font-bold group-hover:translate-x-1 transition-transform" data-icon="solar:alt-arrow-right-linear"></span>
        </div>
      </div>
    `;
  }).join('');
}



