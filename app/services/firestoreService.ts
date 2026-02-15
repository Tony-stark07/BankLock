import { db, auth } from '../config/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';

export interface BudgetData {
  budget: number;
  transactions: any[];
  categoryLimits: Record<string, number>;
}

const getBudgetDocRef = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return doc(db, 'users', user.uid, 'budget', 'data');
};

export const saveBudgetToFirestore = async (budgetData: BudgetData) => {
  try {
    const docRef = getBudgetDocRef();
    await setDoc(docRef, budgetData, { merge: true });
  } catch (error) {
    console.error('Error saving budget:', error);
    throw error;
  }
};

export const loadBudgetFromFirestore = async (): Promise<BudgetData | null> => {
  try {
    const docRef = getBudgetDocRef();
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as BudgetData;
    }
    return null;
  } catch (error) {
    console.error('Error loading budget:', error);
    throw error;
  }
};

export const updateBudgetInFirestore = async (updates: Partial<BudgetData>) => {
  try {
    const docRef = getBudgetDocRef();
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating budget:', error);
    throw error;
  }
};
