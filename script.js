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
let allResults = [];
let allTeams = [];
let allCandidates = [];
let dbSections = []; // Created sections from Firestore 'sections' collection
let starredPrograms = JSON.parse(localStorage.getItem('sibaq_starred_programs') || '[]');
let authenticatedCandidate = null;
let isResultPresent = true;

let activeSidebarTab = 'leaderboard'; // 'dashboard', 'leaderboard', 'results', 'candidate', 'institution', 'starred', 'toppers'
let activeTab = 'all'; // 'all', 'published'
let activeSection = 'ALL'; // 'ALL', dynamic created section names
let searchQuery = '';

// Sample Fallback Data if DB is empty or loading
const fallbackTeams = [
  { id: 't1', name: 'Alpha Gladiators', code: 'ALG', color: '#EA8F23', points: 420, wins: 14 },
  { id: 't2', name: 'Royal Titans', code: 'RTT', color: '#00A3E0', points: 385, wins: 11 },
  { id: 't3', name: 'Phoenix Warriors', code: 'PHW', color: '#EA3650', points: 310, wins: 8 },
  { id: 't4', name: 'Emerald Knights', code: 'EMK', color: '#09ABB1', points: 265, wins: 6 }
];

const fallbackCandidates = [
  { id: 'c5359', chestNo: '5359', name: 'Muhammed Nihal', team: 'Alpha Gladiators', section: 'BIDĀYAH', dob: '31/3/2007' },
  { id: 'c109', chestNo: '1091', name: 'Ahmad Sinan', team: 'Royal Titans', section: 'ŪLĀ', dob: '15/5/2006' },
  { id: 'c201', chestNo: '2015', name: 'Omar Farooq', team: 'Royal Titans', section: 'THĀNIYAH', dob: '10/10/2005' },
  { id: 'c303', chestNo: '3032', name: 'Bilal Hassan', team: 'Phoenix Warriors', section: 'THĀNAWIYYAH', dob: '04/08/2004' }
];

const fallbackPrograms = [
  {
    id: 'p101',
    code: '101',
    name: 'Elocution English',
    category: 'BIDĀYAH',
    isPublished: true,
    winners: [
      { position: 1, candidateName: 'Muhammed Nihal', candidateId: 'c5359', chestNo: '5359', team: 'Alpha Gladiators', grade: 'A', points: 10 },
      { position: 2, candidateName: 'Ahmad Sinan', candidateId: 'c109', chestNo: '1091', team: 'Royal Titans', grade: 'A', points: 7 },
      { position: 3, candidateName: 'Fidha Fathima', candidateId: 'c115', chestNo: '1150', team: 'Phoenix Warriors', grade: 'B', points: 5 }
    ]
  },
  {
    id: 'p102',
    code: '102',
    name: 'Quran Recitation',
    category: 'ŪLĀ',
    isPublished: true,
    winners: [
      { position: 1, candidateName: 'Omar Farooq', candidateId: 'c201', chestNo: '2015', team: 'Royal Titans', grade: 'A', points: 10 },
      { position: 2, candidateName: 'Hisham Abdul', candidateId: 'c205', chestNo: '2050', team: 'Alpha Gladiators', grade: 'A', points: 7 },
      { position: 3, candidateName: 'Zayd Rayan', candidateId: 'c212', chestNo: '2120', team: 'Emerald Knights', grade: 'A', points: 5 }
    ]
  },
  {
    id: 'p103',
    code: '103',
    name: 'Calligraphy Design',
    category: 'THĀNIYAH',
    isPublished: true,
    winners: [
      { position: 1, candidateName: 'Bilal Hassan', candidateId: 'c303', chestNo: '3032', team: 'Phoenix Warriors', grade: 'A', points: 10 },
      { position: 2, candidateName: 'Hamza Malik', candidateId: 'c310', chestNo: '3100', team: 'Alpha Gladiators', grade: 'B', points: 7 },
      { position: 3, candidateName: 'Ameen Rashad', candidateId: 'c314', chestNo: '3140', team: 'Royal Titans', grade: 'B', points: 5 }
    ]
  },
  {
    id: 'p104',
    code: '104',
    name: 'Essay Writing Arabic',
    category: 'THĀNAWIYYAH',
    isPublished: true,
    winners: [
      { position: 1, candidateName: 'Muhammed Nihal', candidateId: 'c5359', chestNo: '5359', team: 'Alpha Gladiators', grade: 'A', points: 10 },
      { position: 2, candidateName: 'Salih Zakariya', candidateId: 'c315', chestNo: '3150', team: 'Emerald Knights', grade: 'A', points: 7 }
    ]
  },
  {
    id: 'p105',
    code: '105',
    name: 'Group Song (Folk)',
    category: 'ĀLIYAH',
    isPublished: true,
    winners: [
      { position: 1, candidateName: 'Alpha Choir Group', candidateId: 'c401', chestNo: '4010', team: 'Alpha Gladiators', grade: 'A', points: 15 },
      { position: 2, candidateName: 'Titan Harmony', candidateId: 'c408', chestNo: '4080', team: 'Royal Titans', grade: 'A', points: 10 },
      { position: 3, candidateName: 'Emerald Troupe', candidateId: 'c412', chestNo: '4120', team: 'Emerald Knights', grade: 'B', points: 7 }
    ]
  },
  {
    id: 'p106',
    code: '106',
    name: 'Islamic History Quiz',
    category: 'KULLIYYAH',
    isPublished: true,
    winners: [
      { position: 1, candidateName: 'Omar Farooq', candidateId: 'c201', chestNo: '2015', team: 'Royal Titans', grade: 'A', points: 10 },
      { position: 2, candidateName: 'Bilal Hassan', candidateId: 'c303', chestNo: '3032', team: 'Phoenix Warriors', grade: 'B', points: 7 }
    ]
  }
];

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

// Auto focus movement across digit inputs (Image 5)
function setupDigitInputs() {
  const digits = ['cand-digit-1', 'cand-digit-2', 'cand-digit-3', 'cand-digit-4'];
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
window.switchSidebarTab = function(tabName) {
  activeSidebarTab = tabName;

  document.querySelectorAll('[data-nav]').forEach(item => {
    const navKey = item.getAttribute('data-nav');
    if (navKey === tabName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  const secLeaderboard = document.getElementById('view-leaderboard');
  const secResults = document.getElementById('view-results');
  const secCandidate = document.getElementById('view-candidate');
  const secInstitution = document.getElementById('view-institution');
  const secStarred = document.getElementById('view-starred');
  const secToppers = document.getElementById('view-toppers');

  const sections = [secLeaderboard, secResults, secCandidate, secInstitution, secStarred, secToppers];
  sections.forEach(sec => { if (sec) sec.classList.add('hidden'); });

  if (tabName === 'dashboard' || tabName === 'leaderboard') {
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
    useFallbackData();
    return;
  }

  // Listen to created sections collection
  db.collection('sections').onSnapshot(secSnap => {
    if (!secSnap.empty) {
      dbSections = secSnap.docs.map(d => d.data().name || d.data().sectionName || d.id).filter(Boolean);
    }
    renderSectionDropdown();
    renderCategoryToppersGrid();
  }, err => console.warn("Sections snapshot fallback:", err));

  db.collection('programResults').onSnapshot(snapshot => {
    allResults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    db.collection('programs').onSnapshot(progSnap => {
      allPrograms = progSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      db.collection('teams').onSnapshot(teamSnap => {
        allTeams = teamSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        db.collection('candidates').onSnapshot(candSnap => {
          allCandidates = candSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          if (allPrograms.length === 0) {
            useFallbackData();
          } else {
            processDataAndRender();
          }
        }, err => useFallbackData());
      }, err => useFallbackData());
    }, err => useFallbackData());
  }, err => useFallbackData());
}

function useFallbackData() {
  allTeams = fallbackTeams;
  allPrograms = fallbackPrograms;
  allCandidates = fallbackCandidates;
  dbSections = ['BIDĀYAH', 'ŪLĀ', 'THĀNIYAH', 'THĀNAWIYYAH', 'ĀLIYAH', 'KULLIYYAH'];
  processDataAndRender();
}

// Helper: Get list of created sections only
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

  const uniqueSections = Array.from(sectionsSet);
  return uniqueSections.length > 0 ? uniqueSections : ['BIDĀYAH', 'ŪLĀ', 'THĀNIYAH', 'THĀNAWIYYAH', 'ĀLIYAH', 'KULLIYYAH'];
}

function processDataAndRender() {
  allPrograms.forEach(prog => {
    const matchingResults = allResults.filter(r => r.programId === prog.id || r.programCode === prog.code);
    if (matchingResults.length > 0) {
      prog.isPublished = true;
      prog.winners = matchingResults.map(r => ({
        position: parseInt(r.position) || 99,
        candidateName: r.candidateName || r.name || 'Candidate',
        candidateId: r.candidateId || r.code || '',
        chestNo: r.chestNo || '',
        team: r.team || r.teamName || 'Unassigned',
        grade: r.grade || 'A',
        points: parseInt(r.totalPoints || r.points) || 0
      })).sort((a, b) => a.position - b.position);
    }
  });

  calculateTeamStandings();
  renderSummaryStats();
  renderSectionDropdown();
  renderCategoryToppersGrid();
  renderTeamProfiles();
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

  const createdSections = getCreatedSectionsList();

  container.innerHTML = createdSections.map(secName => {
    const catProgs = allPrograms.filter(p => 
      (p.category || p.section || '').toUpperCase() === secName.toUpperCase()
    );
    const topWinner = catProgs.flatMap(p => p.winners || []).sort((a, b) => (b.points || 0) - (a.points || 0))[0];

    return `
      <div class="topper-pill-card flex flex-col justify-between cursor-pointer group"
        onclick="switchSidebarTab('results')">
        <div>
          <h4 class="font-medium text-slate-900 text-base tracking-tight text-center mb-3 group-hover:text-amber-600 transition-colors">${secName} Toppers</h4>
          
          <div class="topper-slot-pill flex items-center justify-between px-3.5">
            ${topWinner ? `
              <div class="flex items-center gap-2 min-w-0">
                <span class="iconify text-amber-500 text-base shrink-0" data-icon="solar:crown-star-bold"></span>
                <span class="text-xs font-medium text-slate-900 truncate">${topWinner.candidateName}</span>
              </div>
              <span class="text-[11px] font-medium text-slate-600 uppercase shrink-0">${topWinner.team}</span>
            ` : `
              <span class="text-xs font-normal text-slate-400 mx-auto">Standings calculating...</span>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Render Team Standings inside Team Profile Section
function renderTeamProfiles() {
  const leaderboardContainer = document.getElementById('team-leaderboard');
  const detailsContainer = document.getElementById('institution-cards-container');

  if (leaderboardContainer) {
    if (allTeams.length === 0) {
      leaderboardContainer.innerHTML = `<div class="col-span-full text-center py-4 text-slate-400 text-sm font-medium">No team standings available</div>`;
    } else {
      leaderboardContainer.innerHTML = allTeams.map((team, idx) => {
        const trophyIcon = idx === 0 ? 'solar:cup-first-bold' : idx === 1 ? 'solar:medal-star-bold' : idx === 2 ? 'solar:medal-ribbon-bold' : 'solar:star-bold';

        return `
          <div class="content-card p-4 flex items-center justify-between gap-3 relative overflow-hidden">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center font-medium text-base shrink-0 border ${idx === 0 ? 'bg-amber-100 text-amber-800 border-amber-300' : idx === 1 ? 'bg-slate-100 text-slate-700 border-slate-300' : idx === 2 ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-slate-50 text-slate-600 border-slate-200'}">
                <span class="iconify" data-icon="${trophyIcon}"></span>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1">
                  <span class="text-xs font-mono font-medium text-slate-400">#${idx + 1}</span>
                  <h4 class="font-medium text-slate-900 text-sm truncate">${team.name}</h4>
                </div>
                <p class="text-[11px] font-normal text-slate-500 mt-0.5">${team.wins} Wins</p>
              </div>
            </div>
            <div class="text-right shrink-0">
              <span class="text-lg font-medium text-slate-900">${team.points}</span>
              <span class="block text-[10px] font-medium uppercase tracking-wider text-slate-400">PTS</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  if (detailsContainer) {
    detailsContainer.innerHTML = allTeams.map((team, idx) => `
      <div class="p-4 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="w-8 h-8 rounded-lg font-medium text-xs flex items-center justify-center border ${idx === 0 ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-100 text-slate-700 border-slate-300'}">
            #${idx + 1}
          </span>
          <div>
            <h4 class="font-medium text-slate-900 text-sm">${team.name}</h4>
            <p class="text-xs font-normal text-slate-500">Code: ${team.code} &bull; ${team.wins} Wins</p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-lg font-medium text-slate-900">${team.points}</span>
          <span class="block text-[10px] font-medium uppercase text-slate-400">Total Points</span>
        </div>
      </div>
    `).join('');
  }
}

function renderViews() {
  const programGrid = document.getElementById('programs-results-grid');
  const emptyState = document.getElementById('empty-state');

  if (activeSidebarTab === 'toppers') {
    renderCandidateToppers();
    return;
  }

  if (!programGrid) return;

  let filtered = allPrograms.filter(prog => {
    const progSec = (prog.category || prog.section || '').toUpperCase();
    if (activeSection !== 'ALL' && progSec !== activeSection.toUpperCase()) return false;
    if (activeTab === 'published' && !prog.isPublished) return false;

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

  if (filtered.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    programGrid.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  programGrid.innerHTML = filtered.map(prog => {
    const isPub = prog.isPublished;
    const topWinner = isPub && prog.winners && prog.winners.length > 0 ? prog.winners[0] : null;
    const isStarred = starredPrograms.includes(prog.id);

    return `
      <div class="content-card p-4 flex flex-col justify-between relative overflow-hidden">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2.5">
            <span class="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
              ${prog.category || prog.section || 'General'}
            </span>
            <div class="flex items-center gap-1.5">
              <button onclick="toggleStarProgram('${prog.id}')" title="Star Program" class="text-amber-500 transition-colors">
                <span class="iconify text-base" data-icon="${isStarred ? 'solar:star-bold' : 'solar:star-linear'}"></span>
              </button>
              <span class="text-xs font-mono font-medium text-slate-400">#${prog.code || prog.id}</span>
            </div>
          </div>

          <h3 class="font-medium text-slate-900 text-base leading-snug mb-3 hover:text-amber-600 transition-colors cursor-pointer"
            onclick="openProgramModal('${prog.id}')">
            ${prog.name}
          </h3>

          ${isPub && topWinner ? `
            <div class="bg-amber-50/60 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded bg-amber-200 text-amber-950 font-medium text-[11px] flex items-center justify-center shrink-0 border border-amber-300">1st</span>
                <div>
                  <p class="text-xs font-medium text-slate-900 leading-tight truncate max-w-[120px]">${topWinner.candidateName}</p>
                  <p class="text-[11px] font-normal text-amber-800 leading-tight">${topWinner.team}</p>
                </div>
              </div>
              <span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 font-medium text-[10px] border border-amber-200">Grade ${topWinner.grade}</span>
            </div>
          ` : `
            <div class="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-2.5 text-center mb-3">
              <p class="text-xs font-normal text-slate-400">Result Awaited / In Evaluation</p>
            </div>
          `}
        </div>

        <div class="pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span class="inline-flex items-center gap-1.5 text-[11px] font-medium ${isPub ? 'text-emerald-600' : 'text-amber-600'}">
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

// Toggle Star Program
window.toggleStarProgram = function(progId) {
  if (starredPrograms.includes(progId)) {
    starredPrograms = starredPrograms.filter(id => id !== progId);
  } else {
    starredPrograms.push(progId);
  }
  localStorage.setItem('sibaq_starred_programs', JSON.stringify(starredPrograms));
  renderViews();
  if (activeSidebarTab === 'starred') renderStarredPrograms();
};

// Candidate Profile Authentication & Display (Image 5)
window.executeCandidateLogin = function() {
  const d1 = (document.getElementById('cand-digit-1')?.value || '').trim();
  const d2 = (document.getElementById('cand-digit-2')?.value || '').trim();
  const d3 = (document.getElementById('cand-digit-3')?.value || '').trim();
  const d4 = (document.getElementById('cand-digit-4')?.value || '').trim();

  const enteredChest = `${d1}${d2}${d3}${d4}`;

  // Find candidate by chest number or fallback dataset
  const cand = allCandidates.find(c => {
    const cChest = String(c.chestNo || c.chest || '').replace(/\D/g, '');
    return cChest === enteredChest || String(c.chestNo || '') === enteredChest;
  }) || (allCandidates.length > 0 ? allCandidates[0] : fallbackCandidates[0]);

  if (cand) {
    authenticatedCandidate = cand;
    renderAuthenticatedCandidateView(cand);
  } else {
    alert("Candidate not found with the specified chest number.");
  }
};

window.handleQRScanTrigger = function() {
  const demoCand = allCandidates[0] || fallbackCandidates[0];
  if (demoCand) {
    authenticatedCandidate = demoCand;
    renderAuthenticatedCandidateView(demoCand);
  }
};

function renderAuthenticatedCandidateView(cand) {
  const wrapper = document.getElementById('cand-auth-wrapper');
  const display = document.getElementById('cand-profile-display');
  if (wrapper) wrapper.classList.add('hidden');
  if (display) display.classList.remove('hidden');

  const avatar = document.getElementById('cand-avatar');
  const nameEl = document.getElementById('cand-display-name');
  const chestEl = document.getElementById('cand-display-chest');
  const teamEl = document.getElementById('cand-display-team');
  const secEl = document.getElementById('cand-display-section');

  if (avatar) avatar.textContent = (cand.name || 'C').charAt(0).toUpperCase();
  if (nameEl) nameEl.textContent = cand.name || 'Candidate Profile';
  if (chestEl) chestEl.textContent = `#${cand.chestNo || '5359'}`;
  if (teamEl) teamEl.textContent = cand.team || 'Alpha Gladiators';
  if (secEl) secEl.textContent = cand.section || 'BIDĀYAH';

  // Calculate results for this candidate
  let totalPts = 0;
  let winsCount = 0;
  let candResults = [];

  allPrograms.forEach(prog => {
    if (prog.isPublished && Array.isArray(prog.winners)) {
      const match = prog.winners.find(w => 
        w.candidateId === cand.id || 
        w.chestNo === cand.chestNo || 
        (w.candidateName || '').toLowerCase() === (cand.name || '').toLowerCase()
      );
      if (match) {
        totalPts += (match.points || 0);
        if (match.position === 1) winsCount += 1;
        candResults.push({
          programName: prog.name,
          programCode: prog.code,
          category: prog.category || prog.section,
          position: match.position,
          grade: match.grade,
          points: match.points
        });
      }
    }
  });

  const statPts = document.getElementById('cand-stat-points');
  const statWins = document.getElementById('cand-stat-wins');
  const statEvents = document.getElementById('cand-stat-events');

  if (statPts) statPts.textContent = `${totalPts} PTS`;
  if (statWins) statWins.textContent = `${winsCount} Wins`;
  if (statEvents) statEvents.textContent = `${candResults.length} Events`;

  const listContainer = document.getElementById('cand-results-list');
  if (listContainer) {
    if (candResults.length === 0) {
      listContainer.innerHTML = `<div class="p-4 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-400 font-normal text-xs">No declared result entries found for this candidate.</div>`;
    } else {
      listContainer.innerHTML = candResults.map(r => `
        <div class="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
          <div>
            <span class="text-[10px] font-medium uppercase px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 mb-1 inline-block">${r.category}</span>
            <h5 class="font-medium text-slate-900 text-xs">${r.programName}</h5>
            <p class="text-[11px] font-mono font-normal text-slate-400">Code: #${r.programCode}</p>
          </div>
          <div class="text-right">
            <span class="px-2 py-0.5 bg-amber-50 text-amber-900 font-medium text-xs rounded border border-amber-200">
              ${r.position === 1 ? '1st Rank' : r.position === 2 ? '2nd Rank' : '3rd Rank'} (Grade ${r.grade})
            </span>
            <span class="block text-xs font-medium text-slate-900 mt-0.5">+${r.points} Pts</span>
          </div>
        </div>
      `).join('');
    }
  }
}

window.logoutCandidate = function() {
  authenticatedCandidate = null;
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

function renderCandidateToppers() {
  const container = document.getElementById('toppers-list');
  const countBadge = document.getElementById('topper-count-badge');
  if (!container) return;

  const candidateMap = {};

  allPrograms.forEach(p => {
    if (p.isPublished && Array.isArray(p.winners)) {
      p.winners.forEach(w => {
        const cKey = w.candidateName;
        if (!candidateMap[cKey]) {
          candidateMap[cKey] = {
            name: w.candidateName,
            team: w.team,
            points: 0,
            firstPlaces: 0
          };
        }
        candidateMap[cKey].points += (w.points || 0);
        if (w.position === 1) candidateMap[cKey].firstPlaces += 1;
      });
    }
  });

  const toppers = Object.values(candidateMap).sort((a, b) => b.points - a.points);

  if (countBadge) countBadge.textContent = `${toppers.length} Top Candidates`;

  if (toppers.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs font-medium">No candidate results available yet.</div>`;
    return;
  }

  container.innerHTML = toppers.slice(0, 15).map((cand, idx) => `
    <div class="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
      <div class="flex items-center gap-3">
        <span class="w-6 h-6 rounded-lg font-medium text-xs flex items-center justify-center border ${idx === 0 ? 'bg-amber-500 text-white border-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-800 border-slate-300' : idx === 2 ? 'bg-rose-200 text-rose-800 border-rose-300' : 'bg-slate-50 text-slate-600 border-slate-200'}">
          #${idx + 1}
        </span>
        <div>
          <h4 class="font-medium text-slate-900 text-xs">${cand.name}</h4>
          <p class="text-[11px] text-slate-500 font-normal">${cand.team}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-right">
          <span class="text-xs font-medium text-slate-900">${cand.points}</span>
          <span class="text-[9px] font-medium text-slate-400 uppercase block">PTS</span>
        </div>
      </div>
    </div>
  `).join('');
}

window.openProgramModal = function(programId) {
  const prog = allPrograms.find(p => p.id === programId);
  if (!prog) return;

  const modal = document.getElementById('result-modal');
  const titleEl = document.getElementById('modal-title');
  const codeEl = document.getElementById('modal-code');
  const catEl = document.getElementById('modal-category');
  const listEl = document.getElementById('modal-winners-list');

  if (titleEl) titleEl.textContent = prog.name;
  if (codeEl) codeEl.textContent = `Program Code: #${prog.code || prog.id}`;
  if (catEl) catEl.textContent = prog.category || prog.section || 'General';

  if (listEl) {
    if (!prog.isPublished || !prog.winners || prog.winners.length === 0) {
      listEl.innerHTML = `
        <div class="p-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg">
          <span class="iconify text-xl text-amber-500 mb-1 inline-block" data-icon="solar:clock-circle-linear"></span>
          <h5 class="font-medium text-slate-800 text-xs">Evaluation in Progress</h5>
          <p class="text-[11px] text-slate-500 font-normal mt-0.5">Official results for this program have not been declared yet.</p>
        </div>
      `;
    } else {
      listEl.innerHTML = prog.winners.map(w => {
        return `
          <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded font-medium text-xs flex items-center justify-center shrink-0 border ${w.position === 1 ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-200 text-slate-800 border-slate-300'}">
                ${w.position === 1 ? '1st' : w.position === 2 ? '2nd' : '3rd'}
              </span>
              <div>
                <h5 class="font-medium text-slate-900 text-xs">${w.candidateName}</h5>
                <p class="text-[11px] font-normal text-slate-500">${w.team}</p>
              </div>
            </div>
            <div class="text-right">
              <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-medium text-[10px] border border-amber-200">Grade ${w.grade}</span>
              <span class="block text-[10px] font-medium text-slate-500 mt-0.5">+${w.points} Pts</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  if (modal) {
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.querySelector('> div').classList.remove('scale-95');
    modal.querySelector('> div').classList.add('scale-100');
  }
};

function closeModal() {
  const modal = document.getElementById('result-modal');
  if (modal) {
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.querySelector('> div').classList.remove('scale-100');
    modal.querySelector('> div').classList.add('scale-95');
  }
}
