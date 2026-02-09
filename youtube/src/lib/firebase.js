import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {getAuth,GoogleAuthProvider} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAapnnORDBx6sElt7V38Hzaep3I9ZJ46Sc",
  authDomain: "fir-aeaf3.firebaseapp.com",
  projectId: "fir-aeaf3",
  storageBucket: "fir-aeaf3.firebasestorage.app",
  messagingSenderId: "780782747004",
  appId: "1:780782747004:web:ab01f8741726f6e7d2b8f9",
  measurementId: "G-81EETN3KPH"
};

const app = initializeApp(firebaseConfig);
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
const auth=getAuth(app);
const provider=new GoogleAuthProvider(); 
export {auth,provider};