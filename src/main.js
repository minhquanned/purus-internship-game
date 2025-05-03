import { GameManager } from './components/GameManager';

// Start game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Starting game initialization');
    
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 5px; z-index: 1000;';
    loadingDiv.textContent = 'Loading game...';
    document.body.appendChild(loadingDiv);
    
    // Create GameManager instance which will handle all initialization
    const gameManager = new GameManager();
    window.gameManager = gameManager;

    // Initialize game through GameManager
    gameManager.initializeGame()
        .then(() => {
            loadingDiv.remove();
            
            // Add event listener for start button
            document.getElementById('start-button').addEventListener('click', () => {
                gameManager.startGame();
            });
        })
        .catch(error => {
            console.error('Error initializing game:', error);
            loadingDiv.style.background = 'rgba(255,0,0,0.8)';
            loadingDiv.textContent = `Game initialization failed: ${error.message}. Please check console for details.`;
        });
});