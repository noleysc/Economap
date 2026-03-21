export interface Deal {
  id: string;
  title: string;
  description: string;
  vendor: string;
  price: number;
  discountedPrice?: number;
  sponsored: boolean;
}
