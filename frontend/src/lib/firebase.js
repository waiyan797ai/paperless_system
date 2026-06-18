import { initializeApp } from "firebase/app"
import { getMessaging, getToken, onMessage } from "firebase/messaging"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAzZHNuCFbfIq-LThqsjCbiaePO_xyqe88",
  authDomain: "paperless-f0bd4.firebaseapp.com",
  projectId: "paperless-f0bd4",
  storageBucket: "paperless-f0bd4.firebasestorage.app",
  messagingSenderId: "523144802472",
  appId: "1:523144802472:web:fd4f7c9d122da9ab7a129d",
  measurementId: "G-TNNMJ2E90W"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(app)

// Request notification permission and get token
export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'J-fYnvQewGYL8Q4pMk1vM50Va94dhcYKPnP0757hbI4'
      })
      
      // Save token to user profile
      if (token) {
        try {
          const api = (await import('./api')).default
          await api.post('/auth/fcm-token', { fcm_token: token })
        } catch (error) {
          console.error('Failed to save FCM token:', error)
        }
      }
      
      return token
    } else {
      console.log('Notification permission denied')
      return null
    }
  } catch (error) {
    console.error('Error getting notification permission:', error)
    return null
  }
}

// Handle foreground messages
export function onForegroundMessage(callback) {
  onMessage(messaging, (payload) => {
    console.log('Received foreground message:', payload)
    callback(payload)
  })
}

export { app, messaging }
