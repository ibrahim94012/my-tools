/* ============================================================
   firebase-config.js
   এখানে আপনার Firebase প্রজেক্টের config বসান।
   Firebase Console → Project Settings → General → Your apps → SDK setup
   থেকে এই মানগুলো কপি করে নিচে বসিয়ে দিন।
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyBth3rO-sl9UHUfXYr0S82OjUySiAwcB0U",
  authDomain: "mytools-572f1.firebaseapp.com",
  databaseURL: "https://mytools-572f1-default-rtdb.firebaseio.com",
  projectId: "mytools-572f1",
  storageBucket: "mytools-572f1.firebasestorage.app",
  messagingSenderId: "187745737891",
  appId: "1:187745737891:web:24878feeb96f22f5e23316",
  measurementId: "G-P5W99L29BG"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();
const googleProvider = new firebase.auth.GoogleAuthProvider();
