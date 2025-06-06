# Craft World Auto Bot 🎮

An automated bot for Craft World game that handles mining, factory operations, and area claiming with multi-account support.

> This script is an updated version of the [original Craft World Auto Bot](https://github.com/vikitoshi/Craft-World-Auto-Bot.git) with Web3 authentication support.

## Features ✨

- **Automated Mining**: Start and claim mines automatically
- **Factory Operations**: Automated factory management
- **Area Claiming**: Auto-claim areas for expansion
- **Multi-Account Support**: Process multiple accounts sequentially
- **Web3 Authentication**: Automatic authentication using your wallet's private key

## Installation 🚀

1. **Clone the repository**
   ```bash
   git clone https://github.com/bazelbubx/Craft-World-Auto-Bot.git
   cd Craft-World-Auto-Bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create configuration files**
   ```bash
   touch pk.txt
   touch config.json
   ```

4. **Add your private key**
   Open `pk.txt` and add your wallet's private key:
   ```
   your_wallet_private_key
   ```
   > ⚠️ **IMPORTANT**: Never share your private key with anyone and keep it secure!

5. **Configure account IDs**
   Create `config.json` with your mine, factory, and area IDs:
   ```json
   {
     "mineId_1": "your_mine_id",
     "factoryId_1": "your_factory_id",
     "areaId_1": "your_area_id",
     "mineId_2": "your_mine_id",
     "factoryId_2": "your_factory_id",
     "areaId_2": "your_area_id",
     
   }
   ```

## Usage 💻

### Quick Start
```bash
node index.js
```

## Getting Required IDs 🔍

You need to obtain three types of IDs: Mine ID, Factory ID, and Area ID.

### Step-by-Step Tutorial:

1. **Open Craft World Game**
   - Go to [https://preview.craft-world.gg/](https://preview.craft-world.gg/)
   - Connect your wallet

2. **Open Developer Tools**
   - Press `F12` or right-click and select "Inspect Element"
   - Go to the **Network** tab
   - Make sure to check "Preserve log" option

3. **Get Mine ID**
   - In the game, click on any mine to start mining
   - In the Network tab, look for requests to `user-actions/ingest`
   - Click on the request and check the **Request Payload**
   - Look for `"actionType": "START_MINE"` and copy the `mineId` value
   
   ![Mine ID Location](https://github.com/bazelbubx/Craft-World-Auto-Bot/blob/main/1.PNG?raw=true)
   
4. **Get Factory ID**
   - Click on any factory in the game to start production
   - In the Network tab, find the request with `"actionType": "START_FACTORY"`
   - Copy the `factoryId` value from the payload
   
   ![Factory ID Location](https://github.com/bazelbubx/Craft-World-Auto-Bot/blob/main/2.PNG?raw=true)

5. **Get Area ID**
   - Click on any area to claim it
   - Look for requests with `"actionType": "CLAIM_AREA"`
   - Copy the `areaId` value from the payload
   
   ![Area ID Location](https://github.com/bazelbubx/Craft-World-Auto-Bot/blob/main/3.PNG?raw=true)

### Example Network Request:
```json
{
  "data": [{
    "id": "uuid-here",
    "actionType": "START_MINE",
    "payload": {
      "mineId": "06838ec6-e293-774b-8000-147fc35bd45c"
    },
    "time": 1234567890
  }]
}
```

### Config.json Example:
```json
{
  "mineId": "06838ec6-e293-774b-8000-147fc35bd45c",
  "factoryId": "0683ec42-e189-7374-8000-16987dc1e875",
  "areaId": "0683ec38-f7cf-7142-8000-94f87f155e4c"
}
```

## File Structure 📁

```
Craft-World-Auto-Bot/
├── index.js          # Main bot script
├── auth.js           # Web3 authentication module
├── pk.txt            # Your wallet's private key
├── config.json       # Game IDs configuration
├── package.json      # Node.js dependencies
├── README.md         # This file
└── .gitignore        # Git ignore rules
```

## Security Notes 🔒

- ⚠️ **NEVER share your private key**
- 🔐 Keep your `pk.txt` and `config.json` files secure and private
- 🚫 Don't commit private keys or sensitive IDs to version control
- 🔒 Store your private key securely

## Troubleshooting 🔧

### Common Issues

1. **"No private key found in pk.txt"**
   - Make sure `pk.txt` exists in the project directory
   - Ensure private key is properly formatted
   - Check that the private key doesn't have extra spaces

2. **"Missing IDs in config.json"**
   - Make sure `config.json` exists and is properly formatted
   - Verify you have all required IDs: `mineId`, `factoryId`, and `areaId`
   - Check that the JSON syntax is correct

3. **"Error: ENOTFOUND preview.craft-world.gg"**
   - Check your internet connection
   - Verify the game servers are online

4. **"Failed to start mine/factory/claim area"**
   - Check if your account has sufficient resources
   - Verify that your IDs are correct
   - Ensure your wallet has enough funds for transactions

5. **Bot stops unexpectedly**
   - Check console for error messages
   - Ensure stable internet connection
   - Verify your private key is correct

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Disclaimer ⚠️

This bot is for educational purposes only. Use at your own risk. The developers are not responsible for any account suspensions or other consequences resulting from the use of this bot.

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support 💬

If you find this project helpful, please give it a ⭐ on GitHub!

For issues and questions, please open an issue in the GitHub repository.

---

**Happy Botting!** 🎮✨
