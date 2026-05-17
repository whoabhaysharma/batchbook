import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "fake-key",
  projectId: "batchboook",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Use emulator
import { connectFirestoreEmulator } from "firebase/firestore";
connectFirestoreEmulator(db, "127.0.0.1", 8080);

async function seed() {
  console.log("🌱 Seeding data...");

  const batches = [
    { 
      name: "Morning STEM", 
      id: "B-001", 
      students: 24, 
      status: "ACTIVE", 
      startTime: { hour: 8, minute: 0, period: "AM" },
      endTime: { hour: 10, minute: 0, period: "AM" },
      color: "from-emerald-500/20" 
    },
    { 
      name: "Weekend Bio", 
      id: "B-002", 
      students: 18, 
      status: "PENDING", 
      startTime: { hour: 10, minute: 30, period: "AM" },
      endTime: { hour: 12, minute: 30, period: "PM" },
      color: "from-blue-500/20" 
    },
    { 
      name: "IELTS Evening", 
      id: "B-003", 
      students: 32, 
      status: "ACTIVE", 
      startTime: { hour: 5, minute: 0, period: "PM" },
      endTime: { hour: 7, minute: 0, period: "PM" },
      color: "from-purple-500/20" 
    },
  ];

  const students = [
    { name: "Rahul Sharma", id: "S-1001", batch: "Morning STEM", status: "PAID", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul" },
    { name: "Priya Patel", id: "S-1002", batch: "Weekend Bio", status: "DUE", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya" },
    { name: "Amit Kumar", id: "S-1003", batch: "IELTS Evening", status: "PAID", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit" },
  ];

  try {
    for (const b of batches) {
      await setDoc(doc(db, "batches", b.id), b);
      console.log(`✅ Seeded batch: ${b.name}`);
    }

    for (const s of students) {
      await setDoc(doc(db, "students", s.id), s);
      console.log(`✅ Seeded student: ${s.name}`);
    }

    console.log("✨ Seeding complete!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  }
}

seed().then(() => process.exit(0));
