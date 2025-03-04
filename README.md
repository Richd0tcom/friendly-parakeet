# friendly-parakeet 

# System Design: Flash Sale System

## 🚀 Project Overview

This is a scalable, high-performance flash sale system designed to handle concurrent user purchases with real-time inventory tracking, built using Node.js, TypeScript, MongoDB, and Redis.

## 🏗️ System Architecture

### Architectural Diagram

![diagram-export-04-03-2025-13_55_18](https://github.com/user-attachments/assets/717ea533-262b-46f2-9f39-0c128245463f)

### Key Architecture Components
- API Gateway
- Flash Sale Microservice
- Real-time WebSocket Notification Service
- Distributed Caching Layer
- Transactional NoSQL Database

## 📊 Tech Stack

### Backend
- **Language**: TypeScript
- **Runtime**: Node.js
- **Web Framework**: Express.js
- **WebSocket**: Socket.IO

### Database
- **Primary Database**: MongoDB
- **Caching Layer**: Redis

### Additional Technologies
- **ORM**: Mongoose
- **Concurrency Management**: Redis Transactions
- **Real-time Communication**: WebSockets

## ✨ Features

- Concurrent user purchase handling
- Real-time inventory tracking/live updates
- Distributed caching
- Race condition prevention
- Leaderboard functionality

## 🛠️ Prerequisites

- Node.js (v16+ recommended)
- With Docker:
  - Docker
  - Docker Compose
- Without Docker 
  - MongoDB (v4.4+) with a replica set (at least one node)
  - Redis (v6+)
  - npm or yarn

## 🔧 Installation

1. Clone the repository
```bash
git clone https://github.com/richd0tcom/friendly-parakeet.git
cd friendly-parakeet
```
### WITHOUT DOCKER
2. Install dependencies
```bash
npm install
```

3. Create a `.env` file with the following configurations:
```
MONGODB_URI=mongodb://localhost:27017/flash-sale?rs0
REDIS_URI=redis://localhost:6379
PORT=3021
JWT_SECRET=cia_level_secret
```
### WITH DOCKER
if you are using docker the enviroments will be setup for you. ensure that nothing else is running on the same port

2. Run
```bash
docker-compose up
```

This will spin up all the services needed as well as their enviroments

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## 🧪 Testing

Before Testing, ensure you have created at least one Product, Inventory and Sale as well as starting said sale.

The test script only simulates user `purchases` under high traffic conditions.

Remember to replace the id in the test script with that of the sale you just created.

N/B the test script may crash while creating users initially (for reasons I'm too lazy to debug ). If this happens, simple run the test again.

To rerun finished tests, restart the sale or create another one.
### Running Tests
```bash
# Run load test
npm run test-race 
 # production enviroment after building and starting
```

```bash
npm run dev-test
 # development enviroment without building
```


### Load Testing Scenarios
- Concurrent user purchases
- Inventory accuracy verification
- Race condition handling

## 📋 Postman/API Documentation

[API Endpoint Documentation](https://documenter.getpostman.com/view/22009828/2sAYdkGTk9)

## 🔍 Performance Considerations

- Atomic Redis operations for inventory management
- Distributed caching
- WebSocket for real-time updates
- Horizontal scalability design

## 📦 Deployment
    


## 🚧 TODO List

### Short-term Improvements
- [ ] Implement comprehensive error logging
- [ ] Enhance security middleware
- [x] Create Dockerfiles

### Long-term Roadmap
- [ ] Machine learning-based fraud detection
- [ ] Enhanced rate limiting

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Contact

Name - [Richdotcom](mailto:tuberich@gmail.com)

Project Link: [https://github.com/richd0tcom/friendly-parakeet](https://github.com/richd0tcom/friendly-parakeet)

## 🙏 Acknowledgements

- My PC for not dying on me
