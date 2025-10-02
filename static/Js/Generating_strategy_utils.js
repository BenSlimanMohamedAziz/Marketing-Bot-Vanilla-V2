class StrategyNotificationManager {
    constructor() {
        this.eventSource = null;
        this.notificationElement = null;
        this.checkInterval = null;
        this.pollInterval = null;
        this.statusCheckInterval = null;
        this.failureCount = 0;
        this.maxFailures = 3;
        this.currentStrategyId = null;
        this.init();
    }

    init() {
        this.createNotificationElement();
        this.checkActiveGeneration();
        
        window.addEventListener('storage', (e) => {
            if (e.key === 'strategy_generation') {
                this.handleStorageChange(e.newValue);
            }
        });

        // Check periodically with health validation
        this.checkInterval = setInterval(() => {
            this.checkActiveGeneration();
        }, 5000);
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    createNotificationElement() {
        const html = `
            <div id="strategyNotification" class="strategy-notification">
                <div class="notification-content">
                    <div class="notification-header">
                        <span class="notification-title">
                            <i class="fas fa-magic"></i>
                            <span id="notifTitle">Generating Marketing Strategy</span>
                        </span>
                        <button class="notification-close" id="closeNotification">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="notification-body">
                        <div class="progress-container">
                            <div class="progress-bar" id="notificationProgressBar" style="width: 0%"></div>
                        </div>
                        <div class="status-text" id="statusText">
                            Chahbander is preparing your strategy...
                        </div>
                        <div class="step-indicator" id="stepIndicator">
                            Initializing...
                        </div>
                    </div>
                    <div class="notification-footer" id="notificationFooter">
                        <div class="loading-spinner-small"></div>
                        <span class="time-estimate">Estimated time: 5-15 minutes</span>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        this.notificationElement = document.getElementById('strategyNotification');

        // Close button handler
        document.getElementById('closeNotification').addEventListener('click', () => {
            this.hideNotification();
            // Only clear storage if generation is complete or errored
            const data = this.getGenerationData();
            if (data && (data.status === 'completed' || data.status === 'error')) {
                localStorage.removeItem('strategy_generation');
            }
        });
    }

    getGenerationData() {
        const data = localStorage.getItem('strategy_generation');
        return data ? JSON.parse(data) : null;
    }

    async checkActiveGeneration() {
        const generationData = this.getGenerationData();
        if (!generationData) return;

        const age = Date.now() - generationData.startTime;
        
        // Clear stale data (older than 5 minutes)
        if (age > 300000) {
            console.log('Clearing stale generation data');
            localStorage.removeItem('strategy_generation');
            this.hideNotification();
            return;
        }

        // Check if strategy status has changed to completed state
        if (generationData.status === 'completed' && generationData.strategyId) {
            this.currentStrategyId = generationData.strategyId;
            const strategyStatus = await this.checkStrategyStatus(generationData.strategyId);
            
            if (strategyStatus === 'approved' || strategyStatus === 'denied - archived') {
                // Strategy has been processed, remove notification
                localStorage.removeItem('strategy_generation');
                this.hideNotification();
                return;
            }
            
            // Strategy still pending action, show persistent notification
            this.showPersistentNotification(generationData);
            
            // Start periodic status checking
            if (!this.statusCheckInterval) {
                this.startStatusChecking(generationData.strategyId);
            }
        } else if (generationData.status === 'generating') {
            // Show normal progress notification for generating state
            this.restoreProgressState(generationData);
            
            // Verify server is still processing
            const isValid = await this.verifyGenerationStatus(generationData.companyId);
            if (!isValid) {
                this.showErrorNotification('Generation interrupted. Please try again.');
                return;
            }
            
            this.showNotification();
            if (!this.eventSource && !this.pollInterval) {
                this.connectSSE(generationData.companyId);
            }
        } else if (generationData.status === 'error') {
            this.showErrorNotification(generationData.error || 'Generation failed');
        }
    }

    async checkStrategyStatus(strategyId) {
        try {
            const response = await fetch(`/check_strategy_status_by_id/${strategyId}`);
            if (!response.ok) {
                throw new Error('Failed to check strategy status');
            }
            const data = await response.json();
            return data.status;
        } catch (error) {
            console.error('Error checking strategy status:', error);
            return null;
        }
    }

    startStatusChecking(strategyId) {
        this.statusCheckInterval = setInterval(async () => {
            const status = await this.checkStrategyStatus(strategyId);
            if (status === 'approved' || status === 'denied - archived') {
                // Strategy processed, clean up
                clearInterval(this.statusCheckInterval);
                this.statusCheckInterval = null;
                localStorage.removeItem('strategy_generation');
                this.hideNotification();
            }
        }, 10000); // Check every 10 seconds
    }

    showPersistentNotification(generationData) {
        this.notificationElement.classList.remove('success', 'error');
        this.notificationElement.classList.add('visible', 'persistent');
        
        this.updateNotificationContent(
            '<i class="fas fa-check-circle"></i> Strategy Ready',
            'Your marketing strategy has been generated successfully!',
            'Take action to complete the process',
            true
        );
        
        document.getElementById('notificationProgressBar').style.width = '100%';
    }

    restoreProgressState(data) {
        const progress = data.progress || 0;
        const progressBar = document.getElementById('notificationProgressBar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        // Only update step indicator if still generating
        if (data.status === 'generating') {
            const stepIndicator = document.getElementById('stepIndicator');
            if (stepIndicator && data.currentStep) {
                stepIndicator.textContent = data.currentStep;
            }
            
            // Update notification content for generating state
            this.updateNotificationContent(
                //<i class="fas fa-magic"> </i>   
                'Generating Marketing Strategy',
                'Chahbander is preparing your strategy...',
                data.currentStep || 'Processing...',
                false
            );
        }
    }

    updateNotificationContent(title, statusText, stepText, isPersistent = false) {
        const titleElement = document.getElementById('notifTitle');
        const statusElement = document.getElementById('statusText');
        const stepElement = document.getElementById('stepIndicator');
        const footerElement = document.getElementById('notificationFooter');
        
        if (titleElement) titleElement.innerHTML = title;
        if (statusElement) statusElement.textContent = statusText;
        if (stepElement) stepElement.textContent = stepText;
        
        if (isPersistent) {
            this.notificationElement.classList.add('persistent');
            if (footerElement) {
                footerElement.innerHTML = `
                    <button class="btn btn-primary" id="viewStrategyBtn">
                        <i class="fas fa-eye"></i> View Strategy
                    </button>
                    <span class="time-estimate">Action Required</span>
                `;
                
                // Re-attach event listener
                document.getElementById('viewStrategyBtn').addEventListener('click', () => {
                    if (this.currentStrategyId) {
                        this.viewStrategy(this.currentStrategyId);
                    }
                });
            }
        } else {
            this.notificationElement.classList.remove('persistent');
            if (footerElement) {
                footerElement.innerHTML = `
                    <div class="loading-spinner-small"></div>
                    <span class="time-estimate">Estimated time: 5-15 minutes</span>
                `;
            }
        }
    }

    async verifyGenerationStatus(companyId) {
        try {
            const response = await fetch(`/check_strategy_status/${companyId}`);
            if (!response.ok) {
                throw new Error('Server unavailable');
            }
            
            const data = await response.json();
            
            if (data.status === 'completed') {
                this.onComplete(data.strategy_id);
                return false;
            }
            
            if (data.status === 'unknown') {
                return false;
            }
            
            this.failureCount = 0;
            return true;
        } catch (error) {
            console.error('Verification failed:', error);
            this.failureCount++;
            
            if (this.failureCount >= this.maxFailures) {
                return false;
            }
            return true;
        }
    }

    startGeneration(companyId) {
        // Clear any existing intervals first
        this.cleanup();
        
        const generationData = {
            companyId: companyId,
            status: 'generating',
            startTime: Date.now(),
            currentStep: 'Initializing...',
            progress: 0
        };
        
        localStorage.setItem('strategy_generation', JSON.stringify(generationData));
        this.failureCount = 0;
        
        // Show initial progress state
        this.updateProgress({
            progress: 0,
            currentStep: 'Starting strategy generation...'
        });
        this.showNotification();
        this.connectSSE(companyId);
    }

    connectSSE(companyId) {
        if (this.eventSource) {
            this.eventSource.close();
        }

        this.eventSource = new EventSource(`/strategy_progress/${companyId}`);

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.updateProgress(data);
                this.failureCount = 0;
            } catch (error) {
                console.error('Error parsing SSE data:', error);
            }
        };

        this.eventSource.addEventListener('complete', (event) => {
            try {
                const data = JSON.parse(event.data);
                this.onComplete(data.strategy_id);
            } catch (error) {
                console.error('Error parsing completion data:', error);
            }
        });

        this.eventSource.onerror = (error) => {
            console.error('SSE Error:', error);
            this.eventSource.close();
            this.eventSource = null;
            
            this.failureCount++;
            
            if (this.failureCount >= this.maxFailures) {
                this.showErrorNotification('Connection lost. Please refresh and try again.');
            } else {
                this.startPolling(companyId);
            }
        };
    }

    startPolling(companyId) {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }

        this.pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/check_strategy_status/${companyId}`);
                
                if (!response.ok) {
                    throw new Error('Server unavailable');
                }
                
                const data = await response.json();
                
                if (data.status === 'completed') {
                    clearInterval(this.pollInterval);
                    this.pollInterval = null;
                    this.onComplete(data.strategy_id);
                } else if (data.status === 'error') {
                    clearInterval(this.pollInterval);
                    this.pollInterval = null;
                    this.showErrorNotification(data.error || 'Generation failed');
                } else if (data.status === 'unknown') {
                    clearInterval(this.pollInterval);
                    this.pollInterval = null;
                    this.showErrorNotification('Generation session lost');
                } else if (data.currentStep || data.progress !== undefined) {
                    this.updateProgress(data);
                    this.failureCount = 0;
                }
            } catch (error) {
                console.error('Polling error:', error);
                this.failureCount++;
                
                if (this.failureCount >= this.maxFailures) {
                    clearInterval(this.pollInterval);
                    this.pollInterval = null;
                    this.showErrorNotification('Server connection lost');
                }
            }
        }, 3000);
    }

    updateProgress(data) {
        const { progress, currentStep } = data;
        
        const progressBar = document.getElementById('notificationProgressBar');
        if (progressBar && progress !== undefined) {
            progressBar.style.width = `${progress}%`;
        }
        
        const stepIndicator = document.getElementById('stepIndicator');
        if (stepIndicator && currentStep) {
            stepIndicator.textContent = currentStep;
        }
        
        const generationData = this.getGenerationData();
        if (generationData) {
            generationData.currentStep = currentStep;
            generationData.progress = progress || generationData.progress || 0;
            localStorage.setItem('strategy_generation', JSON.stringify(generationData));
        }
    }

    onComplete(strategyId) {
        this.cleanup();

        const generationData = {
            status: 'completed',
            strategyId: strategyId,
            completedAt: Date.now()
        };
        localStorage.setItem('strategy_generation', JSON.stringify(generationData));

        this.showPersistentNotification(generationData);
        this.currentStrategyId = strategyId;
        this.startStatusChecking(strategyId);
    }

    showNotification() {
        this.notificationElement.classList.remove('success', 'error', 'persistent');
        this.notificationElement.classList.add('visible');
    }

    hideNotification() {
        this.notificationElement.classList.remove('visible');
    }

    showErrorNotification(message) {
        this.cleanup();
        
        const generationData = {
            status: 'error',
            error: message,
            timestamp: Date.now()
        };
        localStorage.setItem('strategy_generation', JSON.stringify(generationData));
        
        this.hideNotification();
        
        setTimeout(() => {
            this.notificationElement.classList.add('error', 'visible');
            document.getElementById('notifTitle').innerHTML = '<i class="fas fa-exclamation-circle"></i> Generation Failed';
            document.getElementById('statusText').textContent = message;
            document.getElementById('stepIndicator').style.display = 'none';
            
            const footer = document.getElementById('notificationFooter');
            footer.innerHTML = `
                <button class="btn btn-secondary" onclick="window.strategyNotification.dismissError()">
                    <i class="fas fa-times"></i> Dismiss
                </button>
            `;
        }, 300);
    }

    dismissError() {
        localStorage.removeItem('strategy_generation');
        this.hideNotification();
    }

    viewStrategy(strategyId) {
        window.location.href = `/strategy/${strategyId}`;
    }

    handleStorageChange(newValue) {
        if (!newValue) {
            this.hideNotification();
            this.cleanup();
            return;
        }

        const data = JSON.parse(newValue);
        if (data.status === 'generating') {
            this.restoreProgressState(data);
            this.showNotification();
            if (!this.eventSource && !this.pollInterval) {
                this.connectSSE(data.companyId);
            }
        } else if (data.status === 'completed') {
            this.showPersistentNotification(data);
            this.currentStrategyId = data.strategyId;
            this.startStatusChecking(data.strategyId);
        } else if (data.status === 'error') {
            this.showErrorNotification(data.error || 'Generation failed');
        }
    }

    cleanup() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }
}

// Initialize globally
window.strategyNotification = new StrategyNotificationManager();