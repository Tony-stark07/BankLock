import { Image } from 'expo-image';
import { useState, useEffect } from 'react';
import {
  Alert,
  Button,
  StyleSheet,
  TextInput,
  FlatList,
  Modal,
  Pressable,
  View,
  Text,
  ScrollView,
  Animated,
} from 'react-native';

import { HelloWave } from './components/hello-wave';
import ParallaxScrollView from './components/parallax-scroll-view';
import { ThemedText } from './components/themed-text';
import { ThemedView } from './components/themed-view';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

const ALLOWED_OVER_BUDGET_CATEGORIES = ['Health', 'Medical', 'Emergency', 'Essential'];

export default function HomeScreen() {
  const [budget, setBudget] = useState<number | null>(null);
  const [setupModalVisible, setSetupModalVisible] = useState(true);
  const [budgetInput, setBudgetInput] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [descriptionInput, setDescriptionInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Other');
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [budgetExceededShown, setBudgetExceededShown] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<Transaction | null>(null);

  const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0);
  const remaining = budget ? budget - totalSpending : 0;
  const percentageUsed = budget ? (totalSpending / budget) * 100 : 0;

  // Check if budget is exceeded
  useEffect(() => {
    if (budget && totalSpending >= budget && !budgetExceededShown) {
      setBudgetExceededShown(true);
      Alert.alert(
        '⚠️ Budget Limit Reached!',
        `You've reached your budget limit of $${budget}. Current spending: $${totalSpending.toFixed(2)}`,
        [{ text: 'OK', style: 'destructive' }]
      );
    } else if (totalSpending < budget!) {
      setBudgetExceededShown(false);
    }
  }, [totalSpending, budget, budgetExceededShown]);

  const handleSetBudget = () => {
    const budgetAmount = parseFloat(budgetInput);
    if (!isNaN(budgetAmount) && budgetAmount > 0) {
      setBudget(budgetAmount);
      setSetupModalVisible(false);
      setBudgetInput('');
    } else {
      Alert.alert('Invalid Input', 'Please enter a valid budget amount');
    }
  };

  const handleAddTransaction = () => {
    const amount = parseFloat(amountInput);
    if (!descriptionInput.trim() || isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid description and amount');
      return;
    }

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      description: descriptionInput,
      amount,
      category: selectedCategory,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const totalAfterTransaction = totalSpending + amount;
    const willExceedBudget = totalAfterTransaction > budget!;

    if (willExceedBudget && ALLOWED_OVER_BUDGET_CATEGORIES.includes(selectedCategory)) {
      // Show confirmation alert for allowed categories
      setPendingTransaction(newTransaction);
      Alert.alert(
        '⚠️ Budget Alert',
        `This ${selectedCategory} expense of $${amount.toFixed(2)} will exceed your budget by $${(totalAfterTransaction - budget!).toFixed(2)}. Are you sure you want to proceed?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setPendingTransaction(null) },
          { 
            text: 'Yes, Proceed', 
            style: 'destructive', 
            onPress: () => {
              if (pendingTransaction) {
                setTransactions([newTransaction, ...transactions]);
                setDescriptionInput('');
                setAmountInput('');
                setSelectedCategory('Other');
                setPendingTransaction(null);
              }
            }
          },
        ]
      );
    } else if (willExceedBudget) {
      // Block non-allowed categories from exceeding budget
      Alert.alert(
        '❌ Budget Exceeded',
        `You cannot add this expense. It would exceed your budget. You have $${remaining.toFixed(2)} remaining.`,
        [{ text: 'OK', style: 'default' }]
      );
    } else {
      // Proceed normally if under budget
      setTransactions([newTransaction, ...transactions]);
      setDescriptionInput('');
      setAmountInput('');
      setSelectedCategory('Other');
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  if (budget === null) {
    return (
      <Modal visible={setupModalVisible} transparent animationType="fade">
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <ThemedText type="title" style={styles.modalTitle}>
              💰 Budget Setup
            </ThemedText>
            <ThemedText style={styles.modalSubtitle}>
              Set your spending budget
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Enter your budget (e.g., 500)"
              keyboardType="decimal-pad"
              value={budgetInput}
              onChangeText={setBudgetInput}
              placeholderTextColor="#999"
            />
            <Pressable
              style={styles.setupButton}
              onPress={handleSetBudget}
            >
              <Text style={styles.setupButtonText}>Set Budget</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('../assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Budget Tracker 💰</ThemedText>
        <HelloWave />
      </ThemedView>

      {/* Budget Summary Card */}
      <ThemedView style={styles.summaryCard}>
        <View style={styles.budgetHeader}>
          <ThemedText type="subtitle" style={{ color: '#000' }}>Budget Overview</ThemedText>
          <Pressable
            onPress={() => {
              setBudget(null);
              setSetupModalVisible(true);
              setTransactions([]);
            }}
          >
            <ThemedText style={styles.editBudgetText}>Edit</ThemedText>
          </Pressable>
        </View>

        <View style={styles.amountRow}>
          <View>
            <ThemedText style={[styles.label, { color: '#000' }]}>Budget:</ThemedText>
            <ThemedText style={styles.largeAmount}>${budget.toFixed(2)}</ThemedText>
          </View>
          <View style={styles.divider} />
          <View>
            <ThemedText style={[styles.label, { color: '#000' }]}>Spent:</ThemedText>
            <ThemedText
              style={[
                styles.largeAmount,
                { color: totalSpending >= budget ? '#FF6B6B' : '#4CAF50' },
              ]}
            >
              ${totalSpending.toFixed(2)}
            </ThemedText>
          </View>
          <View style={styles.divider} />
          <View>
            <ThemedText style={[styles.label, { color: '#000' }]}>Remaining:</ThemedText>
            <ThemedText
              style={[
                styles.largeAmount,
                { color: remaining > 0 ? '#4CAF50' : '#FF6B6B' },
              ]}
            >
              ${remaining.toFixed(2)}
            </ThemedText>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(percentageUsed, 100)}%`,
                backgroundColor: percentageUsed >= 100 ? '#FF6B6B' : percentageUsed >= 75 ? '#FFA500' : '#4CAF50',
              },
            ]}
          />
        </View>
        <ThemedText style={styles.progressText}>
          {percentageUsed.toFixed(0)}% of budget used
        </ThemedText>
      </ThemedView>

      {/* Add Transaction */}
      <ThemedView style={styles.addTransactionCard}>
        <ThemedText type="subtitle" style={[styles.addTransactionTitle, { color: '#000' }]}>
          Add Expense
        </ThemedText>
        <TextInput
          style={styles.input}
          placeholder="What did you spend on?"
          value={descriptionInput}
          onChangeText={setDescriptionInput}
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Amount"
          keyboardType="decimal-pad"
          value={amountInput}
          onChangeText={setAmountInput}
          placeholderTextColor="#999"
        />
        
        {/* Category Picker */}
        <Pressable 
          style={styles.categoryButton}
          onPress={() => setCategoryPickerVisible(!categoryPickerVisible)}
        >
          <ThemedText style={styles.categoryButtonText}>
            Category: {selectedCategory}
          </ThemedText>
        </Pressable>

        {categoryPickerVisible && (
          <View style={styles.categoryGrid}>
            {['Health', 'Medical', 'Emergency', 'Essential', 'Groceries', 'Entertainment', 'Transport', 'Other'].map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.categoryOption,
                  selectedCategory === cat && styles.categoryOptionSelected,
                ]}
                onPress={() => {
                  setSelectedCategory(cat);
                  setCategoryPickerVisible(false);
                }}
              >
                <ThemedText
                  style={[
                    styles.categoryOptionText,
                    selectedCategory === cat && styles.categoryOptionTextSelected,
                  ]}
                >
                  {cat}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        <Pressable style={styles.addButton} onPress={handleAddTransaction}>
          <Text style={styles.addButtonText}>+ Add Expense</Text>
        </Pressable>
      </ThemedView>

      {/* Transactions List */}
      {transactions.length > 0 && (
        <ThemedView style={styles.transactionsCard}>
          <ThemedText type="subtitle" style={[styles.transactionsTitle, { color: '#000' }]}>
            Recent Expenses
          </ThemedText>
          <FlatList
            data={transactions}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.transactionItem}>
                <View style={styles.transactionInfo}>
                  <View style={styles.transactionHeader}>
                    <ThemedText style={[styles.transactionDescription, { color: '#000' }]}>
                      {item.description}
                    </ThemedText>
                    <View 
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor: ALLOWED_OVER_BUDGET_CATEGORIES.includes(item.category)
                            ? '#E8F5E9'
                            : '#F5F5F5',
                        },
                      ]}
                    >
                      <ThemedText 
                        style={[
                          styles.categoryBadgeText,
                          {
                            color: ALLOWED_OVER_BUDGET_CATEGORIES.includes(item.category)
                              ? '#2E7D32'
                              : '#666',
                          },
                        ]}
                      >
                        {item.category}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.transactionDate}>
                    {item.date}
                  </ThemedText>
                </View>
                <View style={styles.transactionAmount}>
                  <ThemedText style={styles.transactionAmountText}>
                    -${item.amount.toFixed(2)}
                  </ThemedText>
                  <Pressable
                    onPress={() => handleDeleteTransaction(item.id)}
                    style={styles.deleteButton}
                  >
                    <ThemedText style={styles.deleteButtonText}>✕</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </ThemedView>
      )}

      {transactions.length === 0 && budget && (
        <ThemedView style={styles.emptyState}>
          <ThemedText style={styles.emptyStateText}>
            No expenses yet. Start tracking! 📝
          </ThemedText>
        </ThemedView>
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  setupButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    width: '100%',
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  editBudgetText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  divider: {
    width: 1,
    backgroundColor: '#ddd',
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  largeAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressContainer: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
    transition: 'all 0.3s ease',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  addTransactionCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  addTransactionTitle: {
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  transactionsTitle: {
    marginBottom: 15,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#e0e0e0',
    borderBottomWidth: 1,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  deleteButton: {
    padding: 5,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#FF6B6B',
  },
  categoryButton: {
    backgroundColor: '#e8f0ff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
    paddingTop: 10,
  },
  categoryOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  categoryOptionTextSelected: {
    color: '#fff',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
