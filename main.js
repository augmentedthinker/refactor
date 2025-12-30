import { initDiceWidget } from './DiceWidget.js';

const spawnBtn = document.getElementById('spawn-btn');
const board = document.getElementById('game-board');

spawnBtn.addEventListener('click', () => {
    // Create a wrapper for our new widget
    const widgetWrapper = document.createElement('div');
    widgetWrapper.style.margin = "10px";
    board.appendChild(widgetWrapper);

    // Initialize the module inside this specific wrapper
    initDiceWidget(widgetWrapper);
    
    // Disable spawn button to keep the UI clean for this demo
    spawnBtn.disabled = true;
    spawnBtn.innerText = "Dice Loaded";
});
