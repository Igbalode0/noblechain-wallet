// Noble Chain - Internal Wallet Platform
// Production-grade wallet system with real state management

class NobleChain {
    constructor() {
        this.currentUser = null;
        this.users = this.loadUsers();
        this.wallets = this.loadWallets();
        this.transactions = this.loadTransactions();
        this.supportChats = this.loadSupportChats();
        this.loginHistory = this.loadLoginHistory();
        this.marketData = this.generateMarketData();
        this.init();
    }

    init() {
        // Check session after all data is loaded
        this.checkSession();
        this.bindEvents();
        this.startMarketUpdates();
    }

    // ==================== AUTHENTICATION ====================

    signup(email, password, username) {
        if (this.users.find(u => u.email === email)) {
            throw new Error('Email already registered');
        }
        if (this.users.find(u => u.username === username)) {
            throw new Error('Username already taken');
        }

        const user = {
            id: this.generateId(),
            email,
            username,
            passwordHash: this.hashPassword(password),
            securityPhraseHash: null,
            profilePicture: 'resources/user-avatar.png',
            createdAt: Date.now(),
            lastLogin: null,
            role: 'user',
            ipAddress: 'user-signup',
            adminNotes: '',
            transferPinHash: null,
            hasLoggedInBefore: false,
            accountStatus: 'active'
        };

        this.users.push(user);
        this.saveUsers();

        // Create wallet
        const wallet = {
            userId: user.id,
            dollarBalance: 0,
            assets: {},
            totalValue: 0
        };
        this.wallets[user.id] = wallet;
        this.saveWallets();

        // Create user PIN entry requirement
        this.createPinEntry(user.id);

        // Ensure user is in admin panel database
        this.syncUserWithAdminPanel(user);

        return user;
    }

    // ==================== TRANSFER PIN SYSTEM ====================

    createPinEntry(userId) {
        // This creates a PIN entry requirement for the user
        const pinData = {
            userId: userId,
            pinHash: null,
            createdAt: Date.now(),
            mustSetPin: true
        };
        
        // Store PIN data
        const pinStorage = JSON.parse(localStorage.getItem('noblechain_pins') || '{}');
        pinStorage[userId] = pinData;
        localStorage.setItem('noblechain_pins', JSON.stringify(pinStorage));
        
        return pinData;
    }

    setTransferPin(userId, pin) {
        if (!/^\d{4,6}$/.test(pin)) {
            throw new Error('PIN must be 4-6 digits');
        }

        const pinStorage = JSON.parse(localStorage.getItem('noblechain_pins') || '{}');
        if (!pinStorage[userId]) {
            throw new Error('PIN setup required');
        }

        // Hash the PIN
        const pinHash = this.hashPassword(pin);
        
        pinStorage[userId].pinHash = pinHash;
        pinStorage[userId].mustSetPin = false;
        pinStorage[userId].lastUpdated = Date.now();
        
        localStorage.setItem('noblechain_pins', JSON.stringify(pinStorage));
        
        // Update user record
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.transferPinHash = pinHash;
            this.saveUsers();
        }
        
        // Send notification
        this.sendEmailNotification(userId, 'pin_changed', {
            timestamp: Date.now()
        });
        
        return true;
    }

    verifyTransferPin(userId, pin) {
        const pinStorage = JSON.parse(localStorage.getItem('noblechain_pins') || '{}');
        const pinData = pinStorage[userId];
        
        if (!pinData || !pinData.pinHash) {
            throw new Error('Transfer PIN not set');
        }
        
        const pinHash = this.hashPassword(pin);
        const isValid = pinHash === pinData.pinHash;
        
        // Log PIN verification attempt
        this.logAdminAction('pin_verification', {
            userId: userId,
            success: isValid,
            timestamp: Date.now()
        });
        
        if (!isValid) {
            // Send security notification for failed PIN attempt
            this.sendEmailNotification(userId, 'pin_failed', {
                timestamp: Date.now()
            });
            throw new Error('Invalid Transfer PIN');
        }
        
        return true;
    }

    resetTransferPin(userId, adminId) {
        const pinStorage = JSON.parse(localStorage.getItem('noblechain_pins') || '{}');
        
        if (pinStorage[userId]) {
            pinStorage[userId].pinHash = null;
            pinStorage[userId].mustSetPin = true;
            pinStorage[userId].lastUpdated = Date.now();
            pinStorage[userId].resetBy = adminId;
            localStorage.setItem('noblechain_pins', JSON.stringify(pinStorage));
        }
        
        // Update user record
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.transferPinHash = null;
            this.saveUsers();
        }
        
        // Log admin action
        this.logAdminAction('pin_reset', {
            userId: userId,
            adminId: adminId,
            timestamp: Date.now()
        });
        
        // Send notification to user
        this.sendEmailNotification(userId, 'pin_changed', {
            timestamp: Date.now(),
            resetByAdmin: true
        });
        
        return true;
    }

    hasTransferPin(userId) {
        const pinStorage = JSON.parse(localStorage.getItem('noblechain_pins') || '{}');
        const pinData = pinStorage[userId];
        return pinData && pinData.pinHash && !pinData.mustSetPin;
    }

    mustSetTransferPin(userId) {
        const pinStorage = JSON.parse(localStorage.getItem('noblechain_pins') || '{}');
        const pinData = pinStorage[userId];
        return pinData && pinData.mustSetPin;
    }

    login(email, password, deviceInfo = 'Unknown') {
        const user = this.users.find(u => u.email === email);
        
        if (!user || user.passwordHash !== this.hashPassword(password)) {
            // Record failed login attempt
            if (user) {
                this.recordLoginAttempt(user.id, false, deviceInfo);
            }
            throw new Error('Invalid credentials');
        }

        user.lastLogin = Date.now();
        this.saveUsers();
        this.currentUser = user;
        this.saveSession();
        
        // Record successful login attempt
        this.recordLoginAttempt(user.id, true, deviceInfo);
        
        // Send admin notification for new user registration (if this is first login)
        if (!user.hasLoggedInBefore) {
            user.hasLoggedInBefore = true;
            this.saveUsers();
            this.sendAdminNotification('new_user', {
                username: user.username,
                email: user.email,
                timestamp: Date.now()
            });
        }
        
        return user;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('noblechain_session');
        localStorage.removeItem('noblechain_admin_session');
        window.location.href = 'index.html';
    }

   window.nobleChain = window.nobleChain || {};
   window.noblechain.generateSecurityPhrase() {
        const words = [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
            'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
            'acoustic', 'acquire', 'across', 'action', 'actor', 'actress', 'actual', 'adapt',
            'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance', 'advice',
            'aerobic', 'affair', 'afford', 'afraid', 'again', 'agent', 'agree', 'ahead',
            'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
            'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already',
            'also', 'alter', 'always', 'amateur', 'amazing', 'among', 'amount', 'amused',
            'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry', 'animal', 'ankle',
            'apart', 'apology', 'appear', 'apple', 'approve', 'archive', 'area', 'arena',
            'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest',
            'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'aspect', 'attack',
            'attend', 'attention', 'attitude', 'attract', 'auction', 'autumn', 'average',
            'avocado', 'avoid', 'awake', 'award', 'aware', 'awesome', 'awful', 'awkward',
            'axis', 'baby', 'bachelor', 'bacon', 'badge', 'balance', 'balcony', 'ball',
            'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base',
            'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become',
            'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt',
            'bench', 'benefit', 'berry', 'best', 'betray', 'better', 'between', 'beyond',
            'bicycle', 'bid', 'billion', 'bind', 'biology', 'bird', 'birth', 'bitter',
            'black', 'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless', 'blind',
            'blood', 'bloom', 'blossom', 'blouse', 'blue', 'blur', 'blush', 'board',
            'boat', 'body', 'boil', 'bomb', 'bond', 'bone', 'bonus', 'book', 'boost',
            'border', 'boring', 'borrow', 'boss', 'bottom', 'bounce', 'box', 'boy',
            'bracket', 'brain', 'brand', 'brass', 'brave', 'bread', 'breeze', 'brick',
            'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom',
            'brother', 'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build',
            'bulb', 'bulk', 'bullet', 'bundle', 'burden', 'bureau', 'burn', 'burst',
            'business', 'busy', 'butter', 'buyer', 'buzz', 'cabbage', 'cabin', 'cable',
            'cactus', 'cage', 'cake', 'calm', 'camera', 'camp', 'can', 'cancel', 'candy',
            'cannon', 'canoe', 'canvas', 'canyon', 'capable', 'capital', 'captain',
            'car', 'carbon', 'card', 'cargo', 'carpet', 'carriage', 'carrier', 'carrot',
            'carry', 'cart', 'case', 'cash', 'casino', 'castle', 'casual', 'cat', 'catalog',
            'catch', 'category', 'cattle', 'caught', 'cause', 'caution', 'cave', 'ceiling',
            'celebrate', 'celebrity', 'cell', 'cemetery', 'census', 'center', 'century',
            'ceremony', 'certain', 'chain', 'chair', 'chaise', 'chalk', 'champion', 'change',
            'chaos', 'chapter', 'charge', 'chase', 'cheat', 'check', 'cheese', 'chef',
            'cherry', 'chest', 'chicken', 'chief', 'child', 'chimney', 'choice', 'choose',
            'chronic', 'chuckle', 'chunk', 'churn', 'cigar', 'cinnamon', 'circle', 'circus',
            'citizen', 'citrus', 'city', 'civil', 'claim', 'clap', 'clarify', 'claw', 'clay',
            'clean', 'clerk', 'clever', 'click', 'client', 'cliff', 'climb', 'clinic', 'clip',
            'clock', 'clog', 'close', 'closet', 'cloth', 'cloud', 'clown', 'club', 'clue',
            'cluster', 'coach', 'coast', 'coconut', 'code', 'coffee', 'coil', 'coin', 'collect',
            'color', 'column', 'combine', 'come', 'comfort', 'comic', 'common', 'company',
            'compare', 'compete', 'compile', 'complain', 'complete', 'complex', 'compose',
            'computer', 'concern', 'concert', 'conduct', 'confirm', 'congress', 'connect',
            'consider', 'consist', 'constant', 'consume', 'contact', 'contain', 'contemplate',
            'content', 'contest', 'context', 'continue', 'contract', 'contrast', 'contribute',
            'control', 'convert', 'coordinate', 'copy', 'corner', 'corpse', 'correct', 'corridor',
            'costume', 'cottage', 'cotton', 'couch', 'cough', 'could', 'count', 'court', 'cousin',
            'cover', 'cow', 'crack', 'cradle', 'craft', 'crash', 'crawl', 'crazy', 'cream', 'credit',
            'crevice', 'crew', 'cricket', 'crime', 'crimson', 'crisis', 'crisp', 'criticize', 'crop',
            'cross', 'crowd', 'crucial', 'cruel', 'cruise', 'crumble', 'crunch', 'crusade', 'create',
            'credible', 'credit', 'creek', 'creep', 'crew', 'crime', 'crimson', 'crisis', 'crisp',
            'criticize', 'crop', 'cross', 'crowd', 'crucial', 'cruel', 'cruise', 'crumble', 'crunch',
            'crusade', 'create', 'credible', 'credit', 'creek', 'creep', 'crew', 'crime', 'crimson',
            'crisis', 'crisp', 'criticize', 'crop', 'cross', 'crowd', 'crucial', 'cruel', 'cruise',
            'crumble', 'crunch', 'crusade', 'create', 'credible', 'credit', 'creek', 'creep', 'crew'
        ];

        let phrase = [];
        for (let i = 0; i < 12; i++) {
            phrase.push(words[Math.floor(Math.random() * words.length)]);
        }
        return phrase.join(" ");
    }

    confirmSecurityPhrase(phrase, userSelections) {
        if (phrase.length !== userSelections.length) {
            return false;
        }
        return phrase.every((word, index) => word === userSelections[index]);
    }

    // ==================== WALLET OPERATIONS ====================

    getWallet(userId = null) {
        const targetUserId = userId || this.currentUser?.id;
        return this.wallets[targetUserId] || null;
    }

    getTotalBalance(userId = null) {
        const wallet = this.getWallet(userId);
        if (!wallet) return 0;
        
        let total = wallet.dollarBalance;
        Object.entries(wallet.assets).forEach(([assetId, data]) => {
            const price = this.marketData[assetId]?.price || 0;
            total += data.balance * price;
        });
        
        return total;
    }

    addAsset(userId, assetId) {
        const wallet = this.getWallet(userId);
        if (!wallet.assets[assetId]) {
            wallet.assets[assetId] = { balance: 0, averageCost: 0 };
            this.saveWallets();
        }
    }

    getWalletAddress(userId, assetId) {
        // Generate a consistent internal wallet address for the user-asset combination
        const cleanAssetId = assetId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const userHash = btoa(userId).substr(0, 8);
        return `NBL-${cleanAssetId}-${userHash}-${this.generateId().substr(0, 4)}`;
    }

    removeAsset(userId, assetId) {
        const wallet = this.getWallet(userId);
        delete wallet.assets[assetId];
        this.saveWallets();
    }

    // ==================== TRANSACTIONS ====================

    receiveMoney(amount, assetId = 'USD') {
        const wallet = this.getWallet();
        
        if (assetId === 'USD') {
            wallet.dollarBalance += amount;
        } else {
            if (!wallet.assets[assetId]) {
                wallet.assets[assetId] = { balance: 0, averageCost: 0 };
            }
            wallet.assets[assetId].balance += amount;
        }

        const tx = this.createTransaction('receive', assetId, amount, 'Internal Transfer');
        this.saveWallets();
        return tx;
    }

    sendMoney(recipientUsername, amount, assetId = 'USD', pin = null) {
        // Check if PIN is required and verify it
        if (this.hasTransferPin(this.currentUser.id)) {
            if (!pin) {
                throw new Error('Transfer PIN required for this transaction');
            }
            this.verifyTransferPin(this.currentUser.id, pin);
        }
        
        const recipient = this.users.find(u => u.username === recipientUsername);
        if (!recipient) throw new Error('Recipient not found');
        
        const senderWallet = this.getWallet();
        if (assetId === 'USD') {
            if (senderWallet.dollarBalance < amount) {
                throw new Error('Insufficient balance');
            }
            senderWallet.dollarBalance -= amount;
            this.wallets[recipient.id].dollarBalance += amount;
        } else {
            const asset = senderWallet.assets[assetId];
            if (!asset || asset.balance < amount) {
                throw new Error('Insufficient asset balance');
            }
            asset.balance -= amount;
            if (!this.wallets[recipient.id].assets[assetId]) {
                this.wallets[recipient.id].assets[assetId] = { balance: 0, averageCost: 0 };
            }
            this.wallets[recipient.id].assets[assetId].balance += amount;
        }

        // Create transactions
        const sendTx = this.createTransaction('send', assetId, amount, recipient.username);
        const receiveTx = this.createTransaction('receive', assetId, amount, this.currentUser.username, recipient.id);
        
        this.saveWallets();
        
        // Send email notifications
        this.sendEmailNotification(this.currentUser.id, 'transfer_sent', {
            amount: amount,
            asset: assetId,
            recipient: recipient.username,
            transactionId: sendTx.id
        });
        
        this.sendEmailNotification(recipient.id, 'transfer_received', {
            amount: amount,
            asset: assetId,
            sender: this.currentUser.username,
            transactionId: receiveTx.id
        });
        
        return { sendTx, receiveTx };
    }

    buyAsset(assetId, amount, price = null) {
        const wallet = this.getWallet();
        const cost = (price || this.marketData[assetId]?.price || 0) * amount;
        
        if (wallet.dollarBalance < cost) {
            throw new Error('Insufficient USD balance');
        }

        wallet.dollarBalance -= cost;
        if (!wallet.assets[assetId]) {
            wallet.assets[assetId] = { balance: 0, averageCost: 0 };
        }
        
        const asset = wallet.assets[assetId];
        const totalCost = asset.balance * asset.averageCost + cost;
        asset.balance += amount;
        asset.averageCost = totalCost / asset.balance;

        const tx = this.createTransaction('buy', assetId, amount, null, null, { cost, price: cost / amount });
        this.saveWallets();
        return tx;
    }

    sellAsset(assetId, amount, price = null) {
        const wallet = this.getWallet();
        const asset = wallet.assets[assetId];
        
        if (!asset || asset.balance < amount) {
            throw new Error('Insufficient asset balance');
        }

        const salePrice = price || this.marketData[assetId]?.price || 0;
        const proceeds = salePrice * amount;
        
        asset.balance -= amount;
        wallet.dollarBalance += proceeds;
        
        if (asset.balance === 0) {
            delete wallet.assets[assetId];
        }

        const tx = this.createTransaction('sell', assetId, amount, null, null, { proceeds, price: salePrice });
        this.saveWallets();
        return tx;
    }

    swapAssets(fromAssetId, toAssetId, amount, pin = null) {
        // Check if PIN is required and verify it
        if (this.hasTransferPin(this.currentUser.id)) {
            if (!pin) {
                throw new Error('Transfer PIN required for this transaction');
            }
            this.verifyTransferPin(this.currentUser.id, pin);
        }
        
        const wallet = this.getWallet();
        const fromAsset = wallet.assets[fromAssetId];
        
        if (!fromAsset || fromAsset.balance < amount) {
            throw new Error('Insufficient source asset balance');
        }

        const fromPrice = this.marketData[fromAssetId]?.price || 0;
        const toPrice = this.marketData[toAssetId]?.price || 0;
        const toAmount = (amount * fromPrice) / toPrice;

        fromAsset.balance -= amount;
        if (!wallet.assets[toAssetId]) {
            wallet.assets[toAssetId] = { balance: 0, averageCost: 0 };
        }
        wallet.assets[toAssetId].balance += toAmount;

        if (fromAsset.balance === 0) {
            delete wallet.assets[fromAssetId];
        }

        const swapTx = this.createTransaction('swap', fromAssetId, amount, null, null, { 
            toAsset: toAssetId, 
            toAmount,
            rate: fromPrice / toPrice 
        });
        
        this.saveWallets();
        return swapTx;
    }

    addMoney(amount) {
        const wallet = this.getWallet();
        wallet.dollarBalance += amount;
        
        const tx = this.createTransaction('add_money', 'USD', amount, 'Noble Chain Support');
        this.saveWallets();
        return tx;
    }

    createTransaction(type, asset, amount, counterparty = null, userId = null, metadata = {}) {
        const tx = {
            id: this.generateId(),
            userId: userId || this.currentUser.id,
            type,
            asset,
            amount,
            counterparty,
            timestamp: Date.now(),
            status: 'completed',
            metadata
        };
        
        this.transactions.push(tx);
        this.saveTransactions();
        // Add a user notification for this transaction
        try {
            const title = `Transaction: ${type.replace(/_/g,' ')}`;
            const body = `${type === 'receive' || type === 'add_money' ? 'Received' : (type === 'send' ? 'Sent' : type)} ${amount} ${asset}${counterparty ? ' — ' + counterparty : ''}`;
            this.addNotification(title, body, 'transaction');
        } catch (e) { console.warn('Notification add failed', e); }
        return tx;
    }

    addNotification(title, message, type = 'info') {
        try {
            const note = { id: this.generateId(), title, message, type, timestamp: Date.now(), read: false };
            const list = JSON.parse(localStorage.getItem('noblechain_notifications') || '[]');
            list.unshift(note);
            // keep last 100
            if (list.length > 100) list.splice(100);
            localStorage.setItem('noblechain_notifications', JSON.stringify(list));
            document.dispatchEvent(new CustomEvent('noblechain:notification', { detail: note }));
            return note;
        } catch (e) {
            console.warn('Failed to store notification', e);
            return null;
        }
    }

    // ==================== MARKET DATA ====================

    generateMarketData() {
        return {
            'BTC': { name: 'Bitcoin', symbol: 'BTC', price: 45000 + Math.random() * 5000, change: (Math.random() - 0.5) * 10 },
            'ETH': { name: 'Ethereum', symbol: 'ETH', price: 3000 + Math.random() * 500, change: (Math.random() - 0.5) * 15 },
            'ADA': { name: 'Cardano', symbol: 'ADA', price: 0.45 + Math.random() * 0.1, change: (Math.random() - 0.5) * 20 },
            'SOL': { name: 'Solana', symbol: 'SOL', price: 100 + Math.random() * 20, change: (Math.random() - 0.5) * 25 },
            'MATIC': { name: 'Polygon', symbol: 'MATIC', price: 0.85 + Math.random() * 0.15, change: (Math.random() - 0.5) * 18 },
            'LINK': { name: 'Chainlink', symbol: 'LINK', price: 15 + Math.random() * 3, change: (Math.random() - 0.5) * 12 },
            'VET': { name: 'VeChain', symbol: 'VET', price: 0.025 + Math.random() * 0.005, change: (Math.random() - 0.5) * 30 },
            'FIL': { name: 'Filecoin', symbol: 'FIL', price: 5 + Math.random() * 1, change: (Math.random() - 0.5) * 22 },
            'UNI': { name: 'Uniswap', symbol: 'UNI', price: 8 + Math.random() * 2, change: (Math.random() - 0.5) * 16 },
            'AAVE': { name: 'Aave', symbol: 'AAVE', price: 120 + Math.random() * 20, change: (Math.random() - 0.5) * 14 },
            'AAPL': { name: 'Apple Inc.', symbol: 'AAPL', price: 180 + Math.random() * 20, change: (Math.random() - 0.5) * 5 },
            'MSFT': { name: 'Microsoft Corporation', symbol: 'MSFT', price: 380 + Math.random() * 30, change: (Math.random() - 0.5) * 6 },
            'GOOGL': { name: 'Alphabet Inc.', symbol: 'GOOGL', price: 140 + Math.random() * 15, change: (Math.random() - 0.5) * 7 },
            'AMZN': { name: 'Amazon.com Inc.', symbol: 'AMZN', price: 160 + Math.random() * 20, change: (Math.random() - 0.5) * 8 },
            'TSLA': { name: 'Tesla Inc.', symbol: 'TSLA', price: 250 + Math.random() * 50, change: (Math.random() - 0.5) * 15 },
            'NVDA': { name: 'NVIDIA Corporation', symbol: 'NVDA', price: 500 + Math.random() * 100, change: (Math.random() - 0.5) * 20 }
        };
    }

    startMarketUpdates() {
        setInterval(() => {
            Object.keys(this.marketData).forEach(assetId => {
                const data = this.marketData[assetId];
                data.price += (Math.random() - 0.5) * data.price * 0.001;
                data.change += (Math.random() - 0.5) * 0.5;
            });
            this.updateUI();
        }, 5000);
    }

    // ==================== SUPPORT CHAT ====================

    sendSupportMessage(message, isAdmin = false, senderType = 'user') {
        const chat = {
            id: this.generateId(),
            userId: this.currentUser?.id || 'admin',
            message,
            isAdmin,
            senderType, // 'user', 'ai', 'admin'
            timestamp: Date.now()
        };
        
        this.supportChats.push(chat);
        this.saveSupportChats();
        return chat;
    }

    getSupportChats(userId = null) {
        if (userId) {
            return this.supportChats.filter(chat => chat.userId === userId);
        }
        return this.supportChats;
    }

    generateAIResponse(userMessage) {
        const responses = {
            'hello': 'Hello! Welcome to Noble Chain Support. How can I assist you today?',
            'hi': 'Hi there! I\'m here to help you with your Noble Chain wallet. What do you need assistance with?',
            'help': 'I can help you with:\n• Adding money to your account\n• Sending and receiving funds\n• Buying and selling assets\n• Wallet security\n• Transaction history\n\nWhat would you like to know?',
            'add money': 'To add money to your account, please contact our support team at noblechainhelpdesk@gmail.com. They will guide you through the deposit process.',
            'deposit': 'To make a deposit, please email our support team at noblechainhelpdesk@gmail.com with your request.',
            'send money': 'To send money, go to your dashboard and tap "Send Money". Enter the recipient\'s username and amount. Transfers are instant between Noble Chain users.',
            'receive': 'To receive funds, share your wallet address with the sender. You can find your wallet address by tapping "Receive" on any asset.',
            'buy': 'To buy assets, go to your wallet page, select an asset, and tap "Buy". You can purchase using your USD balance.',
            'sell': 'To sell assets, go to your wallet page, select the asset you want to sell, and tap "Sell".',
            'security': 'Your wallet is secured by your 12-word recovery phrase. Never share this phrase with anyone. Noble Chain will never ask for your recovery phrase.',
            'phrase': 'Your 12-word recovery phrase is the key to your wallet. Write it down and store it securely. If you lose it, you may lose access to your funds.',
            'password': 'If you need to reset your password, please contact our support team. For security reasons, we cannot recover lost recovery phrases.',
            'transaction': 'You can view all your transactions in the Transactions page. Each transaction shows the type, amount, and timestamp.',
            'balance': 'Your total balance is displayed on the dashboard. It includes both your USD balance and the current value of all your assets.',
            'wallet': 'Your wallet contains all your assets. You can add new assets, buy, sell, or send them to other users.',
            'swap': 'To swap assets, go to the Swap page and select which assets you want to exchange.',
            'support': 'For additional support, you can email us at noblechainhelpdesk@gmail.com or continue chatting with me here.',
            'admin': 'If you need to speak with an administrator, please mention that in your message and one will assist you shortly.',
            'default': 'Thank you for contacting Noble Chain Support. I\'m here to help! Could you please provide more details about what you need assistance with?'
        };

        // Simple keyword matching
        const lowerMessage = userMessage.toLowerCase();
        for (const [key, response] of Object.entries(responses)) {
            if (lowerMessage.includes(key) || key === 'default') {
                return response;
            }
        }
        return responses['default'];
    }

    simulateAIResponse(userId) {
        setTimeout(() => {
            const userChats = this.getSupportChats(userId);
            const lastMessage = userChats.filter(chat => chat.senderType === 'user').pop();
            
            if (lastMessage) {
                const aiResponse = this.generateAIResponse(lastMessage.message);
                this.sendSupportMessage(aiResponse, false, 'ai');
                
                // Trigger UI update
                document.dispatchEvent(new CustomEvent('noblechain:support_update'));
            }
        }, 1000 + Math.random() * 1000); // 1-2 second delay
    }

    // ==================== ADMIN FUNCTIONS ====================

    getAllUsers() {
        return this.users;
    }

    getAllTransactions() {
        return this.transactions;
    }

    updateUserBalance(userId, assetId, newBalance) {
        const wallet = this.getWallet(userId);
        if (assetId === 'USD') {
            wallet.dollarBalance = newBalance;
        } else {
            if (!wallet.assets[assetId]) {
                wallet.assets[assetId] = { balance: 0, averageCost: 0 };
            }
            wallet.assets[assetId].balance = newBalance;
        }
        this.saveWallets();
    }

    syncUserWithAdminPanel(user) {
        // This ensures the user is properly registered in admin-accessible databases
        // Trigger admin panel update
        document.dispatchEvent(new CustomEvent('noblechain:admin_sync', { 
            detail: { userId: user.id, action: 'signup' } 
        }));
    }

    // ==================== UTILITY FUNCTIONS ====================

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    hashPassword(password) {
        // Simple hash for demo - use proper crypto in production
        return btoa(password).split('').reverse().join('');
    }

    formatCurrency(amount, decimals = 2) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(amount);
    }

    formatNumber(amount, decimals = 4) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(amount);
    }

    saveSession() {
        if (this.currentUser) {
            localStorage.setItem('noblechain_session', JSON.stringify({
                userId: this.currentUser.id,
                timestamp: Date.now()
            }));
        }
    }

    checkSession() {
        const session = localStorage.getItem('noblechain_session');
        if (session) {
            const data = JSON.parse(session);
            const user = this.users.find(u => u.id === data.userId);
            if (user && Date.now() - data.timestamp < 86400000) { // 24 hours
                this.currentUser = user;
                return true;
            }
        }
        return false;
    }

    updateUI() {
        // Trigger UI updates across components
        document.dispatchEvent(new CustomEvent('noblechain:update'));
    }

}

// Instantiate the app and expose it globally so UI pages can interact
try {
    if (!window.nobleChain || !(window.nobleChain instanceof NobleChain)) {
        window.nobleChain = new NobleChain();
    }
} catch (e) {
    console.error('Failed to initialize NobleChain app', e);
}

    // ==================== EMAIL NOTIFICATIONS ====================

    sendEmailNotification(userId, type, data) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const emailData = {
            to: user.email,
            from: 'noblechainhelpdesk@gmail.com',
            subject: this.getEmailSubject(type),
            body: this.getEmailBody(type, user.username, data),
            timestamp: Date.now()
        };

        // In a real implementation, this would send an actual email
        // For demo purposes, we'll log it and show a notification
        console.log('Email notification sent:', emailData);
        
        // Store email log for demo purposes
        const emailLogs = JSON.parse(localStorage.getItem('noblechain_email_logs') || '[]');
        emailLogs.push(emailData);
        
        // Keep only last 100 email logs
        if (emailLogs.length > 100) {
            emailLogs.splice(0, emailLogs.length - 100);
        }
        
        localStorage.setItem('noblechain_email_logs', JSON.stringify(emailLogs));
    }

    sendAdminNotification(type, data) {
        const adminEmail = 'noblechainhelpdesk@gmail.com';
        
        const emailData = {
            to: adminEmail,
            from: 'noblechainhelpdesk@gmail.com',
            subject: `Admin Alert: ${this.getEmailSubject(type)}`,
            body: this.getAdminEmailBody(type, data),
            timestamp: Date.now()
        };

        console.log('Admin notification sent:', emailData);
        
        // Store admin email log
        const adminEmailLogs = JSON.parse(localStorage.getItem('noblechain_admin_email_logs') || '[]');
        adminEmailLogs.push(emailData);
        
        if (adminEmailLogs.length > 50) {
            adminEmailLogs.splice(0, adminEmailLogs.length - 50);
        }
        
        localStorage.setItem('noblechain_admin_email_logs', JSON.stringify(adminEmailLogs));
    }

    getEmailSubject(type) {
        const subjects = {
            login_success: 'Successful Login to Noble Chain',
            new_device_login: 'New Device Login Detected',
            password_reset: 'Password Reset Request',
            transfer_sent: 'Transfer Sent Successfully',
            transfer_received: 'Transfer Received',
            pin_changed: 'Transfer PIN Changed',
            new_user: 'New User Registration'
        };
        return subjects[type] || 'Noble Chain Notification';
    }

    getEmailBody(type, username, data) {
        const bodies = {
            login_success: `Hello ${username},\n\nYou have successfully logged in to your Noble Chain account on ${new Date(data.timestamp).toLocaleString()}.\n\nDevice: ${data.deviceInfo}\n\nIf you did not initiate this login, please contact support immediately.\n\nBest regards,\nNoble Chain Security Team`,
            
       