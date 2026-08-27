// LinguaSpin Application State & Controller

const state = {
    categories: [],
    questions: [],
    currentCategory: null,
    carouselQuestions: [],
    selectedQuestion: null,
    carouselRotation: 0,
    isSpinning: false,
    timerInterval: null,
    timerRemaining: 60,
    timerTotal: 60,
    adminPin: "1234",
    isAdminAuthenticated: false
};

// Web Audio API Sound Synthesizer (No external MP3 files required!)
class SoundEffects {
    constructor() {
        this.ctx = null;
    }
    
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playTick() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playWin() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.2, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.3);
        });
    }

    playAlarm() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;
        [880, 880, 880].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + idx * 0.15);
            gain.gain.setValueAtTime(0.2, now + idx * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.15 + 0.1);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.15);
            osc.stop(now + idx * 0.15 + 0.1);
        });
    }
}

const sounds = new SoundEffects();

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    fetchCategories();
    setupEventListeners();
});

// API CALLS
async function fetchCategories() {
    try {
        const res = await fetch('/api/categories');
        state.categories = await res.json();
        renderCategories();
    } catch (err) {
        console.error("Error fetching categories:", err);
    }
}

async function fetchQuestions(categoryId = null) {
    try {
        const url = categoryId ? `/api/questions?category_id=${categoryId}` : '/api/questions';
        const res = await fetch(url);
        state.questions = await res.json();
        if (categoryId) {
            state.carouselQuestions = state.questions;
        }
        renderAdminQuestions();
    } catch (err) {
        console.error("Error fetching questions:", err);
    }
}

// VIEW NAVIGATION
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
}

// RENDER CATEGORIES GRID
function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    
    if (state.categories.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 3rem; color: var(--text-muted);">Henüz kategori eklenmemiş. Admin panelinden ekleyebilirsiniz.</div>`;
        return;
    }

    grid.innerHTML = state.categories.map(cat => `
        <div class="category-card" onclick="selectCategory(${cat.id})" style="--cat-color: ${cat.color}; --cat-color-glow: ${cat.color}66;">
            <div>
                <div class="cat-header">
                    <div class="cat-icon-wrapper">${cat.icon || '💬'}</div>
                    <div class="cat-title">${escapeHtml(cat.name)}</div>
                </div>
                <div class="cat-desc">${escapeHtml(cat.description || '')}</div>
            </div>
            <div class="cat-footer">
                <span>${cat.question_count || 0} Soru</span>
                <span class="cat-badge">Başlat &rarr;</span>
            </div>
        </div>
    `).join('');
}

// CATEGORY SELECTION & 3D CAROUSEL SETUP
async function selectCategory(catId) {
    state.currentCategory = state.categories.find(c => c.id === catId);
    if (!state.currentCategory) return;
    
    document.getElementById('carouselCatTitle').innerText = state.currentCategory.name;
    await fetchQuestions(catId);
    
    if (state.carouselQuestions.length === 0) {
        alert("Bu kategoride henüz soru bulunmuyor. Lütfen başka bir kategori seçin veya öğretmen panelinden soru ekleyin.");
        return;
    }
    
    build3DCarousel();
    showView('carouselView');
}

// BUILD 3D CAROUSEL
function build3DCarousel() {
    const wheel = document.getElementById('carouselWheel');
    wheel.innerHTML = '';
    
    const count = state.carouselQuestions.length;
    const cardWidth = 260;
    // Calculate 3D radius based on number of cards
    const radius = Math.max(280, Math.round((cardWidth / 2) / Math.tan(Math.PI / count)));
    const angleStep = 360 / count;

    state.carouselRotation = 0;
    wheel.style.transform = `translateZ(-${radius}px) rotateY(0deg)`;

    state.carouselQuestions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'carousel-card';
        const cardAngle = idx * angleStep;
        
        card.style.transform = `rotateY(${cardAngle}deg) translateZ(${radius}px)`;
        card.setAttribute('data-index', idx);
        
        card.innerHTML = `
            <div class="card-num-badge">#${idx + 1}</div>
            <div class="card-question-preview">${escapeHtml(truncateText(q.question_text, 80))}</div>
            <div class="card-footer-info">
                <span class="diff-tag diff-${q.difficulty}">${q.difficulty}</span>
                <span style="color: var(--text-dim)">Öğrenme Kartı</span>
            </div>
        `;
        wheel.appendChild(card);
    });
}

// SPIN CAROUSEL LOGIC
async function spinCarousel() {
    if (state.isSpinning || state.carouselQuestions.length === 0) return;
    state.isSpinning = true;
    
    // Pick a random question index
    const count = state.carouselQuestions.length;
    const targetIndex = Math.floor(Math.random() * count);
    const angleStep = 360 / count;
    
    // Calculate rotation angle to align targetIndex with front
    const spins = 4 + Math.floor(Math.random() * 2); // 4 to 5 full rotations
    const targetAngle = (spins * 360) + (360 - (targetIndex * angleStep));
    
    state.carouselRotation += targetAngle;
    const wheel = document.getElementById('carouselWheel');
    const radius = Math.max(280, Math.round((260 / 2) / Math.tan(Math.PI / count)));
    
    // Play spinning ticks sound
    let tickCount = 0;
    const tickInterval = setInterval(() => {
        sounds.playTick();
        tickCount++;
        if (tickCount > 15) clearInterval(tickInterval);
    }, 120);

    wheel.style.transition = 'transform 3.5s cubic-bezier(0.12, 0.8, 0.32, 1)';
    wheel.style.transform = `translateZ(-${radius}px) rotateY(${state.carouselRotation}deg)`;

    // Wait for wheel spin animation to complete
    setTimeout(() => {
        clearInterval(tickInterval);
        state.isSpinning = false;
        sounds.playWin();

        // Highlight selected card
        document.querySelectorAll('.carousel-card').forEach(c => c.classList.remove('active-selected'));
        const selectedCard = wheel.querySelector(`[data-index="${targetIndex}"]`);
        if (selectedCard) selectedCard.classList.add('active-selected');

        state.selectedQuestion = state.carouselQuestions[targetIndex];
        
        // Short delay before popup modal opens
        setTimeout(() => {
            openQuestionModal(state.selectedQuestion);
        }, 600);
    }, 3600);
}

// QUESTION POPUP MODAL
function openQuestionModal(question) {
    document.getElementById('modalCatIcon').innerText = state.currentCategory?.icon || '❓';
    document.getElementById('modalQuestionText').innerText = question.question_text;
    
    const hintBox = document.getElementById('modalHintBox');
    if (question.hint) {
        hintBox.innerText = `💡 İpucu / Not: ${question.hint}`;
        hintBox.style.display = 'block';
    } else {
        hintBox.style.display = 'none';
    }
    
    document.getElementById('questionModal').classList.add('active');
}

function closeQuestionModal() {
    document.getElementById('questionModal').classList.remove('active');
}

function handleModalAnswer(accepted) {
    closeQuestionModal();
    if (accepted) {
        startTimerView(state.selectedQuestion);
    }
}

// 1 MINUTE TIMER VIEW
function startTimerView(question) {
    document.getElementById('timerQuestionText').innerText = question.question_text;
    document.getElementById('notesArea').value = '';
    
    showView('timerView');
    resetTimer();
    startTimer();
}

function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    
    updateTimerDisplay();
    state.timerInterval = setInterval(() => {
        if (state.timerRemaining > 0) {
            state.timerRemaining--;
            updateTimerDisplay();
            
            if (state.timerRemaining === 10 || state.timerRemaining === 5) {
                sounds.playTick();
            }
        } else {
            clearInterval(state.timerInterval);
            sounds.playAlarm();
            alert("⏰ 1 Dakikalık süreniz doldu! Harika bir çalışma oldu.");
        }
    }, 1000);
}

function pauseTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        document.getElementById('btnPauseTimer').innerText = '▶️ Devam Et';
    } else {
        startTimer();
        document.getElementById('btnPauseTimer').innerText = '⏸️ Duraklat';
    }
}

function resetTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = null;
    state.timerRemaining = 60;
    document.getElementById('btnPauseTimer').innerText = '⏸️ Duraklat';
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(state.timerRemaining / 60);
    const seconds = state.timerRemaining % 60;
    const text = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    document.getElementById('timerText').innerText = text;
    
    // SVG Progress Ring calculation
    const circle = document.getElementById('timerProgressRing');
    const circumference = 565; // 2 * PI * r (r=90 => ~565.48)
    const offset = circumference - (state.timerRemaining / state.timerTotal) * circumference;
    circle.style.strokeDashoffset = offset;
    
    circle.classList.remove('warning', 'danger');
    if (state.timerRemaining <= 10) {
        circle.classList.add('danger');
    } else if (state.timerRemaining <= 20) {
        circle.classList.add('warning');
    }
}

// TEACHER ADMIN PANEL LOGIC
function openAdminPanel() {
    if (!state.isAdminAuthenticated) {
        const pin = prompt("Öğretmen Paneli Giriş PIN kodunu giriniz (Varsayılan: 1234):");
        if (pin === state.adminPin) {
            state.isAdminAuthenticated = true;
        } else if (pin !== null) {
            alert("Hatalı PIN Kodu!");
            return;
        } else {
            return;
        }
    }
    
    fetchCategories();
    fetchQuestions();
    showView('adminView');
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
    
    if (tabName === 'categories') {
        document.getElementById('tabBtnCategories').classList.add('active');
        document.getElementById('adminCategoriesSection').classList.add('active');
        renderAdminCategories();
    } else {
        document.getElementById('tabBtnQuestions').classList.add('active');
        document.getElementById('adminQuestionsSection').classList.add('active');
        renderAdminQuestions();
    }
}

function renderAdminCategories() {
    const tbody = document.getElementById('adminCatTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = state.categories.map(cat => `
        <tr>
            <td><span style="font-size:1.5rem">${cat.icon || '💬'}</span></td>
            <td><strong>${escapeHtml(cat.name)}</strong></td>
            <td>${escapeHtml(cat.description || '-')}</td>
            <td><span style="display:inline-block; width:18px; height:18px; border-radius:50%; background:${cat.color}"></span> ${cat.color}</td>
            <td>${cat.question_count} Soru</td>
            <td>
                <button class="btn btn-secondary" onclick="editCategoryModal(${cat.id})">✏️ Düzenle</button>
                <button class="btn btn-danger" onclick="deleteCategory(${cat.id})">🗑️ Sil</button>
            </td>
        </tr>
    `).join('');
}

function renderAdminQuestions() {
    const tbody = document.getElementById('adminQuestionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = state.questions.map(q => `
        <tr>
            <td><span class="cat-badge">${escapeHtml(q.category_name || '')}</span></td>
            <td>${escapeHtml(q.question_text)}</td>
            <td><span class="diff-tag diff-${q.difficulty}">${q.difficulty}</span></td>
            <td>${escapeHtml(q.hint || '-')}</td>
            <td>
                <button class="btn btn-secondary" onclick="editQuestionModal(${q.id})">✏️ Düzenle</button>
                <button class="btn btn-danger" onclick="deleteQuestion(${q.id})">🗑️ Sil</button>
            </td>
        </tr>
    `).join('');

    // Populate category dropdown in question form
    const catSelect = document.getElementById('qFormCategory');
    if (catSelect) {
        catSelect.innerHTML = state.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    }
}

// ADMIN FORM MODALS
function openCategoryFormModal(cat = null) {
    document.getElementById('catFormId').value = cat ? cat.id : '';
    document.getElementById('catFormName').value = cat ? cat.name : '';
    document.getElementById('catFormDesc').value = cat ? cat.description : '';
    document.getElementById('catFormIcon').value = cat ? cat.icon : '💬';
    document.getElementById('catFormColor').value = cat ? cat.color : '#6366f1';
    
    document.getElementById('catFormModalTitle').innerText = cat ? 'Kategori Düzenle' : 'Yeni Kategori Ekle';
    document.getElementById('categoryFormModal').classList.add('active');
}

function closeCategoryFormModal() {
    document.getElementById('categoryFormModal').classList.remove('active');
}

async function saveCategoryForm(e) {
    e.preventDefault();
    const id = document.getElementById('catFormId').value;
    const data = {
        name: document.getElementById('catFormName').value.trim(),
        description: document.getElementById('catFormDesc').value.trim(),
        icon: document.getElementById('catFormIcon').value.trim() || '💬',
        color: document.getElementById('catFormColor').value
    };
    
    if (!data.name) return alert("Lütfen kategori adını girin.");
    
    const url = id ? `/api/categories/${id}` : '/api/categories';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            closeCategoryFormModal();
            fetchCategories();
        } else {
            alert("İşlem sırasında bir hata oluştu.");
        }
    } catch (err) {
        console.error(err);
    }
}

function editCategoryModal(catId) {
    const cat = state.categories.find(c => c.id === catId);
    if (cat) openCategoryFormModal(cat);
}

async function deleteCategory(catId) {
    if (!confirm("Bu kategoriyi ve içindeki TÜM soruları silmek istediğinize emin misiniz?")) return;
    try {
        const res = await fetch(`/api/categories/${catId}`, { method: 'DELETE' });
        if (res.ok) {
            fetchCategories();
        }
    } catch (err) {
        console.error(err);
    }
}

function openQuestionFormModal(q = null) {
    document.getElementById('qFormId').value = q ? q.id : '';
    document.getElementById('qFormCategory').value = q ? q.category_id : (state.categories[0]?.id || '');
    document.getElementById('qFormText').value = q ? q.question_text : '';
    document.getElementById('qFormHint').value = q ? q.hint : '';
    document.getElementById('qFormDiff').value = q ? q.difficulty : 'Orta';
    
    document.getElementById('qFormModalTitle').innerText = q ? 'Soru Düzenle' : 'Yeni Soru Ekle';
    document.getElementById('questionFormModal').classList.add('active');
}

function closeQuestionFormModal() {
    document.getElementById('questionFormModal').classList.remove('active');
}

async function saveQuestionForm(e) {
    e.preventDefault();
    const id = document.getElementById('qFormId').value;
    const data = {
        category_id: parseInt(document.getElementById('qFormCategory').value),
        question_text: document.getElementById('qFormText').value.trim(),
        hint: document.getElementById('qFormHint').value.trim(),
        difficulty: document.getElementById('qFormDiff').value
    };
    
    if (!data.question_text) return alert("Lütfen soru metnini yazın.");
    
    const url = id ? `/api/questions/${id}` : '/api/questions';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            closeQuestionFormModal();
            fetchQuestions();
        } else {
            alert("İşlem sırasında hata oluştu.");
        }
    } catch (err) {
        console.error(err);
    }
}

function editQuestionModal(qId) {
    const q = state.questions.find(item => item.id === qId);
    if (q) openQuestionFormModal(q);
}

async function deleteQuestion(qId) {
    if (!confirm("Bu soruyu silmek istediğinize emin misiniz?")) return;
    try {
        const res = await fetch(`/api/questions/${qId}`, { method: 'DELETE' });
        if (res.ok) {
            fetchQuestions();
        }
    } catch (err) {
        console.error(err);
    }
}

// SETUP EVENT LISTENERS
function setupEventListeners() {
    document.getElementById('btnNavAdmin').addEventListener('click', openAdminPanel);
    document.getElementById('btnNavStudent').addEventListener('click', () => {
        fetchCategories();
        showView('categoriesView');
    });
    document.getElementById('logoHome').addEventListener('click', () => {
        fetchCategories();
        showView('categoriesView');
    });
    document.getElementById('btnBackToCat').addEventListener('click', () => {
        showView('categoriesView');
    });
    document.getElementById('btnSpinCarousel').addEventListener('click', spinCarousel);
    
    // Modal buttons
    document.getElementById('btnModalYes').addEventListener('click', () => handleModalAnswer(true));
    document.getElementById('btnModalNo').addEventListener('click', () => handleModalAnswer(false));
    
    // Timer buttons
    document.getElementById('btnPauseTimer').addEventListener('click', pauseTimer);
    document.getElementById('btnResetTimer').addEventListener('click', resetTimer);
    document.getElementById('btnBackFromTimer').addEventListener('click', () => {
        if (state.timerInterval) clearInterval(state.timerInterval);
        showView('carouselView');
    });

    // Admin Forms
    document.getElementById('catForm').addEventListener('submit', saveCategoryForm);
    document.getElementById('qForm').addEventListener('submit', saveQuestionForm);
}

// UTILITY HELPERS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}

function truncateText(str, maxLength) {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}
