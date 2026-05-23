---
title: "npm install firebase"
created: 2026-01-28T08:44:16.783Z
modified: 2026-01-28T08:44:16.783Z
source: onenote
notebook: "InterStellar"
section: "Side hutle"
---

npm install firebase

  
  
  

// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";

import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use

// <https://firebase.google.com/docs/web/setup#available-libraries>

  

// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {

apiKey: "AIzaSyBgcgpi-C92xzLqnyr5-fWkvxq8GasAQmE",

authDomain: "bubble-surfing.firebaseapp.com",

projectId: "bubble-surfing",

storageBucket: "bubble-surfing.firebasestorage.app",

messagingSenderId: "364721701850",

appId: "1:364721701850:web:b569750e9bdeb160e576e3",

measurementId: "G-VJ5K6L32VG"

};

  

// Initialize Firebase

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);