---
title: "npm install firebase"
notebook: "InterStellar"
section_group: "1_Projects"
section: "Side hutle"
onenote_id: "0-b6c1705bc3f904fc2115cd5f14bb4228!1-733661839CC53BA5!scf9b552750a847af894915b8b52c0b2e"
---

npm install firebase
			

			

			

			
// Import the functions you need from the SDKs you need
			
import { initializeApp } from &quot;firebase/app&quot;;
			
import { getAnalytics } from &quot;firebase/analytics&quot;;
			
// TODO: Add SDKs for Firebase products that you want to use
			
// [https://firebase.google.com/docs/web/setup#available-libraries](https://firebase.google.com/docs/web/setup#available-libraries)
			

			
// Your web app&#39;s Firebase configuration
			
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
			
const firebaseConfig = {
			
  apiKey: &quot;AIzaSyBgcgpi-C92xzLqnyr5-fWkvxq8GasAQmE&quot;,
			
  authDomain: &quot;bubble-surfing.firebaseapp.com&quot;,
			
  projectId: &quot;bubble-surfing&quot;,
			
  storageBucket: &quot;bubble-surfing.firebasestorage.app&quot;,
			
  messagingSenderId: &quot;364721701850&quot;,
			
  appId: &quot;1:364721701850:web:b569750e9bdeb160e576e3&quot;,
			
  measurementId: &quot;G-VJ5K6L32VG&quot;
			
};
			

			
// Initialize Firebase
			
const app = initializeApp(firebaseConfig);
			
const analytics = getAnalytics(app);