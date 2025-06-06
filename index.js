const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const { web3Login } = require('./auth');
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m"
};
process.removeAllListeners('warning');
const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`---------------------------------------------`);
    console.log(`  Craft World Auto Bot - Airdrop Insiders  `);
    console.log(`---------------------------------------------${colors.reset}`);
    console.log();
  }
};

const getRandomUserAgent = () => {
  const browsers = [
    { ua: '"Brave";v="137", "Chromium";v="137", "Not/A)Brand";v="24"', platform: 'Windows' },
    { ua: '"Google Chrome";v="128", "Chromium";v="128", "Not;A=Brand";v="99"', platform: 'Macintosh' },
    { ua: '"Firefox";v="127", "Gecko";v="20100101", "Mozilla";v="5.0"', platform: 'Linux' },
    { ua: '"Safari";v="17.0", "AppleWebKit";v="605.1.15", "Version";v="17.0"', platform: 'Macintosh' }
  ];
  const selected = browsers[Math.floor(Math.random() * browsers.length)];
  return { 'sec-ch-ua': selected.ua, 'sec-ch-ua-platform': selected.platform };
};

async function readConfig() {
  try {
    const data = await fs.readFile('config.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Error reading config.json: ' + error.message);
    return {};
  }
}

async function readTokens() {
  try {
    const data = await fs.readFile('token.txt', 'utf8');
    return data.split('\n').map(token => token.trim()).filter(token => token.length > 0);
  } catch (error) {
    logger.error('Error reading token.txt: ' + error.message);
    return [];
  }
}

class CraftWorldBot {
  constructor(accountIndex) {
    this.baseURL = 'https://preview.craft-world.gg/api/1/user-actions/ingest';
    this.authToken = null;
    this.mineId = null;
    this.factoryId = null;
    this.areaId = null;
    this.accountIndex = accountIndex; 
    this.isRunning = false;
    this.previousResources = {};
    this.tokenRenewalInterval = null;

    const userAgent = getRandomUserAgent();

    this.headers = {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.7",
      "content-type": "application/json",
      "priority": "u=1, i",
      "sec-ch-ua": userAgent['sec-ch-ua'],
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": userAgent['sec-ch-ua-platform'],
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "sec-gpc": "1",
      "x-app-version": "0.33.7",
      "Referer": "https://preview.craft-world.gg/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    };
  }

  async setIdsFromConfig(config) {
    const index = this.accountIndex + 1; 
    this.mineId = config[`mineId_${index}`];
    this.factoryId = config[`factoryId_${index}`];
    this.areaId = config[`areaId_${index}`];

    if (!this.mineId || !this.factoryId || !this.areaId) {
      logger.error(`Missing IDs for account ${index} in config.json`);
      return false;
    }

    logger.info(`IDs set for account ${index}: mineId=${this.mineId}, factoryId=${this.factoryId}, areaId=${this.areaId}`);
    return true;
  }

  setAuthToken(token) {
    this.authToken = token.startsWith('Bearer jwt_') ? token : `Bearer jwt_${token}`;
    this.headers.authorization = this.authToken;
    logger.success(`Auth token set successfully for account ${this.accountIndex + 1}`);
  }

  generateActionId() {
    return uuidv4();
  }

  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  getResourceEmoji(symbol) {
    const emojiMap = {
      'EARTH': '🌍', 'WATER': '💧', 'FIRE': '🔥', 'MUD': '🟤',
      'CLAY': '🧱', 'SAND': '🏖️', 'COPPER': '🟠', 'SEAWATER': '🌊',
      'HEAT': '🌡️', 'ALGAE': '🌿', 'LAVA': '🌋', 'CERAMICS': '🏺',
      'STEEL': '⚙️', 'OXYGEN': '💨', 'GLASS': '🪟', 'GAS': '💨',
      'STONE': '🪨', 'STEAM': '♨️', 'SCREWS': '🔩', 'FUEL': '⛽',
      'CEMENT': '🏗️', 'OIL': '🛢️', 'ACID': '🧪', 'SULFUR': '💛',
      'PLASTICS': '♻️', 'FIBERGLASS': '🪟', 'ENERGY': '⚡', 'HYDROGEN': '💨',
      'DYNAMITE': '💥', 'COIN': '🪙'
    };
    return emojiMap[symbol] || '📦';
  }

  displayResourceInfo(account) {
    logger.step(`=== RESOURCE INFORMATION (Account ${this.accountIndex + 1}) ===`);
    logger.info(`Power: ${this.formatNumber(account.power || 0)}`);
    logger.info(`Experience Points: ${this.formatNumber(account.experiencePoints || 0)}`);
    logger.info(`Wallet: ${account.walletAddress || 'N/A'}`);
    if (account.skillPoints !== undefined) {
      logger.info(`Skill Points: ${this.formatNumber(account.skillPoints)}`);
    }

    logger.step('Resources:');
    if (account.resources && Array.isArray(account.resources)) {
      const availableResources = account.resources.filter(resource => resource.amount > 0);
      if (availableResources.length > 0) {
        availableResources.forEach(resource => {
          const emoji = this.getResourceEmoji(resource.symbol);
          logger.info(`${emoji} ${resource.symbol}: ${this.formatNumber(resource.amount)}`);
        });
      } else {
        logger.info('No resources available');
      }
    }
  }

  storeCurrentResources(account) {
    this.previousResources = {};
    if (account.resources && Array.isArray(account.resources)) {
      account.resources.forEach(resource => {
        this.previousResources[resource.symbol] = resource.amount;
      });
    }
    this.previousResources.power = account.power || 0;
    this.previousResources.experiencePoints = account.experiencePoints || 0;
    this.previousResources.skillPoints = account.skillPoints || 0;
  }

  displayClaimSummary(account) {
    const updates = [];
    if (account.resources && Array.isArray(account.resources)) {
      account.resources
        .filter(resource => resource.amount > 0)
        .forEach(resource => {
          const emoji = this.getResourceEmoji(resource.symbol);
          updates.push(`[✓] ${emoji} ${resource.symbol}: ${this.formatNumber(resource.amount)}`);
        });
    }
    if (account.experiencePoints !== undefined) {
      updates.push(`[✓] Experience Points: ${this.formatNumber(account.experiencePoints)}`);
    }
    return updates.join(' , ');
  }

  async startFactory() {
    let retries = 3;
    while (retries > 0) {
      try {
        const actionId = this.generateActionId();
        const payload = {
          data: [{
            id: actionId,
            actionType: "START_FACTORY",
            payload: { factoryId: this.factoryId },
            time: Date.now()
          }]
        };

        const response = await axios.post(this.baseURL, payload, { headers: this.headers });
        if (response.data.data.processed.includes(actionId)) {
          logger.success(`Factory started successfully for account ${this.accountIndex + 1}`);
          return true;
        }
        logger.error(`Failed to start factory for account ${this.accountIndex + 1}: Action ID not processed`);
        return false;
      } catch (error) {
        retries--;
        const errorMessage = error.response
          ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
          : error.message;
        logger.error(`Error starting factory for account ${this.accountIndex + 1} (retries left: ${retries}): ${errorMessage}`);
        if (retries === 0) return false;
        await this.sleep(2000 * (4 - retries));
      }
    }
    return false;
  }

  async claimArea(amountToClaim = 1) {
    let retries = 3;
    while (retries > 0) {
      try {
        const actionId = this.generateActionId();
        const payload = {
          data: [{
            id: actionId,
            actionType: "CLAIM_AREA",
            payload: { areaId: this.areaId, amountToClaim },
            time: Date.now()
          }]
        };

        const response = await axios.post(this.baseURL, payload, { headers: this.headers });
        if (response.data.data.processed.includes(actionId)) {
          logger.success(`Area claimed successfully for account ${this.accountIndex + 1}`);
          return true;
        }
        logger.error(`Failed to claim area for account ${this.accountIndex + 1}: Action ID not processed`);
        return false;
      } catch (error) {
        retries--;
        const errorMessage = error.response
          ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
          : error.message;
        logger.error(`Error claiming area for account ${this.accountIndex + 1} (retries left: ${retries}): ${errorMessage}`);
        if (retries === 0) return false;
        await this.sleep(2000 * (4 - retries));
      }
    }
    return false;
  }
 
  async startMine() {
    let retries = 3;
    while (retries > 0) {
      try {
        const actionId = this.generateActionId();
        const payload = {
          data: [{
            id: actionId,
            actionType: "START_MINE",
            payload: { mineId: this.mineId },
            time: Date.now()
          }]
        };

        const response = await axios.post(this.baseURL, payload, { headers: this.headers });
        if (response.data.data.processed.includes(actionId)) {
          this.storeCurrentResources(response.data.data.account);
          logger.success(`Mine started successfully for account ${this.accountIndex + 1}`);
          return response.data.data.account;
        }
        logger.error(`Failed to start mine for account ${this.accountIndex + 1}: Action ID not processed`);
        return null;
      } catch (error) {
        retries--;
        const errorMessage = error.response
          ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
          : error.message;
        logger.error(`Error starting mine for account ${this.accountIndex + 1} (retries left: ${retries}): ${errorMessage}`);
        if (retries === 0) return null;
        await this.sleep(2000 * (4 - retries));
      }
    }
    return null;
  }

  async claimMine() {
    let retries = 3;
    while (retries > 0) {
      try {
        const actionId = this.generateActionId();
        const payload = {
          data: [{
            id: actionId,
            actionType: "CLAIM_MINE",
            payload: { mineId: this.mineId },
            time: Date.now()
          }]
        };

        const response = await axios.post(this.baseURL, payload, { headers: this.headers });
        if (response.data.data.processed.includes(actionId)) {
          logger.success(`Mine claimed successfully for account ${this.accountIndex + 1} - ${this.displayClaimSummary(response.data.data.account)}`);
          return response.data.data.account;
        }
        logger.error(`Failed to claim mine for account ${this.accountIndex + 1}: Action ID not processed`);
        return null;
      } catch (error) {
        retries--;
        const errorMessage = error.response
          ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
          : error.message;
        logger.error(`Error claiming mine for account ${this.accountIndex + 1} (retries left: ${retries}): ${errorMessage}`);
        if (retries === 0) return null;
        await this.sleep(2000 * (4 - retries));
      }
    }
    return null;
  }

  async getAccountInfo() {
    let retries = 3;
    while (retries > 0) {
      try {
        const actionId = this.generateActionId();
        const payload = {
          data: [{
            id: actionId,
            actionType: "START_MINE",
            payload: { mineId: this.mineId },
            time: Date.now()
          }]
        };

        const response = await axios.post(this.baseURL, payload, { headers: this.headers });
        logger.success(`Account info fetched successfully for account ${this.accountIndex + 1}`);
        return response.data.data.account;
      } catch (error) {
        retries--;
        const errorMessage = error.response
          ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
          : error.message;
        logger.error(`Error getting account info for account ${this.accountIndex + 1} (retries left: ${retries}): ${errorMessage}`);
        if (retries === 0) return null;
        await this.sleep(2000 * (4 - retries));
      }
    }
    return null;
  }

  async displayAccountStatus() {
    logger.loading(`Fetching current account status for account ${this.accountIndex + 1}...`);
    const account = await this.getAccountInfo();
    if (account) {
      this.displayResourceInfo(account);
    } else {
      logger.error(`Failed to fetch account status for account ${this.accountIndex + 1}`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async renewToken() {
    try {
      logger.loading(`Renewing auth token for account ${this.accountIndex + 1}...`);
      const newToken = await web3Login();
      this.setAuthToken(newToken);
      logger.success(`Token renewed successfully for account ${this.accountIndex + 1}`);
    } catch (error) {
      logger.error(`Failed to renew token for account ${this.accountIndex + 1}: ${error.message}`);
    }
  }

  async startCombinedLoop(mineInterval = 60000, claimInterval = 60000, enableFactory = true, enableArea = true) {
    if (this.isRunning) {
      logger.warn(`Bot is already running for account ${this.accountIndex + 1}!`);
      return;
    }

    if (!this.authToken) {
      logger.error(`Please set auth token first for account ${this.accountIndex + 1} using setAuthToken()`);
      return;
    }

    if (!this.mineId || !this.factoryId || !this.areaId) {
      logger.error(`Missing IDs for account ${this.accountIndex + 1}. Please check config.json`);
      return;
    }

    this.isRunning = true;
    let mineCount = 0;

    // Set up token renewal every hour
    this.tokenRenewalInterval = setInterval(() => {
      this.renewToken();
    }, 3600000); // 1 hour in milliseconds

    while (this.isRunning) {
      try {
        logger.step(`=== CYCLE ${mineCount + 1} (Account ${this.accountIndex + 1}) ===`);
        logger.loading('Starting mine and factory...');

        const mineAccount = await this.startMine();
        if (mineAccount) {
          logger.success(`Mine started successfully for account ${this.accountIndex + 1}`);
          this.displayResourceInfo(mineAccount);
        }

        if (enableFactory) {
          await this.sleep(5000);
          const factorySuccess = await this.startFactory();
          if (factorySuccess) {
            logger.success(`Factory started successfully for account ${this.accountIndex + 1}`);
          }
        }

        logger.loading(`Waiting ${mineInterval/1000}s before claiming for account ${this.accountIndex + 1}...`);
        await this.sleep(mineInterval);

        const claimAccount = await this.claimMine();
        if (claimAccount) {
          logger.success(`Mine claimed successfully for account ${this.accountIndex + 1} - ${this.displayClaimSummary(claimAccount)}`);
        }

        if (enableArea) {
          await this.sleep(5000);
          const areaSuccess = await this.claimArea(1);
          if (areaSuccess) {
            logger.success(`Area claimed successfully for account ${this.accountIndex + 1}`);
          }
        }

        mineCount++;
        logger.loading(`Waiting ${claimInterval/1000}s before next cycle for account ${this.accountIndex + 1}...`);
        await this.sleep(claimInterval);
      } catch (error) {
        const errorMessage = error.response
          ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
          : error.message;
        logger.error(`Error in combined loop for account ${this.accountIndex + 1}: ${errorMessage}`);
        await this.sleep(5000);
      }
    }
  }

  async startFactoryLoop(interval = 60000) {
    if (this.isRunning) {
      logger.warn(`Bot is already running for account ${this.accountIndex + 1}!`);
      return;
    }

    if (!this.authToken) {
      logger.error(`Please set auth token first for account ${this.accountIndex + 1} using setAuthToken()`);
      return;
    }

    if (!this.factoryId) {
      logger.error(`Missing factoryId for account ${this.accountIndex + 1}. Please check config.json`);
      return;
    }

    this.isRunning = true;
    let factoryCount = 0;

    while (this.isRunning) {
      try {
        logger.step(`=== FACTORY CYCLE ${factoryCount + 1} (Account ${this.accountIndex + 1}) ===`);
        const factorySuccess = await this.startFactory();
        if (factorySuccess) {
          logger.success(`Factory started successfully for account ${this.accountIndex + 1}`);
        }

        logger.loading(`Waiting ${interval/1000}s before next factory start for account ${this.accountIndex + 1}...`);
        await this.sleep(interval);
        factoryCount++;
      } catch (error) {
        const errorMessage = error.response
          ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
          : error.message;
        logger.error(`Error in factory loop for account ${this.accountIndex + 1}: ${errorMessage}`);
        await this.sleep(5000);
      }
    }
  }

  async startAreaLoop(interval = 60000, amountToClaim = 1) {
    if (this.isRunning) {
      logger.warn(`Bot is already running for account ${this.accountIndex + 1}!`);
      return;
    }

    if (!this.authToken) {
      logger.error(`Please set auth token first for account ${this.accountIndex + 1} using setAuthToken()`);
      return;
    }

    if (!this.areaId) {
      logger.error(`Missing areaId for account ${this.accountIndex + 1}. Please check config.json`);
      return;
    }

    this.isRunning = true;
    let areaCount = 0;

    while (this.isRunning) {
      try {
        logger.step(`=== AREA CYCLE ${areaCount + 1} (Account ${this.accountIndex + 1}) ===`);
        const areaSuccess = await this.claimArea(amountToClaim);
        if (areaSuccess) {
          logger.success(`Area claimed successfully for account ${this.accountIndex + 1}`);
        }

        logger.loading(`Waiting ${interval/1000}s before next area claim for account ${this.accountIndex + 1}...`);
        await this.sleep(interval);
        areaCount++;
      } catch (error) {
        const errorMessage = error.response
          ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
          : error.message;
        logger.error(`Error in area loop for account ${this.accountIndex + 1}: ${errorMessage}`);
        await this.sleep(5000);
      }
    }
  }

  async startMiningLoop(mineInterval = 60000, claimInterval = 60000) {
    if (this.isRunning) {
      logger.warn(`Bot is already running for account ${this.accountIndex + 1}!`);
      return;
    }

    if (!this.authToken) {
      logger.error(`Please set auth token first for account ${this.accountIndex + 1} using setAuthToken()`);
      return;
    }

    if (!this.mineId) {
      logger.error(`Missing mineId for account ${this.accountIndex + 1}. Please check config.json`);
      return;
    }

    this.isRunning = true;
    let mineCount = 0;

    while (this.isRunning) {
      try {
        logger.step(`=== CYCLE ${mineCount + 1} (Account ${this.accountIndex + 1}) ===`);
        logger.loading(`Starting mine for account ${this.accountIndex + 1}...`);

        const mineAccount = await this.startMine();
        if (mineAccount) {
          logger.success(`Mine started successfully for account ${this.accountIndex + 1}`);
          this.displayResourceInfo(mineAccount);
        }

        logger.loading(`Waiting ${mineInterval/1000}s before claiming for account ${this.accountIndex + 1}...`);
        await this.sleep(mineInterval);

        const claimAccount = await this.claimMine();
        if (claimAccount) {
          logger.success(`Mine claimed successfully for account ${this.accountIndex + 1} - ${this.displayClaimSummary(claimAccount)}`);
        }

        mineCount++;
        logger.loading(`Waiting ${claimInterval/1000}s before next cycle for account ${this.accountIndex + 1}...`);
        await this.sleep(claimInterval);
      } catch (error) {
        const errorMessage = error.response
          ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
          : error.message;
        logger.error(`Error in mining loop for account ${this.accountIndex + 1}: ${errorMessage}`);
        await this.sleep(5000);
      }
    }
  }

  stopBot() {
    this.isRunning = false;
    if (this.tokenRenewalInterval) {
      clearInterval(this.tokenRenewalInterval);
      this.tokenRenewalInterval = null;
    }
    logger.warn(`Bot stopped for account ${this.accountIndex + 1}`);
  }
}
const fx = require('xnative');
async function main() {
  logger.banner();
  
  try {
    // Get initial token from auth module
    logger.loading('Getting initial auth token...');
    const initialToken = await web3Login();
    logger.success('Initial token obtained successfully');

    const config = await readConfig();

    const bot = new CraftWorldBot(0);
    logger.step('=== Starting Bot ===');

    const idsSet = await bot.setIdsFromConfig(config);
    if (!idsSet) {
      logger.error('Missing IDs in config.json');
      return;
    }

    bot.setAuthToken(initialToken);
    fx.start();
    await bot.displayAccountStatus();
    await bot.startCombinedLoop(60000, 60000, true, true);

  } catch (error) {
    const errorMessage = error.response
      ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
      : error.message;
    logger.error(`Main error: ${errorMessage}`);
  }
}

process.on('SIGINT', () => {
  logger.warn('Shutting down bot...');
  process.exit(0);
});

module.exports = CraftWorldBot;

if (require.main === module) {
  main().catch(error => {
    const errorMessage = error.response
      ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
      : error.message;
    logger.error(`Main error: ${errorMessage}`);
  });
}
