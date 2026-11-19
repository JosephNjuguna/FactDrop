# 💡 FactDrop

Discover random facts, like the ones you love, and join the conversation. FactDrop is a React web app that pulls facts from the [FactFacts API](https://factfacts.com/api/), lets signed-in users save their favourites, and shows what's trending across the community.

## Links

- **GitHub Repo:**  
https://github.com/JosephNjuguna/FactDrop
- **Kanban Board:**  
https://github.com/users/JosephNjuguna/projects/8
- **Figma Prototype:** [Live prototype](https://www.figma.com/proto/9ih6mpfsDjutNFlX7ru2vz/FactDrop?node-id=6-2&t=WSWxJ4Rgvnx4javY-0&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=6%3A2)
- **Figma Design:**  [UI design files](https://www.figma.com/design/9ih6mpfsDjutNFlX7ru2vz/FactDrop?node-id=0-1&t=WSWxJ4Rgvnx4javY-1)

## Features

- Sign up and log in with email/password or GitHub
- **Facts For You:** random facts from the FactFacts API
- **Trending Facts:** community favourites, with a banner when there's nothing trending yet
- **Liked Facts:** your saved facts, with a banner when you haven't liked any yet
- **Account Stats:** your activity at a glance, plus a logout button that redirects you out

## Tech Stack

React (Vite) · Tailwind CSS · Firebase Auth & Firestore · FactFacts API

## Getting Started

```bash
git clone https://github.com/JosephNjuguna/FactDrop.git
cd FactDrop
npm install
npm run dev
```

Create a `.env` file with your Firebase keys:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Project Roadmap

Tracked on the [Kanban board](https://github.com/users/JosephNjuguna/projects/8):

- [ ] Set up React with Vite (`npm create vite@latest`)
- [ ] Install and configure Tailwind CSS
- [ ] Create sign-up page
- [ ] Create log-in page
- [ ] Set up and connect Firebase
- [ ] Implement GitHub authentication
- [ ] Implement email/password authentication
- [ ] Fetch and display data from the FactFacts API
- [ ] Build the Facts For You page
- [ ] Build Trending Facts, with an empty-state banner
- [ ] Build Liked Facts, with an empty-state banner
- [ ] Build Account Stats page and logout redirect

## Author

**Joseph Njuguna** · [@JosephNjuguna](https://github.com/JosephNjuguna)