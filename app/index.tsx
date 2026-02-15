import { Image } from 'expo-image';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
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
  ActivityIndicator,
} from 'react-native';

import { HelloWave } from './components/hello-wave';
import ParallaxScrollView from './components/parallax-scroll-view';
import { ThemedText } from './components/themed-text';
import { ThemedView } from './components/themed-view';
import { useAuth } from './context/authContext';
import { saveBudgetToFirestore, loadBudgetFromFirestore, updateBudgetInFirestore } from './services/firestoreService';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

const ALLOWED_OVER_BUDGET_CATEGORIES = ['Health', 'Medical', 'Emergency', 'Essential'];

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
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
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'main' | 'analytics'>('main');
  const [categoryLimits, setCategoryLimits] = useState<{ [key: string]: number }>({});
  const [categoryLimitsModalVisible, setCategoryLimitsModalVisible] = useState(false);
  const [editingCategoryLimit, setEditingCategoryLimit] = useState<{ category: string; limit: string } | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Redirect to login if user is not authenticated
  useEffect(() => {
    console.log('Auth check - user:', user ? user.uid : 'null', 'loading:', loading);
    if (!loading && !user) {
      console.log('Not authenticated, redirecting to login...');
      router.replace('/auth/login');
    } else if (!loading && user) {
      console.log('User authenticated, showing app...');
    }
  }, [user, loading, router]);

  const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0);
  const remaining = budget ? budget - totalSpending : 0;
  const percentageUsed = budget ? (totalSpending / budget) * 100 : 0;

  // Load data from Firestore when component mounts
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        const budgetData = await loadBudgetFromFirestore();
        
        if (budgetData) {
          setBudget(budgetData.budget);
          setTransactions(budgetData.transactions || []);
          setCategoryLimits(budgetData.categoryLimits || {});
          setSetupModalVisible(false);
        }
      } catch (error) {
        console.error('Error loading data from Firestore:', error);
        Alert.alert('Sync Error', 'Failed to load your data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Save budget to Firestore when it changes
  useEffect(() => {
    if (budget !== null && !syncing) {
      const saveData = async () => {
        setSyncing(true);
        try {
          await updateBudgetInFirestore({ budget });
        } catch (error) {
          console.error('Error saving budget:', error);
        } finally {
          setSyncing(false);
        }
      };
      saveData();
    }
  }, [budget, syncing]);

  // Save transactions to Firestore whenever they change
  useEffect(() => {
    if (budget !== null && !syncing) {
      const saveData = async () => {
        setSyncing(true);
        try {
          await updateBudgetInFirestore({ transactions });
        } catch (error) {
          console.error('Error saving transactions:', error);
        } finally {
          setSyncing(false);
        }
      };
      saveData();
    }
  }, [transactions]);

  // Save category limits to Firestore
  useEffect(() => {
    if (budget !== null && !syncing) {
      const saveData = async () => {
        setSyncing(true);
        try {
          await updateBudgetInFirestore({ categoryLimits });
        } catch (error) {
          console.error('Error saving category limits:', error);
        } finally {
          setSyncing(false);
        }
      };
      saveData();
    }
  }, [categoryLimits, syncing]);

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

  // Calculate spending by category
  const getSpendingByCategory = () => {
    const categoryMap: { [key: string]: number } = {};
    transactions.forEach(transaction => {
      if (categoryMap[transaction.category]) {
        categoryMap[transaction.category] += transaction.amount;
      } else {
        categoryMap[transaction.category] = transaction.amount;
      }
    });
    return categoryMap;
  };

  const handleSetBudget = async () => {
    const budgetAmount = parseFloat(budgetInput);
    if (!isNaN(budgetAmount) && budgetAmount > 0) {
      try {
        await saveBudgetToFirestore({
          budget: budgetAmount,
          transactions: [],
          categoryLimits: {},
        });
        setBudget(budgetAmount);
        setSetupModalVisible(false);
        setBudgetInput('');
      } catch (error) {
        Alert.alert('Error', 'Failed to save budget. Please try again.');
        console.error('Error saving budget:', error);
      }
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

    // Check category limit
    const categorySpending = transactions
      .filter(t => t.category === selectedCategory)
      .reduce((sum, t) => sum + t.amount, 0);
    const categoryLimit = categoryLimits[selectedCategory];
    const willExceedCategoryLimit = categoryLimit && categorySpending + amount > categoryLimit;

    if (willExceedCategoryLimit) {
      // Warn about category limit
      Alert.alert(
        '⚠️ Category Limit Alert',
        `This expense of $${amount.toFixed(2)} will exceed your ${selectedCategory} category limit of $${categoryLimit?.toFixed(2)}. You've already spent $${categorySpending.toFixed(2)} in this category.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Proceed Anyway', 
            style: 'destructive', 
            onPress: () => {
              // Add transaction after confirming to exceed category limit
              setTransactions([newTransaction, ...transactions]);
              setDescriptionInput('');
              setAmountInput('');
              setSelectedCategory('Other');
            }
          },
        ]
      );
      return;
    }

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

  const handleSetCategoryLimit = () => {
    if (editingCategoryLimit) {
      const limit = parseFloat(editingCategoryLimit.limit);
      if (!isNaN(limit) && limit > 0) {
        const newLimits = {
          ...categoryLimits,
          [editingCategoryLimit.category]: limit,
        };
        setCategoryLimits(newLimits);
        setEditingCategoryLimit(null);
      } else {
        Alert.alert('Invalid Input', 'Please enter a valid limit amount');
      }
    }
  };

  const handleDeleteCategoryLimit = (category: string) => {
    const newLimits = { ...categoryLimits };
    delete newLimits[category];
    setCategoryLimits(newLimits);
  };

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // This should never happen as router.replace happens in useEffect, but as a fallback:
  if (!user) {
    return null;
  }

  if (budget === null) {
    return (
      <Modal visible={setupModalVisible} transparent animationType="fade">
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <ThemedText type="title" style={[styles.modalTitle, { color: '#000' }]}>
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
    <>
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('../assets/images/money-tracker-logo.jpg')}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Budget Tracker 💰</ThemedText>
        <HelloWave />
      </ThemedView>

      {/* View Toggle Buttons */}
      <View style={styles.viewToggleContainer}>
        <Pressable
          style={[
            styles.viewToggleButton,
            viewMode === 'main' && styles.viewToggleButtonActive,
          ]}
          onPress={() => setViewMode('main')}
        >
          <ThemedText
            style={[
              styles.viewToggleButtonText,
              viewMode === 'main' && styles.viewToggleButtonTextActive,
            ]}
          >
            Overview
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.viewToggleButton,
            viewMode === 'analytics' && styles.viewToggleButtonActive,
          ]}
          onPress={() => setViewMode('analytics')}
        >
          <ThemedText
            style={[
              styles.viewToggleButtonText,
              viewMode === 'analytics' && styles.viewToggleButtonTextActive,
            ]}
          >
            Analytics
          </ThemedText>
        </Pressable>
      </View>

      {/* Analytics View */}
      {viewMode === 'analytics' && (
        <ThemedView style={styles.analyticsContainer}>
          <ThemedText type="subtitle" style={{ color: '#fff', marginBottom: 20 }}>
            Spending Analysis
          </ThemedText>

          {transactions.length > 0 ? (
            <>
              {/* Category Spending Chart */}
              <ThemedView style={styles.chartCard}>
                <ThemedText style={[styles.chartTitle, { color: '#000' }]}>
                  Spending by Category
                </ThemedText>
                <View style={styles.pieChartContainer}>
                  {Object.entries(getSpendingByCategory()).map(([category, amount], index) => {
                    const colors = ['#FF6B6B', '#4CAF50', '#FFA500', '#007AFF', '#9C27B0', '#00BCD4', '#FF9800', '#795548'];
                    const maxAmount = Math.max(...Object.values(getSpendingByCategory()) as number[]);
                    const percentage = ((amount as number) / maxAmount) * 100;
                    return (
                      <View key={category} style={styles.categoryChartItem}>
                        <ThemedText style={styles.categoryChartLabel}>{category}</ThemedText>
                        <View style={styles.categoryChartBarContainer}>
                          <View
                            style={[
                              styles.categoryChartBar,
                              {
                                width: `${percentage}%`,
                                backgroundColor: colors[index % colors.length],
                              },
                            ]}
                          />
                        </View>
                        <ThemedText style={styles.categoryChartAmount}>
                          ${(amount as number).toFixed(2)}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              </ThemedView>

              {/* Comparison Bar Chart */}
              <ThemedView style={styles.chartCard}>
                <ThemedText style={[styles.chartTitle, { color: '#000' }]}>
                  Budget vs Spent
                </ThemedText>
                <View style={styles.barChartContainer}>
                  <View style={styles.comparisonItem}>
                    <ThemedText style={styles.comparisonLabel}>Budget</ThemedText>
                    <View style={styles.comparisonBarContainer}>
                      <View
                        style={[
                          styles.comparisonBar,
                          {
                            width: '100%',
                            backgroundColor: '#4CAF50',
                          },
                        ]}
                      />
                    </View>
                    <ThemedText style={styles.comparisonAmount}>
                      ${budget?.toFixed(2)}
                    </ThemedText>
                  </View>
                  <View style={styles.comparisonItem}>
                    <ThemedText style={styles.comparisonLabel}>Spent</ThemedText>
                    <View style={styles.comparisonBarContainer}>
                      <View
                        style={[
                          styles.comparisonBar,
                          {
                            width: `${Math.min((totalSpending / budget!) * 100, 100)}%`,
                            backgroundColor: totalSpending >= budget! ? '#FF6B6B' : '#FFA500',
                          },
                        ]}
                      />
                    </View>
                    <ThemedText style={styles.comparisonAmount}>
                      ${totalSpending.toFixed(2)}
                    </ThemedText>
                  </View>
                </View>
              </ThemedView>

              {/* Category Breakdown */}
              <ThemedView style={styles.categoryBreakdownCard}>
                <ThemedText style={[styles.chartTitle, { color: '#000' }]}>
                  Category Breakdown
                </ThemedText>
                {Object.entries(getSpendingByCategory()).map(([category, amount]) => (
                  <View key={category} style={styles.categoryBreakdownItem}>
                    <ThemedText style={styles.categoryBreakdownName}>
                      {category}
                    </ThemedText>
                    <ThemedText style={styles.categoryBreakdownAmount}>
                      ${(amount as number).toFixed(2)}
                    </ThemedText>
                  </View>
                ))}
              </ThemedView>
            </>
          ) : (
            <ThemedView style={styles.emptyAnalytics}>
              <ThemedText style={styles.emptyAnalyticsText}>
                No transactions yet. Add some expenses to see analytics! 📊
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      )}

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <>
      <ThemedView style={styles.summaryCard}>
        <View style={styles.budgetHeader}>
          <ThemedText type="subtitle" style={{ color: '#000' }}>Budget Overview</ThemedText>
          <Pressable
            onPress={() => {
              logout().catch(error => {
                Alert.alert('Logout Error', error.message);
              });
            }}
          >
            <ThemedText style={styles.editBudgetText}>Logout</ThemedText>
          </Pressable>
        </View>

        <View style={styles.amountRow}>
          <View>
            <ThemedText style={[styles.label, { color: '#000' }]}>Budget:</ThemedText>
            <ThemedText style={[styles.largeAmount, { color: '#000' }]}>${budget.toFixed(2)}</ThemedText>
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

      {/* Category Limits Card */}
      <ThemedView style={styles.categoryLimitsCard}>
        <View style={styles.categoryLimitsHeader}>
          <ThemedText type="subtitle" style={{ color: '#000' }}>Category Limits</ThemedText>
          <Pressable onPress={() => setCategoryLimitsModalVisible(true)}>
            <ThemedText style={styles.editBudgetText}>Manage</ThemedText>
          </Pressable>
        </View>
        {Object.keys(categoryLimits).length > 0 ? (
          <FlatList
            data={Object.entries(categoryLimits)}
            keyExtractor={([category]) => category}
            scrollEnabled={false}
            renderItem={({ item: [category, limit] }) => {
              const spending = transactions
                .filter(t => t.category === category)
                .reduce((sum, t) => sum + t.amount, 0);
              const percentage = (spending / limit) * 100;
              return (
                <View style={styles.categoryLimitItem}>
                  <View style={styles.categoryLimitInfo}>
                    <ThemedText style={[styles.categoryLimitName, { color: '#000' }]}>
                      {category}
                    </ThemedText>
                    <ThemedText style={styles.categoryLimitAmount}>
                      ${spending.toFixed(2)} / ${limit.toFixed(2)}
                    </ThemedText>
                  </View>
                  <View style={styles.categoryLimitProgressContainer}>
                    <View
                      style={[
                        styles.categoryLimitProgress,
                        {
                          width: `${Math.min(percentage, 100)}%`,
                          backgroundColor: percentage >= 100 ? '#FF6B6B' : percentage >= 75 ? '#FFA500' : '#4CAF50',
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            }}
          />
        ) : (
          <ThemedText style={styles.noCategoryLimitsText}>
            No category limits set. Tap "Manage" to add one.
          </ThemedText>
        )}
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

      {transactions.length === 0 && budget && viewMode === 'main' && (
        <ThemedView style={styles.emptyState}>
          <ThemedText style={styles.emptyStateText}>
            No expenses yet. Start tracking! 📝
          </ThemedText>
        </ThemedView>
      )}
        </>
      )}
    </ParallaxScrollView>

      {/* Category Limits Management Modal */}
      <Modal visible={categoryLimitsModalVisible} transparent animationType="slide">
        <View style={styles.centeredView}>
          <View style={[styles.modalView, { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={[styles.modalTitle, { color: '#000' }]}>
                ⚙️ Category Limits
              </ThemedText>
              <Pressable onPress={() => setCategoryLimitsModalVisible(false)}>
                <ThemedText style={{ fontSize: 24, color: '#007AFF' }}>✕</ThemedText>
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1, marginBottom: 20 }}>
              {['Health', 'Medical', 'Emergency', 'Essential', 'Groceries', 'Entertainment', 'Transport', 'Other'].map((category) => (
                <View key={category} style={styles.categoryLimitEditItem}>
                  <View style={styles.categoryLimitEditInfo}>
                    <ThemedText style={[styles.categoryLimitEditName, { color: '#000' }]}>
                      {category}
                    </ThemedText>
                    {categoryLimits[category] && (
                      <ThemedText style={styles.categoryLimitEditCurrent}>
                        Current: ${categoryLimits[category].toFixed(2)}
                      </ThemedText>
                    )}
                  </View>
                  <View style={styles.categoryLimitEditControls}>
                    <TextInput
                      style={[styles.input, { width: 100 }]}
                      placeholder="Limit"
                      keyboardType="decimal-pad"
                      defaultValue={categoryLimits[category]?.toString() || ''}
                      onChangeText={(text) => setEditingCategoryLimit({ category, limit: text })}
                      placeholderTextColor="#999"
                    />
                    <Pressable
                      style={styles.categoryLimitSetButton}
                      onPress={() => {
                        setEditingCategoryLimit({ category, limit: categoryLimits[category]?.toString() || '' });
                        handleSetCategoryLimit();
                      }}
                    >
                      <ThemedText style={styles.categoryLimitSetButtonText}>Set</ThemedText>
                    </Pressable>
                    {categoryLimits[category] && (
                      <Pressable
                        style={styles.categoryLimitDeleteButton}
                        onPress={() => handleDeleteCategoryLimit(category)}
                      >
                        <ThemedText style={styles.categoryLimitDeleteButtonText}>Delete</ThemedText>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            <Pressable
              style={styles.setupButton}
              onPress={() => setCategoryLimitsModalVisible(false)}
            >
              <Text style={styles.setupButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
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
  viewToggleContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  viewToggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  viewToggleButtonTextActive: {
    color: '#fff',
  },
  analyticsContainer: {
    marginBottom: 20,
  },
  chartCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  barChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBreakdownCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  categoryBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomColor: '#e0e0e0',
    borderBottomWidth: 1,
  },
  categoryBreakdownName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  categoryBreakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  emptyAnalytics: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
  },
  emptyAnalyticsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  categoryChartItem: {
    marginBottom: 20,
  },
  categoryChartLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  categoryChartBarContainer: {
    height: 25,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 5,
  },
  categoryChartBar: {
    height: '100%',
    borderRadius: 5,
  },
  categoryChartAmount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  comparisonItem: {
    marginBottom: 20,
  },
  comparisonLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  comparisonBarContainer: {
    height: 35,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  comparisonBar: {
    height: '100%',
    borderRadius: 8,
  },
  comparisonAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  categoryLimitsCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  categoryLimitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryLimitItem: {
    marginBottom: 15,
  },
  categoryLimitInfo: {
    marginBottom: 5,
  },
  categoryLimitName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  categoryLimitAmount: {
    fontSize: 12,
    color: '#666',
  },
  categoryLimitProgressContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryLimitProgress: {
    height: '100%',
    borderRadius: 4,
  },
  noCategoryLimitsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginVertical: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryLimitEditItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: '#e0e0e0',
    borderWidth: 1,
  },
  categoryLimitEditInfo: {
    flex: 1,
  },
  categoryLimitEditName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  categoryLimitEditCurrent: {
    fontSize: 12,
    color: '#666',
  },
  categoryLimitEditControls: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  categoryLimitSetButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  categoryLimitSetButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryLimitDeleteButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  categoryLimitDeleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reactLogo: {
    height: 178,
    width: 290,
    top: 10,
    left: '50%',
    marginLeft: -145,
    position: 'absolute',
  },
});
