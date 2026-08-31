export type Currency = "UYU" | "USD";

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type Expense = {
  id: string;
  amount: string;
  currency: Currency;
  date: string;
  description: string | null;
  categoryId: string;
  category: Category;
  recurringExpenseId: string | null;
};

export type RecurringExpense = {
  id: string;
  amount: string;
  currency: Currency;
  dayOfMonth: number;
  description: string | null;
  active: boolean;
  categoryId: string;
  category: Category;
};
