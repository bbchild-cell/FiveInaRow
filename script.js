// ========================================
// 五子棋直角坐標（平板離線版）主要程式邏輯
// ========================================

const BOARD_SIZE = 15; // 棋盤為 15 × 15 格（坐標範圍 -7 到 7）
const CENTER_OFFSET = 7; // 中心點 (0, 0) 對應的陣列索引位置

// 遊戲狀態變數
let board = []; // 二維陣列：0 代表空位、1 代表玩家黑子、2 代表電腦白子
let turn = 1; // 目前輪到誰：1 代表玩家、2 代表電腦
let winner = 0; // 勝負狀態：0 進行中、1 玩家勝、2 電腦勝、3 平手
let lastMove = null; // 記錄最後一手的位置，用來顯示紅點標記
let difficulty = 'easy'; // 電腦難度：歡樂、普通、魔王
let aiTimer = null; // 記錄電腦思考延遲的計時器，方便重新開始時取消

// 取得畫面上的主要元件
const gridEl = document.getElementById('grid');
const yAxisEl = document.getElementById('y-axis');
const xAxisEl = document.getElementById('x-axis');
const statusEl = document.getElementById('status-display');
const logsEl = document.getElementById('logs');
const errorEl = document.getElementById('error-msg');
const inputX = document.getElementById('input-x');
const inputY = document.getElementById('input-y');
const btnSubmit = document.getElementById('btn-submit');
const btnReset = document.getElementById('btn-reset');
const diffBtns = document.querySelectorAll('.diff-btn');
const stepBtns = document.querySelectorAll('.step-btn');
const victoryOverlay = document.getElementById('victory-overlay');
const victoryCard = document.getElementById('victory-card');
const victoryMessage = document.getElementById('victory-message');
const btnPlayAgain = document.getElementById('btn-play-again');
const btnCloseOverlay = document.getElementById('btn-close-overlay');

// ========================================
// 自動繪製平板「加入主畫面」專屬圖示
// ========================================
function createAppIcon() {
    const iconLink = document.getElementById('app-icon');
    if (!iconLink) return;

    // 使用畫布元件畫出 180 × 180 的木紋五子棋圖示，不需額外存放圖片檔
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 繪製木質棋盤底色與邊框
    ctx.fillStyle = '#e4c17a';
    ctx.fillRect(0, 0, 180, 180);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 172, 172);

    // 繪製 3 × 3 示意格線
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.75)';
    ctx.lineWidth = 3;
    const lines = [45, 90, 135];
    for (let i = 0; i < lines.length; i++) {
        ctx.beginPath();
        ctx.moveTo(24, lines[i]);
        ctx.lineTo(156, lines[i]);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(lines[i], 24);
        ctx.lineTo(lines[i], 156);
        ctx.stroke();
    }

    // 繪製黑子與白子
    const stones = [
        { x: 45, y: 45, isBlack: true },
        { x: 90, y: 90, isBlack: true },
        { x: 135, y: 135, isBlack: true },
        { x: 135, y: 45, isBlack: false },
        { x: 45, y: 135, isBlack: false }
    ];

    stones.forEach((stone) => {
        ctx.beginPath();
        ctx.arc(stone.x, stone.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = stone.isBlack ? '#0f172a' : '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = stone.isBlack ? '#334155' : '#94a3b8';
        ctx.stroke();
    });

    iconLink.href = canvas.toDataURL('image/png');
}

// ========================================
// 初始化棋盤資料與畫面格子
// ========================================
function createEmptyBoard() {
    // 建立 15 列，每一列都填入 15 個 0（代表空位）
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

function initBoardView() {
    gridEl.innerHTML = '';
    yAxisEl.innerHTML = '';
    xAxisEl.innerHTML = '';

    // 產生左側縱坐標刻度（從 7 由上往下遞減到 -7）
    for (let i = 0; i < BOARD_SIZE; i++) {
        const label = document.createElement('div');
        label.className = 'y-label';
        label.textContent = CENTER_OFFSET - i;
        yAxisEl.appendChild(label);
    }

    // 產生下方橫坐標刻度（從 -7 由左往右遞增到 7）
    for (let i = 0; i < BOARD_SIZE; i++) {
        const label = document.createElement('div');
        label.className = 'x-label';
        label.textContent = i - CENTER_OFFSET;
        xAxisEl.appendChild(label);
    }

    // 產生 15 × 15 個棋盤交點與格線
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${r}-${c}`;
            cell.setAttribute('role', 'button');

            // 畫出水平格線（左右邊緣的格子只需要畫一半）
            const hLine = document.createElement('div');
            hLine.className = 'line line-h';
            hLine.style.left = c === 0 ? '50%' : '0';
            hLine.style.width = c === 0 || c === BOARD_SIZE - 1 ? '50%' : '100%';
            cell.appendChild(hLine);

            // 畫出垂直格線（上下邊緣的格子只需要畫一半）
            const vLine = document.createElement('div');
            vLine.className = 'line line-v';
            vLine.style.top = r === 0 ? '50%' : '0';
            vLine.style.height = r === 0 || r === BOARD_SIZE - 1 ? '50%' : '100%';
            cell.appendChild(vLine);

            // 畫出棋盤上的 9 個黑色星位圓點
            if ((r === 3 || r === 7 || r === 11) && (c === 3 || c === 7 || c === 11)) {
                const star = document.createElement('div');
                star.className = 'star';
                cell.appendChild(star);
            }

            // 綁定點擊事件，讓平板手指點交點就能直接下棋
            cell.addEventListener('click', () => handleCellClick(r, c));
            gridEl.appendChild(cell);
        }
    }
}

// ========================================
// 更新棋盤棋子、狀態文字與控制項啟用狀態
// ========================================
function renderBoard() {
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            const oldPiece = cell.querySelector('.piece');
            if (oldPiece) {
                cell.removeChild(oldPiece);
            }

            if (board[r][c] !== 0) {
                const piece = document.createElement('div');
                piece.className = board[r][c] === 1 ? 'piece black' : 'piece white';

                // 在最新一手棋子中央加上紅點標記
                if (lastMove && lastMove.r === r && lastMove.c === c) {
                    const dot = document.createElement('div');
                    dot.className = 'last-move';
                    piece.appendChild(dot);
                }

                cell.appendChild(piece);
            }
        }
    }
}

// 統一控制坐標輸入框與按鈕是否可以點擊
function setControlsDisabled(disabled) {
    btnSubmit.disabled = disabled;
    inputX.disabled = disabled;
    inputY.disabled = disabled;
    stepBtns.forEach((btn) => {
        btn.disabled = disabled;
    });
}

function updateStatus() {
    if (winner === 1) {
        statusEl.innerHTML = '<span class="win-text">玩家（黑）勝利！</span>';
        victoryMessage.textContent = '🎉 玩家（黑）勝利！ 🎉';
        victoryCard.style.borderColor = '#1e293b';
        victoryOverlay.classList.add('active');
        setControlsDisabled(true);
    } else if (winner === 2) {
        statusEl.innerHTML = '<span class="win-text">電腦（白）勝利！</span>';
        victoryMessage.textContent = '🤖 電腦（白）勝利！ 🤖';
        victoryCard.style.borderColor = '#94a3b8';
        victoryOverlay.classList.add('active');
        setControlsDisabled(true);
    } else if (winner === 3) {
        statusEl.innerHTML = '<span class="win-text">雙方平手！</span>';
        victoryMessage.textContent = '🤝 雙方平手！ 🤝';
        victoryCard.style.borderColor = '#64748b';
        victoryOverlay.classList.add('active');
        setControlsDisabled(true);
    } else {
        victoryOverlay.classList.remove('active');
        if (turn === 1) {
            statusEl.innerHTML = '當前輪到：<span class="turn-black">● 玩家（黑子）</span>';
            setControlsDisabled(false);
        } else {
            statusEl.innerHTML = '當前輪到：<span class="turn-white">○ 電腦思考中...</span>';
            setControlsDisabled(true);
        }
    }
}

// 新增一筆對局紀錄並自動捲動到最下方
function addLog(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    logsEl.appendChild(entry);
    logsEl.scrollTop = logsEl.scrollHeight;
}

// ========================================
// 勝負與平手判斷
// ========================================
function checkWin(currentBoard, r, c, player) {
    // 檢查水平、垂直、左上到右下、右上到左下四個軸線
    const directions = [
        [[0, 1], [0, -1]],
        [[1, 0], [-1, 0]],
        [[1, 1], [-1, -1]],
        [[1, -1], [-1, 1]]
    ];

    for (let d = 0; d < directions.length; d++) {
        let count = 1; // 包含剛落下的這一顆棋子

        // 沿著該軸線的兩個相反方向各自延伸計算連續同色棋子數量
        for (let i = 0; i < 2; i++) {
            const dr = directions[d][i][0];
            const dc = directions[d][i][1];
            let nr = r + dr;
            let nc = c + dc;

            while (
                nr >= 0 &&
                nr < BOARD_SIZE &&
                nc >= 0 &&
                nc < BOARD_SIZE &&
                currentBoard[nr][nc] === player
            ) {
                count++;
                nr += dr;
                nc += dc;
            }
        }

        if (count >= 5) return true;
    }

    return false;
}

function checkDraw(currentBoard) {
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (currentBoard[r][c] === 0) return false;
        }
    }
    return true;
}

// ========================================
// 落子流程與操作處理
// ========================================
function makeMove(r, c, player) {
    if (board[r][c] !== 0 || winner !== 0) return false;

    board[r][c] = player;
    lastMove = { r, c };

    // 將陣列索引轉換回直角坐標 (橫坐標, 縱坐標)
    const x = c - CENTER_OFFSET;
    const y = CENTER_OFFSET - r;
    const playerName = player === 1 ? '玩家（黑）' : '電腦（白）';
    addLog(`${playerName} 落子於 (${x}, ${y})`);

    if (checkWin(board, r, c, player)) {
        winner = player;
        addLog(`遊戲結束，${playerName} 獲勝！`);
    } else if (checkDraw(board)) {
        winner = 3;
        addLog('遊戲結束，雙方平手。');
    } else {
        turn = player === 1 ? 2 : 1;
    }

    renderBoard();
    updateStatus();

    // 若輪到電腦且遊戲尚未結束，延遲 400 毫秒再落子，讓畫面更自然
    if (turn === 2 && winner === 0) {
        aiTimer = setTimeout(computerMove, 400);
    }

    return true;
}

function handleCellClick(r, c) {
    if (turn !== 1 || winner !== 0) return;
    errorEl.textContent = '';
    makeMove(r, c, 1);
}

function handleCoordinateSubmit() {
    if (turn !== 1 || winner !== 0) return;
    errorEl.textContent = '';

    const x = parseInt(inputX.value, 10);
    const y = parseInt(inputY.value, 10);

    if (
        Number.isNaN(x) ||
        Number.isNaN(y) ||
        x < -CENTER_OFFSET ||
        x > CENTER_OFFSET ||
        y < -CENTER_OFFSET ||
        y > CENTER_OFFSET
    ) {
        errorEl.textContent = '錯誤：坐標必須是 -7 到 7 之間的整數。';
        return;
    }

    // 將直角坐標轉換為陣列索引（列與欄）
    const c = x + CENTER_OFFSET;
    const r = CENTER_OFFSET - y;

    if (board[r][c] !== 0) {
        errorEl.textContent = '錯誤：這個位置已經有棋子了。';
        return;
    }

    inputX.value = '';
    inputY.value = '';
    // 送出坐標後自動收起平板螢幕鍵盤，讓玩家看清楚整張棋盤
    inputX.blur();
    inputY.blur();
    makeMove(r, c, 1);
}

// ========================================
// 電腦智慧下棋（位置評分 + 難度放水機制）
// ========================================
function evaluateDirection(r, c, dr, dc, player) {
    let count = 1; // 假設落子在此後的連線數
    let blocks = 0; // 兩端被邊界或對手擋住的次數

    // 往正方向檢查最多 4 格
    for (let i = 1; i < 5; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
            blocks++;
            break;
        }
        if (board[nr][nc] === player) {
            count++;
        } else if (board[nr][nc] === 0) {
            break;
        } else {
            blocks++;
            break;
        }
    }

    // 往反方向檢查最多 4 格
    for (let i = 1; i < 5; i++) {
        const nr = r - dr * i;
        const nc = c - dc * i;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
            blocks++;
            break;
        }
        if (board[nr][nc] === player) {
            count++;
        } else if (board[nr][nc] === 0) {
            break;
        } else {
            blocks++;
            break;
        }
    }

    // 兩端都被封死且無法連成五顆，價值為 0
    if (blocks === 2 && count < 5) return 0;

    if (count >= 5) return 100000;
    if (count === 4) return blocks === 0 ? 10000 : 1000;
    if (count === 3) return blocks === 0 ? 1000 : 100;
    if (count === 2) return blocks === 0 ? 100 : 10;
    return 1;
}

function evaluateCell(r, c) {
    const directions = [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1]
    ];
    let attackScore = 0; // 電腦進攻分數
    let defenseScore = 0; // 防守玩家分數

    for (let i = 0; i < directions.length; i++) {
        const dr = directions[i][0];
        const dc = directions[i][1];
        attackScore += evaluateDirection(r, c, dr, dc, 2);
        defenseScore += evaluateDirection(r, c, dr, dc, 1);
    }

    // 自己能直接五連勝優先最高，其次是堵住對手的五連勝
    if (attackScore >= 100000) return 200000;
    if (defenseScore >= 100000) return 150000;

    return attackScore + defenseScore;
}

function computerMove() {
    aiTimer = null;
    if (winner !== 0) return;

    let bestScore = -Infinity;
    let bestMoves = [];
    const adjacentCells = []; // 收集周圍已有棋子的空位，供放水模式隨機下子

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] !== 0) continue;

            // 檢查周圍八個方向是否有棋子
            let hasNeighbor = false;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr;
                    const nc = c + dc;
                    if (
                        nr >= 0 &&
                        nr < BOARD_SIZE &&
                        nc >= 0 &&
                        nc < BOARD_SIZE &&
                        board[nr][nc] !== 0
                    ) {
                        hasNeighbor = true;
                    }
                }
            }

            if (hasNeighbor) {
                adjacentCells.push({ r, c });
            }

            const score = evaluateCell(r, c);
            if (score > bestScore) {
                bestScore = score;
                bestMoves = [{ r, c }];
            } else if (score === bestScore) {
                bestMoves.push({ r, c });
            }
        }
    }

    // 依難度決定放水機率（歡樂模式最容易放水，魔王模式不放水）
    let mistakeProb = 0;
    if (difficulty === 'easy') mistakeProb = 0.6;
    if (difficulty === 'normal') mistakeProb = 0.15;

    if (Math.random() < mistakeProb && adjacentCells.length > 0) {
        const randomMove = adjacentCells[Math.floor(Math.random() * adjacentCells.length)];
        makeMove(randomMove.r, randomMove.c, 2);
        return;
    }

    if (bestMoves.length > 0) {
        const chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        makeMove(chosenMove.r, chosenMove.c, 2);
    }
}

// ========================================
// 重新開始與事件監聽設定
// ========================================
function resetGame() {
    // 取消尚未執行的電腦落子計時器，避免重開後出現殘留落子
    if (aiTimer !== null) {
        clearTimeout(aiTimer);
        aiTimer = null;
    }

    board = createEmptyBoard();
    turn = 1;
    winner = 0;
    lastMove = null;
    logsEl.innerHTML = '';
    errorEl.textContent = '';
    inputX.value = '';
    inputY.value = '';

    addLog('遊戲開始，由玩家（黑子）先手。');
    renderBoard();
    updateStatus();
}

// 綁定確認落子按鈕與輸入框確認鍵
btnSubmit.addEventListener('click', handleCoordinateSubmit);

[inputX, inputY].forEach((input) => {
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            handleCoordinateSubmit();
        }
    });
});

// 綁定平板專用的坐標加減微調按鈕
stepBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const delta = parseInt(btn.getAttribute('data-delta'), 10);
        const targetInput = document.getElementById(targetId);
        if (!targetInput || targetInput.disabled) return;

        // 若輸入框目前空白，從 0 開始增減
        const current = targetInput.value === '' ? 0 : parseInt(targetInput.value, 10);
        const base = Number.isNaN(current) ? 0 : current;
        const nextValue = Math.max(-CENTER_OFFSET, Math.min(CENTER_OFFSET, base + delta));
        targetInput.value = nextValue;
        errorEl.textContent = '';
    });
});

// 綁定難度切換按鈕
diffBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        diffBtns.forEach((item) => item.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.getAttribute('data-diff');
    });
});

// 綁定重新開始與勝利視窗按鈕
btnReset.addEventListener('click', resetGame);
btnPlayAgain.addEventListener('click', resetGame);
btnCloseOverlay.addEventListener('click', () => {
    victoryOverlay.classList.remove('active');
});

// ========================================
// 蘋果平板瀏覽器專屬觸控與防誤觸設定
// ========================================
function setupTabletBrowserSupport() {
    // 啟用蘋果平板瀏覽器的按壓即時視覺回饋
    document.addEventListener('touchstart', () => {}, { passive: true });

    // 防止小朋友在棋盤上連續快點或雙指捏合時意外縮放棋盤
    gridEl.addEventListener('dblclick', (event) => {
        event.preventDefault();
    });

    const preventBoardZoom = (event) => {
        event.preventDefault();
    };
    gridEl.addEventListener('gesturestart', preventBoardZoom);
    gridEl.addEventListener('gesturechange', preventBoardZoom);
}

// 啟動遊戲
createAppIcon();
initBoardView();
setupTabletBrowserSupport();
resetGame();
