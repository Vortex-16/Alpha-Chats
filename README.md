# 💬 Alpha-Chats

<div align="center">

![Alpha-Chats Logo](./gitHubAssests/Chat.png)

[![React](https://img.shields.io/badge/React-19.1.0-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-black.svg)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green.svg)](https://mongodb.com/)

**🚀 Real-time chat application built exclusively for developers**

*Where code meets conversation*

[**📖 Complete Documentation**](./DOCUMENTATION.txt) • [**🖥️ Live Demo**](#) • [**🐛 Report Bug**](#)

</div>

---

## ✨ What Makes It Special

🎯 **Developer-First Design** - Terminal-inspired UI that feels like home  
⚡ **Real-Time Everything** - Instant messaging with typing indicators  
🔥 **Code Syntax Highlighting** - Support for 15+ programming languages  
🛡️ **Production Ready** - JWT auth, bcrypt hashing, CORS protection  
📱 **Mobile Responsive** - Beautiful on desktop, tablet, and mobile  

---

## 🛠️ Tech Stack

### Frontend
**React 19** • **Redux Toolkit** • **Socket.IO Client** • **Tailwind CSS** • **Vite**

### Backend  
**Node.js** • **Express** • **Socket.IO** • **MongoDB** • **JWT** • **Cloudinary**

---

## 📊 Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│   Frontend      │◄──►│   Backend API    │◄──►│   Database      │
│   (React)       │    │   (Express)      │    │   (MongoDB)     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────────────┐               │
         └──────────────►│   Socket.IO    │◄──────────────┘
                         │   Real-time    │
                         │   Connection   │
                         └────────────────┘
                                 │
                    ┌─────────────────────────┐
                    │   Live Features:        │
                    │   • Instant Messages    │
                    │   • Typing Indicators   │
                    │   • Online Presence     │
                    │   • File Sharing        │
                    └─────────────────────────┘
```

---

## 🚀 Quick Start

```bash
# Clone & Install
git clone https://github.com/your-username/alpha-chats.git
cd alpha-chats
npm run install:all

# Set Environment Variables (see DOCUMENTATION.txt)
# Backend: MongoDB URL, JWT Secret, Cloudinary Config
# Frontend: API URLs

# Run Development
npm run dev
```

**🌐 Open:** `http://localhost:5173`

---

## 🌟 Core Features

- **💬 Real-time Messaging** - Socket.IO powered instant chat
- **👥 Online Presence** - See who's active right now  
- **⌨️ Typing Indicators** - Live typing feedback
- **🎨 Code Highlighting** - JavaScript, Python, Java, C++, and more
- **📁 File Sharing** - Images and documents via Cloudinary
- **🔐 Secure Auth** - JWT tokens with bcrypt password hashing
- **📱 Mobile First** - Responsive design for all devices
- **🌙 Dark Theme** - Easy on developer eyes

---

## 📖 Need More Details?

**👉 Check out [DOCUMENTATION.txt](./DOCUMENTATION.txt) for:**
- Complete setup guide
- API documentation  
- Deployment options
- Architecture deep-dive
- Security features
- Performance optimizations

---

## 🚀 Deployment

**⚠️ Socket.IO requires persistent connections** 

**Recommended:** Railway (backend) + Vercel (frontend)  
**Alternative:** Render + Vercel  
**Limited:** Vercel only (loses real-time features)

*See [DOCUMENTATION.txt](https://github.com/vikashgupta16/Alpha-Chats/blob/main/Alpha-Chats%20Complete%20Documentation.txt) for detailed deployment guides.*

---

## 🤝 Contributing

Found a bug? Have a feature idea? Contributions welcome!

1. Fork the repo
2. Create your feature branch  
3. Submit a pull request

---

<div align="center">

**Built with ❤️ by Vikash (Team Lead)**

[![Stars](https://img.shields.io/github/stars/your-username/alpha-chats?style=social)](https://github.com/your-username/alpha-chats)

*⭐ Star this repo if you find it useful!*

</div>


*Used Ai For Some Part Of The Frontend 