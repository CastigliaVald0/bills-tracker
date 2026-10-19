export type Currency = "UYU" | "USD";

export type Category = {
  id: string;
  name: string;
  color: string;
  /** El emoji que la representa, si se le puso uno. */
  emoji?: string | null;
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
  /** El grupo al que pertenece, si se cargó dentro de uno. */
  grupo?: { id: string; nombre: string; color: string } | null;
};

export type RecurringExpense = {
  id: string;
  amount: string;
  currency: Currency;
  dayOfMonth: number;
  description: string | null;
  active: boolean;
  /** Último mes que se cobra (ISO). Null = sin fin. */
  endsOn: string | null;
  /** Cuándo se dio de alta (ISO). Sirve para saber en qué cuota va. */
  createdAt: string;
  categoryId: string;
  category: Category;
};
