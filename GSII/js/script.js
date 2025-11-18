// Variáveis Globais de Estado
let state = {
    skillBEAA: 0,
    energy: 100,
    days: 0,
    isBurnedOut: false,
    gameActive: true,
    targetSkill: 100,
    maxDays: 60, 

    // MAQ Puzzle
    isPuzzleAvailable: true,
    boosterCharges: 0,

    // AI Co-Pilot
    aiCoPilotActive: false,
    aiCoPilotNextCalib: 15, 
    aiCoPilotPenalty: 1.0, 

    // ODS Project Board
    nextODSProjectDay: 10,
    
    // Enviro-Shift
    currentEnviroShift: 'NONE',
};

const LOG_CAPACITY = 10;

// Configurações do Jogo
const CONFIG = {
    VR_HARD: { skillGain: 18, energyCost: 28, time: 3, icon: '⚡' },
    VR_SOFT: { skillGain: 6, energyCost: 8, time: 2, icon: '🧠' },
    HEALTH_POD: { skillGain: 0, energyRestored: 40, time: 4, icon: '🧘' },
    MAQ_PUZZLE: { skillGain: 0, energyCost: 15, time: 5, icon: '🧩' },
    
    // AI Co-Pilot Config
    AI_COPILOT_COST_SKILL: 30, 
    AI_COPILOT_ENERGY_REDUCTION: 0.9, 
    AI_COPILOT_CALIB: { time: 1, energyCost: 5, penalty: 1.5 },

    // ODS Project Config
    ODS_PROJECT: { bonusSkill: 10, riskBurnout: 0.5 }, 
    
    // Enviro-Shift Effects
    SHIFTS: {
        NONE: { name: 'Estabilidade', color: 'text-green-400', effect: { time: 1, energy: 1 } },
        CONNECTION_FAIL: { name: 'Falha de Conexão Crítica', color: 'text-red-400', effect: { time: 2, energy: 1 } }, 
        IMMERSIVE_FLOW: { name: 'Fluxo Imersivo Desbloqueado', color: 'text-blue-400', effect: { time: 1, energy: 0.5 } }, 
        SCREEN_OVERLOAD: { name: 'Sobrecarga de Tela', color: 'text-yellow-400', effect: { time: 1.5, energy: 1.5 } }
    },
    DAILY_ENERGY_COST: 1.5 
};

// Lógica do Puzzle MAQ
const PUZZLE = {
    matrix: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    solution: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    lights: [false, false, false, false, false, false, false, false, false]
};

// --- FUNÇÕES DE UTILDADE E DOM ---

function logMessage(message, type = 'info') {
    const consoleEl = document.getElementById('log-console');
    if (!consoleEl) return;

    const logEntry = document.createElement('div');
    const typeClass = `log-${type === 'booster' ? 'booster' : type}`;
    
    logEntry.innerHTML = `<span class="log-time">[Dia ${state.days}]</span> <span class="${typeClass}">${message}</span>`;

    while (consoleEl.children.length >= LOG_CAPACITY) {
        consoleEl.removeChild(consoleEl.firstChild);
    }
    consoleEl.appendChild(logEntry);
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

function updateUI() {
    // Atualiza Medidores
    document.getElementById('days-count').textContent = `${state.days} / ${state.maxDays}`;
    document.getElementById('skill-value').textContent = state.skillBEAA.toFixed(1);
    document.getElementById('energy-value').textContent = state.energy.toFixed(1);
    document.getElementById('booster-count').textContent = state.boosterCharges;

    // Atualiza Status do Co-Pilot
    const copilotStatusEl = document.getElementById('copilot-status');
    copilotStatusEl.textContent = state.aiCoPilotActive ? 'ATIVO' : 'INATIVO';
    copilotStatusEl.className = state.aiCoPilotActive ? 'text-3xl font-orbitron text-purple-400 mt-1' : 'text-3xl font-orbitron text-gray-500 mt-1';
    
    // Atualiza Enviro-Shift Status
    const shift = CONFIG.SHIFTS[state.currentEnviroShift];
    const shiftStatusEl = document.getElementById('shift-status');
    shiftStatusEl.textContent = shift.name;
    shiftStatusEl.className = `text-xl font-bold ${shift.color} mt-1`;

    const skillBar = document.getElementById('skill-bar');
    const energyBar = document.getElementById('energy-bar');
    const statusText = document.getElementById('status-text');
    const maqButton = document.getElementById('maq-btn');
    const copilotBuyBtn = document.getElementById('copilot-buy-btn');
    const copilotCalibBtn = document.getElementById('copilot-calib-btn');

    skillBar.style.width = `${state.skillBEAA}%`;
    energyBar.style.width = `${state.energy}%`;
    energyBar.className = `progress-bar h-full rounded-full transition-all duration-500 ${state.energy <= 25 ? 'energy-bar-critical' : 'energy-bar-safe'}`;

    // Efeitos e Status
    if (state.isBurnedOut) {
        statusText.innerHTML = "🔴 **BURNOUT CRÍTICO:** Requalificação Congelada!";
        statusText.className = 'text-xl font-bold mt-1 text-red-500';
        disableActionButtons(true);
        document.getElementById('health-pod-btn').removeAttribute('disabled');
    } else {
        let status = "🟢 **ESTADO ESTÁVEL:** Otimizar Fluxo!";
        let statusClass = 'text-xl font-bold mt-1 text-green-400';

        if (state.aiCoPilotActive && state.days >= state.aiCoPilotNextCalib) {
             status = "🔴 **CALIBRAÇÃO PENDENTE:** Co-Pilot instável. ALTO RISCO DE BURNOUT.";
             statusClass = 'text-xl font-bold mt-1 text-red-500';
        } else if (state.energy <= 25) {
            status = "⚠️ **FADIGA COGNITIVA:** Alto Risco de Burnout.";
            statusClass = 'text-xl font-bold mt-1 text-yellow-500';
        }
        statusText.innerHTML = status;
        statusText.className = statusClass;
        disableActionButtons(false);
    }

    // Gerenciamento dos Botões de Upgrade
    if (!state.isPuzzleAvailable) { maqButton.classList.add('disabled'); maqButton.setAttribute('disabled', 'true'); } else { maqButton.classList.remove('disabled'); maqButton.removeAttribute('disabled'); }
    if (state.aiCoPilotActive) { copilotBuyBtn.classList.add('hidden'); copilotCalibBtn.classList.remove('hidden'); } else { copilotBuyBtn.classList.remove('hidden'); copilotCalibBtn.classList.add('hidden'); }
    
    // Fim do Jogo
    if (state.gameActive) {
        if (state.skillBEAA >= state.targetSkill) {
            endGame(true);
        } else if (state.days >= state.maxDays) {
            endGame(false);
        }
    }
}

function disableActionButtons(disabled) {
    document.querySelectorAll('.action-button').forEach(button => {
        if (button.id !== 'health-pod-btn') { // Health Pod sempre habilitado em burnout
            if (disabled) {
                button.classList.add('disabled');
                button.setAttribute('disabled', 'true');
            } else {
                button.classList.remove('disabled');
                button.removeAttribute('disabled');
            }
        }
    });
}

// --- LÓGICA DE JOGO DETALHADA ---

function activateAICoPilot() {
    if (state.skillBEAA < CONFIG.AI_COPILOT_COST_SKILL) {
        logMessage(`Habilidade insuficiente. Requer ${CONFIG.AI_COPILOT_COST_SKILL}% para instalar o Co-Pilot.`, 'error');
        return;
    }
    state.skillBEAA -= CONFIG.AI_COPILOT_COST_SKILL;
    state.aiCoPilotActive = true;
    state.aiCoPilotNextCalib = state.days + 15;
    state.aiCoPilotPenalty = 1.0; 

    logMessage(`✅ AI Co-Pilot instalado! Perdeu ${CONFIG.AI_COPILOT_COST_SKILL}% Habilidade, mas ganhou eficiência de 10% no consumo de energia.`, 'success');
    document.getElementById('copilot-buy-modal').classList.add('hidden');
    updateUI();
}

function performAICalibration() {
    if (!state.aiCoPilotActive) return;
    if (state.isBurnedOut) { logMessage("Ação bloqueada. Nômade em Burnout.", 'error'); return; }

    state.days += CONFIG.AI_COPILOT_CALIB.time;
    state.energy -= CONFIG.AI_COPILOT_CALIB.energyCost;
    state.energy = Math.max(0, state.energy);

    state.aiCoPilotNextCalib = state.days + 15;
    state.aiCoPilotPenalty = 1.0; 

    logMessage(`♻️ Calibração Ética do AI Co-Pilot concluída. Custo: ${CONFIG.AI_COPILOT_CALIB.energyCost} Energia / ${CONFIG.AI_COPILOT_CALIB.time} Dia.`, 'success');
    handleEnviroShift(); 
    updateUI();
}

function checkODSProjectTime() {
    // Retorna true se um projeto ODS for obrigatório
    return state.days >= state.nextODSProjectDay && state.nextODSProjectDay < state.maxDays;
}

function selectODSProject(choice) {
    document.getElementById('ods-modal').classList.add('hidden');
    state.nextODSProjectDay = state.days + 10;
    
    // Custo de alocação de tempo e recursos
    state.days += 5;
    state.energy -= 10;
    state.energy = Math.max(0, state.energy);

    // Bônus ODS
    state.skillBEAA = Math.min(state.targetSkill, state.skillBEAA + CONFIG.ODS_PROJECT.bonusSkill);
    
    // Risco ODS: chance de Sobrecarga de Impacto
    if (Math.random() < CONFIG.ODS_PROJECT.riskBurnout) {
         const loss = Math.floor(Math.random() * 15) + 5;
         state.energy -= loss;
         state.energy = Math.max(0, state.energy);
         logMessage(`🚨 Projeto ODS [${choice}] concluído com Sobrecarga de Impacto. Perda extra de ${loss.toFixed(1)} Energia!`, 'error');
    }

    logMessage(`✅ Projeto ODS [${choice}] concluído! +${CONFIG.ODS_PROJECT.bonusSkill}% Habilidade. Próximo projeto: Dia ${state.nextODSProjectDay}.`, 'success');
    handleEnviroShift(); 
    updateUI();
}

function openODSProjectModal() {
    document.getElementById('ods-modal').classList.remove('hidden');
}

function handleEnviroShift() {
    // 1 em 3 chance de um shift ocorrer a cada ação de treinamento/saúde
    if (Math.random() < 0.33) {
        const shifts = Object.keys(CONFIG.SHIFTS).filter(k => k !== 'NONE');
        const randomShiftKey = shifts[Math.floor(Math.random() * shifts.length)];
        state.currentEnviroShift = randomShiftKey;

        const shift = CONFIG.SHIFTS[randomShiftKey];
        logMessage(`🚨 ENVIRO-SHIFT ATIVO: ${shift.name}. Otimize sua próxima jogada!`, 'warn');
    } else {
        state.currentEnviroShift = 'NONE';
    }
}

// --- LÓGICA DO PUZZLE MAQ (LIGHTS OUT) ---

function openPuzzleModal() {
    if (!state.isPuzzleAvailable) {
        logMessage("A Matriz de Alinhamento Quântico só pode ser ativada uma vez.", 'warn');
        return;
    }
    if (!state.gameActive || state.isBurnedOut) {
        logMessage("Ação bloqueada. Nômade em Burnout ou Jogo Encerrado.", 'error');
        return;
    }

    // Custo de Tempo e Energia para INICIAR o Módulo de Reflexão
    state.days += CONFIG.MAQ_PUZZLE.time;
    state.energy -= CONFIG.MAQ_PUZZLE.energyCost;
    state.energy = Math.max(0, state.energy);
    
    if (state.energy === 0 && !state.isBurnedOut) {
        state.isBurnedOut = true;
        logMessage("FALHA DE ENERGIA AO INICIAR O MAQ! BURNOUT MÁXIMO.", 'error');
        updateUI();
        return;
    }
    
    logMessage(`[MAQ ${CONFIG.MAQ_PUZZLE.icon}] Iniciando Módulo de Reflexão Ética. Custo: ${CONFIG.MAQ_PUZZLE.energyCost} Energia / ${CONFIG.MAQ_PUZZLE.time} Dias.`, 'warn');

    initializePuzzle();
    document.getElementById('puzzle-modal').classList.remove('hidden');
    updateUI();
}

function initializePuzzle() {
    PUZZLE.lights = [false, false, false, false, false, false, false, false, false];
    // Criar um estado resolvível (executando cliques aleatórios)
    for (let i = 0; i < 5; i++) { 
        const randomButton = Math.floor(Math.random() * 9);
        toggleLights(randomButton, false); 
    }
    renderPuzzleGrid();
}

function toggleLights(index, checkWin = true) {
    const row = Math.floor(index / 3);
    const col = index % 3;

    const neighbors = [
        index,
        row > 0 ? index - 3 : -1,
        row < 2 ? index + 3 : -1,
        col > 0 ? index - 1 : -1,
        col < 2 ? index + 1 : -1,
    ];

    neighbors.forEach(i => {
        if (i >= 0 && i < 9) {
            PUZZLE.lights[i] = !PUZZLE.lights[i];
        }
    });
    
    renderPuzzleGrid();
    if (checkWin) checkPuzzleWin();
}

function renderPuzzleGrid() {
    const grid = document.getElementById('puzzle-grid');
    grid.innerHTML = '';
    PUZZLE.lights.forEach((isLit, index) => {
        const button = document.createElement('button');
        button.className = `w-16 h-16 sm:w-20 sm:h-20 rounded-lg font-bold text-2xl transition duration-100 ${isLit ? 'bg-yellow-400 hover:bg-yellow-300 shadow-xl shadow-yellow-500/50' : 'bg-gray-700 hover:bg-gray-600'}`;
        button.onclick = () => toggleLights(index);
        button.textContent = isLit ? 'ON' : 'OFF';
        grid.appendChild(button);
    });
}

function checkPuzzleWin() {
    const isSolved = PUZZLE.lights.every(light => light === true);
    if (isSolved) {
        document.getElementById('puzzle-modal').classList.add('hidden');
        state.isPuzzleAvailable = false;
        state.boosterCharges = 5;
        logMessage(`✅ PUZZLE RESOLVIDO! Booster "Fluxo Ótimo de IA" ativado (5 cargas).`, 'booster');
        updateUI();
    }
}

// --- FUNÇÃO PRINCIPAL DE AÇÃO ---

function performAction(action) {
    if (!state.gameActive || (state.isBurnedOut && action !== 'HEALTH_POD' && action !== 'AI_CALIB')) {
        logMessage("Ação bloqueada. Nômade em Burnout.", 'error');
        return;
    }
    
    if (action !== 'HEALTH_POD' && action !== 'AI_CALIB' && action !== 'MAQ_PUZZLE' && checkODSProjectTime()) {
        logMessage("🚫 Ação Negada. O Projeto ODS precisa ser selecionado para o próximo ciclo de 10 dias.", 'warn');
        openODSProjectModal();
        return;
    }
    
    if (action === 'AI_CALIB') {
        performAICalibration();
        return;
    }
    
    if (action === 'MAQ_PUZZLE') {
        openPuzzleModal();
        return;
    }
    
    // --- Lógica Principal de Ações de Treinamento/Saúde ---
    const actionConfig = CONFIG[action];
    const shift = CONFIG.SHIFTS[state.currentEnviroShift];

    // 1. Calcula Multiplicadores de Tempo e Energia (Enviro-Shift)
    let timeMultiplier = shift.effect.time;
    let energyMultiplier = shift.effect.energy;
    
    // 2. Aplica Penalidade/Benefício do Co-Pilot
    if (state.aiCoPilotActive) {
        if (state.days >= state.aiCoPilotNextCalib) {
            state.aiCoPilotPenalty = CONFIG.AI_COPILOT_CALIB.penalty; // 1.5x custo
        } else {
            energyMultiplier *= CONFIG.AI_COPILOT_ENERGY_REDUCTION; // 0.9x custo
            state.aiCoPilotPenalty = 1.0; 
        }
    } else {
        state.aiCoPilotPenalty = 1.0;
    }
    
    // 3. Calcula Custos Finais de Tempo e Energia
    const daysSpent = actionConfig.time * timeMultiplier;
    state.days += daysSpent;
    
    let baseEnergyCost = actionConfig.energyCost * energyMultiplier * state.aiCoPilotPenalty;
    let dailyEnergyCost = daysSpent * CONFIG.DAILY_ENERGY_COST;
    let finalEnergyCost = baseEnergyCost + dailyEnergyCost;

    // 4. Aplica o Booster MAQ (se for ação de Treinamento)
    let boosterApplied = false;
    if (state.boosterCharges > 0 && (action === 'VR_HARD' || action === 'VR_SOFT')) {
        finalEnergyCost -= (actionConfig.energyCost * energyMultiplier * state.aiCoPilotPenalty) * 0.5;
        finalEnergyCost += dailyEnergyCost; 
        state.boosterCharges--;
        boosterApplied = true;
    }
    
    // 5. Executa Ação
    if (action === 'HEALTH_POD') {
        const restored = actionConfig.energyRestored - dailyEnergyCost;
        state.energy = Math.min(100, state.energy + restored);
        logMessage(`[GAIA HEALTH POD ${actionConfig.icon}] +${restored.toFixed(1)}% Energia Restaurada. Tempo: ${daysSpent.toFixed(1)} dias.`, 'success');
        
        if (state.isBurnedOut) { state.isBurnedOut = false; logMessage("ALERTA RESOLVIDO: Retomando qualificação.", 'success'); }
        
    } else { // VR_HARD or VR_SOFT
        state.skillBEAA = Math.min(state.targetSkill, state.skillBEAA + actionConfig.skillGain);
        state.energy -= finalEnergyCost;

        let actionName = action === 'VR_HARD' ? 'VR LAB' : 'SOFT SKILLS';
        let costMsg = `Custo: -${finalEnergyCost.toFixed(1)} Energia. Tempo: ${daysSpent.toFixed(1)} dias.`;
        
        logMessage(`[${actionName} ${actionConfig.icon}] +${actionConfig.skillGain}% Comp. ${costMsg}${boosterApplied ? ' [BOOSTER]' : ''}`, 'info');
    }

    // 6. Verifica Burnout e Triggers
    state.energy = Math.max(0, state.energy);

    if (state.energy === 0 && !state.isBurnedOut) {
        state.isBurnedOut = true;
        logMessage("FALHA CATASTRÓFICA! O NÔMADE DIGITAL ATINGIU BURNOUT MÁXIMO!", 'error');
    }
    
    handleEnviroShift();
    updateUI();
}

// Função de Fim de Jogo
function endGame(isVictory) {
    state.gameActive = false;
    disableActionButtons(true);
    
    // Fecha todos os modais e mostra a mensagem final
    document.querySelectorAll('[id$="-modal"]').forEach(modal => modal.classList.add('hidden'));
    
    const messageBox = document.getElementById('message-box');
    messageBox.classList.remove('hidden');

    const finalEnergy = state.energy.toFixed(1);
    let endingMessage = "";

    if (isVictory) {
        let quality = finalEnergy > 50 ? "**Vitória Ótima!**" : "Vitória Aceitável.";
        endingMessage = `<p class="text-xl text-gray-300 mb-6">${quality} Requalificação concluída em **${state.days} dias** com saúde (**${finalEnergy}%**).</p>`;
        messageBox.querySelector('div').innerHTML = `
            <h2 class="text-4xl font-bold title-glow text-green-400 mb-4 font-orbitron">SUCESSO: TRANSIÇÃO JUSTA CONCLUÍDA!</h2>
            ${endingMessage}
            <button onclick="location.reload()" class="mt-4 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition duration-200 shadow-lg hover:shadow-green-500/50">REINICIAR SIMULAÇÃO</button>
        `;
    } else {
         messageBox.querySelector('div').innerHTML = `
            <h2 class="text-4xl font-bold title-glow text-red-500 mb-4 font-orbitron">FALHA: TEMPO ESGOTADO OU BURNOUT</h2>
            <p class="text-xl text-gray-300 mb-6">O Nômade foi perdido no processo. Otimização de tempo ou gestão de bem-estar falhou.</p>
            <button onclick="location.reload()" class="mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition duration-200 shadow-lg hover:shadow-red-500/50">TENTAR NOVAMENTE</button>
        `;
    }
}

        

// Inicialização do Jogo

window.onload = function() {
                  logMessage("SIMULAÇÃO GAIA FLOW V4 INICIADA. GESTÃO COMPLEXA ATIVADA.", 'info');
                  logMessage(`Objetivo: 100% Comp. Prazo: ${state.maxDays} Dias. Próximo Projeto ODS: Dia ${state.nextODSProjectDay}.`, 'info');
                  updateUI();
};