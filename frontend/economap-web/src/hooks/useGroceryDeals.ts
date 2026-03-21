import { Deal } from "@/types/Deals";

const groceryDeals: Deal[] = [
  {
    id: "grocery-1",
    title: "Kroger - 20% off on produce",
    description: "Get 20% off on all produce items.",
    vendor: "Kroger",
    price: 25,
    discountedPrice: 20,
    sponsored: true,
  },
  {
    id: "grocery-2",
    title: "Walmart - BOGO on selected items",
    description: "Buy one get one free on selected items.",
    vendor: "Walmart",
    price: 15,
    discountedPrice: 7.5,
    sponsored: false,
  },
];

export const useGroceryDeals = () => {
  return {
    data: groceryDeals,
    isLoading: false,
    isError: false,
  };
};
