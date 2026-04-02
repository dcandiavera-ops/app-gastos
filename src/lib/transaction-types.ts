export type TransactionRecord = {
  id: string;
  amount: number;
  date: Date;
  description: string;
  type: string;
  paymentMethod: string;
  categoryId: string | null;
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
