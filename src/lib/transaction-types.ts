export type TransactionRecord = {
  id: string;
  amount: number;
  date: Date;
  description: string;
  type: string;
  categoryId: string | null;
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
